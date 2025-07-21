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
            PrepareSubnameRegistrarRequest: {
                type: "object",
                required: ["ensName", "chain"],
                properties: {
                    ensName: {
                        type: "string",
                        example: "myplatform.eth",
                        description: "ENS root name to create registrar for (must end with .eth)"
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

            PrepareSubnameRegistrarResponse: {
                type: "object",
                properties: {
                    success: {
                        type: "boolean",
                        example: true
                    },
                    message: {
                        type: "string",
                        example: "Transaction prepared successfully"
                    },
                    data: {
                        type: "object",
                        properties: {
                            to: {
                                type: "string",
                                example: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
                                description: "Contract address to send transaction to"
                            },
                            data: {
                                type: "string",
                                example: "0x123...abc",
                                description: "Encoded transaction data"
                            },
                            value: {
                                type: "string",
                                example: "0",
                                description: "Value to send with transaction (in wei)"
                            },
                            gas: {
                                type: "string",
                                example: "500000",
                                description: "Estimated gas limit"
                            },
                            from: {
                                type: "string",
                                example: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
                                description: "Sender address"
                            },
                            chainId: {
                                type: "number",
                                example: 11155111,
                                description: "Chain ID for the transaction"
                            }
                        },
                        required: ["to", "data", "from", "chainId"]
                    }
                },
                required: ["success", "message", "data"]
            },

            NameWrapperTransferRequest: {
                type: "object",
                required: ["chain", "from", "to", "id"],
                properties: {
                    chain: {
                        type: "string",
                        enum: ["ethereum", "sepolia", "goerli"],
                        example: "sepolia",
                        description: "Blockchain network"
                    },
                    from: {
                        type: "string",
                        pattern: "^0x[a-fA-F0-9]{40}$",
                        example: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
                        description: "Current owner of the wrapped name"
                    },
                    to: {
                        type: "string",
                        pattern: "^0x[a-fA-F0-9]{40}$",
                        example: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
                        description: "New owner of the wrapped name"
                    },
                    id: {
                        type: "string",
                        example: "1234567890123456789",
                        description: "NameWrapper token ID (namehash of the ENS name)"
                    },
                    amount: {
                        type: "string",
                        example: "1",
                        description: "Amount to transfer (default: 1)"
                    },
                    data: {
                        type: "string",
                        example: "0x",
                        description: "Additional data (default: empty bytes)"
                    }
                },
                additionalProperties: false
            },

            NameWrapperTransferResponse: {
                type: "object",
                properties: {
                    success: {
                        type: "boolean",
                        example: true
                    },
                    message: {
                        type: "string",
                        example: "NameWrapper transfer transaction prepared successfully"
                    },
                    data: {
                        type: "object",
                        properties: {
                            to: {
                                type: "string",
                                example: "0x1234567890abcdef1234567890abcdef12345678",
                                description: "NameWrapper contract address"
                            },
                            data: {
                                type: "string",
                                example: "0x123...abc",
                                description: "Encoded transfer transaction data"
                            },
                            value: {
                                type: "string",
                                example: "0",
                                description: "Value to send (default: 0)"
                            },
                            gas: {
                                type: "string",
                                example: "50000",
                                description: "Estimated gas limit"
                            },
                            chainId: {
                                type: "number",
                                example: 11155111,
                                description: "Chain ID"
                            }
                        },
                        required: ["to", "data", "chainId"]
                    }
                },
                required: ["success", "message", "data"]
            },

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

            SubnameClaimRequest: {
                type: "object",
                required: ["subName", "chain"],
                properties: {
                    subName: {
                        type: "string",
                        example: "user123",
                        description: "Subname to claim"
                    },
                    chain: {
                        type: "string",
                        enum: ["ethereum", "sepolia", "goerli"],
                        example: "sepolia",
                        description: "Blockchain network"
                    },
                    useAccountAbstraction: {
                        type: "boolean",
                        example: true,
                        description: "Whether to use account abstraction for gasless transactions (default: false)"
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

            SubnameClaimResponse: {
                type: "object",
                properties: {
                    success: {
                        type: "boolean",
                        example: true
                    },
                    message: {
                        type: "string",
                        example: "Subname claimed successfully"
                    },
                    data: {
                        type: "object",
                        properties: {
                            status: {
                                type: "string",
                                example: "success",
                                enum: ["success", "error"]
                            },
                            address: {
                                type: "string",
                                example: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
                            },
                            hash: {
                                type: "string",
                                example: "0x123...abc"
                            },
                            gasUsed: {
                                type: "string",
                                example: "21000"
                            },
                            effectiveGasPrice: {
                                type: "string",
                                example: "1000000000"
                            },
                            estimatedGas: {
                                type: "string",
                                example: "21000"
                            },
                            estimatedCost: {
                                type: "string",
                                example: "21000000000000"
                            },
                            chainId: {
                                type: "number",
                                example: 11155111
                            }
                        }
                    }
                },
                required: ["success", "message"]
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
                    },
                    details: {
                        type: "object",
                        properties: {
                            functionName: {
                                type: "string",
                                example: "claimName"
                            },
                            args: {
                                type: "array",
                                items: {
                                    type: "string"
                                },
                                example: ["user123"]
                            },
                            account: {
                                type: "string",
                                example: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
                            },
                            contractAddress: {
                                type: "string",
                                example: "0x123...def"
                            },
                            chainId: {
                                type: "number",
                                example: 11155111
                            },
                            estimatedGas: {
                                type: "string",
                                example: "21000"
                            },
                            gasPrice: {
                                type: "string",
                                example: "1000000000"
                            },
                            estimatedCost: {
                                type: "string",
                                example: "21000000000000"
                            },
                            accountBalance: {
                                type: "string",
                                example: "1000000000000000"
                            },
                            required: {
                                type: "string",
                                example: "21000000000000"
                            },
                            shortBy: {
                                type: "string",
                                example: "-20900000000000"
                            }
                        }
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
        "/ens/prepare-registrar": {
            post: {
                summary: "Prepare transaction to create subname registrar contract. (Dashboard)",
                description: "Prepares a transaction to create a new subname registrar contract for the given ENS name. Returns the transaction data that can be signed by the frontend. Requires developer authentication and valid API key.",
                tags: ["ENS"],
                security: [
                    { ApiKeyAuth: [] },
                    { BearerAuth: [] }
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/PrepareSubnameRegistrarRequest" }
                        }
                    }
                },
                responses: {
                    "200": {
                        description: "Transaction prepared successfully",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/PrepareSubnameRegistrarResponse" },
                                examples: {
                                    success: {
                                        value: {
                                            success: true,
                                            message: "Transaction prepared successfully",
                                            data: {
                                                to: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
                                                data: "0x123...abc",
                                                value: "0",
                                                gas: "500000",
                                                from: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
                                                chainId: 11155111
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
                                            message: "ENS name must be a valid string"
                                        }
                                    },
                                    missingFields: {
                                        value: {
                                            success: false,
                                            message: "ENS name and chain are required"
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
        },
        "/ens/namewrapper/prepare-transfer": {
            post: {
                summary: "Prepare NameWrapper transfer transaction",
                description: "Prepares a safeTransferFrom transaction for transferring wrapped ENS names between addresses. Returns encoded transaction data that can be signed and submitted by the client.",
                tags: ["ENS"],
                security: [
                    { ApiKeyAuth: [] },
                    { BearerAuth: [] }
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/NameWrapperTransferRequest" }
                        }
                    }
                },
                responses: {
                    "200": {
                        description: "Transaction prepared successfully",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/NameWrapperTransferResponse" },
                                examples: {
                                    success: {
                                        value: {
                                            success: true,
                                            message: "NameWrapper transfer transaction prepared successfully",
                                            data: {
                                                to: "0x1234567890abcdef1234567890abcdef12345678",
                                                data: "0x123...abc",
                                                value: "0",
                                                gas: "50000",
                                                chainId: 11155111
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
                                    invalidAddress: {
                                        value: {
                                            success: false,
                                            message: "Invalid from or to address"
                                        }
                                    },
                                    missingFields: {
                                        value: {
                                            success: false,
                                            message: "Chain, from, to, and id are required parameters"
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
        "/ens/roots": {
            post: {
                summary: "Register a new ENS root domain. (Dashboard)",
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

        "/ens/name": {
            get: {
                summary: "Get ENS root name for the current app. (Dashboard)",
                description: "Returns the ENS root name, contract address, and status for the current app. Requires API key and developer authentication.",
                tags: ["ENS"],
                security: [
                    { ApiKeyAuth: [] },
                    { BearerAuth: [] }
                ],
                responses: {
                    "200": {
                        description: "ENS root name found",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        data: {
                                            type: "object",
                                            properties: {
                                                ensName: { type: "string", example: "myplatform.eth" },
                                                contractAddress: { type: "string", example: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e" },
                                                isActive: { type: "boolean", example: true }
                                            }
                                        }
                                    },
                                    required: ["success", "data"]
                                },
                                examples: {
                                    found: {
                                        value: {
                                            success: true,
                                            data: {
                                                ensName: "myplatform.eth",
                                                contractAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
                                                isActive: true
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "404": {
                        description: "No ENS root registered for this app",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                                examples: {
                                    notFound: {
                                        value: {
                                            success: false,
                                            message: "No ENS root registered for this app"
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

        "/ens/subnames/check-availability": {
            get: {
                summary: "Check ENS subname availability. (Dashboard/CrefyConnect Library /Api)",
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
        },

        "/ens/subnames/claim": {
            post: {
                summary: "Claim a new ENS subname. (CrefyConnect Library /Api)",
                description: "Claims a new ENS subname under the registered ENS root domain. Supports both regular transactions and account abstraction for gasless transactions. Requires wallet authentication and valid API key.",
                tags: ["ENS"],
                security: [
                    { ApiKeyAuth: [] },
                    { BearerAuth: [] }
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/SubnameClaimRequest" }
                        }
                    }
                },
                responses: {
                    "200": {
                        description: "Subname claimed successfully",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/SubnameClaimResponse" },
                                examples: {
                                    success: {
                                        value: {
                                            success: true,
                                            message: "Subname claimed successfully",
                                            data: {
                                                status: "success",
                                                address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
                                                hash: "0x123...abc",
                                                gasUsed: "21000",
                                                effectiveGasPrice: "1000000000",
                                                estimatedGas: "21000",
                                                estimatedCost: "21000000000000",
                                                chainId: 11155111
                                            }
                                        }
                                    },
                                    aaSuccess: {
                                        value: {
                                            success: true,
                                            message: "Subname claimed successfully using account abstraction",
                                            data: {
                                                status: "success",
                                                address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
                                                hash: "0x456...def",
                                                chainId: 11155111
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "400": {
                        description: "Validation error or insufficient funds",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                                examples: {
                                    invalidName: {
                                        value: {
                                            success: false,
                                            message: "Invalid subname format",
                                            details: {
                                                functionName: "claimName",
                                                args: ["invalid name"],
                                                account: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
                                                contractAddress: "0x123...def",
                                                chainId: 11155111
                                            }
                                        }
                                    },
                                    insufficientFunds: {
                                        value: {
                                            success: false,
                                            message: "Insufficient funds for gas fee",
                                            details: {
                                                functionName: "claimName",
                                                args: ["user123"],
                                                estimatedGas: "21000",
                                                gasPrice: "1000000000",
                                                estimatedCost: "21000000000000",
                                                accountBalance: "1000000000000000",
                                                required: "21000000000000",
                                                shortBy: "-20900000000000",
                                                account: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
                                                contractAddress: "0x123...def",
                                                chainId: 11155111
                                            }
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