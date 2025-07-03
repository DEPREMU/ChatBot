import { WebSocketServer } from "ws";
import http from "http";
import express from "express";
import cors from "cors";
import { getPrompt } from "./rag.ts";
import fs from "fs";

const port = 9243;
const host = "localhost";

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

const infoForLlama = (language: string, userText: string) =>
  `You are a helpful assistant. 
  Answer the user's questions in a concise and informative manner.
  If you don't know the answer, say 'I don't know' in the respective language.
  use these to make the text more comfortable for the user: separator: ---, Bold: **, Italicize: _, List item: *, Titles: #, Subtitles: ##, Sub subtitles: ###.
  You will not answer any question that it is not related to health, medicine, pills/drugs or, our app. 
  Use emojis to make your response more engaging.
  If the user asks for a summary, provide it in a concise manner.
  
  
  Respond in this language: "${language}".
  
  User's text: ${userText}
  `
    .split("\n")
    .join(" ");

const messageToLlama3 = async (
  question: string,
  language: string,
  onData: (chink: string) => void,
  abortController?: AbortController
): Promise<string> => {
  try {
    console.log("=== Getting context from RAG API ===");
    const prompt = await getPrompt(question, language, abortController)
      .then((r) => {
        console.log("Context obtained successfully from RAG API");
        return r;
      })
      .catch((e) => {
        console.error("Error while getting prompt:", e);
        if (abortController?.signal.aborted) {
          console.log("Context fetch was aborted");
        }
        return infoForLlama(language, question);
      });

    fs.writeFileSync("prompt.txt", prompt);

    // Verificar abort antes de hacer el fetch
    if (abortController?.signal.aborted) {
      console.log("Operation aborted before Ollama fetch");
      return "";
    }

    console.log("=== Starting Llama3 streaming ===");
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3",
        prompt,
        stream: true,
      }),
      signal: abortController?.signal,
    });

    if (!response.ok || !response.body) {
      throw new Error(`Ollama error: ${response.status}`);
    }

    console.log("Llama3 response stream started successfully");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let buffer = "";
    let message = "";
    let chunkCount = 0;

    while (true) {
      // Verificar si se solicitó abortar
      if (abortController?.signal.aborted) {
        console.log("Operation aborted, stopping stream processing");
        break;
      }

      const { done, value } = await reader.read();
      if (done) {
        console.log(`Stream finished. Total chunks processed: ${chunkCount}`);
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.trim() === "") continue;

        // Verificar nuevamente si se solicitó abortar
        if (abortController?.signal.aborted) {
          console.log("Operation aborted during line processing");
          break;
        }

        try {
          const data = JSON.parse(line);
          if (!data?.response) continue;

          chunkCount++;
          onData(data.response);
          message += data.response;

          if (chunkCount % 10 === 0) {
            console.log(`Processed ${chunkCount} chunks so far`);
          }
        } catch (err) {
          console.warn("Error al parsear línea de stream:", line);
        }
      }

      // Salir del while si se abortó
      if (abortController?.signal.aborted) {
        break;
      }
    }

    console.log(`=== Llama3 streaming completed ===`);
    console.log(`Total response length: ${message.length} characters`);
    console.log(`Total chunks sent: ${chunkCount}`);
    return message;
  } catch (error) {
    if (error.name === "AbortError" || abortController?.signal.aborted) {
      console.log("messageToLlama3 was aborted");
      return "";
    }
    console.error("Error in messageToLlama3:", error);
    throw error; // Re-throw non-abort errors
  }
};

