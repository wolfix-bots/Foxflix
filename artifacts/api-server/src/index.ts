import http from "http";
import { Server as SocketServer } from "socket.io";
import app from "./app.js";
import { logger } from "./lib/logger.js";
import { setIo, restoreTimers, startScheduleChecker } from "./lib/roomTimer.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const httpServer = http.createServer(app);

const io = new SocketServer(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  path: "/api/socket.io",
});

setIo(io);

io.on("connection", (socket) => {
  const roomId = socket.handshake.query.roomId;
  if (roomId) {
    socket.join(`room:${roomId}`);
    socket.on("disconnect", () => {
      socket.leave(`room:${roomId}`);
    });
  }
});

httpServer.listen(port, () => {
  logger.info({ port }, "Server listening");
  restoreTimers();
  startScheduleChecker();
});
