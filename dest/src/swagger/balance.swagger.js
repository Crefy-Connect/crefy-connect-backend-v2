/**
 * Swagger documentation for Balance endpoints
 */
export const balanceSwagger = {
    openapi: "3.0.0",
    info: {
        title: "Balance API",
        version: "1.0.0",
        description: "API documentation for wallet balance queries across multiple networks",
    },
    servers: [
        {
            url: "https://api.example.com/v1",
            description: "Production server",
        },
    ],
    tags: [
        {
            name: "Balances",
            description: "Wallet balance query endpoints",
        },
    ],
    components: {
        schemas: {
        // ... (keep all existing schemas from previous version)
        },
        securitySchemes: {
        // ... (keep all existing security schemes)
        },
    },
    paths: {
        "/balance/my/balances": {
            get: {
                summary: "Get balances for authenticated user",
                description: `
                    Retrieves complete balance information for the currently authenticated user's wallet.
                    Uses the JWT token from Authorization header to identify the wallet.
                    Returns both native token balances (ETH) and USDT token balances across all supported networks.
                    No need to provide wallet address as it's extracted from the JWT token.
                `,
                tags: ["Balances"],
                security: [{ BearerAuth: [] }],
                responses: {
                    "200": {
                        description: "Balances retrieved successfully",
                        content: {
                            "application/json": {
                                schema: {
                                    allOf: [
                                        { $ref: "#/components/schemas/ApiResponse" },
                                        {
                                            type: "object",
                                            properties: {
                                                data: { $ref: "#/components/schemas/BalanceSummary" },
                                            },
                                        },
                                    ],
                                },
                                examples: {
                                    success: {
                                        summary: "User balances retrieved",
                                        value: {
                                            success: true,
                                            message: "Balances fetched successfully",
                                            data: {
                                                walletAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
                                                balances: {
                                                    nativeBalances: [
                                                        {
                                                            balance: "1500000000000000000",
                                                            formattedBalance: "1.5",
                                                            symbol: "ETH",
                                                            network: "ethereum",
                                                        },
                                                    ],
                                                    usdtBalances: [
                                                        {
                                                            balance: "750000000",
                                                            formattedBalance: "750.0",
                                                            symbol: "USDT",
                                                            tokenName: "Tether USD",
                                                            tokenAddress: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
                                                            tokenDecimals: 6,
                                                            network: "ethereum",
                                                        },
                                                    ],
                                                },
                                            },
                                            timestamp: "2024-01-15T10:30:00.000Z",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "401": {
                        description: "Authentication failed",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                                examples: {
                                    missingToken: {
                                        summary: "Missing token",
                                        value: {
                                            success: false,
                                            message: "Authorization token required",
                                            timestamp: "2024-01-15T10:30:00.000Z",
                                        },
                                    },
                                    invalidToken: {
                                        summary: "Invalid token",
                                        value: {
                                            success: false,
                                            message: "Invalid or expired token",
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
        "/balance/my/network/{network}/balance": {
            get: {
                summary: "Get specific network balance for authenticated user",
                description: `
                    Retrieves balance information for the authenticated user on a specific network.
                    Uses the JWT token from Authorization header to identify the wallet.
                    Can return either native token balance or USDT token balance based on the token query parameter.
                `,
                tags: ["Balances"],
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        name: "network",
                        in: "path",
                        required: true,
                        description: "Blockchain network",
                        schema: {
                            type: "string",
                            enum: ["ethereum", "sepolia", "base", "baseSepolia"],
                            example: "ethereum",
                        },
                    },
                    {
                        name: "token",
                        in: "query",
                        required: false,
                        description: "Token type to query (omit for native token)",
                        schema: {
                            type: "string",
                            enum: ["usdt"],
                            example: "usdt",
                        },
                    },
                ],
                responses: {
                    "200": {
                        description: "Balance retrieved successfully",
                        content: {
                            "application/json": {
                                schema: {
                                    allOf: [
                                        { $ref: "#/components/schemas/ApiResponse" },
                                        {
                                            type: "object",
                                            properties: {
                                                data: {
                                                    $ref: "#/components/schemas/NetworkBalanceResponse",
                                                },
                                            },
                                        },
                                    ],
                                },
                                examples: {
                                    nativeBalance: {
                                        summary: "Native token balance",
                                        value: {
                                            success: true,
                                            message: "Balance fetched successfully",
                                            data: {
                                                walletAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
                                                network: "ethereum",
                                                balance: {
                                                    balance: "1000000000000000000",
                                                    formattedBalance: "1.0",
                                                    symbol: "ETH",
                                                    network: "ethereum",
                                                },
                                            },
                                            timestamp: "2024-01-15T10:30:00.000Z",
                                        },
                                    },
                                    usdtBalance: {
                                        summary: "USDT token balance",
                                        value: {
                                            success: true,
                                            message: "Balance fetched successfully",
                                            data: {
                                                walletAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
                                                network: "ethereum",
                                                balance: {
                                                    balance: "500000000",
                                                    formattedBalance: "500.0",
                                                    symbol: "USDT",
                                                    tokenName: "Tether USD",
                                                    tokenAddress: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
                                                    tokenDecimals: 6,
                                                    network: "ethereum",
                                                },
                                            },
                                            timestamp: "2024-01-15T10:30:00.000Z",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "400": {
                        description: "Invalid parameters",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                                examples: {
                                    invalidNetwork: {
                                        summary: "Invalid network",
                                        value: {
                                            success: false,
                                            message: "Unsupported network",
                                            timestamp: "2024-01-15T10:30:00.000Z",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "401": {
                        description: "Authentication failed",
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
        "/balance/wallet/{walletAddress}/balances": {
            get: {
                summary: "Get all balances for a wallet address (Developer only)",
                description: `
                    Retrieves complete balance information for a specific wallet address across all supported networks.
                    This is a developer-only endpoint that requires API key authentication.
                    Returns both native token balances (ETH) and USDT token balances for all supported networks.
                `,
                tags: ["Balances"],
                security: [{ ApiKeyAuth: [] }],
                parameters: [
                    {
                        name: "walletAddress",
                        in: "path",
                        required: true,
                        description: "Ethereum wallet address (0x format)",
                        schema: {
                            type: "string",
                            pattern: "^0x[a-fA-F0-9]{40}$",
                            example: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
                        },
                    },
                ],
                responses: {
                    "200": {
                        description: "Balances retrieved successfully",
                        content: {
                            "application/json": {
                                schema: {
                                    allOf: [
                                        { $ref: "#/components/schemas/ApiResponse" },
                                        {
                                            type: "object",
                                            properties: {
                                                data: { $ref: "#/components/schemas/BalanceSummary" },
                                            },
                                        },
                                    ],
                                },
                            },
                        },
                    },
                    "401": {
                        description: "Authentication failed",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                            },
                        },
                    },
                    "403": {
                        description: "Access forbidden",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                                examples: {
                                    walletNotInApp: {
                                        summary: "Wallet not in application",
                                        value: {
                                            success: false,
                                            message: "Wallet does not belong to this application",
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
    },
};
