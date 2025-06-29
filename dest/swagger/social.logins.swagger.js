/**
 * Swagger documentation for social logins
 */
export const socialLoginsSwagger = {
    tags: [
        {
            name: 'Social wallet Authentication',
            description: 'User authentication endpoints'
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
                    },
                    otp: {
                        type: 'string',
                        example: '123456',
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
                    data: {
                        type: 'object',
                        properties: {
                            walletAddress: {
                                type: 'string',
                                example: '0x...'
                            },
                            publicKey: {
                                type: 'string',
                                example: '0x...'
                            },
                        },
                    },
                },
            },
        },
    },
    paths: {
        '/oauth/email/{appId}/email-login': {
            post: {
                summary: 'Login or register with email',
                tags: ['Social wallet Authentication'],
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
                    '201': {
                        description: 'OTP sent for verification',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/SuccessResponse'
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
                summary: 'Verify wallet account',
                tags: ['Social wallet Authentication'],
                security: [
                    {
                        BearerAuth: [],
                    },
                ],
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
                                $ref: '#/components/schemas/WalletVerifyRequest',
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Wallet verified successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/SuccessResponse'
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
        '/oauth/email/{appId}/resend-email-otp': {
            post: {
                summary: 'Resend email OTP',
                tags: ['Social wallet Authentication'],
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
                                    $ref: '#/components/schemas/SuccessResponse'
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
                tags: ['Social wallet Authentication'],
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
    },
};
