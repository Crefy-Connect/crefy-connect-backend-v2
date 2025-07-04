import dotenv from 'dotenv';
import winston, { LoggerOptions } from 'winston';

dotenv.config();

// Configuration interfaces
interface MongoDBConfig {
    port: number;
    mongoUri: string;
    jwtSecret: string;
    jwtExpiration: string;
    jwtRefreshExpiration: string;
    poolSize?: number;
    retryWrites?: boolean;
    w?: 'majority' | number;
}

interface SMTPConfig {
    host: string;
    port: number;
    secure: boolean;
    auth: {
        user: string;
        pass: string;
    };
    from?: string;
}

interface RedisConfig {
    host: string;
    port: number;
    password: string;
    tls?: boolean;
    db?: number;
}

interface Web3Config {
    rpcUrls: {
        [chainId: number]: string;
    };
    defaultChainId: number;
    infuraId?: string;
    alchemyId?: string;
}

interface ServerConfig {
    port: number;
    corsOrigins: string[];
    environment: 'development' | 'production' | 'test';
    baseUrl: string;
    trustProxy: boolean;
}

interface LoggerConfig {
    level: string;
    file?: string;
    console: LoggerOptions;
}

interface JWTConfig {
    secret: string;
    expiresIn: string;
}

// Configuration values
export const mongodb_config: MongoDBConfig = {
    port: parseInt(process.env.MONGODB_PORT || '3000'),
    mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/crefy-crefy-connect',
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
    jwtExpiration: process.env.JWT_EXPIRATION || '1h',
    jwtRefreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
    poolSize: parseInt(process.env.MONGODB_POOL_SIZE || '10'),
    retryWrites: process.env.MONGODB_RETRY_WRITES === 'true',
    w: process.env.MONGODB_WRITE_CONCERN === 'majority' ? 'majority' : 1
};

export const smtp_config: SMTPConfig = {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER || 'your-email@gmail.com',
        pass: process.env.SMTP_PASS || 'your-password',
    },
    from: process.env.EMAIL_FROM || '"Crefy Connect" <no-reply@crefy.com>'
};

export const redis_config: RedisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || '',
    tls: process.env.REDIS_TLS === 'true',
    db: parseInt(process.env.REDIS_DB || '0'),

};

export const web3_config: Web3Config = {
    rpcUrls: {
        1: process.env.ETHEREUM_RPC || 'https://mainnet.infura.io/v3/YOUR-INFURA-ID',
        5: process.env.GOERLI_RPC || 'https://goerli.infura.io/v3/YOUR-INFURA-ID',
        137: process.env.POLYGON_RPC || 'https://polygon-rpc.com',
        56: process.env.BSC_RPC || 'https://bsc-dataseed.binance.org/',
    },
    defaultChainId: parseInt(process.env.DEFAULT_CHAIN_ID || '1'),
    infuraId: process.env.INFURA_ID,
    alchemyId: process.env.ALCHEMY_ID
};

export const server_config: ServerConfig = {
    port: parseInt(process.env.PORT || '3000'),
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://127.0.0.1:3000'],
    environment: process.env.NODE_ENV as 'development' | 'production' | 'test' || 'development',
    baseUrl: process.env.BASE_URL || 'http://127.0.0.1:3000',
    trustProxy: process.env.TRUST_PROXY === 'true'
};

export const logger_config: LoggerConfig = {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE,
    console: {
        level: process.env.LOG_CONSOLE_LEVEL || 'info',
        handleExceptions: true,
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }
};

export const jwt_config: JWTConfig = {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRATION || '1d'
};

// Configuration validation function
export function validateConfig() {
    const requiredEnvVars = [
        'MONGO_URI',
        'JWT_SECRET',
        'SMTP_USER',
        'SMTP_PASS'
    ];

    if (process.env.NODE_ENV === 'production') {
        requiredEnvVars.push('INFURA_ID', 'ALCHEMY_ID');
    }

    const missingVars = requiredEnvVars.filter(v => !process.env[v]);
    if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
}

export const elementpay_config = {
    apiKey: process.env.ELEMENTPAY_API_KEY,
    baseUrl: process.env.ELEMENTPAY_BASE_URL,
    rpcUrl: process.env.BASE_RPC_URL,
};

export const twilio_config = {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
};

// Validate configuration on startup
validateConfig();