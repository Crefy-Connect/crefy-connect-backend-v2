import { baseSepolia, scrollSepolia, avalancheFuji, base, sepolia } from "viem/chains";
// Extended chains with additional metadata
export const SUPPORTED_CHAINS = [
    {
        ...baseSepolia,
        isTestnet: true,
        logo: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
        faucetUrl: "https://www.alchemy.com/faucets/base-sepolia",
        bridgeUrl: "https://bridge.base.org"
    },
    {
        ...base,
        isTestnet: false,
        logo: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
        bridgeUrl: "https://bridge.base.org"
    },
    {
        ...scrollSepolia,
        isTestnet: true,
        logo: "https://scroll.io/static/media/Scroll_Logomark.673577b5b7ba0b9b0c8d.png",
        faucetUrl: "https://sepolia.scroll.io/bridge",
        bridgeUrl: "https://sepolia.scroll.io/bridge"
    },
    {
        ...avalancheFuji,
        isTestnet: true,
        logo: "https://cryptologos.cc/logos/avalanche-avax-logo.png",
        faucetUrl: "https://faucet.avax.network/",
        bridgeUrl: "https://bridge.avax.network/"
    },
    {
        ...sepolia,
        isTestnet: true,
        logo: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
        faucetUrl: "https://sepoliafaucet.com/",
        bridgeUrl: "https://bridge.ethereum.org/"
    }
];
// Account Abstraction configurations for each supported chain
export const CHAIN_AA_CONFIGS = {
    // Base Sepolia
    [baseSepolia.id]: {
        bundlerUrl: process.env.BASE_SEPOLIA_BUNDLER_URL || "https://bundler.biconomy.io/api/v2/84532",
        paymasterUrl: process.env.BASE_SEPOLIA_PAYMASTER_URL || "https://paymaster.biconomy.io/api/v1/84532",
        factoryAddress: "0x000000001D1D5004a02bAfAb9de2D6CE5b7B13de",
        requiresDeployment: true,
        gasPolicy: "HYBRID",
        maxGasLimit: 1000000,
        supportedTokens: [
            {
                symbol: "ETH",
                name: "Ethereum",
                address: "0x0000000000000000000000000000000000000000",
                decimals: 18,
                isNative: true,
                logo: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
                coingeckoId: "ethereum"
            },
            {
                symbol: "USDC",
                name: "USD Coin",
                address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
                decimals: 6,
                isNative: false,
                logo: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
                coingeckoId: "usd-coin"
            }
        ]
    },
    // Base Mainnet
    [base.id]: {
        bundlerUrl: process.env.BASE_BUNDLER_URL || "https://bundler.biconomy.io/api/v2/8453",
        paymasterUrl: process.env.BASE_PAYMASTER_URL || "https://paymaster.biconomy.io/api/v1/8453",
        factoryAddress: "0x000000001D1D5004a02bAfAb9de2D6CE5b7B13de",
        requiresDeployment: false,
        gasPolicy: "SPONSORED",
        maxGasLimit: 1000000,
        supportedTokens: [
            {
                symbol: "ETH",
                name: "Ethereum",
                address: "0x0000000000000000000000000000000000000000",
                decimals: 18,
                isNative: true,
                logo: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
                coingeckoId: "ethereum"
            },
            {
                symbol: "USDC",
                name: "USD Coin",
                address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                decimals: 6,
                isNative: false,
                logo: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
                coingeckoId: "usd-coin"
            }
        ]
    },
    // Scroll Sepolia
    [scrollSepolia.id]: {
        bundlerUrl: process.env.SCROLL_SEPOLIA_BUNDLER_URL || "https://bundler.biconomy.io/api/v2/534351",
        paymasterUrl: process.env.SCROLL_SEPOLIA_PAYMASTER_URL || "https://paymaster.biconomy.io/api/v1/534351",
        factoryAddress: "0x0000000071727De22E5E9d8BAf0edAc6f37da032",
        requiresDeployment: false,
        gasPolicy: "FEE",
        maxGasLimit: 800000,
        supportedTokens: [
            {
                symbol: "ETH",
                name: "Ethereum",
                address: "0x0000000000000000000000000000000000000000",
                decimals: 18,
                isNative: true,
                logo: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
                coingeckoId: "ethereum"
            }
        ]
    },
    // Avalanche Fuji
    [avalancheFuji.id]: {
        bundlerUrl: process.env.AVALANCHE_FUJI_BUNDLER_URL || "https://bundler.biconomy.io/api/v2/43113",
        paymasterUrl: process.env.AVALANCHE_FUJI_PAYMASTER_URL || "https://paymaster.biconomy.io/api/v1/43113",
        factoryAddress: "0x000000001D1D5004a02bAfAb9de2D6CE5b7B13de",
        requiresDeployment: true,
        gasPolicy: "HYBRID",
        maxGasLimit: 1200000,
        supportedTokens: [
            {
                symbol: "AVAX",
                name: "Avalanche",
                address: "0x0000000000000000000000000000000000000000",
                decimals: 18,
                isNative: true,
                logo: "https://cryptologos.cc/logos/avalanche-avax-logo.png",
                coingeckoId: "avalanche-2"
            }
        ]
    },
    // Ethereum Sepolia
    [sepolia.id]: {
        bundlerUrl: process.env.ETHEREUM_SEPOLIA_BUNDLER_URL || "https://bundler.biconomy.io/api/v2/11155111",
        paymasterUrl: process.env.ETHEREUM_SEPOLIA_PAYMASTER_URL || "https://paymaster.biconomy.io/api/v1/11155111",
        factoryAddress: "0x000000001D1D5004a02bAfAb9de2D6CE5b7B13de",
        requiresDeployment: false,
        gasPolicy: "SPONSORED",
        maxGasLimit: 1000000,
        supportedTokens: [
            {
                symbol: "ETH",
                name: "Ethereum",
                address: "0x0000000000000000000000000000000000000000",
                decimals: 18,
                isNative: true,
                logo: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
                coingeckoId: "ethereum"
            },
            {
                symbol: "USDC",
                name: "USD Coin",
                address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
                decimals: 6,
                isNative: false,
                logo: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
                coingeckoId: "usd-coin"
            }
        ]
    }
};
/**
 * Chain utilities class for managing blockchain configurations
 */
