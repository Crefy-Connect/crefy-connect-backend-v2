/**
 * Comprehensive Swagger documentation for ENS management endpoints
 */
export const ensSwagger = {
    tags: [
        {
            name: "ENS",
            description: "Ethereum Name Service (ENS) management endpoints"
        }
    ],
    components: {
        schemas: {
            // Request Schemas
            ENSRegisterRequest: {
                type: "object",
                required: ["ens_name", "chain"],
                properties: {
                    ens_name: {
                        type: "string",
                        example: "myplatform.eth",
                        description: "ENS root name (must end with .eth)"
                    },
                    contractAddress: {
                        type: "string",
                        pattern: "^0x[a-fA-F0-9]{40}$",
                        example: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
                        description: "Optional contract address (defaults to configured address)"
                    },
                    chain: {
                        type: "string",
                        enum: ["ethereum", "sepolia", "goerli"],
                        example: "sepolia",
                        description: "Blockchain network"
                    },
                    isActive: {
                        type: "boolean",
                        example: true,
                        description: "Whether the root should be active (default: true)"
                    }
                },
                additionalProperties: false
            },

            SubnameAvailabilityRequest: {
                type: "object",
                required: ["subName", "chain"],
                properties: {
                    subName: {
                        type: "string",
                        example: "user123",
                        description: "Subname to check availability for"
                    },
                    chain: {
                        type: "string",
                        enum: ["ethereum", "sepolia", "goerli"],
                        example: "sepolia",
                        description: "Blockchain network"
                    }
                },
                additionalProperties: false
            },

            // Response Schemas
            ENSRegisterResponse: {
                type: "object",
                properties: {
                    success: {
                        type: "boolean",
                        example: true
                    },
                    message: {
                        type: "string",
                        example: "ENS root registered successfully"
                    },
                    data: {
                        type: "object",
                        properties: {
                            name: {
                                type: "string",
                                example: "myplatform.eth"
                            },
                            contractAddress: {
                                type: "string",
                                example: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
                            },
                            isActive: {
                                type: "boolean",
                                example: true
                            },
                            ownerAppId: {
                                type: "string",
                                example: "app_123456789"
                            }
                        }
                    }
                },
                required: ["success", "message"]
            },

            SubnameAvailabilityResponse: {
                type: "object",
                properties: {
                    success: {
                        type: "boolean",
                        example: true
                    },
                    message: {
                        type: "string",
                        example: "Subname is available"
                    },
                    available: {
                        type: "boolean",
                        example: true,
                        description: "Whether the subname is available"
                    }
                },
                required: ["success", "message", "available"]
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
                        example: "Error message describing what went wrong"
                    },
                    error: {
                        type: "string",
                        example: "Detailed error (only in development)",
                        description: "Error stack trace or additional details"
                    }
                },
                required: ["success", "message"]
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
        "/ens/roots": {
            post: {
                summary: "Register a new ENS root domain",
                description: "Registers a new ENS root domain (.eth) that can be used to create subdomains. Requires wallet authentication and valid API key.",
                tags: ["ENS"],
                security: [
                    { ApiKeyAuth: [] },
                    { BearerAuth: [] }
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/ENSRegisterRequest" }
                        }
                    }
                },
                responses: {
                    "200": {
                        description: "ENS root registered successfully",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ENSRegisterResponse" },
                                examples: {
                                    success: {
                                        value: {
                                            success: true,
                                            message: "ENS root registered successfully",
                                            data: {
                                                name: "myplatform.eth",
                                                contractAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
                                                isActive: true,
                                                ownerAppId: "app_123456789"
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "400": {
                        description: "Validation error",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                                examples: {
                                    invalidName: {
                                        value: {
                                            success: false,
                                            message: "ENS Name must end with .eth"
                                        }
                                    },
                                    missingFields: {
                                        value: {
                                            success: false,
                                            message: "Name and chain are required"
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "401": {
                        description: "Unauthorized - Invalid credentials",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" }
                            }
                        }
                    },
                    "409": {
                        description: "Conflict - ENS root already registered",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                                example: {
                                    success: false,
                                    message: "ENS root already registered"
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

        "/ens/subnames/check-availability": {
            get: {
                summary: "Check ENS subname availability",
                description: "Checks if a subname is available under the registered ENS root domain. Requires wallet authentication and valid API key.",
                tags: ["ENS"],
                security: [
                    { ApiKeyAuth: [] },
                    { BearerAuth: [] }
                ],
                parameters: [
                    {
                        in: "query",
                        name: "subName",
                        required: true,
                        schema: {
                            type: "string"
                        },
                        description: "Subname to check availability for"
                    },
                    {
                        in: "query",
                        name: "chain",
                        required: true,
                        schema: {
                            type: "string",
                            enum: ["ethereum", "sepolia", "goerli"]
                        },
                        description: "Blockchain network to check on"
                    }
                ],
                responses: {
                    "200": {
                        description: "Subname availability check successful",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/SubnameAvailabilityResponse" },
                                examples: {
                                    available: {
                                        value: {
                                            success: true,
                                            message: "Subname is available",
                                            available: true
                                        }
                                    },
                                    taken: {
                                        value: {
                                            success: true,
                                            message: "Subname is already taken",
                                            available: false
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "400": {
                        description: "Validation error",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                                example: {
                                    success: false,
                                    message: "Subname and chain are required"
                                }
                            }
                        }
                    },
                    "401": {
                        description: "Unauthorized - Invalid credentials",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" }
                            }
                        }
                    },
                    "404": {
                        description: "ENS root not found for this app",
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