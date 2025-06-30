/**
 * Swagger documentation for social logins
 */
export const socialLoginsSwagger = {
    tags: [
        {
            name: 'Social Wallet Authentication',
            description: 'User authentication endpoints using social login methods'
        },
    ],
    components: {
        schemas: {
            EmailLoginRequest: {
                type: 'object',
                required: ['email'],
                properties: {
                    email: {
                        type: 'string',
                        format: 'email',
                        example: 'user@example.com',
                        description: 'User email address'
                    },
                },
            },
            WalletVerifyRequest: {
                type: 'object',
                required: ['email', 'otp'],
                properties: {
                    email: {
                        type: 'string',
                        format: 'email',
                        example: 'user@example.com',
                        description: 'User email address'
                    },
                    otp: {
                        type: 'string',
                        example: '123456',
                        description: 'One-time password received via email'
                    },
                },
            },
            WalletResponse: {
                type: 'object',
                properties: {
                    walletAddress: {
                        type: 'string',
                        example: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
                        description: 'Ethereum wallet address'
                    },
                    publicKey: {
                        type: 'string',
                        example: '0x04a34b...',
                        description: 'Wallet public key'
                    },
                    socialType: {
                        type: 'string',
                        example: 'email',
                        description: 'Authentication method used'
                    },
                    userData: {
                        type: 'string',
                        example: '{"email":"user@example.com"}',
                        description: 'Stringified user data'
                    },
                },
            },
            SuccessResponse: {
                type: 'object',
                properties: {
                    success: {
                        type: 'boolean',
                        example: true
                    },
                    message: {
                        type: 'string',
                        example: 'Operation successful'
                    },
                    isActive: {
                        type: 'boolean',
                        description: 'Whether the wallet is already active/verified',
                        example: false
                    },
                    walletExists: {
                        type: 'boolean',
                        description: 'Whether the wallet already existed',
                        example: true
                    },
                    data: {
                        $ref: '#/components/schemas/WalletResponse'
                    },
                    token: {
                        type: 'string',
                        description: 'JWT token for authenticated requests',
                        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                    },
                },
            },
            ErrorResponse: {
                type: 'object',
                properties: {
                    success: {
                        type: 'boolean',
                        example: false
                    },
                    message: {
                        type: 'string',
                        example: 'Error message'
                    },
                },
            },
        },
        securitySchemes: {
            BearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'JWT token obtained after successful verification'
            },
        },
    },
    paths: {
        '/oauth/email/{appId}/email-login': {
            post: {
                summary: 'Login or register with email',
                description: 'Initiates email login/signup. Checks for valid JWT token first. If no valid token exists, sends OTP for verification regardless of whether the wallet exists or is new.',
                tags: ['Social Wallet Authentication'],
                parameters: [
                    {
                        in: 'path',
                        name: 'appId',
                        required: true,
                        schema: {
                            type: 'string',
                        },
                        description: 'The application ID',
                    },
                ],
                security: [{
                    BearerAuth: []
                }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/EmailLoginRequest',
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Returns different responses based on state: 1) If valid token exists - returns wallet details, 2) If wallet exists - OTP sent for verification, 3) If new wallet - OTP sent for new registration',
                        content: {
                            'application/json': {
                                schema: {
                                    oneOf: [
                                        {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean', example: true },
                                                message: { type: 'string', example: 'User already logged in' },
                                                data: { $ref: '#/components/schemas/WalletResponse' },
                                                isActive: { type: 'boolean', example: true },
                                                token: { type: 'string' }
                                            }
                                        },
                                        {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean', example: true },
                                                message: { type: 'string', example: 'OTP sent to email for verification' },
                                                isActive: { type: 'boolean', example: true },
                                                walletExists: { type: 'boolean', example: true }
                                            }
                                        }
                                    ]
                                },
                            },
                        },
                    },
                    '201': {
                        description: 'OTP sent for new wallet registration',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        message: { type: 'string', example: 'OTP sent to email for verification' },
                                        isActive: { type: 'boolean', example: false },
                                        walletExists: { type: 'boolean', example: false }
                                    }
                                },
                            },
                        },
                    },
                    '400': {
                        description: 'Bad request - missing or invalid parameters',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/ErrorResponse'
                                },
                            },
                        },
                    },
                    '500': {
                        description: 'Internal server error',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/ErrorResponse'
                                },
                            },
                        },
                    },
                },
            },
        },
        '/oauth/email/{appId}/wallet-verify': {
            post: {
                summary: 'Verify wallet account with OTP',
                description: 'Verifies the OTP sent to email and activates the wallet if successful. If a valid JWT token is provided and matches the wallet, returns wallet details without OTP verification.',
                tags: ['Social Wallet Authentication'],
                parameters: [
                    {
                        in: 'path',
                        name: 'appId',
                        required: true,
                        schema: {
                            type: 'string',
                        },
                        description: 'The application ID',
                    },
                ],
                security: [{
                    BearerAuth: []
                }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/WalletVerifyRequest',
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Returns either: 1) Wallet details if valid token exists, or 2) Success response after OTP verification',
                        content: {
                            'application/json': {
                                schema: {
                                    oneOf: [
                                        {
                                            $ref: '#/components/schemas/SuccessResponse'
                                        },
                                        {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean', example: true },
                                                message: { type: 'string', example: 'User already logged in' },
                                                data: { $ref: '#/components/schemas/WalletResponse' },
                                                isActive: { type: 'boolean', example: true },
                                                token: { type: 'string' }
                                            }
                                        }
                                    ]
                                },
                            },
                        },
                    },
                    '400': {
                        description: 'Bad request - invalid OTP, expired OTP, or wallet not found',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/ErrorResponse'
                                },
                            },
                        },
                    },
                    '401': {
                        description: 'Unauthorized - invalid or expired OTP',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/ErrorResponse'
                                },
                            },
                        },
                    },
                    '500': {
                        description: 'Internal server error',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/ErrorResponse'
                                },
                            },
                        },
                    },
                },
            },
        },
        '/oauth/email/{appId}/resend-email-otp': {
            post: {
                summary: 'Resend email OTP',
                description: 'Resends the OTP to the email address for verification.',
                tags: ['Social Wallet Authentication'],
                parameters: [
                    {
                        in: 'path',
                        name: 'appId',
                        required: true,
                        schema: {
                            type: 'string',
                        },
                        description: 'The application ID',
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/EmailLoginRequest',
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'OTP resent to email for verification',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        message: { type: 'string', example: 'OTP resent to email for verification' }
                                    }
                                },
                            },
                        },
                    },
                    '400': {
                        description: 'Bad request - wallet not found',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/ErrorResponse'
                                },
                            },
                        },
                    },
                    '500': {
                        description: 'Internal server error',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/ErrorResponse'
                                },
                            },
                        },
                    },
                },
            },
        },
        '/oauth/google/{appId}/initiate-google-auth': {
            get: {
                summary: 'Initiate Google OAuth flow',
                description: 'Redirects to Google OAuth consent screen for authentication',
                tags: ['Social Wallet Authentication'],
                parameters: [
                    {
                        in: 'path',
                        name: 'appId',
                        required: true,
                        schema: {
                            type: 'string',
                        },
                        description: 'The application ID',
                    },
                ],
                responses: {
                    '302': {
                        description: 'Redirect to Google OAuth consent screen',
                        headers: {
                            Location: {
                                description: 'URL to redirect to',
                                schema: { type: 'string' }
                            }
                        }
                    },
                    '400': {
                        description: 'Bad request - missing or invalid parameters',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/ErrorResponse'
                                },
                            },
                        },
                    },
                    '500': {
                        description: 'Internal server error',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/ErrorResponse'
                                },
                            },
                        },
                    },
                },
            },
        },
        '/oauth/google/{appId}/callback': {
            get: {
                summary: 'Google OAuth callback',
                description: 'Callback endpoint for Google OAuth flow',
                tags: ['Social Wallet Authentication'],
                parameters: [
                    {
                        in: 'path',
                        name: 'appId',
                        required: true,
                        schema: {
                            type: 'string',
                        },
                        description: 'The application ID',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Google authentication successful',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        message: { type: 'string', example: 'Google Wallet Authentication successful' }
                                    }
                                },
                            },
                        },
                    },
                    '401': {
                        description: 'Unauthorized - authentication failed',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/ErrorResponse'
                                },
                            },
                        },
                    },
                    '500': {
                        description: 'Internal server error',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/ErrorResponse'
                                },
                            },
                        },
                    },
                },
            },
        },
    },
};