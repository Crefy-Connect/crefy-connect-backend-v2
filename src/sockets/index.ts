import { Server } from 'socket.io';
import logger from '../utils/logger.js';

export function setupSocketIO(io: Server) {
    io.on('connection', (socket) => {
        logger.info(`New socket connection: ${socket.id}`);

        socket.on('disconnect', () => {
            logger.info(`Socket disconnected: ${socket.id}`);
        });
    });

    logger.info("Socket.IO server initialized");
}