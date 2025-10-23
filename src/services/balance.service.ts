import { ethers } from "ethers";
import axios from "axios";
import logger from "../utils/logger.js";

export interface BalanceResult {
  balance: string;
  formattedBalance: string;
  symbol: string;
  network: string;
  iconUrl?: string;
}

export interface TokenBalanceResult extends BalanceResult {
  tokenAddress: string;
  tokenName?: string;
  tokenDecimals: number;
}

class BalanceService {
  private rpcProviders: { [key: string]: string } = {
    ethereum: "https://eth-mainnet.g.alchemy.com/v2/lPQIzwUwRFYqXAgL_lGR",
    sepolia: "https://eth-sepolia.g.alchemy.com/v2/-lPQIzwUwRFYqXAgL_lGR",
    base: "https://base-mainnet.g.alchemy.com/v2/-lPQIzwUwRFYqXAgL_lGR",
    baseSepolia: "https://base-sepolia.g.alchemy.com/v2/-lPQIzwUwRFYqXAgL_lGR",
    lisk: "https://rpc.api.lisk.com", // Lisk Mainnet RPC
    liskTestnet: "https://testnet.rpc.api.lisk.com", // Lisk Testnet RPC
  };

  private tokenContracts: { [key: string]: { [key: string]: string } } = {
    ethereum: {
      USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    },
    sepolia: {
      USDT: "0x7169D38820df1161176f1D4C9a14904A2a0b69a2",
    },
    base: {
      USDT: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
    },
    baseSepolia: {
      USDT: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    },
    lisk: {
      // Lisk tokens would be added here when available
      USDT: "", // Add Lisk USDT address when available
    },
    liskTestnet: {
      USDT: "", // Add Lisk Testnet USDT address when available
    },
  };

  private networkIcons: { [key: string]: string } = {
    ethereum: "https://cryptologos.cc/logos/ethereum-eth-logo.svg",
    sepolia: "https://cryptologos.cc/logos/ethereum-eth-logo.svg",
    base: "https://cryptologos.cc/logos/base-base-logo.svg",
    baseSepolia: "https://cryptologos.cc/logos/base-base-logo.svg",
    lisk: "https://cryptologos.cc/logos/lisk-lsk-logo.svg",
    liskTestnet: "https://cryptologos.cc/logos/lisk-lsk-logo.svg",
  };

  private tokenIcons: { [key: string]: string } = {
    ETH: "https://cryptologos.cc/logos/ethereum-eth-logo.svg",
    USDT: "https://cryptologos.cc/logos/tether-usdt-logo.svg",
    LSK: "https://cryptologos.cc/logos/lisk-lsk-logo.svg",
  };

  /**
   * Get native balance for a wallet address
   */
  async getNativeBalance(
    address: string,
    network: string
  ): Promise<BalanceResult> {
    try {
      // Handle Lisk separately as it's EVM-compatible but might have different RPC structure
      if (network.includes("lisk")) {
        return await this.getLiskNativeBalance(address, network);
      }

      const providerUrl = this.rpcProviders[network];
      if (!providerUrl) {
        throw new Error(`Unsupported network: ${network}`);
      }

      const provider = new ethers.JsonRpcProvider(providerUrl);
      const balance = await provider.getBalance(address);

      const decimals = this.getNativeDecimals(network);
      const formattedBalance = ethers.formatUnits(balance, decimals);
      const symbol = this.getNativeSymbol(network);

      return {
        balance: balance.toString(),
        formattedBalance,
        symbol,
        network,
        iconUrl: this.tokenIcons[symbol] || this.networkIcons[network],
      };
    } catch (error) {
      logger.error(`Error fetching native balance for ${network}: ${error}`);
      throw new Error(`Failed to fetch ${network} native balance`);
    }
  }

  /**
   * Get Lisk native balance (LSK)
   */
  private async getLiskNativeBalance(
    address: string,
    network: string
  ): Promise<BalanceResult> {
    try {
      const providerUrl = this.rpcProviders[network];
      if (!providerUrl) {
        throw new Error(`Unsupported Lisk network: ${network}`);
      }

      const provider = new ethers.JsonRpcProvider(providerUrl);
      const balance = await provider.getBalance(address);

      const decimals = 18; // LSK uses 18 decimals
      const formattedBalance = ethers.formatUnits(balance, decimals);
      const symbol = "LSK";

      return {
        balance: balance.toString(),
        formattedBalance,
        symbol,
        network,
        iconUrl: this.tokenIcons[symbol] || this.networkIcons[network],
      };
    } catch (error) {
      logger.error(
        `Error fetching Lisk native balance for ${network}: ${error}`
      );
      throw new Error(`Failed to fetch ${network} LSK balance`);
    }
  }

