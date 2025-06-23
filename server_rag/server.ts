import { WebSocketServer } from "ws";
import http, { get } from "http";
import express from "express";
import cors from "cors";
import { getContextFromQuery, getPrompt } from "./rag.ts";
import { log } from "console";

const port = 9243;
const host = "100.123.53.113";

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());
app.get("/", (_, res) => {
  res.send("WebSocket server is running");
});

const server = http.createServer(app);
const wss = new WebSocketServer({
  server,
});

const infoForLlama = (language: string) =>
  `You are a helpful assistant. 
  Answer the user's questions in a concise and informative manner.
  If you don't know the answer, say 'I don't know' in the respective language.
  use these to make the text more comfortable for the user: separator: ---, Bold: **, Italicize: _, List item: *, Titles: #, Subtitles: ##, Sub subtitles: ###.
  You will not answer any question that it is not related to health, medicine, pills/drugs or, our app. 
  Use emojis to make your response more engaging.
  If the user asks for a summary, provide it in a concise manner.
  
  
  Respond in this language: "${language}".`
    .split("\n")
    .join(" ");

const messageToLlama3 = async (
  question: string,
  language: string,
  onData: (chink: string) => void
): Promise<string> => {
  const prompt = await getPrompt(question, language)
    .then((r) => r)
    .catch((e) => {
      console.error("Error while getting prompt:", e);
      return question;
    });

  const response = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama3",
      prompt,
      stream: true,
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Ollama error: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let buffer = "";
  let message = "";

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
        message += data.response;
      } catch (err) {
        console.warn("Error al parsear línea de stream:", line);
      }
    }
  }
  return message;
};

wss.on("connection", (ws) => {
  console.log("New client connected");

  ws.on("message", async (message) => {
    console.log("Received message:", message.toString());

    let parsedMessage: {
      type: "start-stream";
      password: string;
      prompt?: string;
      language?: string;
    };
    try {
      parsedMessage = JSON.parse(message.toString());
      if (parsedMessage.type !== "start-stream") {
        ws.close(1000, "Stream stopped by client");
        return;
      }

      if (parsedMessage.password !== "password_here") {
        ws.close(1008, "Invalid password");
        return;
      }

      if (!parsedMessage.prompt || !parsedMessage.language) {
        ws.close(1003, "Missing prompt or language");
        return;
      }
      let messageFromLlama = "";
      try {
        messageFromLlama = await messageToLlama3(
          parsedMessage.prompt,
          parsedMessage.language,
          (chunk) => {
            ws.send(JSON.stringify({ type: "response-stream", chunk }));
          }
        );
      } catch (error) {
        console.error("Error in messageToLlama3:", error);
        ws.send(
          JSON.stringify({
            type: "error",
            message: "Error processing message",
          })
        );
        return;
      }

      if (messageFromLlama.length > 0)
        ws.send(
          JSON.stringify({
            type: "done",
            text: messageFromLlama,
            isDone: true,
            isThinking: false,
          })
        );
      else
        ws.send(
          JSON.stringify({
            type: "done",
            text: "I don't know",
            isDone: true,
            isThinking: false,
          })
        );
    } catch (error) {
      ws.close(1003, "Invalid JSON format");
    }
  });

  ws.on("close", (e) => {
    console.log("Client disconnected", e);
  });
});

server.listen(port, host, () => {
  console.log(`WebSocket server is running on ws://${host}:${port}`);
});
