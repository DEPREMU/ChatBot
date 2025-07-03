export const getContextFromQuery = async (
  prompt: string,
  language: string = "en",
  onToken?: (token: string) => void,
  externalAbortController?: AbortController
): Promise<string> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.log("RAG API request timeout (2 minutes)");
    controller.abort();
  }, 120000);

  // Si hay un AbortController externo, escuchar su señal
  externalAbortController?.signal?.addEventListener("abort", () => {
    console.log("RAG API request aborted by external controller");
    controller.abort();
  });

  try {
    console.log("=== Starting RAG API context fetch ===");
    console.log(`Prompt length: ${prompt.length}`);
    console.log(`Language: ${language}`);

    const response = await fetch("http://localhost:8000/context", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, lang: language }),
      signal: controller?.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok || !response.body) {
      console.error(
        `RAG API error: ${response.status} - ${response.statusText}`
      );
      throw new Error(
        `RAG API error: ${response.status} - ${response.statusText}`
      );
    }

    console.log("RAG API response received, starting to read stream");
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let fullText = "Context: ";
    let chunkCount = 0;
    const maxChunks = 1000;

    while (chunkCount < maxChunks) {
      // Check for abort before each read
      if (controller.signal.aborted) {
        console.log("RAG API stream reading aborted");
        break;
      }

      const { value, done } = await reader.read();
      if (done) {
        console.log(
          `RAG API stream finished successfully. Total chunks: ${chunkCount}`
        );
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      fullText += chunk;
      chunkCount++;

      if (onToken) onToken(chunk);

      if (chunkCount % 50 === 0) {
        console.log(
          `RAG API: processed ${chunkCount} chunks, text length: ${fullText.length}`
        );
      }

      if (fullText.length > 50000) {
        console.warn("Context too long, truncating");
        break;
      }
    }

    if (chunkCount >= maxChunks) {
      console.warn("Reached maximum chunk limit, stopping stream");
    }

    if (fullText.length <= 20) {
      console.warn("Received empty context from RAG API", fullText);
      return "Context: No relevant context found for the query.";
    }

    console.log(`=== RAG API context completed ===`);
    console.log(`Final context length: ${fullText.length} characters`);
    console.log(`Total chunks processed: ${chunkCount}`);
    return fullText;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === "AbortError" || controller.signal.aborted) {
      console.log("RAG API request was aborted");
      throw new Error("RAG API request was aborted");
    }

    console.error("Error in getContextFromQuery:", error);
    throw new Error(`Failed to get context: ${error.message}`);
  }
};

export const getPrompt = async (
  question: string,
  language: string,
  abortController?: AbortController
) => {
  let context: string | null = null;

  try {
    console.log(
      `=== Getting context for question ===: ${question.substring(0, 100)}...`
    );
    console.log(`Target language: ${language}`);
    console.log(`Abort controller provided: ${!!abortController}`);
    console.log(
      `Abort controller status: ${
        abortController?.signal.aborted ? "aborted" : "active"
      }`
    );

    context = await getContextFromQuery(
      question,
      language,
      undefined,
      abortController
    );
    console.log(`=== Context retrieved successfully ===`);
    console.log(`Context length: ${context.length} characters`);
  } catch (error) {
    console.error("Error fetching context:", error);
    if (abortController?.signal.aborted) {
      console.log("Context fetch was aborted, using minimal context");
    }
    // Usar un contexto por defecto en caso de error
    context = `Context: The user wrote: "${question}". No additional context available due to system error.`;
  }

  // Validar que el contexto no esté vacío o sea muy corto
  if (!context || context.length <= 20) {
    console.log("Context too short, using fallback");
    context = `Context: The user wrote: "${question}". No relevant context found.`;
  }

  const prompt = [
    `You are a helpful assistant.
    Answer the user's questions in a concise and informative manner.
    If you don't know the answer, say 'I don't know' in the respective language.
    Use these to make the text more comfortable for the user:
    separator: ---
    Bold: **
    Italicize: _
    List item: *
    Titles: #
    Subtitles: ##
    Sub subtitles: ###
    You will not be able to answer any question that it is not related to health, medicine, pills/drugs or, our app, if the user's text is not about any of those topics, you will reject the answer on a polite way.
    Use emojis to make your response more engaging.
    If the user asks for a summary, provide it in a concise manner.`
      .split("\n")
      .map((line) => line.trim() + (line.endsWith(".") ? "" : "."))
      .filter((line) => line !== "")
      .join(" ")
      .trim(),
    `Use the following context created by you to answer the following text from the user. And respond only in this language: ${language}.`,
    context,
    `Text from the user: ${question}`,
  ].join("\n\n");

  console.log(`=== Final prompt prepared ===`);
  console.log(`Total prompt length: ${prompt.length} characters`);
  return prompt;
};
