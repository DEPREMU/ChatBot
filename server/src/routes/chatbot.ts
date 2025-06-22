type ResponseSocket = {
  type: "response-stream" | "error" | "done";
  chunk?: string;
  message?: string;
};

export const streamMessageFromOllama = async (
  prompt: string,
  language: string,
  onData: (chunk: string) => void
): Promise<void> => {
  const socket = new WebSocket("ws://100.123.53.113:9243");
  socket.onopen = () => {
    socket.send(
      JSON.stringify({
        type: "start-stream",
        password: "password_here",
        prompt,
        language,
      })
    );
  };
  socket.onmessage = (event) => {
    if (!event?.data) return;

    const data = JSON.parse(event.data) as ResponseSocket;
    if (data.type === "response-stream") {
      onData(data.chunk || "");
    } else if (data.type === "error") {
      console.error("Error from server:", data.message);
      return;
    } else if (data.type === "done") {
      socket.close();
      return;
    }
  };
  while (socket.readyState !== WebSocket.CLOSED) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
};

const s = async (onData = (s: any) => {}, language: string) => {
  const infoForLlama = `You are a helpful assistant. 
  Answer the user's questions in a concise and informative manner.
  If you don't know the answer, say 'I don't know' in the respective language.
  use these to make the text more comfortable for the user: separator: ---, Bold: **, Italicize: _, List item: *, Titles: #, Subtitles: ##, Sub subtitles: ###.
  Use emojis to make your response more engaging.
  If the user asks for a summary, provide it in a concise manner.
  
  
  Respond in this language: "${language}".`
    .split("\n")
    .join(" ");

  const response = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama3",
      prompt: [infoForLlama, prompt].join("\n\n"),
      stream: true,
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Ollama error: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.trim() === "") continue;

      try {
        const data = JSON.parse(line);
        if (!data?.response) continue;
        onData(data.response);
      } catch (err) {
        console.warn("Error al parsear línea de stream:", line);
      }
    }
  }
};
