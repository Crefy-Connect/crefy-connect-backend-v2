import winston from 'winston';
import { logger_config } from '../config/index.js';
import DailyRotateFile from 'winston-daily-rotate-file';

// Define custom log levels and colors
const logLevels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
    verbose: 5
};

const logColors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue',
    verbose: 'cyan'
};

winston.addColors(logColors);

// Create the logger instance
const logger = winston.createLogger({
    levels: logLevels,
    level: logger_config.level,
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
    ),
    defaultMeta: { service: 'crefy-connect' },
    transports: []
});

// Console transport (always enabled)
logger.add(new winston.transports.Console({
    level: logger_config.console.level,
    format: winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.printf(
            (info) => `${info.timestamp} ${info.level}: ${info.message} ${info.stack || ''}`
        )
    ),
    handleExceptions: logger_config.console.handleExceptions
}));

// File transport (only in production or when explicitly configured)
if (logger_config.file || process.env.NODE_ENV === 'production') {
    const fileTransport = new DailyRotateFile({
        filename: logger_config.file || 'logs/application-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        level: logger_config.level,
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
        )
    });

    logger.add(fileTransport);

    // Error-specific file transport
    const errorFileTransport = new DailyRotateFile({
        filename: 'logs/error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '30d',
        level: 'error',
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
        )
    });

    logger.add(errorFileTransport);
}

// Handle uncaught exceptions
if (process.env.NODE_ENV === 'production') {
    const exceptionFileTransport = new DailyRotateFile({
        filename: 'logs/exceptions-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '30d'
    });

    logger.exceptions.handle(exceptionFileTransport);
}

// Stream for morgan HTTP logging
export const httpLogStream = {
    write: (message: string) => {
        logger.http(message.trim());
    }
};

export default logger;