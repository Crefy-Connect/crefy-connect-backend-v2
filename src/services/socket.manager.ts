// socket.manager.ts - Enhanced with better logging
import { Server, Socket } from "socket.io";
import logger from "../utils/logger.js";

interface SocketAuthSession {
  socketId: string;
  createdAt: Date;
  lastActivity: Date;
  metadata?: any;
}

class SocketManager {
  private static _instance: SocketManager;
  private io: Server | null = null;
  private socketSessions: Map<string, SocketAuthSession> = new Map();

  private constructor() {}

  public static getInstance(): SocketManager {
    if (!SocketManager._instance) {
      SocketManager._instance = new SocketManager();
    }
    return SocketManager._instance;
  }

  public initialize(io: Server): void {
    this.io = io;
    this.setupConnectionHandlers();
    logger.info("SocketManager initialized");
  }

  private setupConnectionHandlers(): void {
    if (!this.io) throw new Error("Socket.IO server not initialized");

    this.io.on("connection", (socket: Socket) => {
      logger.info(`New client connected: ${socket.id}`);

      // Client sends their session ID after connecting
      socket.on("register-session", (sessionId: string, metadata?: any) => {
        // Validate sessionId is a string
        if (typeof sessionId !== "string") {
          console.error("Invalid sessionId type:", typeof sessionId, sessionId);
          return;
        }

        this.socketSessions.set(sessionId, {
          socketId: socket.id,
          createdAt: new Date(),
          lastActivity: new Date(),
          metadata,
        });

        console.log(
          `✅ Registered session ${sessionId} with socket ${socket.id}`
        );
        console.log(`📊 Total active sessions: ${this.socketSessions.size}`);

        // Send confirmation to client
        socket.emit("session-registered", { sessionId, success: true });
      });

      // Client can check if session is still active
      socket.on(
        "check-session",
        (sessionId: string, callback: (exists: boolean) => void) => {
          const exists = this.socketSessions.has(sessionId);
          console.log(
            `Checking session ${sessionId}: ${exists ? "EXISTS" : "NOT FOUND"}`
          );
          callback(exists);
        }
      );

      // Debug endpoint for clients to check their session status
      socket.on("debug-session", (sessionId: string) => {
        const session = this.socketSessions.get(sessionId);
        console.log(`🔍 Debug session ${sessionId}:`, session);
        socket.emit("session-debug", {
          sessionId,
          exists: !!session,
          sessionInfo: session,
          totalSessions: this.socketSessions.size,
        });
      });

      socket.on("disconnect", (reason) => {
        console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);

        // Clean up session mappings
        let removedCount = 0;
        this.socketSessions.forEach((value, key) => {
          if (value.socketId === socket.id) {
            this.socketSessions.delete(key);
            removedCount++;
            console.log(`🗑️ Removed session ${key} due to disconnect`);
          }
        });

        console.log(
          `📊 Removed ${removedCount} sessions, remaining: ${this.socketSessions.size}`
        );
      });
    });

    // Clean up stale sessions periodically
    setInterval(() => this.cleanupStaleSessions(), 5 * 60 * 1000);
  }

  private cleanupStaleSessions(): void {
    const now = new Date();
    const staleTime = 30 * 60 * 1000; // 30 minutes
    let cleanedCount = 0;

    this.socketSessions.forEach((session, sessionId) => {
      if (now.getTime() - session.lastActivity.getTime() > staleTime) {
        this.socketSessions.delete(sessionId);
        cleanedCount++;
        console.log(`🧹 Cleaned up stale session: ${sessionId}`);
      }
    });

    if (cleanedCount > 0) {
      console.log(
        `📊 Cleaned ${cleanedCount} stale sessions, remaining: ${this.socketSessions.size}`
      );
    }
  }

  // Method to emit events to specific sessions
  public emitToSession(sessionId: string, event: string, data: any): boolean {
    if (!this.io) {
      console.error("❌ Socket.IO server not initialized");
      return false;
    }

    const session = this.socketSessions.get(sessionId);

    if (!session) {
      console.error(`❌ Session not found: ${sessionId}`);
      console.log(
        `📊 Available sessions:`,
        Array.from(this.socketSessions.keys())
      );
      return false;
    }

    // Update last activity
    session.lastActivity = new Date();
    this.socketSessions.set(sessionId, session);

    console.log(
      `📡 Emitting ${event} to session ${sessionId} (socket: ${session.socketId})`
    );

    try {
      this.io.to(session.socketId).emit(event, data);
      console.log(`✅ Successfully emitted ${event} to session ${sessionId}`);
      return true;
    } catch (error) {
      console.error(
        `❌ Failed to emit ${event} to session ${sessionId}:`,
        error
      );
      return false;
    }
  }

  // Check if a session exists
  public hasSession(sessionId: string): boolean {
    const exists = this.socketSessions.has(sessionId);
    console.log(`🔍 Session ${sessionId} exists: ${exists}`);
    return exists;
  }

  // Get session information
  public getSession(sessionId: string): SocketAuthSession | undefined {
    return this.socketSessions.get(sessionId);
  }

  public getSessionInfo(sessionId: string): SocketAuthSession | undefined {
    const session = this.socketSessions.get(sessionId);
    console.log(`🔍 Session info for ${sessionId}:`, session);
    return session;
  }

  // Get all active sessions (for debugging)
  public getAllSessions(): Map<string, SocketAuthSession> {
    return new Map(this.socketSessions);
  }
}

export default SocketManager;
