"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_1 = require("socket.io");
const http_1 = require("http");
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const database_1 = require("./utils/database");
const Document_1 = require("./models/Document");
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables from .env file
dotenv_1.default.config();
const PORT = process.env.PORT || 3001;
const DEFAULT_VALUE = "";
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
    },
});
const activeUsers = {};
io.on("connection", (socket) => {
    socket.on("get-document", (documentId) => __awaiter(void 0, void 0, void 0, function* () {
        const document = (yield findOrCreateDocument(documentId));
        socket.join(documentId);
        socket.emit("load-document", document.data);
        socket.on("send-changes", (delta) => {
            socket.broadcast.to(documentId).emit("receive-changes", delta);
        });
        socket.on("save-document", (data) => __awaiter(void 0, void 0, void 0, function* () {
            yield Document_1.Document.findByIdAndUpdate(documentId, { data });
        }));
        socket.on("join-document", ({ documentId, userName }) => {
            if (!activeUsers[documentId])
                activeUsers[documentId] = new Set();
            // Store the user in the active users set
            activeUsers[documentId].add(`${socket.id}:${userName}`);
            // Broadcast the updated list of active users
            io.to(documentId).emit("update-active-users", Array.from(activeUsers[documentId]).map((user) => user.split(":")[1]));
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
                io.to(docId).emit("update-active-users", Array.from(users).map((user) => user.split(":")[1]));
            }
        });
        socket.on("send-cursor", (data) => {
            const { userId, cursorPosition } = data;
            socket.broadcast.to(documentId).emit("receive-cursor", {
                userId,
                cursorPosition,
            });
        });
    }));
});
const findOrCreateDocument = (id) => __awaiter(void 0, void 0, void 0, function* () {
    if (!id)
        return null;
    let document = yield Document_1.Document.findById(id);
    if (!document) {
        document = yield Document_1.Document.create({ _id: id, data: DEFAULT_VALUE });
    }
    return document;
});
const startServer = () => __awaiter(void 0, void 0, void 0, function* () {
    yield (0, database_1.connectDatabase)();
    httpServer.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
});
startServer();
