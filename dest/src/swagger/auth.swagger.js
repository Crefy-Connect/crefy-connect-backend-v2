/**
 * Swagger documentation for Authentication endpoints
 */
export const authSwagger = {
    openapi: "3.0.0",
    info: {
        title: "Authentication API",
        version: "1.0.0",
        description: "API documentation for wallet authentication and management endpoints"
    },
    servers: [
        {
            url: "https://api.example.com/v1",
            description: "Production server"
        }
    ],
    tags: [
        {
            name: "Authentication",
            description: "Wallet authentication and management endpoints",
        },
    ],
    components: {
        schemas: {
            // Base Response Schemas
            ApiResponse: {
                type: "object",
                properties: {
                    success: {
                        type: "boolean",
                        description: "Indicates if the request was successful"
                    },
                    message: {
                        type: "string",
                        description: "Response message"
                    },
                    timestamp: {
                        type: "string",
                        format: "date-time",
                        example: "2024-01-15T10:30:00.000Z"
                    }
                }
            },
            ErrorResponse: {
                type: "object",
                properties: {
                    success: {
                        type: "boolean",
                        example: false
                    },
                    message: {
                        type: "string",
                        description: "Error message"
                    },
                    timestamp: {
                        type: "string",
                        format: "date-time",
                        example: "2024-01-15T10:30:00.000Z"
                    }
                }
            },
            // Wallet Data Schemas
            WalletInfo: {
                type: "object",
                properties: {
                    walletAddress: {
                        type: "string",
                        pattern: "^0x[a-fA-F0-9]{40}$",
                        example: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
                        description: "Ethereum wallet address",
                    },
                    publicKey: {
                        type: "string",
                        example: "0x04a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd5b8dec5235a0fa8722476c7709c02559e3aa73aa03918ba2d492eea75abea235",
                        description: "Wallet public key",
                    },
                    email: {
                        type: "string",
                        format: "email",
                        example: "user@example.com",
                        description: "User email address"
                    },
                    socialType: {
                        type: "string",
                        enum: ["google", "facebook", "twitter", "sms", "github"],
                        example: "google",
                        description: "Authentication method used",
                    },
                    userData: {
                        type: "object",
                        nullable: true,
                        description: "Parsed user data from social login",
                        example: {
                            name: "John Doe",
                            picture: "https://example.com/avatar.jpg"
                        }
                    },
                    isActive: {
                        type: "boolean",
                        example: true,
                        description: "Whether the wallet is active and verified",
                    },
                    appId: {
                        type: "string",
                        example: "app_123456789",
                        description: "Application ID the wallet belongs to"
                    },
                    ensSubname: {
                        type: "string",
                        nullable: true,
                        example: "alice.example.eth",
                        description: "ENS subname assigned to the wallet"
                    }
                }
            },
            WalletListResponse: {
                type: "object",
                properties: {
                    wallets: {
                        type: "array",
                        items: { $ref: "#/components/schemas/WalletInfo" }
                    },
                    pagination: {
                        type: "object",
                        properties: {
                            page: {
                                type: "integer",
                                example: 1,
                                description: "Current page number"
                            },
                            limit: {
                                type: "integer",
                                example: 10,
                                description: "Number of items per page"
                            },
                            total: {
                                type: "integer",
                                example: 100,
                                description: "Total number of items"
                            },
                            pages: {
                                type: "integer",
                                example: 10,
                                description: "Total number of pages"
                            }
                        }
                    }
                }
            },
            TokenValidationResponse: {
                type: "object",
                properties: {
                    isValid: {
                        type: "boolean",
                        description: "Whether the token is valid"
                    },
                    walletAddress: {
                        type: "string",
                        pattern: "^0x[a-fA-F0-9]{40}$",
                        example: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
                        description: "Wallet address from the token"
                    },
                    isActive: {
                        type: "boolean",
                        example: true,
                        description: "Whether the wallet is active"
                    }
                }
            }
        },
        securitySchemes: {
            ApiKeyAuth: {
                type: "apiKey",
                in: "header",
                name: "x-api-key",
                description: "Application API key for authentication"
            },
            BearerAuth: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT",
                description: "JWT token obtained after successful wallet verification"
            }
        }
    },
    paths: {
        "/auth/validate-token": {
            get: {
                summary: "Validate JWT token",
                description: `
                    Validates the JWT token and returns basic wallet status.
                    This endpoint checks if the token is valid and if the associated wallet is active.
                `,
                tags: ["Authentication"],
                security: [{ BearerAuth: [] }],
                responses: {
                    "200": {
                        description: "Token validation successful",
                        content: {
                            "application/json": {
                                schema: {
                                    allOf: [
                                        { $ref: "#/components/schemas/ApiResponse" },
                                        {
                                            type: "object",
                                            properties: {
                                                data: { $ref: "#/components/schemas/TokenValidationResponse" }
                                            }
                                        }
                                    ]
                                },
                                examples: {
                                    validToken: {
                                        summary: "Valid token",
                                        value: {
                                            success: true,
                                            message: "Token is valid",
                                            data: {
                                                isValid: true,
                                                walletAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
                                                isActive: true
                                            },
                                            timestamp: "2024-01-15T10:30:00.000Z"
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "401": {
                        description: "Invalid or missing token",
                        content: {
                            "application/json": {
                                schema: {
                                    allOf: [
                                        { $ref: "#/components/schemas/ErrorResponse" },
                                        {
                                            type: "object",
                                            properties: {
                                                data: {
                                                    type: "object",
                                                    properties: {
                                                        isValid: { type: "boolean", example: false }
                                                    }
                                                }
                                            }
                                        }
                                    ]
                                },
                                examples: {
                                    invalidToken: {
                                        summary: "Invalid token",
                                        value: {
                                            success: false,
                                            message: "Invalid token",
                                            data: { isValid: false },
                                            timestamp: "2024-01-15T10:30:00.000Z"
                                        }
                                    },
                                    missingToken: {
                                        summary: "Missing token",
                                        value: {
                                            success: false,
                                            message: "Authorization token required",
                                            data: { isValid: false },
                                            timestamp: "2024-01-15T10:30:00.000Z"
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "404": {
                        description: "Wallet not found",
                        content: {
                            "application/json": {
                                schema: {
                                    allOf: [
                                        { $ref: "#/components/schemas/ErrorResponse" },
                                        {
                                            type: "object",
                                            properties: {
                                                data: {
                                                    type: "object",
                                                    properties: {
                                                        isValid: { type: "boolean", example: false }
                                                    }
                                                }
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                    },
                    "500": {
                        description: "Internal server error",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" }
                            }
                        }
                    }
                }
            }
        },
        "/auth/wallet-by-token": {
            get: {
                summary: "Get wallet info by token",
                description: `
                    Retrieves complete wallet information using the JWT token from Authorization header.
                    This endpoint extracts the wallet address from the token and returns the full wallet details.
                `,
                tags: ["Authentication"],
                security: [{ BearerAuth: [] }],
                responses: {
                    "200": {
                        description: "Wallet info retrieved successfully",
                        content: {
                            "application/json": {
                                schema: {
                                    allOf: [
                                        { $ref: "#/components/schemas/ApiResponse" },
                                        {
                                            type: "object",
                                            properties: {
                                                data: { $ref: "#/components/schemas/WalletInfo" }
                                            }
                                        }
                                    ]
                                },
                                examples: {
                                    success: {
                                        summary: "Wallet info retrieved",
                                        value: {
                                            success: true,
                                            message: "Wallet info retrieved successfully",
                                            data: {
                                                walletAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
                                                publicKey: "0x04a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd",
                                                email: "user@example.com",
                                                socialType: "google",
                                                userData: {
                                                    name: "John Doe",
                                                    picture: "https://example.com/avatar.jpg"
                                                },
                                                isActive: true,
                                                appId: "app_123456789",
                                                ensSubname: "alice.example.eth"
                                            },
                                            timestamp: "2024-01-15T10:30:00.000Z"
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "401": {
                        description: "Authentication failed",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                                examples: {
                                    missingToken: {
                                        summary: "Missing token",
                                        value: {
                                            success: false,
                                            message: "Authorization token required",
                                            timestamp: "2024-01-15T10:30:00.000Z"
                                        }
                                    },
                                    invalidToken: {
                                        summary: "Invalid token",
                                        value: {
                                            success: false,
                                            message: "Invalid token payload",
                                            timestamp: "2024-01-15T10:30:00.000Z"
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "404": {
                        description: "Wallet not found",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                                examples: {
                                    notFound: {
                                        summary: "Wallet not found",
                                        value: {
                                            success: false,
                                            message: "Wallet not found or inactive",
                                            timestamp: "2024-01-15T10:30:00.000Z"
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "500": {
                        description: "Internal server error",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" }
                            }
                        }
                    }
                }
            }
        },
        "/auth/wallet-info": {
            get: {
                summary: "Get current authenticated wallet info",
                description: `
                    Retrieves wallet information for the currently authenticated user.
                    Requires wallet authentication middleware (JWT token validated and wallet attached to request).
                `,
                tags: ["Authentication"],
                security: [{ BearerAuth: [] }],
                responses: {
                    "200": {
                        description: "Wallet info retrieved successfully",
                        content: {
                            "application/json": {
                                schema: {
                                    allOf: [
                                        { $ref: "#/components/schemas/ApiResponse" },
                                        {
                                            type: "object",
                                            properties: {
                                                data: { $ref: "#/components/schemas/WalletInfo" }
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                    },
                    "401": {
                        description: "Wallet not authenticated",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                                examples: {
                                    notAuthenticated: {
                                        summary: "Not authenticated",
                                        value: {
                                            success: false,
                                            message: "Wallet not authenticated",
                                            timestamp: "2024-01-15T10:30:00.000Z"
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "500": {
                        description: "Internal server error",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" }
                            }
                        }
                    }
                }
            }
        },
        "/auth/logout": {
            post: {
                summary: "Logout user",
                description: `
                    Logout endpoint for client-side token invalidation.
                    Note: Since JWT is stateless, actual token invalidation requires client-side token disposal.
                    Consider implementing a token blacklist for immediate server-side invalidation.
                `,
                tags: ["Authentication"],
                security: [{ BearerAuth: [] }],
                responses: {
                    "200": {
                        description: "Logout successful",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ApiResponse" },
                                examples: {
                                    success: {
                                        summary: "Logout successful",
                                        value: {
                                            success: true,
                                            message: "Logout successful. Please discard your token client-side.",
                                            timestamp: "2024-01-15T10:30:00.000Z"
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "500": {
                        description: "Internal server error",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" }
                            }
                        }
                    }
                }
            }
        },
        "/auth/app/wallets": {
            get: {
                summary: "Get wallets by application (Developer only)",
                description: `
                    Retrieves paginated list of wallets for the authenticated developer's application.
                    Requires API key authentication and developer permissions.
                `,
                tags: ["Authentication"],
                security: [{ ApiKeyAuth: [] }],
                parameters: [
                    {
                        name: "page",
                        in: "query",
                        description: "Page number for pagination",
                        required: false,
                        schema: {
                            type: "integer",
                            minimum: 1,
                            default: 1
                        }
                    },
                    {
                        name: "limit",
                        in: "query",
                        description: "Number of items per page",
                        required: false,
                        schema: {
                            type: "integer",
                            minimum: 1,
                            maximum: 100,
                            default: 10
                        }
                    }
                ],
                responses: {
                    "200": {
                        description: "Wallets retrieved successfully",
                        content: {
                            "application/json": {
                                schema: {
                                    allOf: [
                                        { $ref: "#/components/schemas/ApiResponse" },
                                        {
                                            type: "object",
                                            properties: {
                                                data: { $ref: "#/components/schemas/WalletListResponse" }
                                            }
                                        }
                                    ]
                                },
                                examples: {
                                    success: {
                                        summary: "Wallets retrieved",
                                        value: {
                                            success: true,
                                            message: "Wallets retrieved successfully",
                                            data: {
                                                wallets: [
                                                    {
                                                        walletAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
                                                        publicKey: "0x04a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd",
                                                        email: "user1@example.com",
                                                        socialType: "google",
                                                        userData: { name: "John Doe" },
                                                        isActive: true,
                                                        appId: "app_123456789",
                                                        ensSubname: "john.example.eth"
                                                    }
                                                ],
                                                pagination: {
                                                    page: 1,
                                                    limit: 10,
                                                    total: 50,
                                                    pages: 5
                                                }
                                            },
                                            timestamp: "2024-01-15T10:30:00.000Z"
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "401": {
                        description: "App authentication required",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" }
                            }
                        }
                    },
                    "500": {
                        description: "Internal server error",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" }
                            }
                        }
                    }
                }
            }
        }
    }
};
