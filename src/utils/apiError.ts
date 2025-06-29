import logger from "./logger.js";

export class ApiError extends Error {
    constructor(
        public statusCode: number,
        message: string,
        public errors: any[] = []
    ) {
        super(message);
        logger.error(`ApiError: ${message}`);
        Object.setPrototypeOf(this, ApiError.prototype);
    }
}