// socket.manager.ts
import { Server, Socket } from 'socket.io';
import logger from '../utils/logger.js';

class SocketManager {
    private static _instance: SocketManager;
    private io: Server | null = null;
    private socketSessions: Map<string, string> = new Map(); // sessionId -> socketId mapping

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
            socket.on('register-session', (sessionId: string) => {
                this.socketSessions.set(sessionId, socket.id);
                logger.info(`Registered session ${sessionId} with socket ${socket.id}`);
            });

            socket.on('disconnect', () => {
                // Clean up session mappings
                this.socketSessions.forEach((value, key) => {
                    if (value === socket.id) {
                        this.socketSessions.delete(key);
                    }
                });
                logger.info(`Client disconnected: ${socket.id}`);
            });
        });
    }

    // Method to emit events to specific sessions
    public emitToSession(sessionId: string, event: string, data: any): boolean {
        if (!this.io) return false;

        const socketId = this.socketSessions.get(sessionId);
        if (!socketId) return false;

        this.io.to(socketId).emit(event, data);
        return true;
    }
}

// Export the class itself, not an instance
export default SocketManager;