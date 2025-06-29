import { Response } from 'express';

interface SuccessResponse<T> {
    success: boolean;
    message: string;
    data?: T;
}

interface ErrorResponse {
    success: boolean;
    message: string;
    error?: any;
    code?: string;
}

export class ResponseHandler {
    static success<T>(res: Response, data: T, message: string = 'Success', statusCode: number = 200) {
        const response: SuccessResponse<T> = {
            success: true,
            message,
            data
        };
        return res.status(statusCode).json(response);
    }

    static error(res: Response, error: any, statusCode: number = 500) {
        const response: ErrorResponse = {
            success: false,
            message: error.message || 'An error occurred',
            error: process.env.NODE_ENV === 'development' ? error : undefined,
            code: error.code
        };
        return res.status(statusCode).json(response);
    }

    static validationError(res: Response, errors: any[], message: string = 'Validation failed') {
        const response: ErrorResponse = {
            success: false,
            message,
            error: errors
        };
        return res.status(400).json(response);
    }
}