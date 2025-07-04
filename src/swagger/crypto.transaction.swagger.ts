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
                    chain: {
                        type: 'string',
                        enum: ['avalancheFuji', 'baseSepolia', 'scrollSepolia', 'base'],
                        description: 'Chain network to use'
                    },
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
                    chain: {
                        type: 'string',
                        enum: ['avalancheFuji', 'baseSepolia', 'scrollSepolia', 'base'],
                        description: 'Chain network to use'
                    },
                },
            },
            ExecuteContractRequest: {
                type: 'object',
                required: ['contractAddress', 'abi', 'functionName', 'chain'],
                properties: {
                    contractAddress: { type: 'string', example: '0xContract...', description: 'Smart contract address' },
                    abi: { type: 'array', items: { type: 'object' }, description: 'Contract ABI JSON' },
                    functionName: { type: 'string', example: 'transfer', description: 'Function to execute' },
                    args: { type: 'array', example: ['0xabc...', '100'], description: 'Function arguments' },
                    value: { type: 'string', example: '0', description: 'ETH value to send' },
                    chain: {
                        type: 'string',
                        enum: ['avalancheFuji', 'baseSepolia', 'scrollSepolia', 'base'],
                        description: 'Chain network to use'
                    },
                },
            },
            WalletInfoResponse: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: true },
                    walletId: { type: 'string', description: 'MongoDB wallet ID' },
                    walletEmail: { type: 'string', description: 'Email associated with the wallet' },
                    socialType: { type: 'string', description: 'Social login type used' },
                    smartWalletAddress: { type: 'string', description: 'Smart wallet address' },
                    socialWalletAddress: { type: 'string', description: 'Current address from AA service' },
                    balance: { type: 'number', description: 'Wallet balance in ETH' },
                    isActive: { type: 'boolean', description: 'Wallet activation status' },
                    createdAt: { type: 'string', format: 'date-time', description: 'Creation timestamp' },
                    updatedAt: { type: 'string', format: 'date-time', description: 'Last update timestamp' },
                },
            },
            TransactionResponse: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: true },
                    fromAddress: { type: 'string', description: 'Sender address' },
                    toAddress: { type: 'string', description: 'Recipient address (for ETH/ERC20)' },
                    tokenAddress: { type: 'string', description: 'ERC20 token address (for ERC20 transfers)' },
                    transactionHash: { type: 'string', description: 'Transaction hash' },
                    receipt: {
                        type: 'object',
                        properties: {
                            blockHash: { type: 'string' },
                            gasUsed: { type: 'string' },
                            status: { type: 'number' },
                            type: { type: 'string' },
                            transactionHash: { type: 'string' },
                            blockNumber: { type: 'string' },
                            effectiveGasPrice: { type: 'string' },
                            logsCount: { type: 'number' }
                        },
                        description: 'Transaction receipt details'
                    },
                },
            },
            ErrorResponse: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'Error message' },
                    error: { type: 'string', description: 'Detailed error message' },
                    address: { type: 'string', description: 'Wallet address if available' },
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
                                example: {
                                    success: true,
                                    fromAddress: "0x123...",
                                    toAddress: "0xabc...",
                                    transactionHash: "0x456...",
                                    receipt: {
                                        blockHash: "0x789...",
                                        gasUsed: "21000",
                                        status: 1,
                                        type: "0x2"
                                    }
                                }
                            },
                        },
                    },
                    400: {
                        description: 'Bad request',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' },
                                example: {
                                    success: false,
                                    message: "recipient address, value amount and chain network are required"
                                }
                            }
                        },
                    },
                    500: {
                        description: 'Server error',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' },
                                example: {
                                    error: "Error message",
                                    address: "0x123..."
                                }
                            }
                        },
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
                            example: {
                                tokenAddress: "0xToken...",
                                to: "0xRecipient...",
                                amount: "100",
                                decimals: 18,
                                chain: "baseSepolia"
                            }
                        },
                    },
                },
                responses: {
                    200: {
                        description: 'ERC20 transfer successful',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/TransactionResponse' },
                                example: {
                                    success: true,
                                    fromAddress: "0x123...",
                                    toAddress: "0xabc...",
                                    tokenAddress: "0xToken...",
                                    transactionHash: "0x456...",
                                    receipt: {
                                        transactionHash: "0x456...",
                                        blockNumber: "123456",
                                        status: 1,
                                        gasUsed: "50000",
                                        effectiveGasPrice: "1000000000",
                                        logsCount: 2
                                    }
                                }
                            },
                        },
                    },
                    400: {
                        description: 'Bad request',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' },
                                example: {
                                    error: "Wallet ID, token address, recipient, and amount are required"
                                }
                            }
                        },
                    },
                    500: {
                        description: 'Server error',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' },
                                example: {
                                    error: "Error message",
                                    address: "0x123..."
                                }
                            }
                        },
                    },
                },
            },
        },
        '/crypto/wallet-info': {
            get: {
                summary: 'Get Wallet Information',
                description: 'Retrieve wallet details including addresses and balance',
                tags: ['Crypto Transactions'],
                security: [{ BearerAuth: [] }],
                responses: {
                    200: {
                        description: 'Wallet info retrieved',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/WalletInfoResponse' },
                                example: {
                                    success: true,
                                    walletId: "65a1b...",
                                    walletEmail: "user@example.com",
                                    socialType: "google",
                                    smartWalletAddress: "0x123...",
                                    socialWalletAddress: "0x456...",
                                    balance: 0.5,
                                    isActive: true,
                                    createdAt: "2024-01-12T10:30:00Z",
                                    updatedAt: "2024-01-12T10:30:00Z"
                                }
                            },
                        },
                    },
                    400: {
                        description: 'Bad request',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' },
                                example: {
                                    error: "Wallet ID is required"
                                }
                            }
                        },
                    },
                    404: {
                        description: 'Wallet not found',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' },
                                example: {
                                    error: "Wallet not found"
                                }
                            }
                        },
                    },
                    500: {
                        description: 'Server error',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' },
                                example: {
                                    error: "Error message"
                                }
                            }
                        },
                    },
                },
            },
        },
        '/crypto/execute-contract': {
            post: {
                summary: 'Execute Smart Contract Function',
                description: 'Execute a function on a smart contract using the wallet',
                tags: ['Crypto Transactions'],
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/ExecuteContractRequest' },
                            example: {
                                contractAddress: "0xContract...",
                                abi: [{ "inputs": [], "name": "myFunction", "outputs": [], "stateMutability": "nonpayable", "type": "function" }],
                                functionName: "myFunction",
                                args: [],
                                value: "0",
                                chain: "baseSepolia"
                            }
                        },
                    },
                },
                responses: {
                    200: {
                        description: 'Contract function executed',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/TransactionResponse' },
                                example: {
                                    success: true,
                                    fromAddress: "0x123...",
                                    contractAddress: "0xContract...",
                                    transactionHash: "0x456...",
                                    receipt: {
                                        transactionHash: "0x456...",
                                        blockNumber: "123456",
                                        status: 1,
                                        gasUsed: "50000",
                                        effectiveGasPrice: "1000000000",
                                        logsCount: 2
                                    }
                                }
                            },
                        },
                    },
                    400: {
                        description: 'Bad request',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' },
                                example: {
                                    error: "Wallet ID, contract address, ABI, and function name are required"
                                }
                            }
                        },
                    },
                    500: {
                        description: 'Server error',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' },
                                example: {
                                    error: "Error message",
                                    address: "0x123..."
                                }
                            }
                        },
                    },
                },
            },
        },
    },
};