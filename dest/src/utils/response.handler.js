export class ResponseHandler {
    /**
     * Send success response
     */
    static success(res, data, message = "Operation successful", statusCode = 200) {
        const response = {
            success: true,
            message,
            data,
            timestamp: new Date().toISOString(),
        };
        return res.status(statusCode).json(response);
    }
    /**
     * Send created response
     */
    static created(res, data, message = "Resource created successfully") {
        return this.success(res, data, message, 201);
    }
    /**
     * Send error response
     */
    static error(res, error, statusCode = 500, message) {
        const response = {
            success: false,
            message: message || error.message || "An error occurred",
            timestamp: new Date().toISOString(),
        };
        // Include error details in development
        if (process.env.NODE_ENV === "development") {
            response.error = {
                message: error.message,
                stack: error.stack,
                code: error.code,
            };
        }
        return res.status(statusCode).json(response);
    }
    /**
     * Send validation error response
     */
    static validationError(res, errors, message = "Validation failed") {
        const response = {
            success: false,
            message,
            error: errors,
            timestamp: new Date().toISOString(),
        };
        return res.status(400).json(response);
    }
    /**
     * Send not found response
     */
    static notFound(res, message = "Resource not found") {
        const response = {
            success: false,
            message,
            timestamp: new Date().toISOString(),
        };
        return res.status(404).json(response);
    }
    /**
     * Send unauthorized response
     */
    static unauthorized(res, message = "Unauthorized access") {
        const response = {
            success: false,
            message,
            timestamp: new Date().toISOString(),
        };
        return res.status(401).json(response);
    }
    /**
     * Send forbidden response
     */
    static forbidden(res, message = "Access forbidden") {
        const response = {
            success: false,
            message,
            timestamp: new Date().toISOString(),
        };
        return res.status(403).json(response);
    }
    /**
     * Send conflict response
     */
    static conflict(res, message = "Resource conflict") {
        const response = {
            success: false,
            message,
            timestamp: new Date().toISOString(),
        };
        return res.status(409).json(response);
    }
    /**
     * Send paginated response
     */
    static paginated(res, data, pagination, message = "Data retrieved successfully") {
        const response = {
            success: true,
            message,
            data,
            pagination: {
                ...pagination,
                totalPages: Math.ceil(pagination.total / pagination.limit),
            },
            timestamp: new Date().toISOString(),
        };
        return res.status(200).json(response);
    }
    /**
     * Send custom response
     */
    static custom(res, statusCode, success, message, data, additionalFields) {
        const response = {
            success,
            message,
            data,
            timestamp: new Date().toISOString(),
            ...additionalFields,
        };
        return res.status(statusCode).json(response);
    }
}
