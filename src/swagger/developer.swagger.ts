/**
 * Comprehensive Swagger documentation for Developer Management
 */
export const developerSwagger = {
    tags: [
        {
            name: "Developers",
            description: "Developer account management including registration, authentication, and profile management",
        },
    ],
    components: {
        schemas: {
            // Request Schemas
            DeveloperRegisterRequest: {
                type: "object",
                required: ["name", "email", "password"],
                properties: {
                    name: {
                        type: "string",
                        minLength: 2,
                        maxLength: 50,
                        example: "John Doe",
                        description: "Full name of the developer"
                    },
                    email: {
                        type: "string",
                        format: "email",
                        example: "developer@example.com",
                        description: "Valid email address for account"
                    },
                    password: {
                        type: "string",
                        minLength: 8,
                        example: "securePassword123!",
                        description: "Password (min 8 characters)"
                    }
                },
                additionalProperties: false
            },

            OTPVerificationRequest: {
                type: "object",
                required: ["email", "otp"],
                properties: {
                    email: {
                        type: "string",
                        format: "email",
                        example: "developer@example.com"
                    },
                    otp: {
                        type: "string",
                        pattern: "^[0-9]{6}$",
                        example: "123456",
                        description: "6-digit OTP received via email"
                    }
                }
            },

            DeveloperLoginRequest: {
                type: "object",
                required: ["email", "password"],
                properties: {
                    email: {
                        type: "string",
                        format: "email",
                        example: "developer@example.com"
                    },
                    password: {
                        type: "string",
                        example: "securePassword123!"
                    }
                }
            },

            PasswordResetRequest: {
                type: "object",
                required: ["token", "newPassword"],
                properties: {
                    token: {
                        type: "string",
                        description: "Password reset token received via email"
                    },
                    newPassword: {
                        type: "string",
                        minLength: 8,
                        description: "New password (min 8 characters)"
                    }
                }
            },

            // Response Schemas
            DeveloperProfile: {
                type: "object",
                properties: {
                    id: {
                        type: "string",
                        format: "uuid",
                        description: "Unique developer identifier"
                    },
                    name: {
                        type: "string",
                        example: "John Doe"
                    },
                    email: {
                        type: "string",
                        format: "email",
                        example: "developer@example.com"
                    },
                    createdAt: {
                        type: "string",
                        format: "date-time",
                        description: "Account creation timestamp"
                    },
                    isActive: {
                        type: "boolean",
                        description: "Whether account is verified"
                    }
                }
            },

            AuthSuccessResponse: {
                type: "object",
                properties: {
                    success: {
                        type: "boolean",
                        example: true
                    },
                    message: {
                        type: "string",
                        example: "Operation successful"
                    },
                    token: {
                        type: "string",
                        description: "JWT authentication token",
                        example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    },
                    data: {
                        $ref: "#/components/schemas/DeveloperProfile"
                    }
                }
            },

            BasicSuccessResponse: {
                type: "object",
                properties: {
                    success: {
                        type: "boolean",
                        example: true
                    },
                    message: {
                        type: "string",
                        example: "Operation completed successfully"
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
                        example: "Error description"
                    },
                    error: {
                        type: "string",
                        example: "ERROR_CODE",
                        description: "Machine-readable error code"
                    }
                }
            }
        },

        securitySchemes: {
            BearerAuth: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT",
                description: "JWT obtained during login"
            }
        }
    },

    paths: {
        "/developers/register": {
            post: {
                summary: "Register a new developer account",
                description: `
                    Creates a new developer account with the provided details. 
                    An OTP will be sent to the provided email for verification.
                    
                    **Requirements:**
                    - Name must be 2-50 characters
                    - Email must be valid and unique
                    - Password must be at least 8 characters
                `,
                tags: ["Developers"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/DeveloperRegisterRequest" }
                        }
                    }
                },
                responses: {
                    "201": {
                        description: "Developer registered successfully (OTP sent)",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        message: { type: "string" },
                                        data: { $ref: "#/components/schemas/DeveloperProfile" }
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
                                    missingFields: {
                                        value: {
                                            success: false,
                                            message: "Name, email and password are required",
                                            error: "VALIDATION_ERROR"
                                        }
                                    },
                                    invalidEmail: {
                                        value: {
                                            success: false,
                                            message: "Invalid email format",
                                            error: "VALIDATION_ERROR"
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "409": {
                        description: "Account already exists",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                                example: {
                                    success: false,
                                    message: "Developer with this email already exists",
                                    error: "ACCOUNT_EXISTS"
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

        "/developers/verify-otp": {
            post: {
                summary: "Verify email with OTP",
                description: `
                    Verifies the developer's email address using the OTP sent during registration.
                    After successful verification, the account becomes active.
                    
                    **Note:** OTP expires after 10 minutes
                `,
                tags: ["Developers"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/OTPVerificationRequest" }
                        }
                    }
                },
                responses: {
                    "200": {
                        description: "Email verified successfully",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/BasicSuccessResponse" }
                            }
                        }
                    },
                    "400": {
                        description: "Invalid OTP or expired",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                                examples: {
                                    invalidOTP: {
                                        value: {
                                            success: false,
                                            message: "Invalid OTP",
                                            error: "INVALID_OTP"
                                        }
                                    },
                                    expiredOTP: {
                                        value: {
                                            success: false,
                                            message: "OTP has expired",
                                            error: "OTP_EXPIRED"
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "404": {
                        description: "Developer not found",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" }
                            }
                        }
                    },
                    "409": {
                        description: "Account already verified",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                                example: {
                                    success: false,
                                    message: "Account is already verified, please login",
                                    error: "ALREADY_VERIFIED"
                                }
                            }
                        }
                    }
                }
            }
        },

        "/developers/resend-otp": {
            post: {
                summary: "Resend OTP to email",
                description: `
                    Resends a new OTP to the developer's email address.
                    Useful when the original OTP was not received or has expired.
                `,
                tags: ["Developers"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["email"],
                                properties: {
                                    email: {
                                        type: "string",
                                        format: "email"
                                    }
                                }
                            }
                        }
                    }
                },
                responses: {
                    "200": {
                        description: "OTP resent successfully",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/BasicSuccessResponse" }
                            }
                        }
                    },
                    "404": {
                        description: "Developer not found",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" }
                            }
                        }
                    },
                    "409": {
                        description: "Account already verified",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" }
                            }
                        }
                    }
                }
            }
        },

        "/developers/login": {
            post: {
                summary: "Authenticate developer",
                description: `
                    Authenticates a developer using email and password.
                    Returns a JWT token for accessing protected endpoints.
                `,
                tags: ["Developers"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/DeveloperLoginRequest" }
                        }
                    }
                },
                responses: {
                    "200": {
                        description: "Login successful",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/AuthSuccessResponse" }
                            }
                        }
                    },
                    "400": {
                        description: "Invalid credentials",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" }
                            }
                        }
                    },
                    "404": {
                        description: "Developer not found",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" }
                            }
                        }
                    },
                    "409": {
                        description: "Account not verified",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" }
                            }
                        }
                    }
                }
            }
        },

        "/developers/forgot-password": {
            post: {
                summary: "Request password reset",
                description: `
                    Initiates password reset flow by sending a reset link to the developer's email.
                    The link contains a token valid for 24 hours.
                `,
                tags: ["Developers"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["email"],
                                properties: {
                                    email: {
                                        type: "string",
                                        format: "email"
                                    }
                                }
                            }
                        }
                    }
                },
                responses: {
                    "200": {
                        description: "Reset email sent successfully",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/BasicSuccessResponse" }
                            }
                        }
                    },
                    "400": {
                        description: "Email required",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" }
                            }
                        }
                    },
                    "404": {
                        description: "Developer not found",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" }
                            }
                        }
                    }
                }
            }
        },

        "/developers/verify-reset-token": {
            get: {
                summary: "Verify password reset token",
                description: "Validates a password reset token before allowing password change",
                tags: ["Developers"],
                parameters: [{
                    name: "token",
                    in: "query",
                    required: true,
                    schema: { type: "string" }
                }],
                responses: {
                    "200": {
                        description: "Token is valid",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/BasicSuccessResponse" }
                            }
                        }
                    },
                    "400": {
                        description: "Token required",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" }
                            }
                        }
                    },
                    "401": {
                        description: "Invalid or expired token",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" }
                            }
                        }
                    }
                }
            }
        },

        "/developers/reset-password": {
            post: {
                summary: "Reset password using valid token",
                description: "Updates password using a valid reset token",
                tags: ["Developers"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/PasswordResetRequest" }
                        }
                    }
                },
                responses: {
                    "200": {
                        description: "Password reset successful",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/BasicSuccessResponse" }
                            }
                        }
                    },
                    "400": {
                        description: "Invalid request",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" }
                            }
                        }
                    },
                    "401": {
                        description: "Invalid or expired token",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" }
                            }
                        }
                    }
                }
            }
        },

        "/developers/profile": {
            get: {
                summary: "Get developer profile",
                description: "Retrieves authenticated developer's profile information",
                tags: ["Developers"],
                security: [{ BearerAuth: [] }],
                responses: {
                    "200": {
                        description: "Profile retrieved successfully",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean" },
                                        message: { type: "string" },
                                        data: { $ref: "#/components/schemas/DeveloperProfile" }
                                    }
                                }
                            }
                        }
                    },
                    "401": {
                        description: "Unauthorized",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" }
                            }
                        }
                    },
                    "404": {
                        description: "Developer not found",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" }
                            }
                        }
                    }
                }
            }
        },

        "/developers": {
            delete: {
                summary: "Delete developer account",
                description: "Permanently deletes the authenticated developer's account",
                tags: ["Developers"],
                security: [{ BearerAuth: [] }],
                responses: {
                    "200": {
                        description: "Account deleted successfully",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/BasicSuccessResponse" }
                            }
                        }
                    },
                    "401": {
                        description: "Unauthorized",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" }
                            }
                        }
                    },
                    "404": {
                        description: "Developer not found",
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