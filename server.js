const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const crypto = require("crypto");

const app = express();
app.use(cors({ origin: "*" }));
app.get("/", (_, res) => res.send("Kazento Poker practice server is online."));
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

const rooms = new Map();
const suits = ["♠", "♥", "♦", "♣"];
const ranks = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];

function deck() {
  return suits.flatMap(s => ranks.map(r => ({ r, s })))
    .sort(() => Math.random() - 0.5);
}
function publicRoom(room) {
  return {
    code: room.code,
    owner: room.owner,
    players: [...room.players.values()].map(p => ({
      id: p.id, name: p.name, stack: p.stack, status: p.status,
      isOwner: p.id === room.owner, isMe: false
    })),
    community: room.community,
    phase: room.phase,
    pot: room.pot,
    message: room.message
  };
}
function broadcast(room) {
  const state = publicRoom(room);
  for (const p of room.players.values()) {
    io.to(p.id).emit("room-state", {
      ...state,
      players: state.players.map(x => ({ ...x, isMe: x.id === p.id })),
      myCards: p.cards || []
    });
  }
}
function code() { return crypto.randomBytes(3).toString("hex").toUpperCase(); }

io.on("connection", socket => {
  socket.on("create-room", ({ name }, cb) => {
    const roomCode = code();
    const player = { id: socket.id, name: String(name || "Owner").slice(0,18), stack: 20000, status: "Waiting", cards: [] };
    const room = { code: roomCode, owner: socket.id, players: new Map([[socket.id, player]]),
      community: [], phase: "Waiting", pot: 0, message: "Waiting for players to join." };
    rooms.set(roomCode, room); socket.join(roomCode);
    cb?.({ ok: true, code: roomCode }); broadcast(room);
  });

  socket.on("join-room", ({ code: roomCode, name }, cb) => {
    const room = rooms.get(String(roomCode || "").toUpperCase());
    if (!room) return cb?.({ ok:false, error:"Room not found." });
    if (room.players.size >= 8) return cb?.({ ok:false, error:"Table is full (8 players)." });
    if (room.phase !== "Waiting") return cb?.({ ok:false, error:"This hand has already started." });
    const player = { id: socket.id, name: String(name || "Player").slice(0,18), stack: 20000, status:"Waiting", cards:[] };
    room.players.set(socket.id, player); socket.join(room.code);
    cb?.({ ok:true }); room.message = `${player.name} joined the table.`; broadcast(room);
  });

  socket.on("start-hand", cb => {
    const room = [...rooms.values()].find(r => r.owner === socket.id);
    if (!room) return cb?.({ ok:false, error:"Only the table owner can start." });
    if (room.players.size < 2) return cb?.({ ok:false, error:"At least 2 players are required." });
    const d = deck();
    for (const p of room.players.values()) { p.cards = [d.pop(), d.pop()]; p.status = "In hand"; }
    room.community = [d.pop(), d.pop(), d.pop(), d.pop(), d.pop()];
    room.phase = "Showdown";
    room.pot = 0;
    room.message = "Practice hand dealt. Private cards are visible only to their owner; reveal happens at showdown.";
    room.deck = d;
    broadcast(room);
    // This starter reveals cards only after owner ends the hand.
    cb?.({ ok:true });
  });

  socket.on("reveal-hand", cb => {
    const room = [...rooms.values()].find(r => r.owner === socket.id);
    if (!room || room.phase !== "Showdown") return cb?.({ ok:false, error:"No hand to reveal." });
    room.phase = "Finished";
    room.message = "Showdown: cards are now revealed to everyone.";
    const revealed = [...room.players.values()].map(p => ({ id:p.id, name:p.name, cards:p.cards }));
    for (const p of room.players.values()) io.to(p.id).emit("revealed-cards", revealed);
    broadcast(room); cb?.({ ok:true });
  });

  socket.on("new-hand", cb => {
    const room = [...rooms.values()].find(r => r.owner === socket.id);
    if (!room) return cb?.({ ok:false, error:"Only the owner can reset the table." });
    room.phase = "Waiting"; room.community = []; room.pot = 0;
    room.message = "New practice round. Waiting for the owner to deal.";
    for (const p of room.players.values()) { p.cards = []; p.status = "Waiting"; }
    broadcast(room); cb?.({ ok:true });
  });

  socket.on("disconnect", () => {
    for (const [key, room] of rooms) {
      if (room.players.has(socket.id)) {
        room.players.delete(socket.id);
        if (room.owner === socket.id) {
          const next = room.players.keys().next().value;
          if (next) room.owner = next;
        }
        if (!room.players.size) rooms.delete(key);
        else { room.message = "A player disconnected."; broadcast(room); }
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server listening on ${PORT}`));