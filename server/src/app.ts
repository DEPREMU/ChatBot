import http from "http";
import cors from "cors";
import express from "express";
import { log } from "console";
import { ObjectId } from "mongodb";
import { getCollection, getDatabase } from "./database/functions.ts";
import { streamMessageFromOllama } from "./routes/index.ts";
import { WebSocketServer, WebSocket } from "ws";
import { title } from "process";

type Message = {
  from: "user" | "bot";
  text: string;
  timestamp: string;
  number: number;
  chatId: string;
};
type chatbotCollection = {
  _id: ObjectId;
  history: Message[];
};
type UsersCollection = {
  _id: string;
  socket: null;
  language?: string;
  chats: {
    id: string;
    title: string;
    timestamp: string;
  }[];
};
type UserSession = {
  _id: string;
  socket: WebSocket;
  history: { [key: string]: Message[] };
  chats: { [title: string]: string };
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
        chats: doc?.chats || {},
      };
      users.set(session._id, session);
    });
  });
});

const app = express();
app.use(cors());
app.use(express.json());
app.get("/chats/:userId", async (req, res) => {
  const userId = req.params.userId;

  if (!userId) {
    res
      .status(400)
      .json({ success: false, error: "ID de usuario no proporcionado." });
    return;
  }
  const db = await getDatabase("chatbot");
  const collection = db.collection<UserSession>("users");
  const user = await collection.findOne({
    _id: new ObjectId(userId) as unknown as string,
  });
  if (!user) {
    res
      .status(404)
      .json({ success: false, error: "Sesión de usuario no encontrada." });
    return;
  }
  console.log(user);

  res.json({
    success: true,
    chats: user.chats,
  });
});
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on("connection", (ws: WebSocket) => {
  let userId: string | null = null;

  ws.on("message", async (msg) => {
    const parsed = JSON.parse(msg.toString()) as {
      type: "init" | "message" | "history";
      chatId: string;
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
      const db = await getDatabase("chatbot");
      const collection = db.collection<chatbotCollection>("chatbotCollection");
      const previousChats = (await collection.findOne({
        _id: new ObjectId(userId),
      })) || {
        _id: userId,
        history: [],
        language: parsed?.language || "en",
      };
      const history = {};
      if (previousChats.history) {
        const prevHistory = previousChats.history;
        prevHistory.forEach((msg) => {
          if (!history[msg.chatId]) {
            history[msg.chatId] = [];
          }

          history[msg.chatId].push(msg);
        });

        Object.keys(history).forEach((chatId) => {
          history[chatId].sort((a: Message, b: Message) => a.number - b.number);
        });
      }

      const session: UserSession = {
        _id: userId,
        socket: ws,
        history,
        chats: {},
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
      console.log(parsed);
      if (!users.has(userId)) {
        ws.send(
          JSON.stringify({
            type: "error",
            message: "Sesión no encontrada.",
          })
        );
        return;
      }
      if (!parsed.chatId) {
        ws.send(
          JSON.stringify({
            type: "error",
            message: "ID de chat no proporcionado.",
          })
        );
        return;
      }
      const session = users.get(userId);
      if (!session) return;
      if (Object.keys(session.history).includes(parsed.chatId)) {
        session.history[parsed.chatId].sort(
          (a: Message, b: Message) => a.number - b.number
        );
      } else session.history[parsed.chatId] = [];

      ws.send(
        JSON.stringify({
          type: "history",
          history: session.history[parsed.chatId] || [],
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
      if (!session || !session.history?.[parsed.chatId]) return;

      const userText = parsed.prompt || "";
      log(
        `Mensaje recibido del usuario ${userId}: ${userText} en chat ${parsed.chatId}`
      );
      session.history[parsed.chatId].push({
        from: "user",
        text: userText,
        number: session.history[parsed.chatId]?.length || 0,
        timestamp: new Date().toISOString(),
        chatId: parsed.chatId,
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

      let title = await streamMessageFromOllama(
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
      if (!botReply || botReply.length < 10) {
        botReply = "";
        title = await streamMessageFromOllama(
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
      }
      if (!title || title.length < 3) title = "MediBot";

      session.socket.send(
        JSON.stringify({
          type: "response-stream",
          text: botReply,
          isDone: true,
          title,
        })
      );

      session.history[parsed.chatId].push({
        from: "bot",
        text: botReply,
        chatId: parsed.chatId,
        number: session.history[parsed.chatId].length,
        timestamp: new Date().toISOString(),
      });

      const db = await getDatabase("chatbot");
      const collection = db.collection<chatbotCollection>("chatbotCollection");
      const collectionUser = db.collection<UsersCollection>("users");
      const chats = await collectionUser
        .findOne({
          _id: new ObjectId(userId) as unknown as string,
        })
        .then((doc) => doc?.chats || []);
      if (!chats.some((chat) => Object.keys(chat)[0] === title))
        await collectionUser.updateOne(
          { _id: new ObjectId(userId) as unknown as string },
          {
            $set: {
              chats: [
                ...chats,
                {
                  title,
                  id: parsed.chatId,
                  timestamp: new Date().toISOString(),
                },
              ],
            },
          },
          { upsert: true }
        );
      let history: Message[] = [];
      let arrHistory = Object.values(session.history);
      arrHistory.forEach((chats) => {
        history = history.concat(chats);
      });
      await collection.updateOne(
        { _id: new ObjectId(userId) },
        { $set: { history } },
        { upsert: true }
      );
    }
  });

  ws.on("close", () => {
    console.log(`Usuario ${userId} desconectado`);
  });
});

export default server;
