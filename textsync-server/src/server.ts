import { Server } from "socket.io";
import { createServer } from "http";
import cors from "cors";
import express from "express";
import { connectDatabase } from "./utils/database";
import { Document } from "./models/Document";
import { CursorUpdate } from "./types/CursorUpdate";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const PORT = process.env.PORT || 3001;
const DEFAULT_VALUE = "";

const app = express();
app.use(cors());
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

const activeUsers: Record<string, Set<string>> = {};

io.on("connection", (socket) => {
  socket.on("get-document", async (documentId: string) => {
    const document = (await findOrCreateDocument(documentId)) as NonNullable<
      Awaited<ReturnType<typeof findOrCreateDocument>>
    >;

    socket.join(documentId);
    socket.emit("load-document", document.data);

    socket.on("send-changes", (delta) => {
      socket.broadcast.to(documentId).emit("receive-changes", delta);
    });

    socket.on("save-document", async (data) => {
      await Document.findByIdAndUpdate(documentId, { data });
    });

    socket.on("join-document", ({ documentId, userName }) => {
      if (!activeUsers[documentId]) activeUsers[documentId] = new Set();
      // Store the user in the active users set
      activeUsers[documentId].add(`${socket.id}:${userName}`);

      // Broadcast the updated list of active users
      io.to(documentId).emit(
        "update-active-users",
        Array.from(activeUsers[documentId]).map((user) => user.split(":")[1])
      );
    });

    socket.on("disconnect", () => {
      // Remove the user from all active user lists
      for (const [docId, users] of Object.entries(activeUsers)) {
        for (const user of users) {
          if (user.startsWith(socket.id)) {
            users.delete(user);
            break;
          }
        }

        // Broadcast the updated list of active users
        io.to(docId).emit(
          "update-active-users",
          Array.from(users).map((user) => user.split(":")[1])
        );
      }
    });

    socket.on("send-cursor", (data: CursorUpdate) => {
      const { userId, cursorPosition } = data;
      socket.broadcast.to(documentId).emit("receive-cursor", {
        userId,
        cursorPosition,
      });
    });
  });
});

const findOrCreateDocument = async (id: string) => {
  if (!id) return null;

  let document = await Document.findById(id);

  if (!document) {
    document = await Document.create({ _id: id, data: DEFAULT_VALUE });
  }

  return document;
};

const startServer = async () => {
  await connectDatabase();
  httpServer.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
};

startServer();