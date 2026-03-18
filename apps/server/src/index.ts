import { auth } from "@PoCity/auth";
import { env } from "@PoCity/env/server";
import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express from "express";
import { createServer } from "http";
import { Server, type Socket } from "socket.io";

const app = express();
app.use(express.json());
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {origin: "http://localhost:3000", methods: ["GET", "POST"]}
});

interface Player{
    id: string;
    x: number;
    y: number;
    name: string;
}

const players: Record<string, Player> = {};

io.on("connection", (socket: Socket) => {
  console.log("Player connected:", socket.id);

  // new player joins
  socket.on("player:join", (data: { name: string; x: number; y: number }) => {
    const player: Player = { id: socket.id, ...data };
    players[socket.id] = player;
    // send existing players to new player
    socket.emit("players:init", Object.values(players));
    // tell everyone else about new player
    socket.broadcast.emit("player:joined", player);
  });

  // player moves
  socket.on("player:move", (data: { x: number; y: number }) => {
    const player = players[socket.id];
    if (!player) return;

    player.x = data.x;
    player.y = data.y;
    socket.broadcast.emit("player:moved", { id: socket.id, ...data });
  });

  // player leaves
  socket.on("disconnect", () => {
    delete players[socket.id];
    io.emit("player:left", socket.id);
  });
});

httpServer.listen(3001, () => console.log("Socket server on port 3001"));

/////////////////
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.all("/api/auth{/*path}", toNodeHandler(auth));




