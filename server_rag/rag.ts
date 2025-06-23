export const getContextFromQuery = async (
  prompt: string,
  language: string = "en"
): Promise<string> => {
  const response = await fetch("http://localhost:8000/context", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      lang: language,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama RAG error: ${response.status}`);
  }

  const data = await response.json();
  return data.context || "";
};

export const getPrompt = async (question: string, language: string) => {
  let context = await getContextFromQuery(question, language)
    .then((context) => context)
    .catch((error) => {
      console.error("Error fetching context:", error);
      return null;
    });
  if (!context) {
    context = `Context: The user wrote: "${question}"`;
  }
  return [
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
      .filter((line) => line.trim() !== "")
      .join(" ")
      .trim(),
    `Use the following context created by you to answer the following text from the user. And respond only in this language: ${language}.`,
    context,
    `Text from the user: ${question}`,
  ].join("\n\n");
};
