export const cryptoTransactionSwagger = {
    tags: [
        {
            name: 'Crypto Transactions',
            description: 'Endpoints for ETH and ERC20 token transfers, contract calls, and wallet info',
        },
    ],
    components: {
        schemas: {
            SendETHRequest: {
                type: 'object',
                required: ['to', 'value', 'chain'],
                properties: {
                    to: { type: 'string', example: '0xabc123...', description: 'Recipient address' },
                    value: { type: 'string', example: '0.01', description: 'Amount of ETH to send' },
                    chain: { type: 'object', description: 'Chain object (e.g., from viem/chains)' },
                },
            },
            SendERC20Request: {
                type: 'object',
                required: ['tokenAddress', 'to', 'amount', 'chain'],
                properties: {
                    tokenAddress: { type: 'string', example: '0xToken...', description: 'ERC20 token contract address' },
                    to: { type: 'string', example: '0xRecipient...', description: 'Recipient address' },
                    amount: { type: 'string', example: '100', description: 'Amount of tokens to send' },
                    decimals: { type: 'integer', example: 18, description: 'Token decimals (optional)' },
                    chain: { type: 'object', description: 'Chain object (e.g., from viem/chains)' },
                },
            },
            ExecuteContractRequest: {
                type: 'object',
                required: ['contractAddress', 'abi', 'functionName'],
                properties: {
                    contractAddress: { type: 'string', example: '0xContract...', description: 'Smart contract address' },
                    abi: { type: 'array', items: { type: 'object' }, description: 'Contract ABI JSON' },
                    functionName: { type: 'string', example: 'transfer', description: 'Function to execute' },
                    args: { type: 'array', example: ['0xabc...', '100'], description: 'Function arguments' },
                    value: { type: 'string', example: '0', description: 'ETH value to send' },
                    chain: { type: 'object', description: 'Chain object' },
                },
            },
            WalletInfoResponse: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: true },
                    walletId: { type: 'string' },
                    registeredAddress: { type: 'string' },
                    currentAddress: { type: 'string' },
                    isActive: { type: 'boolean' },
                    createdAt: { type: 'string' },
                    updatedAt: { type: 'string' },
                },
            },
            TransactionResponse: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: true },
                    fromAddress: { type: 'string' },
                    toAddress: { type: 'string' },
                    tokenAddress: { type: 'string' },
                    transactionHash: { type: 'string' },
                    receipt: { type: 'object' },
                },
            },
            ErrorResponse: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'Error message' },
                },
            },
        },
        securitySchemes: {
            BearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
            },
        },
    },
    paths: {
        '/crypto/send-eth': {
            post: {
                summary: 'Send ETH',
                tags: ['Crypto Transactions'],
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/SendETHRequest' },
                        },
                    },
                },
                responses: {
                    200: {
                        description: 'ETH sent successfully',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/TransactionResponse' },
                            },
                        },
                    },
                    400: {
                        description: 'Bad request',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
                    },
                    500: {
                        description: 'Server error',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
                    },
                },
            },
        },
        '/crypto/send-erc20': {
            post: {
                summary: 'Send ERC20 Tokens',
                tags: ['Crypto Transactions'],
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/SendERC20Request' },
                        },
                    },
                },
                responses: {
                    200: {
                        description: 'ERC20 transfer successful',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/TransactionResponse' },
                            },
                        },
                    },
                    400: {
                        description: 'Bad request',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
                    },
                    500: {
                        description: 'Server error',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
                    },
                },
            },
        },
        '/crypto/wallet-info': {
            get: {
                summary: 'Get Wallet Info',
                tags: ['Crypto Transactions'],
                security: [{ BearerAuth: [] }],
                responses: {
                    200: {
                        description: 'Wallet info retrieved',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/WalletInfoResponse' },
                            },
                        },
                    },
                    404: {
                        description: 'Wallet not found',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
                    },
                    500: {
                        description: 'Server error',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
                    },
                },
            },
        },
        '/crypto/execute-contract': {
            post: {
                summary: 'Execute Contract Function',
                tags: ['Crypto Transactions'],
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/ExecuteContractRequest' },
                        },
                    },
                },
                responses: {
                    200: {
                        description: 'Contract function executed',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/TransactionResponse' },
                            },
                        },
                    },
                    400: {
                        description: 'Bad request',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
                    },
                    500: {
                        description: 'Server error',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
                    },
                },
            },
        },
    },
};
