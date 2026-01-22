export const cryptoTransactionSwagger = {
    tags: [
        {
            name: "Crypto Transactions",
            description: "Blockchain transaction endpoints for ETH transfers, ERC20 tokens, and smart contract interactions",
        },
    ],
    components: {
        schemas: {
            // Request Schemas
            SendETHRequest: {
                type: "object",
                required: ["to", "value", "chain"],
                properties: {
                    to: {
                        type: "string",
                        pattern: "^0x[a-fA-F0-9]{40}$",
                        example: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
                        description: "Recipient wallet address",
                    },
                    value: {
                        type: "string",
                        pattern: "^[0-9]+(\\.[0-9]+)?$",
                        example: "0.01",
                        description: "Amount of ETH to send (in ETH, not wei)",
                    },
                    chain: {
                        type: "string",
                        enum: ["avalancheFuji", "baseSepolia", "scrollSepolia", "base"],
                        description: "Blockchain network to use for the transaction",
                    },
                    mode: {
                        type: "string",
                        enum: ["SPONSORED", "FEE"],
                        default: "SPONSORED",
                        description: "Transaction mode (SPONSORED for gasless, FEE for self-paid)",
                    },
                },
                additionalProperties: false,
            },
            SendERC20Request: {
                type: "object",
                required: ["tokenAddress", "to", "amount", "chain"],
                properties: {
                    tokenAddress: {
                        type: "string",
                        pattern: "^0x[a-fA-F0-9]{40}$",
                        example: "0xA0b86a33E6441b8435b662f0E2d0B8A0E6F4b5C2",
                        description: "ERC20 token contract address",
                    },
                    to: {
                        type: "string",
                        pattern: "^0x[a-fA-F0-9]{40}$",
                        example: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
                        description: "Recipient wallet address",
                    },
                    amount: {
                        type: "string",
                        pattern: "^[0-9]+(\\.[0-9]+)?$",
                        example: "100.5",
                        description: "Amount of tokens to send (in token units, not smallest denomination)",
                    },
                    decimals: {
                        type: "integer",
                        minimum: 0,
                        maximum: 18,
                        default: 18,
                        example: 18,
                        description: "Token decimal places (defaults to 18 if not specified)",
                    },
                    chain: {
                        type: "string",
                        enum: ["avalancheFuji", "baseSepolia", "scrollSepolia", "base"],
                        description: "Blockchain network to use for the transaction",
                    },
                    mode: {
                        type: "string",
                        enum: ["SPONSORED", "FEE"],
                        default: "SPONSORED",
                        description: "Transaction mode (SPONSORED for gasless, FEE for self-paid)",
                    },
                },
                additionalProperties: false,
            },
            ExecuteContractRequest: {
                type: "object",
                required: ["contractAddress", "abi", "functionName", "chain"],
                properties: {
                    contractAddress: {
                        type: "string",
                        pattern: "^0x[a-fA-F0-9]{40}$",
                        example: "0xA0b86a33E6441b8435b662f0E2d0B8A0E6F4b5C2",
                        description: "Smart contract address",
                    },
                    abi: {
                        type: "array",
                        items: { type: "object" },
                        description: "Contract ABI (Application Binary Interface) as JSON array",
                        example: [
                            {
                                inputs: [
                                    { name: "to", type: "address" },
                                    { name: "amount", type: "uint256" },
                                ],
                                name: "transfer",
                                outputs: [{ name: "", type: "bool" }],
                                stateMutability: "nonpayable",
                                type: "function",
                            },
                        ],
                    },
                    functionName: {
                        type: "string",
                        example: "transfer",
                        description: "Name of the contract function to execute",
                    },
                    args: {
                        type: "array",
                        items: {},
                        default: [],
                        example: ["0x742d35Cc6634C0532925a3b844Bc454e4438f44e", "1000000000000000000"],
                        description: "Array of function arguments in the correct order",
                    },
                    value: {
                        type: "string",
                        pattern: "^[0-9]+(\\.[0-9]+)?$",
                        default: "0",
                        example: "0.01",
                        description: "Amount of ETH to send with the transaction (in ETH, not wei)",
                    },
                    chain: {
                        type: "string",
                        enum: ["avalancheFuji", "baseSepolia", "scrollSepolia", "base"],
                        description: "Blockchain network to use for the transaction",
                    },
                    mode: {
                        type: "string",
                        enum: ["SPONSORED", "FEE"],
                        default: "SPONSORED",
                        description: "Transaction mode (SPONSORED for gasless, FEE for self-paid)",
                    },
                },
                additionalProperties: false,
            },
            // Response Schemas
            TransactionReceipt: {
                type: "object",
                properties: {
                    transactionHash: {
                        type: "string",
                        pattern: "^0x[a-fA-F0-9]{64}$",
                        example: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
                        description: "Transaction hash",
                    },
                    blockNumber: {
                        type: "string",
                        example: "12345678",
                        description: "Block number where transaction was mined",
                    },
                    blockHash: {
                        type: "string",
                        pattern: "^0x[a-fA-F0-9]{64}$",
                        example: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
                        description: "Hash of the block containing the transaction",
                    },
                    status: {
                        type: "string",
                        enum: ["success", "reverted"],
                        example: "success",
                        description: "Transaction status",
                    },
                    gasUsed: {
                        type: "string",
                        example: "21000",
                        description: "Amount of gas used by the transaction",
                    },
                    effectiveGasPrice: {
                        type: "string",
                        example: "20000000000",
                        description: "Effective gas price in wei",
                    },
                    type: {
                        type: "string",
                        example: "0x2",
                        description: "Transaction type (EIP-1559, legacy, etc.)",
                    },
                    logsCount: {
                        type: "integer",
                        example: 2,
                        description: "Number of events/logs emitted by the transaction",
                    },
                },
            },
            ChainInfo: {
                type: "object",
                properties: {
                    chain: {
                        type: "string",
                        example: "baseSepolia",
                        description: "Blockchain network name",
                    },
                    accountAddress: {
                        type: "string",
                        example: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
                        description: "Smart account address on this chain",
                    },
                    isDeployed: {
                        type: "boolean",
                        example: true,
                        description: "Whether the account is deployed on-chain",
                    },
                    accountVersion: {
                        type: "string",
                        enum: ["V2", "NEXUS", "UNKNOWN"],
                        example: "NEXUS",
                        description: "Version of the smart account",
                    },
                    nativeBalance: {
                        type: "string",
                        example: "1.5",
                        description: "Native token balance (ETH/AVAX/etc.)",
                    },
                    tokenBalances: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                symbol: {
                                    type: "string",
                                    example: "USDC",
                                    description: "Token symbol",
                                },
                                address: {
                                    type: "string",
                                    example: "0xA0b86a33E6441b8435b662f0E2d0B8A0E6F4b5C2",
                                    description: "Token contract address",
                                },
                                balance: {
                                    type: "string",
                                    example: "100.5",
                                    description: "Token balance",
                                },
                                decimals: {
                                    type: "integer",
                                    example: 6,
                                    description: "Token decimals",
                                },
                            },
                        },
                        description: "Token balances on this chain",
                    },
                },
            },
            WalletInfoResponse: {
                allOf: [
                    { $ref: "#/components/schemas/ApiResponse" },
                    {
                        type: "object",
                        properties: {
                            success: { type: "boolean", example: true },
                            data: {
                                type: "object",
                                properties: {
                                    walletId: {
                                        type: "string",
                                        example: "65a1b2c3d4e5f6789012345",
                                        description: "MongoDB wallet document ID",
                                    },
                                    walletEmail: {
                                        type: "string",
                                        format: "email",
                                        example: "user@example.com",
                                        description: "Email associated with the wallet",
                                    },
                                    socialType: {
                                        type: "string",
                                        enum: ["email", "google", "facebook", "twitter"],
                                        example: "email",
                                        description: "Social login method used",
                                    },
                                    isActive: {
                                        type: "boolean",
                                        example: true,
                                        description: "Whether the wallet is active and verified",
                                    },
                                    chains: {
                                        type: "array",
                                        items: { $ref: "#/components/schemas/ChainInfo" },
                                        description: "Account information across different chains",
                                    },
                                    createdAt: {
                                        type: "string",
                                        format: "date-time",
                                        example: "2024-01-15T10:30:00.000Z",
                                        description: "Wallet creation timestamp",
                                    },
                                    updatedAt: {
                                        type: "string",
                                        format: "date-time",
                                        example: "2024-01-15T10:30:00.000Z",
                                        description: "Last update timestamp",
                                    },
                                },
                            },
                        },
                    },
                ],
            },
            TransactionResponse: {
                allOf: [
                    { $ref: "#/components/schemas/ApiResponse" },
                    {
                        type: "object",
                        properties: {
                            success: { type: "boolean", example: true },
                            data: {
                                type: "object",
                                properties: {
                                    fromAddress: {
                                        type: "string",
                                        pattern: "^0x[a-fA-F0-9]{40}$",
                                        example: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
                                        description: "Sender wallet address",
                                    },
                                    toAddress: {
                                        type: "string",
                                        pattern: "^0x[a-fA-F0-9]{40}$",
                                        example: "0xA0b86a33E6441b8435b662f0E2d0B8A0E6F4b5C2",
                                        description: "Recipient address (for ETH/ERC20 transfers)",
                                    },
                                    contractAddress: {
                                        type: "string",
                                        pattern: "^0x[a-fA-F0-9]{40}$",
                                        example: "0xA0b86a33E6441b8435b662f0E2d0B8A0E6F4b5C2",
                                        description: "Contract address (for contract interactions)",
                                    },
                                    tokenAddress: {
                                        type: "string",
                                        pattern: "^0x[a-fA-F0-9]{40}$",
                                        example: "0xA0b86a33E6441b8435b662f0E2d0B8A0E6F4b5C2",
                                        description: "Token contract address (for ERC20 transfers)",
                                    },
                                    transactionHash: {
                                        type: "string",
                                        pattern: "^0x[a-fA-F0-9]{64}$",
                                        example: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
                                        description: "Transaction hash",
                                    },
                                    receipt: { $ref: "#/components/schemas/TransactionReceipt" },
                                    chain: {
                                        type: "string",
                                        example: "baseSepolia",
                                        description: "Chain where transaction was executed",
                                    },
                                    mode: {
                                        type: "string",
                                        enum: ["SPONSORED", "FEE"],
                                        example: "SPONSORED",
                                        description: "Transaction mode used",
                                    },
                                    value: {
                                        type: "string",
                                        example: "0.01",
                                        description: "Value sent with transaction (if applicable)",
                                    },
                                },
                            },
                        },
                    },
                ],
            },
            SupportedChain: {
                type: "object",
                properties: {
                    name: {
                        type: "string",
                        example: "baseSepolia",
                        description: "Chain identifier used in API",
                    },
                    chainId: {
                        type: "number",
                        example: 84532,
                        description: "Chain ID number",
                    },
                    testnet: {
                        type: "boolean",
                        example: true,
                        description: "Whether this is a testnet",
                    },
                    nativeCurrency: {
                        type: "object",
                        properties: {
                            name: {
                                type: "string",
                                example: "Ether",
                            },
                            symbol: {
                                type: "string",
                                example: "ETH",
                            },
                            decimals: {
                                type: "number",
                                example: 18,
                            },
                        },
                    },
                },
            },
            SupportedChainsResponse: {
                allOf: [
                    { $ref: "#/components/schemas/ApiResponse" },
                    {
                        type: "object",
                        properties: {
                            success: { type: "boolean", example: true },
                            data: {
                                type: "array",
                                items: { $ref: "#/components/schemas/SupportedChain" },
                                description: "List of supported chains",
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
                            address: {
                                type: "string",
                                description: "Wallet address if available",
                            },
                        },
                    },
                ],
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
        },
        securitySchemes: {
            BearerAuth: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT",
                description: "JWT token obtained from wallet authentication",
            },
        },
    },
    paths: {
        "/crypto/send-eth": {
            post: {
                summary: "Send ETH to another address",
                description: `
                  Sends ETH from the authenticated user's smart account to a specified recipient address.
                  
                  **Transaction Modes:**
                  - SPONSORED: Gas fees are paid by the service (default)
                  - FEE: User pays gas fees from their account balance
                  
                  **Important Notes:**
                  - Amount should be specified in ETH (e.g., "0.01" for 0.01 ETH)
                  - For FEE mode, ensure account has sufficient ETH for amount + gas fees
                  - SPONSORED mode requires prior arrangement with the service provider
                  `,
                tags: ["Crypto Transactions"],
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/SendETHRequest" },
                            examples: {
                                sponsoredTransfer: {
                                    summary: "Sponsored ETH transfer (gas-free)",
                                    value: {
                                        to: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
                                        value: "0.01",
                                        chain: "baseSepolia",
                                        mode: "SPONSORED",
                                    },
                                },
                                feeTransfer: {
                                    summary: "Fee-paid ETH transfer",
                                    value: {
                                        to: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
                                        value: "0.005",
                                        chain: "base",
                                        mode: "FEE",
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "ETH transfer successful",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/TransactionResponse" },
                                examples: {
                                    success: {
                                        summary: "Successful ETH transfer",
                                        value: {
                                            success: true,
                                            message: "ETH transfer completed successfully",
                                            data: {
                                                fromAddress: "0x123...",
                                                toAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
                                                transactionHash: "0x1234567890abcdef...",
                                                receipt: {
                                                    transactionHash: "0x1234567890abcdef...",
                                                    blockNumber: "12345678",
                                                    status: "success",
                                                    gasUsed: "21000",
                                                    effectiveGasPrice: "20000000000",
                                                },
                                                chain: "baseSepolia",
                                                mode: "SPONSORED",
                                                value: "0.01",
                                            },
                                            timestamp: "2024-01-15T10:30:00.000Z",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "400": {
                        description: "Invalid request or insufficient funds",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                                examples: {
                                    insufficientFunds: {
                                        summary: "Insufficient funds",
                                        value: {
                                            success: false,
                                            message: "Insufficient funds for transaction",
                                            data: {
                                                code: "INSUFFICIENT_FUNDS",
                                                chain: "baseSepolia",
                                                currentBalance: "0.001",
                                                requiredAmount: "0.01",
                                            },
                                            timestamp: "2024-01-15T10:30:00.000Z",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "500": {
                        description: "Transaction failed or server error",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                            },
                        },
                    },
                },
            },
        },
        "/crypto/send-erc20": {
            post: {
                summary: "Send ERC20 tokens",
                description: `
                  Transfers ERC20 tokens from the authenticated user's smart account to a recipient address.
                  
                  **Transaction Modes:**
                  - SPONSORED: Gas fees are paid by the service (default)
                  - FEE: User pays gas fees from their account balance
                  
                  **Important Notes:**
                  - Amount should be in token units (e.g., "100" for 100 tokens)
                  - Decimals parameter adjusts for token precision (most tokens use 18 decimals)
                  - For FEE mode, requires sufficient ETH balance for gas fees
                  - Token contract must be valid and deployed on the specified chain
                  `,
                tags: ["Crypto Transactions"],
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/SendERC20Request" },
                            examples: {
                                sponsoredTransfer: {
                                    summary: "Sponsored ERC20 transfer",
                                    value: {
                                        tokenAddress: "0xA0b86a33E6441b8435b662f0E2d0B8A0E6F4b5C2",
                                        to: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
                                        amount: "100",
                                        decimals: 18,
                                        chain: "baseSepolia",
                                        mode: "SPONSORED",
                                    },
                                },
                                feeTransfer: {
                                    summary: "Fee-paid ERC20 transfer",
                                    value: {
                                        tokenAddress: "0xA0b86a33E6441b8435b662f0E2d0B8A0E6F4b5C2",
                                        to: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
                                        amount: "50.5",
                                        decimals: 6,
                                        chain: "base",
                                        mode: "FEE",
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "ERC20 transfer successful",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/TransactionResponse" },
                                examples: {
                                    success: {
                                        summary: "Successful ERC20 transfer",
                                        value: {
                                            success: true,
                                            message: "ERC20 transfer completed successfully",
                                            data: {
                                                fromAddress: "0x123...",
                                                toAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
                                                tokenAddress: "0xA0b86a33E6441b8435b662f0E2d0B8A0E6F4b5C2",
                                                transactionHash: "0x1234567890abcdef...",
                                                receipt: {
                                                    transactionHash: "0x1234567890abcdef...",
                                                    blockNumber: "12345678",
                                                    status: "success",
                                                    gasUsed: "65000",
                                                    logsCount: 1,
                                                },
                                                chain: "baseSepolia",
                                                mode: "SPONSORED",
                                                amount: "100",
                                                decimals: 18,
                                            },
                                            timestamp: "2024-01-15T10:30:00.000Z",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "400": {
                        description: "Invalid request parameters",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                            },
                        },
                    },
                    "500": {
                        description: "Transaction failed or server error",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                            },
                        },
                    },
                },
            },
        },
        "/crypto/wallet-info": {
            get: {
                summary: "Get comprehensive wallet information",
                description: `
                  Retrieves detailed wallet information including:
                  - Smart account addresses across all supported chains
                  - Account deployment status and version (V2/NEXUS)
                  - Native token balances
                  - ERC20 token balances
                  - Wallet metadata and status
                  
                  **Account Versions:**
                  - V2: Standard smart account implementation
                  - NEXUS: Advanced account with additional features
                  - UNKNOWN: Account not yet deployed or version not detected
                  `,
                tags: ["Crypto Transactions"],
                security: [{ BearerAuth: [] }],
                responses: {
                    "200": {
                        description: "Wallet information retrieved successfully",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/WalletInfoResponse" },
                                examples: {
                                    success: {
                                        summary: "Complete wallet information",
                                        value: {
                                            success: true,
                                            message: "Wallet information retrieved successfully",
                                            data: {
                                                walletId: "65a1b2c3d4e5f6789012345",
                                                walletEmail: "user@example.com",
                                                socialType: "email",
                                                isActive: true,
                                                chains: [
                                                    {
                                                        chain: "baseSepolia",
                                                        accountAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
                                                        isDeployed: true,
                                                        accountVersion: "NEXUS",
                                                        nativeBalance: "1.5",
                                                        tokenBalances: [
                                                            {
                                                                symbol: "USDC",
                                                                address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
                                                                balance: "100.5",
                                                                decimals: 6,
                                                            },
                                                        ],
                                                    },
                                                    {
                                                        chain: "base",
                                                        accountAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
                                                        isDeployed: false,
                                                        accountVersion: "UNKNOWN",
                                                        nativeBalance: "0",
                                                        tokenBalances: [],
                                                    },
                                                ],
                                                createdAt: "2024-01-15T10:30:00.000Z",
                                                updatedAt: "2024-01-15T10:30:00.000Z",
                                            },
                                            timestamp: "2024-01-15T10:30:00.000Z",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "401": {
                        description: "Unauthorized",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                            },
                        },
                    },
                    "500": {
                        description: "Server error",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                            },
                        },
                    },
                },
            },
        },
        "/crypto/execute-contract": {
            post: {
                summary: "Execute smart contract function",
                description: `
                  Executes a function on a smart contract using the authenticated user's smart account.
                  
                  **Transaction Modes:**
                  - SPONSORED: Gas fees are paid by the service (default)
                  - FEE: User pays gas fees from their account balance
                  
                  **Requirements:**
                  - Valid contract address deployed on the specified chain
                  - Correct ABI for the contract
                  - Function name must exist in the contract
                  - Arguments must match function signature exactly
                  - For FEE mode, sufficient ETH balance for gas fees (and value if sending ETH)
                  `,
                tags: ["Crypto Transactions"],
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/ExecuteContractRequest" },
                            examples: {
                                sponsoredCall: {
                                    summary: "Sponsored contract call",
                                    value: {
                                        contractAddress: "0xA0b86a33E6441b8435b662f0E2d0B8A0E6F4b5C2",
                                        abi: [
                                            {
                                                inputs: [
                                                    { name: "to", type: "address" },
                                                    { name: "amount", type: "uint256" },
                                                ],
                                                name: "transfer",
                                                outputs: [{ name: "", type: "bool" }],
                                                stateMutability: "nonpayable",
                                                type: "function",
                                            },
                                        ],
                                        functionName: "transfer",
                                        args: ["0x742d35Cc6634C0532925a3b844Bc454e4438f44e", "1000000000000000000"],
                                        value: "0",
                                        chain: "baseSepolia",
                                        mode: "SPONSORED",
                                    },
                                },
                                feeCall: {
                                    summary: "Fee-paid contract call with ETH",
                                    value: {
                                        contractAddress: "0xA0b86a33E6441b8435b662f0E2d0B8A0E6F4b5C2",
                                        abi: [
                                            {
                                                inputs: [{ name: "data", type: "string" }],
                                                name: "storeData",
                                                outputs: [],
                                                stateMutability: "payable",
                                                type: "function",
                                            },
                                        ],
                                        functionName: "storeData",
                                        args: ["Hello, blockchain!"],
                                        value: "0.01",
                                        chain: "base",
                                        mode: "FEE",
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "Contract function executed successfully",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/TransactionResponse" },
                                examples: {
                                    success: {
                                        summary: "Successful contract execution",
                                        value: {
                                            success: true,
                                            message: "Contract function executed successfully",
                                            data: {
                                                fromAddress: "0x123...",
                                                contractAddress: "0xA0b86a33E6441b8435b662f0E2d0B8A0E6F4b5C2",
                                                transactionHash: "0x1234567890abcdef...",
                                                receipt: {
                                                    transactionHash: "0x1234567890abcdef...",
                                                    blockNumber: "12345678",
                                                    status: "success",
                                                    gasUsed: "85000",
                                                    logsCount: 3,
                                                },
                                                chain: "baseSepolia",
                                                mode: "SPONSORED",
                                                value: "0",
                                            },
                                            timestamp: "2024-01-15T10:30:00.000Z",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "400": {
                        description: "Invalid contract, ABI, or function parameters",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                            },
                        },
                    },
                    "500": {
                        description: "Contract execution failed or server error",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                            },
                        },
                    },
                },
            },
        },
        "/crypto/supported-chains": {
            get: {
                summary: "Get list of supported chains",
                description: `
                  Returns information about all blockchain networks supported by the API.
                  
                  Includes:
                  - Chain identifiers (used in API requests)
                  - Chain IDs
                  - Network types (testnet/mainnet)
                  - Native currency information
                  `,
                tags: ["Crypto Transactions"],
                responses: {
                    "200": {
                        description: "List of supported chains",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/SupportedChainsResponse" },
                                example: {
                                    success: true,
                                    message: "Supported chains retrieved successfully",
                                    data: [
                                        {
                                            name: "baseSepolia",
                                            chainId: 84532,
                                            testnet: true,
                                            nativeCurrency: {
                                                name: "Ether",
                                                symbol: "ETH",
                                                decimals: 18,
                                            },
                                        },
                                        {
                                            name: "base",
                                            chainId: 8453,
                                            testnet: false,
                                            nativeCurrency: {
                                                name: "Ether",
                                                symbol: "ETH",
                                                decimals: 18,
                                            },
                                        },
                                    ],
                                    timestamp: "2024-01-15T10:30:00.000Z",
                                },
                            },
                        },
                    },
                },
            },
        },
    },
};
