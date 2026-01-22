/**
 * Comprehensive Swagger documentation for social authentication endpoints
 */
export const socialLoginsSwagger = {
  openapi: "3.0.0",
  info: {
    title: "Social Authentication API",
    version: "1.0.0",
    description:
      "API documentation for social login and wallet authentication endpoints supporting email, Google, and Twitter OAuth",
  },
  servers: [
    {
      url: "https://api.example.com/v1",
      description: "Production server",
    },
  ],
  tags: [
    {
      name: "Social Authentication",
      description:
        "Social login and wallet authentication endpoints supporting email, Google, and Twitter OAuth providers",
    },
  ],
  components: {
    schemas: {
      // Request Schemas
      EmailLoginRequest: {
        type: "object",
        required: ["email"],
        properties: {
          email: {
            type: "string",
            format: "email",
            example: "user@example.com",
            description: "Valid email address for authentication",
          },
        },
        additionalProperties: false,
      },
      WalletVerifyRequest: {
        type: "object",
        required: ["email", "otp"],
        properties: {
          email: {
            type: "string",
            format: "email",
            example: "user@example.com",
            description: "Email address used for login",
          },
          otp: {
            type: "string",
            pattern: "^[0-9]{6}$",
            example: "123456",
            description: "6-digit OTP received via email",
          },
        },
        additionalProperties: false,
      },

      // Response Schemas
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
            example:
              "0x04a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd5b8dec5235a0fa8722476c7709c02559e3aa73aa03918ba2d492eea75abea235",
            description: "Wallet public key",
          },
          socialType: {
            type: "string",
            enum: ["email", "google", "twitter"],
            example: "email",
            description: "Authentication method used",
          },
          userData: {
            type: "string",
            example: '{"email":"user@example.com","name":"John Doe"}',
            description: "Stringified user data from social provider",
          },
          username: {
            type: "string",
            example: "johndoe",
            description: "Twitter username (only for Twitter OAuth)",
          },
          email: {
            type: "string",
            format: "email",
            example: "user@example.com",
            description: "User's email address",
          },
        },
      },

      TwitterUserData: {
        type: "object",
        properties: {
          twitterId: {
            type: "string",
            example: "123456789",
            description: "Twitter user ID",
          },
          username: {
            type: "string",
            example: "johndoe",
            description: "Twitter username",
          },
          displayName: {
            type: "string",
            example: "John Doe",
            description: "Twitter display name",
          },
          email: {
            type: "string",
            format: "email",
            example: "user@example.com",
            description: "Twitter email (if available)",
          },
          photo: {
            type: "string",
            format: "uri",
            example: "https://pbs.twimg.com/profile_images/...",
            description: "Twitter profile picture URL",
          },
          profileUrl: {
            type: "string",
            format: "uri",
            example: "https://twitter.com/johndoe",
            description: "Twitter profile URL",
          },
          provider: {
            type: "string",
            example: "twitter",
            description: "Authentication provider",
          },
        },
      },

      ApiResponse: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            description: "Indicates if the operation was successful",
          },
          message: {
            type: "string",
            description: "Human-readable message describing the result",
          },
          timestamp: {
            type: "string",
            format: "date-time",
            description: "ISO timestamp of the response",
          },
        },
        required: ["success", "message", "timestamp"],
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

      ErrorResponse: {
        allOf: [
          { $ref: "#/components/schemas/ApiResponse" },
          {
            type: "object",
            properties: {
              success: { type: "boolean", example: false },
              error: {
                type: "object",
                description: "Error details (only in development mode)",
                properties: {
                  message: { type: "string" },
                  stack: { type: "string" },
                  code: { type: "string" },
                },
              },
              errorDescription: {
                type: "string",
                description: "Detailed error description",
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
        description: "Application API key for authentication",
      },
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "JWT token obtained after successful wallet verification",
      },
    },
  },

  paths: {
    "/oauth/email/email-login": {
      post: {
        summary: "Initiate email authentication",
        description: `
                      Initiates email-based authentication flow. Requires x-api-key header.
                      The endpoint handles three scenarios:
                      
                      1. **Valid JWT Token**: If a valid JWT token is provided and matches an active wallet, returns wallet details immediately
                      2. **Existing Wallet**: If wallet exists but no valid token, sends OTP for verification
                      3. **New User**: Creates new wallet and sends OTP for initial verification
                  `,
        tags: ["Social Authentication"],
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/EmailLoginRequest" },
            },
          },
        },
        responses: {
          "200": {
            description:
              "User already authenticated or OTP sent for existing wallet",
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
                        walletAddress:
                          "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
                        publicKey:
                          "0x04a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd",
                        socialType: "email",
                        userData: '{"email":"user@example.com"}',
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
                      message: "OTP sent to email for verification",
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
                      message: "OTP sent to email for verification",
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
                  invalidEmail: {
                    summary: "Invalid email format",
                    value: {
                      success: false,
                      message: "Valid email is required",
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

    "/oauth/email/wallet-verify": {
      post: {
        summary: "Verify wallet with OTP",
        description: `
                      Verifies the OTP sent to email and activates the wallet. 
                      Requires x-api-key header.
                  `,
        tags: ["Social Authentication"],
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/WalletVerifyRequest" },
            },
          },
        },
        responses: {
          "200": {
            description:
              "Wallet verified successfully or user already authenticated",
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
                        walletAddress:
                          "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
                        publicKey:
                          "0x04a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd",
                        socialType: "email",
                        userData: '{"email":"user@example.com"}',
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

    "/oauth/email/resend-email-otp": {
      post: {
        summary: "Resend email OTP",
        description: `
                      Resends the OTP to the specified email address. 
                      Requires x-api-key header.
                  `,
        tags: ["Social Authentication"],
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/EmailLoginRequest" },
            },
          },
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
                      message: "OTP resent to email for verification",
                      timestamp: "2024-01-15T10:30:00.000Z",
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Invalid email or wallet not found",
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

    "/oauth/google/{appId}/initiate-google-auth": {
      get: {
        summary: "Initiate Google OAuth flow",
        description: `
                      Redirects the user to Google's OAuth consent screen.
                      Requires appId as a path parameter.
                  `,
        tags: ["Social Authentication"],
        parameters: [
          {
            in: "path",
            name: "appId",
            required: true,
            schema: { type: "string" },
            description: "Unique application ID for identifying the client app",
          },
          {
            in: "query",
            name: "socketAuthId",
            required: false,
            schema: { type: "string" },
            description: "Socket authentication ID for real-time communication",
          },
        ],
        responses: {
          "302": {
            description: "Redirect to Google OAuth consent screen",
            headers: {
              Location: {
                description: "Google OAuth authorization URL",
                schema: {
                  type: "string",
                  format: "uri",
                  example:
                    "https://accounts.google.com/oauth/authorize?client_id=...",
                },
              },
            },
          },
          "400": {
            description: "Invalid app ID or configuration error",
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

    "/oauth/google/callback": {
      get: {
        summary: "Google OAuth callback endpoint",
        description: `
                      Handles the callback from Google OAuth flow. 
                      This endpoint is called automatically by Google.
                  `,
        tags: ["Social Authentication"],
        parameters: [
          {
            in: "query",
            name: "code",
            schema: { type: "string" },
            description: "Authorization code from Google",
          },
          {
            in: "query",
            name: "state",
            schema: { type: "string" },
            description: "State parameter for security verification",
          },
        ],
        responses: {
          "200": {
            description: "Google authentication successful",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginSuccessResponse" },
                examples: {
                  success: {
                    summary: "Google authentication successful",
                    value: {
                      success: true,
                      message: "Google Wallet Authentication successful",
                      data: {
                        walletAddress:
                          "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
                        publicKey:
                          "0x04a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd",
                        socialType: "google",
                        userData:
                          '{"email":"user@gmail.com","name":"John Doe","picture":"https://..."}',
                      },
                      isActive: true,
                      token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                      timestamp: "2024-01-15T10:30:00.000Z",
                    },
                  },
                },
              },
              "text/html": {
                schema: { type: "string" },
                description:
                  "HTML success page for browser-based authentication",
              },
            },
          },
          "401": {
            description: "Authentication failed or user denied access",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                examples: {
                  authFailed: {
                    summary: "Authentication failed",
                    value: {
                      success: false,
                      message: "Google OAuth failed",
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

    "/oauth/twitter/{appId}/initiate-twitter-auth": {
      get: {
        summary: "Initiate Twitter OAuth flow",
        description: `
                      Redirects the user to Twitter's OAuth consent screen.
                      Requires appId as a path parameter.
                      Uses OAuth 1.0a authentication flow.
                  `,
        tags: ["Social Authentication"],
        parameters: [
          {
            in: "path",
            name: "appId",
            required: true,
            schema: { type: "string" },
            description: "Unique application ID for identifying the client app",
          },
          {
            in: "query",
            name: "socketAuthId",
            required: false,
            schema: { type: "string" },
            description: "Socket authentication ID for real-time communication",
          },
        ],
        responses: {
          "302": {
            description: "Redirect to Twitter OAuth consent screen",
            headers: {
              Location: {
                description: "Twitter OAuth authorization URL",
                schema: {
                  type: "string",
                  format: "uri",
                  example:
                    "https://api.twitter.com/oauth/authenticate?oauth_token=...",
                },
              },
            },
          },
          "400": {
            description: "Invalid app ID or configuration error",
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

    "/oauth/twitter/callback": {
      get: {
        summary: "Twitter OAuth callback endpoint",
        description: `
                      Handles the callback from Twitter OAuth flow. 
                      This endpoint is called automatically by Twitter.
                      Uses OAuth 1.0a authentication flow.
                  `,
        tags: ["Social Authentication"],
        parameters: [
          {
            in: "query",
            name: "oauth_token",
            schema: { type: "string" },
            description: "OAuth token from Twitter",
          },
          {
            in: "query",
            name: "oauth_verifier",
            schema: { type: "string" },
            description: "OAuth verifier from Twitter",
          },
          {
            in: "query",
            name: "state",
            schema: { type: "string" },
            description: "State parameter for security verification",
          },
        ],
        responses: {
          "200": {
            description: "Twitter authentication successful",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginSuccessResponse" },
                examples: {
                  success: {
                    summary: "Twitter authentication successful",
                    value: {
                      success: true,
                      message: "Twitter Wallet Authentication successful",
                      data: {
                        walletAddress:
                          "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
                        publicKey:
                          "0x04a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd",
                        socialType: "twitter",
                        userData:
                          '{"twitterId":"123456789","username":"johndoe","displayName":"John Doe","email":"user@example.com","photo":"https://pbs.twimg.com/profile_images/...","profileUrl":"https://twitter.com/johndoe"}',
                        username: "johndoe",
                        email: "user@example.com",
                      },
                      isActive: true,
                      token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                      timestamp: "2024-01-15T10:30:00.000Z",
                    },
                  },
                },
              },
              "text/html": {
                schema: { type: "string" },
                description:
                  "HTML success page for browser-based authentication",
              },
            },
          },
          "401": {
            description: "Authentication failed or user denied access",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                examples: {
                  authFailed: {
                    summary: "Authentication failed",
                    value: {
                      success: false,
                      message: "Twitter OAuth failed",
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

    "/oauth/twitter/failure": {
      get: {
        summary: "Twitter OAuth failure endpoint",
        description: `
                      Handles Twitter OAuth authentication failures.
                      Returns detailed error information.
                  `,
        tags: ["Social Authentication"],
        parameters: [
          {
            in: "query",
            name: "error",
            schema: { type: "string" },
            description: "Error code from Twitter OAuth",
          },
          {
            in: "query",
            name: "error_description",
            schema: { type: "string" },
            description: "Detailed error description from Twitter OAuth",
          },
        ],
        responses: {
          "401": {
            description: "Twitter OAuth authentication failed",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                examples: {
                  denied: {
                    summary: "User denied authorization",
                    value: {
                      success: false,
                      message: "Twitter OAuth failed",
                      error: "access_denied",
                      errorDescription: "User denied access to Twitter account",
                      timestamp: "2024-01-15T10:30:00.000Z",
                    },
                  },
                  invalidToken: {
                    summary: "Invalid OAuth token",
                    value: {
                      success: false,
                      message: "Twitter OAuth failed",
                      error: "invalid_token",
                      errorDescription: "Invalid OAuth token provided",
                      timestamp: "2024-01-15T10:30:00.000Z",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    "/oauth/social/user-info": {
      get: {
        summary: "Get social login user information",
        description: `
                      Retrieves authenticated user information for social login users.
                      Requires valid JWT token in Authorization header.
                  `,
        tags: ["Social Authentication"],
        security: [{ BearerAuth: [] }],
        responses: {
          "200": {
            description: "User information retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/WalletData" },
                    timestamp: { type: "string", format: "date-time" },
                  },
                },
                examples: {
                  twitterUser: {
                    summary: "Twitter user information",
                    value: {
                      success: true,
                      data: {
                        walletAddress:
                          "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
                        publicKey:
                          "0x04a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd",
                        socialType: "twitter",
                        userData:
                          '{"twitterId":"123456789","username":"johndoe","displayName":"John Doe"}',
                        username: "johndoe",
                        email: "user@example.com",
                      },
                      timestamp: "2024-01-15T10:30:00.000Z",
                    },
                  },
                  googleUser: {
                    summary: "Google user information",
                    value: {
                      success: true,
                      data: {
                        walletAddress:
                          "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
                        publicKey:
                          "0x04a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd",
                        socialType: "google",
                        userData:
                          '{"email":"user@gmail.com","name":"John Doe","picture":"https://..."}',
                        email: "user@gmail.com",
                      },
                      timestamp: "2024-01-15T10:30:00.000Z",
                    },
                  },
                },
              },
            },
          },
          "401": {
            description: "Unauthorized - invalid or missing JWT token",
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
  },
};
