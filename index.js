import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
const httpServer = createServer(app);

app.use(cors());

const io = new Server(httpServer, {
  cors: {
    origin: "https://chess-one-jet.vercel.app", 
    methods: ["GET", "POST"],
  },
});

const roomMap = new Map();
const roomPlayers = new Map();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("room:join", ({ name, roomId }) => {
    const players = roomPlayers.get(roomId) || [];
    if (players.length >= 2) {
      socket.emit("room:full");
      return;
    }

    const color = players.length === 0 ? "white" : "black";
    players.push({ id: socket.id, name, color });
    roomPlayers.set(roomId, players);
    roomMap.set(socket.id, roomId);
    socket.join(roomId);

    console.log(`User ${name} joined room ${roomId} as ${color}`);
    socket.emit("room:joined", { name, roomId, color });
    socket.to(roomId).emit("player:joined", { name, color });
  });

  socket.on("move:made", ({ from, to, board, turn }) => {
    const roomId = roomMap.get(socket.id);
    socket.to(roomId).emit("move:update", { from, to, board, turn });
  });

  socket.on("game:over", ({ winner }) => {
    const roomId = roomMap.get(socket.id);
    socket.to(roomId).emit("game:over", { winner });
  });

  socket.on("disconnect", () => {
    const roomId = roomMap.get(socket.id);
    if (roomId) {
      const players = roomPlayers.get(roomId) || [];
      roomPlayers.set(
        roomId,
        players.filter((p) => p.id !== socket.id)
      );
    }
    console.log("User disconnected:", socket.id);
    roomMap.delete(socket.id);
  });
});

httpServer.listen(3000, () => {
  console.log("Server is running on port 3000");
});