wss.on("connection", (ws) => {
  console.log("New client connected");

  // Crear un AbortController para esta conexión
  let abortController = new AbortController();
  let isClosing = false;

  // Configurar keepalive para mantener la conexión activa
  const keepAliveInterval = setInterval(() => {
    if (ws.readyState === ws.OPEN) {
      console.log("Sending keepalive ping");
      ws.ping();
    } else {
      console.log("WebSocket not open, clearing keepalive");
      clearInterval(keepAliveInterval);
    }
  }, 30000); // Ping cada 30 segundos

  // Manejar pong responses
  ws.on("pong", () => {
    console.log("Received pong from client - connection is alive");
  });

  // Configurar el manejo del cierre del websocket
  const handleWebSocketClose = (code: number, reason: string) => {
    if (isClosing) {
      console.log("WebSocket close handler already called, ignoring");
      return;
    }

    console.log(`Processing WebSocket close: ${code} - ${reason}`);
    console.log(`WebSocket readyState: ${ws.readyState}`);
    console.log(`Current abort status: ${abortController.signal.aborted}`);

    // Limpiar keepalive
    clearInterval(keepAliveInterval);

    // Solo abortar operaciones para cierres verdaderamente anormales
    // 1000: Normal Closure
    // 1001: Going Away
    // 1006: Abnormal Closure (no close frame)
    // 1011: Internal Error
    // 1012: Service Restart
    const shouldAbort = [1006, 1011, 1012].includes(code);

    if (shouldAbort) {
      isClosing = true;
      console.log(`Abnormal close detected (${code}), will abort operations`);

      if (!abortController.signal.aborted) {
        console.log("Aborting operations due to abnormal websocket closure");
        abortController.abort();
        console.log("Operations aborted");
      } else {
        console.log("Operations already aborted");
      }
    } else {
      console.log(
        `Normal/expected close detected (${code}), not aborting operations`
      );
    }
  };

  ws.on("message", async (message) => {
    console.log("Received message:", message.toString());

    let parsedMessage: {
      type: "start-stream";
      password: string;
      prompt?: string;
      language?: string;
    };

    let operationTimeout: NodeJS.Timeout | null = null;

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

      // NO crear un nuevo AbortController aquí, usar el existente
      // Solo crear uno nuevo si el actual ya está abortado
      if (abortController.signal.aborted) {
        console.log("Creating new AbortController as current one is aborted");
        abortController = new AbortController();
      }

      // Timeout general para toda la operación (2 minutos)
      operationTimeout = setTimeout(() => {
        if (!abortController.signal.aborted) {
          console.log("Operation timeout reached, aborting");
          abortController.abort();
        }
      }, 120000); // 2 minutos

      // Verificar que el WebSocket esté aún conectado antes de comenzar
      if (ws.readyState !== ws.OPEN) {
        console.log("WebSocket is not open, aborting operation");
        if (operationTimeout) clearTimeout(operationTimeout);
        return;
      }

      let messageFromLlama = "";
      let retryCount = 0;
      const maxRetries = 3;

      console.log(
        "Starting processing with AbortController:",
        !abortController.signal.aborted
      );

      try {
        while (
          (!messageFromLlama || messageFromLlama.length < 10) &&
          retryCount < maxRetries
        ) {
          // Verificar si se solicitó abortar antes de cada intento
          if (abortController.signal.aborted) {
            console.log("Operation aborted before retry attempt");
            return;
          }

          if (retryCount > 0) {
            console.log(
              `Retry attempt ${retryCount} for prompt: ${parsedMessage.prompt}`
            );
            // Esperar un poco antes de reintentar, pero verificar abort durante la espera
            try {
              await new Promise((resolve, reject) => {
                const timeout = setTimeout(resolve, 1000);
                abortController.signal.addEventListener("abort", () => {
                  clearTimeout(timeout);
                  reject(new Error("Operation aborted during retry delay"));
                });
              });
            } catch (delayError) {
              if (abortController.signal.aborted) {
                console.log("Retry delay aborted");
                return;
              }
            }
          }

          // Verificar si el websocket sigue abierto antes de continuar
          if (ws.readyState !== ws.OPEN) {
            console.log("WebSocket closed during processing, aborting");
            abortController.abort();
            return;
          }

          try {
            console.log(
              `Starting messageToLlama3 attempt ${retryCount + 1}/${maxRetries}`
            );

            let chunksSent = 0;
            messageFromLlama = await messageToLlama3(
              parsedMessage.prompt,
              parsedMessage.language,
              (chunk) => {
                // Verificar si el websocket sigue abierto antes de enviar
                if (
                  ws.readyState === ws.OPEN &&
                  !abortController.signal.aborted
                ) {
                  chunksSent++;
                  if (chunksSent % 5 === 0) {
                    console.log(`Sent ${chunksSent} chunks to client`);
                  }
                  ws.send(JSON.stringify({ type: "response-stream", chunk }));
                } else {
                  console.log(
                    `Cannot send chunk ${chunksSent + 1}: ws.readyState=${
                      ws.readyState
                    }, aborted=${abortController.signal.aborted}`
                  );
                }
              },
              abortController
            );
            console.log(
              `messageToLlama3 completed. Response length: ${messageFromLlama.length}, chunks sent: ${chunksSent}`
            );
          } catch (llamaError) {
            if (abortController.signal.aborted) {
              console.log("messageToLlama3 was aborted, stopping retries");
              return;
            }
            console.error(
              `Error in messageToLlama3 attempt ${retryCount}:`,
              llamaError
            );
            // Continuar con el siguiente intento en lugar de fallar completamente
          }

          retryCount++;
        }

        // Verificar abort antes de continuar con el procesamiento
        if (abortController.signal.aborted) {
          console.log("Operation aborted after getting response");
          return;
        }

        // Si después de los reintentos no hay respuesta válida
        if (!messageFromLlama || messageFromLlama.length < 10) {
          console.warn("Failed to get valid response after all retries");
          // En lugar de lanzar error, enviar respuesta de "no sé"
          if (ws.readyState === ws.OPEN) {
            ws.send(
              JSON.stringify({
                type: "done",
                text: "I don't know",
                isDone: true,
                isThinking: false,
              })
            );
          }
          return;
        }
      } catch (error) {
        console.error("Error in retry loop:", error);

        // Solo enviar error si no fue debido a un abort y el websocket sigue abierto
        if (!abortController.signal.aborted && ws.readyState === ws.OPEN) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Error processing message",
            })
          );
        }

        // No cerrar el websocket aquí, solo logear el error
        console.log("Error handled, websocket remains open");
        if (operationTimeout) clearTimeout(operationTimeout);
        return;
      }

      // Limpiar el timeout si llegamos aquí
      if (operationTimeout) clearTimeout(operationTimeout);

      // Verificar abort antes de generar el título
      if (abortController.signal.aborted || ws.readyState !== ws.OPEN) {
        console.log("Operation aborted before title generation");
        return;
      }

      if (messageFromLlama.length > 10) {
        const title = await fetch(`http://localhost:11434/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "llama3",
            prompt: `You are a helpful assistant. 
            Generate a concise title for the following text in ${parsedMessage.language}.
            You will only return the title, nothing else, without "".
            Message from user: ${parsedMessage.prompt}
            Message from Llama: ${messageFromLlama}`,
            stream: false,
          }),
          signal: abortController.signal,
        })
          .then(async (res) => (await res.json()).response)
          .catch((err) => {
            if (err.name === "AbortError") {
              console.log("Title generation aborted");
              return "Operation cancelled";
            }
            console.error("Error fetching title from Llama:", err);
            return "No title available";
          });

        // Verificar abort antes de enviar la respuesta final
        if (!abortController.signal.aborted && ws.readyState === ws.OPEN) {
          console.log("Title from Llama:", title);
          ws.send(
            JSON.stringify({
              type: "done",
              text: messageFromLlama,
              title,
              isDone: true,
              isThinking: false,
            })
          );
        }
      } else if (!abortController.signal.aborted && ws.readyState === ws.OPEN) {
        ws.send(
          JSON.stringify({
            type: "done",
            text: "I don't know",
            isDone: true,
            isThinking: false,
          })
        );
      }

      // Limpiar el timeout al finalizar exitosamente
      if (operationTimeout) clearTimeout(operationTimeout);
    } catch (error) {
      if (!abortController.signal.aborted) {
        console.error("Error parsing message:", error);
        ws.close(1003, "Invalid JSON format");
      }
      if (operationTimeout) clearTimeout(operationTimeout);
    }
  });
  ws.on("close", (code, reason) => {
    console.log("=== WebSocket close event triggered ===");
    console.log(`Close code: ${code}, reason: ${reason}`);
    console.log(`Current abort status: ${abortController.signal.aborted}`);
    console.log(`isClosing flag: ${isClosing}`);

    // Solo procesar el cierre si no es un cierre normal iniciado por el servidor
    if (code !== 1000 || reason.toString() !== "Stream stopped by client") {
      console.log("Processing non-normal close");
      // Pequeño delay para permitir que las operaciones en curso terminen
      setTimeout(() => {
        handleWebSocketClose(code, reason.toString());
      }, 200); // Reducido para respuesta más rápida
    } else {
      console.log("Normal close initiated by server, not aborting operations");
      clearInterval(keepAliveInterval);
    }
  });

  ws.on("error", (error) => {
    console.error("=== WebSocket error ===:", error);
    // Pequeño delay para permitir que las operaciones en curso terminen
    setTimeout(() => {
      handleWebSocketClose(1006, "WebSocket error");
    }, 200); // Reducido para respuesta más rápida
  });
});

server.listen(port, host, async () => {
  console.log(`WebSocket server is running on ws://${host}:${port}`);
});
