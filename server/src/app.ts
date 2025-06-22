import http from "http";
import express from "express";
import { log } from "console";
import { ObjectId } from "mongodb";
import { getCollection } from "./database/functions.ts";
import { streamMessageFromOllama } from "./routes/index.ts";
import { WebSocketServer, WebSocket } from "ws";

type Message = {
  from: "user" | "bot";
  text: string;
  timestamp: string;
  number: number;
};
type UserSession = {
  _id: string;
  socket: WebSocket;
  history: Message[];
  language?: string;
};

const users = new Map<string, UserSession>();

getCollection("chatbotZaid", "users").then((collection) => {
  const allUsers = collection.find({}).toArray();
  allUsers.then((docs) => {
    docs.forEach((doc) => {
      const session: UserSession = {
        _id: doc._id.toString(),
        socket: null as unknown as WebSocket,
        history: doc.history || [],
      };
      users.set(session._id, session);
    });
  });
});

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on("connection", (ws: WebSocket) => {
  let userId: string | null = null;

  ws.on("message", async (msg) => {
    const parsed = JSON.parse(msg.toString()) as {
      type: "init" | "message" | "history";
      userId?: string;
      prompt?: string;
      language?: string;
    };

    // Iniciar sesión
    if (parsed.type === "init" && parsed.userId) {
      userId = parsed.userId as string;
      if (!userId) {
        ws.send(
          JSON.stringify({
            type: "error",
            message: "ID de usuario no proporcionado.",
          })
        );
        return;
      }

      // Obtener historial de MongoDB
      const collection = await getCollection("chatbotCollection", "chatbot");
      const previousChats = (await collection.findOne({
        _id: new ObjectId(userId),
      })) || {
        _id: userId,
        history: [],
        socket: ws,
      };

      const session: UserSession = {
        _id: userId,
        socket: ws,
        history: previousChats.history,
        language: parsed.language || "en",
      };

      users.set(userId, session);

      ws.send(
        JSON.stringify({
          type: "info",
          message: `Sesión iniciada para ${userId}.`,
        })
      );
    }

    // Solicitud de historial
    else if (parsed.type === "history" && userId) {
      if (!users.has(userId)) {
        ws.send(
          JSON.stringify({
            type: "error",
            message: "Sesión no encontrada.",
          })
        );
        return;
      }
      const session = users.get(userId);
      if (!session) return;

      ws.send(
        JSON.stringify({
          type: "history",
          history: session.history,
        })
      );
    }

    // Mensaje del usuario
    else if (parsed.type === "message" && userId) {
      if (!users.has(userId)) {
        ws.send(
          JSON.stringify({
            type: "error",
            message: "Sesión no encontrada.",
          })
        );
        return;
      }
      const session = users.get(userId);
      if (!session) return;

      const userText = parsed.prompt || "";
      log(`Mensaje recibido del usuario ${userId}: ${userText}`);
      session.history.push({
        from: "user",
        text: userText,
        number: session.history?.length || 0,
        timestamp: new Date().toISOString(),
      });

      let botReply = "";

      session.socket.send(
        JSON.stringify({
          type: "response-stream",
          text: "",
          isDone: false,
          isThinking: true,
        })
      );

      await streamMessageFromOllama(
        userText,
        session.language || "en",
        (chunk) => {
          botReply += chunk;

          session.socket.send(
            JSON.stringify({
              type: "response-stream",
              text: chunk,
              isDone: false,
              isThinking: false,
            })
          );
        }
      );
      session.socket.send(
        JSON.stringify({
          type: "response-stream",
          text: botReply,
          isDone: true,
        })
      );

      session.history.push({
        from: "bot",
        text: botReply,
        number: session.history.length,
        timestamp: new Date().toISOString(),
      });

      const collection = await getCollection("chatbotCollection", "chatbot");
      await collection.updateOne(
        { _id: new ObjectId(userId) },
        { $set: { history: session.history } },
        { upsert: true }
      );
    }
  });

  ws.on("close", () => {
    console.log(`Usuario ${userId} desconectado`);
  });
});

export default server;
