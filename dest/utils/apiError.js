import logger from "./logger.js";
export class ApiError extends Error {
    statusCode;
    errors;
    constructor(statusCode, message, errors = []) {
        super(message);
        this.statusCode = statusCode;
        this.errors = errors;
        logger.error(`ApiError: ${message}`);
        Object.setPrototypeOf(this, ApiError.prototype);
    }
}
