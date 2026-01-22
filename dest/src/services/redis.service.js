import { createClient } from 'redis';
import { redis_config } from '../config/index.js';
import logger from '../utils/logger.js';
let redisClient;
export async function initializeRedis() {
    // Create proper socket options based on TLS requirement
    const socketOptions = redis_config.tls
        ? {
            host: redis_config.host,
            port: redis_config.port,
            tls: true,
        }
        : {
            host: redis_config.host,
            port: redis_config.port
            // No tls property at all when not using TLS
        };
    redisClient = createClient({
        socket: socketOptions,
        password: redis_config.password,
        database: redis_config.db
    });
    redisClient.on('error', (err) => logger.error('Redis Client Error:', err));
    redisClient.on('connect', () => logger.info('Connected to Redis'));
    await redisClient.connect();
}
export function getRedisClient() {
    if (!redisClient) {
        throw new Error('Redis client not initialized');
    }
    return redisClient;
}
