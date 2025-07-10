import { Router } from "express";
import { authenticateDeveloper } from "../middlewares/auth.middleware.js";
import AppController from "../controllers/app.controller.js";

/**
 * Comprehensive Swagger documentation for App Management
 */
export const appSwagger = {
    tags: [
        {
            name: "Apps",
            description: "Application management for developers including creation, configuration, and deletion",
        },
    ],
    components: {
        schemas: {
            // Request Schemas
            AppCreateRequest: {
                type: "object",
                required: ["name", "redirectUrls"],
                properties: {
                    name: {
                        type: "string",
                        minLength: 3,
                        maxLength: 50,
                        example: "My Awesome App",
                        description: "Application name (3-50 characters)"
                    },
                    description: {
                        type: "string",
                        maxLength: 500,
                        example: "A revolutionary app that changes everything",
                        description: "Application description (optional)"
                    },
                    redirectUrls: {
                        type: "array",
                        minItems: 1,
                        items: {
                            type: "string",
                            format: "uri",
                            example: "https://myapp.com/callback"
                        },
                        description: "Valid redirect URIs for OAuth flows"
                    },
                    iconUrl: {
                        type: "string",
                        format: "uri",
                        example: "https://myapp.com/icon.png",
                        description: "Application icon URL (optional)"
                    }
                },
                additionalProperties: false
            },

            AppUpdateRequest: {
                type: "object",
                properties: {
                    name: {
                        type: "string",
                        minLength: 3,
                        maxLength: 50,
                        example: "Updated App Name"
                    },
                    description: {
                        type: "string",
                        maxLength: 500,
                        example: "Updated description"
                    },
                    redirectUrls: {
                        type: "array",
                        minItems: 1,
                        items: {
                            type: "string",
                            format: "uri"
                        }
                    },
                    iconUrl: {
                        type: "string",
                        format: "uri"
                    }
                },
                additionalProperties: false
            },

            // Response Schemas
            AppResponse: {
                type: "object",
                properties: {
                    id: {
                        type: "string",
                        format: "uuid",
                        description: "Unique application identifier"
                    },
                    appId: {
                        type: "string",
                        example: "app_123456789",
                        description: "Public application identifier"
                    },
                    name: {
                        type: "string",
                        example: "My Awesome App"
                    },
                    description: {
                        type: "string",
                        example: "A description of my app"
                    },
                    redirectUrls: {
                        type: "array",
                        items: {
                            type: "string",
                            format: "uri"
                        }
                    },
                    iconUrl: {
                        type: "string",
                        format: "uri"
                    },
                    createdAt: {
                        type: "string",
                        format: "date-time",
                        description: "Creation timestamp"
                    },
                    updatedAt: {
                        type: "string",
                        format: "date-time",
                        description: "Last update timestamp"
                    }
                }
            },

            AppListResponse: {
                type: "object",
                properties: {
                    success: {
                        type: "boolean",
                        example: true
                    },
                    count: {
                        type: "integer",
                        example: 3,
                        description: "Number of apps returned"
                    },
                    data: {
                        type: "array",
                        items: {
                            $ref: "#/components/schemas/AppResponse"
                        }
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
                        example: "APP_NOT_FOUND",
                        description: "Machine-readable error code"
                    },
                    details: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                field: { type: "string" },
                                message: { type: "string" }
                            }
                        },
                        description: "Validation error details (when applicable)"
                    }
                }
            }
        },

        securitySchemes: {
            BearerAuth: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT",
                description: "JWT obtained during developer authentication"
            }
        }
    },

    paths: {
        "/apps": {
            post: {
                summary: "Create a new application",
                description: `
                    Creates a new application for the authenticated developer.
                    Returns the created app with generated credentials.
                    
                    **Required Fields:**
                    - name: 3-50 characters
                    - redirectUrls: At least one valid HTTPS URL
                    
                    **Note:** The app will be assigned a unique appId and secret
                `,
                tags: ["Apps"],
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/AppCreateRequest" },
                            examples: {
                                basicApp: {
                                    value: {
                                        name: "My Production App",
                                        description: "Our main customer-facing application",
                                        redirectUrls: [
                                            "https://app.com/auth/callback",
                                            "https://dev.app.com/auth/callback"
                                        ],
                                        iconUrl: "https://app.com/logo.png"
                                    }
                                },
                                minimalApp: {
                                    value: {
                                        name: "Test App",
                                        redirectUrls: ["https://test.app.com/callback"]
                                    }
                                }
                            }
                        }
                    }
                },
                responses: {
                    "201": {
                        description: "Application created successfully",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/AppResponse" },
                                example: {
                                    id: "507f1f77bcf86cd799439011",
                                    appId: "app_123456789",
                                    name: "My Awesome App",
                                    description: "A description of my app",
                                    redirectUrls: ["https://myapp.com/callback"],
                                    iconUrl: "https://myapp.com/icon.png",
                                    createdAt: "2023-01-15T10:30:00.000Z",
                                    updatedAt: "2023-01-15T10:30:00.000Z"
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
                                    missingName: {
                                        value: {
                                            success: false,
                                            message: "Validation failed",
                                            error: "VALIDATION_ERROR",
                                            details: [
                                                {
                                                    field: "name",
                                                    message: "Name is required"
                                                }
                                            ]
                                        }
                                    },
                                    invalidUrl: {
                                        value: {
                                            success: false,
                                            message: "Validation failed",
                                            error: "VALIDATION_ERROR",
                                            details: [
                                                {
                                                    field: "redirectUrls[0]",
                                                    message: "Must be a valid HTTPS URL"
                                                }
                                            ]
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "401": {
                        description: "Unauthorized - Invalid or missing JWT",
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
            },

            get: {
                summary: "List developer's applications",
                description: `
                    Returns all applications belonging to the authenticated developer.
                    Apps are returned in reverse chronological order (newest first).
                `,
                tags: ["Apps"],
                security: [{ BearerAuth: [] }],
                responses: {
                    "200": {
                        description: "Successful operation",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/AppListResponse" },
                                example: {
                                    success: true,
                                    count: 2,
                                    data: [
                                        {
                                            id: "507f1f77bcf86cd799439011",
                                            appId: "app_987654321",
                                            name: "My Newest App",
                                            description: "Just created last week",
                                            redirectUrls: ["https://new.app.com/callback"],
                                            createdAt: "2023-01-20T08:15:00.000Z",
                                            updatedAt: "2023-01-20T08:15:00.000Z"
                                        },
                                        {
                                            id: "507f1f77bcf86cd799439012",
                                            appId: "app_123456789",
                                            name: "My First App",
                                            description: "Initial test application",
                                            redirectUrls: [
                                                "https://app.com/callback",
                                                "https://dev.app.com/callback"
                                            ],
                                            createdAt: "2023-01-15T10:30:00.000Z",
                                            updatedAt: "2023-01-18T14:45:00.000Z"
                                        }
                                    ]
                                }
                            }
                        }
                    },
                    "401": {
                        description: "Unauthorized - Invalid or missing JWT",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" }
                            }
                        }
                    },
                    "404": {
                        description: "No applications found",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                                example: {
                                    success: false,
                                    message: "No applications found",
                                    error: "APPS_NOT_FOUND"
                                }
                            }
                        }
                    }
                }
            }
        },

        "/apps/{appId}": {
            get: {
                summary: "Get application details",
                description: `
                    Returns detailed information about a specific application.
                    The developer must own the application.
                `,
                tags: ["Apps"],
                security: [{ BearerAuth: [] }],
                parameters: [{
                    name: "appId",
                    in: "path",
                    required: true,
                    description: "Application ID",
                    schema: {
                        type: "string",
                        pattern: "^[a-zA-Z0-9_-]+$",
                        example: "app_123456789"
                    }
                }],
                responses: {
                    "200": {
                        description: "Application details",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/AppResponse" }
                            }
                        }
                    },
                    "401": {
                        description: "Unauthorized - Invalid or missing JWT",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" }
                            }
                        }
                    },
                    "403": {
                        description: "Forbidden - App doesn't belong to developer",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" }
                            }
                        }
                    },
                    "404": {
                        description: "Application not found",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" }
                            }
                        }
                    }
                }
            },

            put: {
                summary: "Update application",
                description: `
                    Updates an existing application. All fields are optional,
                    but at least one field must be provided.
                    
                    **Note:** Changing redirectUrls may require re-verification
                `,
                tags: ["Apps"],
                security: [{ BearerAuth: [] }],
                parameters: [{
                    name: "appId",
                    in: "path",
                    required: true,
                    description: "Application ID",
                    schema: {
                        type: "string",
                        pattern: "^[a-zA-Z0-9_-]+$",
                        example: "app_123456789"
                    }
                }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/AppUpdateRequest" }
                        }
                    }
                },
                responses: {
                    "200": {
                        description: "Application updated successfully",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/AppResponse" }
                            }
                        }
                    },
                    "400": {
                        description: "No update data provided",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" }
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
                    "403": {
                        description: "Forbidden - App doesn't belong to developer",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" }
                            }
                        }
                    },
                    "404": {
                        description: "Application not found",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" }
                            }
                        }
                    }
                }
            },

            delete: {
                summary: "Delete application",
                description: `
                    Permanently deletes an application and all associated data.
                    This action cannot be undone.
                `,
                tags: ["Apps"],
                security: [{ BearerAuth: [] }],
                parameters: [{
                    name: "appId",
                    in: "path",
                    required: true,
                    description: "Application ID",
                    schema: {
                        type: "string",
                        pattern: "^[a-zA-Z0-9_-]+$",
                        example: "app_123456789"
                    }
                }],
                responses: {
                    "200": {
                        description: "Application deleted successfully",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        message: { type: "string" }
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
                    "403": {
                        description: "Forbidden - App doesn't belong to developer",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" }
                            }
                        }
                    },
                    "404": {
                        description: "Application not found",
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