  /**
   * Get USDT balance for a wallet address
   */
  async getUSDTBalance(
    address: string,
    network: string
  ): Promise<TokenBalanceResult> {
    try {
      // Skip USDT for Lisk if not available
      if (network.includes("lisk")) {
        const tokenAddress = this.tokenContracts[network]?.USDT;
        if (!tokenAddress) {
          throw new Error(`USDT not yet supported on Lisk`);
        }
      }

      const providerUrl = this.rpcProviders[network];
      const tokenAddress = this.tokenContracts[network]?.USDT;

      if (!providerUrl || !tokenAddress) {
        throw new Error(`USDT not supported on network: ${network}`);
      }

      const provider = new ethers.JsonRpcProvider(providerUrl);

      // USDT ABI (minimal for balanceOf and decimals)
      const usdtAbi = [
        "function balanceOf(address owner) view returns (uint256)",
        "function decimals() view returns (uint8)",
        "function symbol() view returns (string)",
        "function name() view returns (string)",
      ];

      const contract = new ethers.Contract(tokenAddress, usdtAbi, provider);

      const [balance, decimals, symbol, name] = await Promise.all([
        contract.balanceOf(address),
        contract.decimals(),
        contract.symbol(),
        contract.name().catch(() => "USDT"), // Fallback if name call fails
      ]);

      const formattedBalance = ethers.formatUnits(balance, decimals);

      return {
        balance: balance.toString(),
        formattedBalance,
        symbol,
        tokenName: name,
        tokenAddress,
        tokenDecimals: decimals,
        network,
        iconUrl: this.tokenIcons[symbol] || this.tokenIcons.USDT,
      };
    } catch (error) {
      logger.error(`Error fetching USDT balance for ${network}: ${error}`);
      throw new Error(`Failed to fetch ${network} USDT balance`);
    }
  }

  /**
   * Get all balances for a wallet address
   */
  async getAllBalances(address: string): Promise<{
    nativeBalances: BalanceResult[];
    usdtBalances: TokenBalanceResult[];
  }> {
    const networks = [
      "ethereum",
      "sepolia",
      "base",
      "baseSepolia",
      "lisk",
      "liskTestnet",
    ];

    const nativePromises = networks.map((network) =>
      this.getNativeBalance(address, network).catch((error) => {
        logger.error(`Failed to get native balance for ${network}: ${error}`);
        return null;
      })
    );

    const usdtPromises = networks.map((network) =>
      this.getUSDTBalance(address, network).catch((error) => {
        logger.error(`Failed to get USDT balance for ${network}: ${error}`);
        return null;
      })
    );

    const [nativeResults, usdtResults] = await Promise.all([
      Promise.all(nativePromises),
      Promise.all(usdtPromises),
    ]);

    return {
      nativeBalances: nativeResults.filter(Boolean) as BalanceResult[],
      usdtBalances: usdtResults.filter(Boolean) as TokenBalanceResult[],
    };
  }

  /**
   * Get balance for any ERC20 token
   */
  async getTokenBalance(
    address: string,
    network: string,
    tokenAddress: string
  ): Promise<TokenBalanceResult> {
    try {
      const providerUrl = this.rpcProviders[network];
      if (!providerUrl) {
        throw new Error(`Unsupported network: ${network}`);
      }

      const provider = new ethers.JsonRpcProvider(providerUrl);

      const tokenAbi = [
        "function balanceOf(address owner) view returns (uint256)",
        "function decimals() view returns (uint8)",
        "function symbol() view returns (string)",
        "function name() view returns (string)",
      ];

      const contract = new ethers.Contract(tokenAddress, tokenAbi, provider);

      const [balance, decimals, symbol, name] = await Promise.all([
        contract.balanceOf(address),
        contract.decimals(),
        contract.symbol(),
        contract.name().catch(() => "Unknown Token"),
      ]);

      const formattedBalance = ethers.formatUnits(balance, decimals);

      return {
        balance: balance.toString(),
        formattedBalance,
        symbol,
        tokenName: name,
        tokenAddress,
        tokenDecimals: decimals,
        network,
        iconUrl: this.getTokenIconUrl(symbol, tokenAddress, network),
      };
    } catch (error) {
      logger.error(`Error fetching token balance for ${network}: ${error}`);
      throw new Error(`Failed to fetch token balance on ${network}`);
    }
  }

  private getNativeSymbol(network: string): string {
    const symbols: { [key: string]: string } = {
      ethereum: "ETH",
      sepolia: "ETH",
      base: "ETH",
      baseSepolia: "ETH",
      lisk: "LSK",
      liskTestnet: "LSK",
    };
    return symbols[network] || "UNKNOWN";
  }

  private getNativeDecimals(network: string): number {
    const decimals: { [key: string]: number } = {
      ethereum: 18,
      sepolia: 18,
      base: 18,
      baseSepolia: 18,
      lisk: 18,
      liskTestnet: 18,
    };
    return decimals[network] || 18;
  }

  private getTokenIconUrl(
    symbol: string,
    tokenAddress: string,
    network: string
  ): string {
    // First try to get from predefined icons
    if (this.tokenIcons[symbol]) {
      return this.tokenIcons[symbol];
    }

    // Fallback to trustwallet assets (if available for the network)
    const chainId = this.getChainIdForTrustWallet(network);
    if (chainId) {
      return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${chainId}/assets/${tokenAddress}/logo.png`;
    }

    // Final fallback to network icon
    return this.networkIcons[network] || "";
  }

  private getChainIdForTrustWallet(network: string): string | null {
    const chainMap: { [key: string]: string } = {
      ethereum: "ethereum",
      base: "base",
      // Add other networks as needed
    };
    return chainMap[network] || null;
  }
}

export default new BalanceService();
