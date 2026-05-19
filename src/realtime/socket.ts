import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import env from "../config/env.ts";
import { verifyAccessToken } from "../utils/tokens.ts";
import { logger } from "../utils/logger.ts";

let io: Server | null = null;

export const initSocket = (httpServer: HttpServer): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: env.corsOrigins.length > 0 ? env.corsOrigins : true,
      credentials: true,
    },
    maxHttpBufferSize: 1e6,
  });

  // JWT handshake (see AUTH-FLOW.md / REALTIME.md).
  io.use((socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) return next(new Error("unauthorized"));
      const user = verifyAccessToken(token);
      (socket.data as { userId: string }).userId = user.id;
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const userId = (socket.data as { userId: string }).userId;
    socket.join(`user:${userId}`);

    socket.on("leaderboard:subscribe", (board: string) => {
      if (["global", "weekly", "monthly"].includes(board))
        socket.join(`lb:${board}`);
    });

    socket.on("disconnect", () =>
      logger.debug("socket disconnect", { userId })
    );
  });

  logger.info("Socket.IO initialized");
  return io;
};

/** Engines never touch `io` directly — they go through these helpers. */
export const emitToUser = (
  userId: string,
  event: string,
  payload: unknown
): void => {
  io?.to(`user:${userId}`).emit(event, payload);
};

export const emitLeaderboard = (board: string, payload: unknown): void => {
  io?.to(`lb:${board}`).emit("leaderboard:update", payload);
};
