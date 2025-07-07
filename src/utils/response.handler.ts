import type { Response } from "express"

interface ApiResponse<T = any> {
    success: boolean
    message: string
    data?: T
    error?: any
    code?: string
    timestamp?: string
    path?: string
}

interface PaginatedResponse<T> extends ApiResponse<T> {
    pagination?: {
        page: number
        limit: number
        total: number
        totalPages: number
    }
}

export class ResponseHandler {
    /**
     * Send success response
     */
    static success<T>(res: Response, data?: T, message = "Operation successful", statusCode = 200): Response {
        const response: ApiResponse<T> = {
            success: true,
            message,
            data,
            timestamp: new Date().toISOString(),
        }

        return res.status(statusCode).json(response)
    }

    /**
     * Send created response
     */
    static created<T>(res: Response, data?: T, message = "Resource created successfully"): Response {
        return this.success(res, data, message, 201)
    }

    /**
     * Send error response
     */
    static error(res: Response, error: any, statusCode = 500, message?: string): Response {
        const response: ApiResponse = {
            success: false,
            message: message || error.message || "An error occurred",
            timestamp: new Date().toISOString(),
        }

        // Include error details in development
        if (process.env.NODE_ENV === "development") {
            response.error = {
                message: error.message,
                stack: error.stack,
                code: error.code,
            }
        }

        return res.status(statusCode).json(response)
    }

    /**
     * Send validation error response
     */
    static validationError(res: Response, errors: any[], message = "Validation failed"): Response {
        const response: ApiResponse = {
            success: false,
            message,
            error: errors,
            timestamp: new Date().toISOString(),
        }

        return res.status(400).json(response)
    }

    /**
     * Send not found response
     */
    static notFound(res: Response, message = "Resource not found"): Response {
        const response: ApiResponse = {
            success: false,
            message,
            timestamp: new Date().toISOString(),
        }

        return res.status(404).json(response)
    }

    /**
     * Send unauthorized response
     */
    static unauthorized(res: Response, message = "Unauthorized access"): Response {
        const response: ApiResponse = {
            success: false,
            message,
            timestamp: new Date().toISOString(),
        }

        return res.status(401).json(response)
    }

    /**
     * Send forbidden response
     */
    static forbidden(res: Response, message = "Access forbidden"): Response {
        const response: ApiResponse = {
            success: false,
            message,
            timestamp: new Date().toISOString(),
        }

        return res.status(403).json(response)
    }

    /**
     * Send conflict response
     */
    static conflict(res: Response, message = "Resource conflict"): Response {
        const response: ApiResponse = {
            success: false,
            message,
            timestamp: new Date().toISOString(),
        }

        return res.status(409).json(response)
    }

    /**
     * Send paginated response
     */
    static paginated<T>(
        res: Response,
        data: T[],
        pagination: {
            page: number
            limit: number
            total: number
        },
        message = "Data retrieved successfully",
    ): Response {
        const response: PaginatedResponse<T[]> = {
            success: true,
            message,
            data,
            pagination: {
                ...pagination,
                totalPages: Math.ceil(pagination.total / pagination.limit),
            },
            timestamp: new Date().toISOString(),
        }

        return res.status(200).json(response)
    }

    /**
     * Send custom response
     */
    static custom<T>(
        res: Response,
        statusCode: number,
        success: boolean,
        message: string,
        data?: T,
        additionalFields?: Record<string, any>,
    ): Response {
        const response: ApiResponse<T> = {
            success,
            message,
            data,
            timestamp: new Date().toISOString(),
            ...additionalFields,
        }

        return res.status(statusCode).json(response)
    }
}