export class ChainUtils {
    /**
     * Get all supported chains
     */
    static getAllSupportedChains() {
        return SUPPORTED_CHAINS;
    }
    /**
     * Get chain by ID
     */
    static getChainById(chainId) {
        return SUPPORTED_CHAINS.find(chain => chain.id === chainId);
    }
    /**
     * Get chain by name
     */
    static getChainByName(name) {
        return SUPPORTED_CHAINS.find(chain => chain.name.toLowerCase() === name.toLowerCase());
    }
    /**
     * Check if chain is supported
     */
    static isChainSupported(chainId) {
        return SUPPORTED_CHAINS.some(chain => chain.id === chainId);
    }
    /**
     * Get AA configuration for chain
     */
    static getAAConfigByChainId(chainId) {
        return CHAIN_AA_CONFIGS[chainId];
    }
    /**
     * Get supported tokens for a chain
     */
    static getSupportedTokens(chainId) {
        const config = CHAIN_AA_CONFIGS[chainId];
        return config?.supportedTokens || [];
    }
    /**
     * Get token by symbol on a specific chain
     */
    static getTokenBySymbol(chainId, symbol) {
        const tokens = this.getSupportedTokens(chainId);
        return tokens.find(token => token.symbol.toLowerCase() === symbol.toLowerCase());
    }
    /**
     * Get native token for a chain
     */
    static getNativeToken(chainId) {
        const tokens = this.getSupportedTokens(chainId);
        return tokens.find(token => token.isNative);
    }
    /**
     * Get testnet chains
     */
    static getTestnetChains() {
        return SUPPORTED_CHAINS.filter(chain => chain.isTestnet);
    }
    /**
     * Get mainnet chains
     */
    static getMainnetChains() {
        return SUPPORTED_CHAINS.filter(chain => !chain.isTestnet);
    }
    /**
     * Validate chain configuration
     */
    static validateChainConfig(chainId) {
        const errors = [];
        const chain = this.getChainById(chainId);
        if (!chain) {
            errors.push(`Chain ${chainId} not found`);
            return { isValid: false, errors };
        }
        const config = this.getAAConfigByChainId(chainId);
        if (!config) {
            errors.push(`AA configuration not found for chain ${chainId}`);
            return { isValid: false, errors };
        }
        // Validate URLs
        if (!config.bundlerUrl) {
            errors.push("Bundler URL is required");
        }
        if (!config.paymasterUrl) {
            errors.push("Paymaster URL is required");
        }
        if (!config.factoryAddress) {
            errors.push("Factory address is required");
        }
        // Validate factory address format
        if (!/^0x[a-fA-F0-9]{40}$/.test(config.factoryAddress)) {
            errors.push("Invalid factory address format");
        }
        // Validate supported tokens
        if (!config.supportedTokens || config.supportedTokens.length === 0) {
            errors.push("At least one supported token is required");
        }
        const nativeTokens = config.supportedTokens.filter(t => t.isNative);
        if (nativeTokens.length !== 1) {
            errors.push("Exactly one native token is required");
        }
        return { isValid: errors.length === 0, errors };
    }
    /**
     * Get transaction URL for block explorer
     */
    static getTransactionUrl(chainId, txHash) {
        const chain = this.getChainById(chainId);
        if (!chain?.blockExplorers?.default?.url)
            return undefined;
        return `${chain.blockExplorers.default.url}/tx/${txHash}`;
    }
    /**
     * Get address URL for block explorer
     */
    static getAddressUrl(chainId, address) {
        const chain = this.getChainById(chainId);
        if (!chain?.blockExplorers?.default?.url)
            return undefined;
        return `${chain.blockExplorers.default.url}/address/${address}`;
    }
    /**
     * Get chain statistics
     */
    static getChainStats() {
        const totalChains = SUPPORTED_CHAINS.length;
        const testnets = this.getTestnetChains().length;
        const mainnets = this.getMainnetChains().length;
        const totalTokens = Object.values(CHAIN_AA_CONFIGS)
            .reduce((sum, config) => sum + config.supportedTokens.length, 0);
        return {
            totalChains,
            testnets,
            mainnets,
            totalTokens,
            supportedChainIds: SUPPORTED_CHAINS.map(c => c.id),
            chainNames: SUPPORTED_CHAINS.map(c => c.name)
        };
    }
    /**
     * Get chains by gas policy
     */
    static getChainsByGasPolicy(policy) {
        return SUPPORTED_CHAINS.filter(chain => {
            const config = CHAIN_AA_CONFIGS[chain.id];
            return config?.gasPolicy === policy;
        });
    }
    /**
     * Get recommended chain for new users (testnet with sponsored gas)
     */
    static getRecommendedChainForNewUsers() {
        return SUPPORTED_CHAINS.find(chain => {
            const config = CHAIN_AA_CONFIGS[chain.id];
            return chain.isTestnet && config?.gasPolicy === "SPONSORED";
        });
    }
}
