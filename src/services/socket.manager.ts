// socket.manager.ts - Enhanced version
import { Server, Socket } from 'socket.io';
import logger from '../utils/logger.js';

interface SocketAuthSession {
    socketId: string;
    createdAt: Date;
    lastActivity: Date;
    metadata?: any;
}

class SocketManager {
    private static _instance: SocketManager;
    private io: Server | null = null;
    private socketSessions: Map<string, SocketAuthSession> = new Map(); // sessionId -> socket session data

    private constructor() { }

    public static getInstance(): SocketManager {
        if (!SocketManager._instance) {
            SocketManager._instance = new SocketManager();
        }
        return SocketManager._instance;
    }

    public initialize(io: Server): void {
        this.io = io;
        this.setupConnectionHandlers();
        logger.info('SocketManager initialized');
    }

    private setupConnectionHandlers(): void {
        if (!this.io) throw new Error('Socket.IO server not initialized');

        this.io.on('connection', (socket) => {
            logger.info(`New client connected: ${socket.id}`);

            // Client sends their session ID after connecting
            socket.on('register-session', (sessionId: string, metadata?: any) => {
                this.socketSessions.set(sessionId, {
                    socketId: socket.id,
                    createdAt: new Date(),
                    lastActivity: new Date(),
                    metadata
                });
                logger.info(`Registered session ${sessionId} with socket ${socket.id}`);
            });

            // Client can check if session is still active
            socket.on('check-session', (sessionId: string, callback: (exists: boolean) => void) => {
                const exists = this.socketSessions.has(sessionId);
                callback(exists);
            });

            socket.on('disconnect', () => {
                // Clean up session mappings
                this.socketSessions.forEach((value, key) => {
                    if (value.socketId === socket.id) {
                        this.socketSessions.delete(key);
                        logger.info(`Removed session ${key} due to disconnect`);
                    }
                });
                logger.info(`Client disconnected: ${socket.id}`);
            });
        });

        // Clean up stale sessions periodically
        setInterval(() => this.cleanupStaleSessions(), 5 * 60 * 1000); // Every 5 minutes
    }

    private cleanupStaleSessions(): void {
        const now = new Date();
        const staleTime = 30 * 60 * 1000; // 30 minutes

        this.socketSessions.forEach((session, sessionId) => {
            if (now.getTime() - session.lastActivity.getTime() > staleTime) {
                this.socketSessions.delete(sessionId);
                logger.info(`Cleaned up stale session: ${sessionId}`);
            }
        });
    }

    // Method to emit events to specific sessions
    public emitToSession(sessionId: string, event: string, data: any): boolean {
        if (!this.io) return false;

        const session = this.socketSessions.get(sessionId);
        if (!session) return false;

        // Update last activity
        session.lastActivity = new Date();
        this.socketSessions.set(sessionId, session);

        this.io.to(session.socketId).emit(event, data);
        logger.debug(`Emitted ${event} to session ${sessionId}`);
        return true;
    }

    // Check if a session exists
    public hasSession(sessionId: string): boolean {
        return this.socketSessions.has(sessionId);
    }

    // Get session information
    public getSession(sessionId: string): SocketAuthSession | undefined {
        return this.socketSessions.get(sessionId);
    }
}

export default SocketManager;