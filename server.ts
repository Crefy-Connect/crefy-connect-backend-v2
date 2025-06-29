import App from './src/app.js';
import { server_config } from './src/config/index.js';
import logger from './src/utils/logger.js';

// Node built-ins
import cluster from 'node:cluster';
import os from 'node:os';
import process from 'node:process';

// Third-party modules
import mongoose from 'mongoose';

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Cluster mode for production
if (cluster.isPrimary && server_config.environment === 'production') {
    const numCPUs = os.cpus().length;
    logger.info(`Primary ${process.pid} is running`);

    // Fork workers
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }
} else {
    const app = new App();
    app.listen();

    // Graceful shutdown
    const shutdown = async (signal: string) => {
        logger.info(`Received ${signal}. Shutting down gracefully...`);

        try {
            // Close HTTP server
            await new Promise<void>((resolve) => {
                app.server?.close(() => {
                    logger.info('HTTP server closed');
                    resolve();
                });
            });

            // Close MongoDB connection
            await mongoose.disconnect();
            logger.info('MongoDB connection closed');

            process.exit(0);
        } catch (error) {
            logger.error('Error during shutdown:', error);
            process.exit(1);
        }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
}