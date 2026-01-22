/**
 * Swagger documentation for SMS authentication endpoints
 */
export const smsAuthSwagger = {
    openapi: "3.0.0",
    info: {
        title: "SMS Authentication API",
        version: "1.0.0",
        description: "API documentation for SMS-based wallet authentication endpoints"
    },
    servers: [
        {
            url: "https://api.example.com/v1",
            description: "Production server"
        }
    ],
    tags: [
        {
            name: "SMS Authentication",
            description: "SMS-based wallet authentication endpoints",
        },
    ],
    components: {
        schemas: {
            // Request Schemas
            SmsLoginRequest: {
                type: "object",
                required: ["phoneNumber"],
                properties: {
                    phoneNumber: {
                        type: "string",
                        pattern: "^\\+\\d{10,15}$",
                        example: "+1234567890",
                        description: "Phone number in international format (+ followed by 10-15 digits)",
                    },
                },
                additionalProperties: false,
            },
            SmsVerifyRequest: {
                type: "object",
                required: ["phoneNumber", "otp"],
                properties: {
                    phoneNumber: {
                        type: "string",
                        pattern: "^\\+\\d{10,15}$",
                        example: "+1234567890",
                        description: "Phone number in international format",
                    },
                    otp: {
                        type: "string",
                        pattern: "^[0-9]{6}$",
                        example: "123456",
                        description: "6-digit OTP received via SMS",
                    },
                },
                additionalProperties: false,
            },
            // Response Schemas (reusing some from socialLoginsSwagger)
            WalletData: {
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
                    socialType: {
                        type: "string",
                        enum: ["sms"],
                        example: "sms",
                        description: "Authentication method used",
                    },
                    userData: {
                        type: "string",
                        example: '{"phoneNumber":"+1234567890"}',
                        description: "Stringified user data",
                    },
                },
            },
            LoginSuccessResponse: {
                allOf: [
                    { $ref: "#/components/schemas/ApiResponse" },
                    {
                        type: "object",
                        properties: {
                            success: { type: "boolean", example: true },
                            data: { $ref: "#/components/schemas/WalletData" },
                            isActive: {
                                type: "boolean",
                                example: true,
                                description: "Whether the wallet is active and verified",
                            },
                            token: {
                                type: "string",
                                example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                                description: "JWT authentication token",
                            },
                        },
                    },
                ],
            },
            OTPSentResponse: {
                allOf: [
                    { $ref: "#/components/schemas/ApiResponse" },
                    {
                        type: "object",
                        properties: {
                            success: { type: "boolean", example: true },
                            isActive: {
                                type: "boolean",
                                description: "Whether the wallet is already active",
                            },
                            walletExists: {
                                type: "boolean",
                                description: "Whether the wallet already existed",
                            },
                        },
                    },
                ],
            },
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
        "/sms/login": {
            post: {
                summary: "Initiate SMS authentication",
                description: `
                    Initiates SMS-based authentication flow. Requires x-api-key header.
                    The endpoint handles three scenarios:
                    
                    1. **Valid JWT Token**: If a valid JWT token is provided and matches an active wallet, returns wallet details immediately
                    2. **Existing Wallet**: If wallet exists but no valid token, sends OTP via SMS for verification
                    3. **New User**: Creates new wallet and sends OTP via SMS for initial verification
                `,
                tags: ["SMS Authentication"],
                security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/SmsLoginRequest" }
                        }
                    }
                },
                responses: {
                    "200": {
                        description: "User already authenticated or OTP sent for existing wallet",
                        content: {
                            "application/json": {
                                schema: {
                                    oneOf: [
                                        { $ref: "#/components/schemas/LoginSuccessResponse" },
                                        { $ref: "#/components/schemas/OTPSentResponse" },
                                    ],
                                },
                                examples: {
                                    alreadyLoggedIn: {
                                        summary: "User already authenticated",
                                        value: {
                                            success: true,
                                            message: "User already logged in",
                                            data: {
                                                walletAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
                                                publicKey: "0x04a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd",
                                                socialType: "sms",
                                                userData: '{"phoneNumber":"+1234567890"}',
                                            },
                                            isActive: true,
                                            token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                                            timestamp: "2024-01-15T10:30:00.000Z",
                                        },
                                    },
                                    otpSentExisting: {
                                        summary: "OTP sent for existing wallet",
                                        value: {
                                            success: true,
                                            message: "OTP sent to phone number for verification",
                                            isActive: true,
                                            walletExists: true,
                                            timestamp: "2024-01-15T10:30:00.000Z",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "201": {
                        description: "New wallet created and OTP sent",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/OTPSentResponse" },
                                examples: {
                                    newWallet: {
                                        summary: "OTP sent for new wallet",
                                        value: {
                                            success: true,
                                            message: "OTP sent to phone number for verification",
                                            isActive: false,
                                            walletExists: false,
                                            timestamp: "2024-01-15T10:30:00.000Z",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "400": {
                        description: "Invalid request data",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                                examples: {
                                    invalidPhone: {
                                        summary: "Invalid phone number format",
                                        value: {
                                            success: false,
                                            message: "Valid phone number in international format is required",
                                            timestamp: "2024-01-15T10:30:00.000Z",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "500": {
                        description: "Internal server error",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                            },
                        },
                    },
                },
            },
        },
        "/sms/verify": {
            post: {
                summary: "Verify wallet with SMS OTP",
                description: `
                    Verifies the OTP sent via SMS and activates the wallet. 
                    Requires x-api-key header.
                `,
                tags: ["SMS Authentication"],
                security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/SmsVerifyRequest" }
                        }
                    }
                },
                responses: {
                    "200": {
                        description: "Wallet verified successfully or user already authenticated",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/LoginSuccessResponse" },
                                examples: {
                                    verificationSuccess: {
                                        summary: "OTP verification successful",
                                        value: {
                                            success: true,
                                            message: "Wallet verified successfully",
                                            data: {
                                                walletAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
                                                publicKey: "0x04a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd",
                                                socialType: "sms",
                                                userData: '{"phoneNumber":"+1234567890"}',
                                            },
                                            isActive: true,
                                            token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                                            timestamp: "2024-01-15T10:30:00.000Z",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "400": {
                        description: "Invalid request or OTP",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                                examples: {
                                    invalidOTP: {
                                        summary: "Invalid OTP provided",
                                        value: {
                                            success: false,
                                            message: "Invalid OTP",
                                            timestamp: "2024-01-15T10:30:00.000Z",
                                        },
                                    },
                                    expiredOTP: {
                                        summary: "OTP has expired",
                                        value: {
                                            success: false,
                                            message: "OTP expired",
                                            timestamp: "2024-01-15T10:30:00.000Z",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "404": {
                        description: "Wallet not found",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                            },
                        },
                    },
                    "500": {
                        description: "Internal server error",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                            },
                        },
                    },
                },
            },
        },
        "/sms/resend-otp": {
            post: {
                summary: "Resend SMS OTP",
                description: `
                    Resends the OTP to the specified phone number. 
                    Requires x-api-key header.
                `,
                tags: ["SMS Authentication"],
                security: [{ ApiKeyAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/SmsLoginRequest" }
                        }
                    }
                },
                responses: {
                    "200": {
                        description: "OTP resent successfully",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ApiResponse" },
                                examples: {
                                    success: {
                                        summary: "OTP resent successfully",
                                        value: {
                                            success: true,
                                            message: "OTP resent to phone number for verification",
                                            timestamp: "2024-01-15T10:30:00.000Z",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "400": {
                        description: "Invalid phone number",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                            },
                        },
                    },
                    "404": {
                        description: "Wallet not found",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                            },
                        },
                    },
                    "429": {
                        description: "Too many requests - rate limited",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                            },
                        },
                    },
                    "500": {
                        description: "Internal server error",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                            },
                        },
                    },
                },
            },
        },
    }
};
