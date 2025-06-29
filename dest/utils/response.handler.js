export class ResponseHandler {
    static success(res, data, message = 'Success', statusCode = 200) {
        const response = {
            success: true,
            message,
            data
        };
        return res.status(statusCode).json(response);
    }
    static error(res, error, statusCode = 500) {
        const response = {
            success: false,
            message: error.message || 'An error occurred',
            error: process.env.NODE_ENV === 'development' ? error : undefined,
            code: error.code
        };
        return res.status(statusCode).json(response);
    }
    static validationError(res, errors, message = 'Validation failed') {
        const response = {
            success: false,
            message,
            error: errors
        };
        return res.status(400).json(response);
    }
}
