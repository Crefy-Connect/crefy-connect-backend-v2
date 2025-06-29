import { createClient, RedisClientType, RedisClientOptions } from 'redis';
import { redis_config } from '../config/index.js';
import logger from '../utils/logger.js';

let redisClient: RedisClientType;

export async function initializeRedis() {
    // Create proper socket options based on TLS requirement
    const socketOptions: RedisClientOptions['socket'] = redis_config.tls
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
    }) as RedisClientType;

    redisClient.on('error', (err: Error) => logger.error('Redis Client Error:', err));
    redisClient.on('connect', () => logger.info('Connected to Redis'));

    await redisClient.connect();
}

export function getRedisClient(): RedisClientType {
    if (!redisClient) {
        throw new Error('Redis client not initialized');
    }
    return redisClient;
}