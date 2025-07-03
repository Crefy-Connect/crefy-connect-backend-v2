// @ts-nocheck
import {
    toNexusAccount,
    createBicoPaymasterClient,
    createSmartAccountClient,
    createBicoBundlerClient
} from "@biconomy/abstractjs";
import {
    privateKeyToAccount,
    Account
} from "viem/accounts";
import {
    Chain,
    baseSepolia,
    scrollSepolia
} from "viem/chains";
import {
    erc20Abi,
    encodeFunctionData,
    parseUnits,
    Abi,
    http,
    parseEther,
    Hash,
    TransactionReceipt,
    encodeAbiParameters,
    createPublicClient,
    getContractAddress,
    createWalletClient,
    formatEther
} from "viem";
import { config } from "dotenv";
import logger from "../utils/logger.js";

config();

// Types
type TransactionResult = {
    address: string;
    hash?: Hash;
    receipt?: TransactionReceipt;
    error?: Error;
};

type ContractCall = {
    contractAddress: string;
    abi: Abi;
    functionName: string;
    args?: any[];
    value?: string;
};

type TransactionParams = {
    to?: string;
    value?: string;
    data?: string;
    contractCall?: ContractCall;
    mode?: 'SPONSORED' | 'FEE';
};

type AccountVersion = 'V2' | 'NEXUS' | 'UNKNOWN';

// Constants
const NEXUS_IMPLEMENTATION_ADDRESS = "0x000000008761E87F023f65c49DC9cb1C7EdFEaaf";
const NEXUS_BOOTSTRAP_ADDRESS = "0x000000F5b753Fdd20C5CA2D7c1210b3Ab1EA5903";
const EMPTY_HOOK_ADDRESS = "0x0000000000000000000000000000000000000001";
const ACCOUNT_FACTORY_ADDRESS = "0x0000000071727De22E5E9d8BAf0edAc6f37da032";

const SUPPORTED_CHAINS_CONFIG = {
    [baseSepolia.id]: {
        bundlerUrl: process.env.BASE_SEPOLIA_BUNDLER_URL,
        paymasterUrl: process.env.BASE_SEPOLIA_PAYMASTER_URL,
        factoryAddress: "0x000000001D1D5004a02bAfAb9de2D6CE5b7B13de",
        requiresDeployment: true
    },
    [scrollSepolia.id]: {
        bundlerUrl: process.env.SCROLL_SEPOLIA_BUNDLER_URL,
        paymasterUrl: process.env.SCROLL_SEPOLIA_PAYMASTER_URL,
        factoryAddress: "0x0000000071727De22E5E9d8BAf0edAc6f37da032", // Different factory for Scroll
        requiresDeployment: false // Scroll may not require deployment
    }
};

export class AccountAbstractionService {
    private privateKey: string;
    private account: Account;
    private chain: Chain;
    private paymasterUrl: string;
    private bundlerUrl: string;
    private publicClient: any;
    private client: any;
    private accountVersion: AccountVersion = 'UNKNOWN';
    private factoryAddress: string;
    private requiresDeployment: boolean;

    constructor({
        privateKey,
        chain = baseSepolia,
    }: {
        privateKey?: string;
        chain?: Chain;
        paymasterUrl?: string;
        bundlerUrl?: string;
    } = {}) {
        if (!privateKey) {
            throw new Error("Private key is required");
        }

        const chainConfig = SUPPORTED_CHAINS_CONFIG[chain.id];
        if (!chainConfig) {
            throw new Error(`Unsupported chain: ${chain.name}`);
        }

        this.privateKey = this.formatPrivateKey(privateKey);
        this.account = privateKeyToAccount(this.privateKey);
        this.chain = chain;
        this.paymasterUrl = chainConfig.paymasterUrl;
        this.bundlerUrl = chainConfig.bundlerUrl;
        this.factoryAddress = chainConfig.factoryAddress;
        this.requiresDeployment = chainConfig.requiresDeployment;

        this.publicClient = createPublicClient({
            chain: this.chain,
            transport: http()
        });

        logger.info(`Initialized for ${chain.name} - Deployment required: ${this.requiresDeployment}`);
    }

    private formatPrivateKey(privateKey: string): string {
        return privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
    }

    public async getAccountAddress(): Promise<string> {
        this.client = await this.createClient();
        return this.client.account.address;
    }

    public async getAccountBalance(): Promise<string> {
        this.client = await this.createClient();
        return this.client.account.balance;
    }

    private async getGasFees() {
        const { maxFeePerGas, maxPriorityFeePerGas } =
            await this.publicClient.estimateFeesPerGas();

        if (!maxFeePerGas || !maxPriorityFeePerGas) {
            throw new Error('Failed to estimate gas fees');
        }

        return { maxFeePerGas, maxPriorityFeePerGas };
    }

    private async detectAccountVersion(address: string): Promise<AccountVersion> {
        const isDeployed = await this.isAccountDeployed(address);

        if (!isDeployed) {
            return 'UNKNOWN';
        }

        try {
            // Try Nexus implementation check first
            try {
                const implementation = await this.publicClient.readContract({
                    address: address as `0x${string}`,
                    abi: [{
                        name: "implementation",
                        type: "function",
                        stateMutability: "view",
                        inputs: [],
                        outputs: [{ type: "address" }]
                    }],
                    functionName: "implementation"
                });

                if (implementation === NEXUS_IMPLEMENTATION_ADDRESS) {
                    return 'NEXUS';
                }
            } catch (e) {
                // Implementation check failed, likely V2 account
            }

            // Fallback check for V2 account
            const isV2 = await this.publicClient.readContract({
                address: address as `0x${string}`,
                abi: [{
                    name: "isModuleEnabled",
                    type: "function",
                    stateMutability: "view",
                    inputs: [{ type: "address" }],
                    outputs: [{ type: "bool" }]
                }],
                functionName: "isModuleEnabled",
                args: ["0x0000000071727De22E5E9d8BAf0edAc6f37da032"] // Default Biconomy module
            });

            return isV2 ? 'V2' : 'UNKNOWN';
        } catch (error) {
            logger.warn(`Could not detect account version: ${error.message}`);
            return 'UNKNOWN';
        }
    }

    private async createClient() {
        return createSmartAccountClient({
            account: await toNexusAccount({
                signer: this.account,
                chain: this.chain,
                transport: http(),
            }),
            transport: http(this.bundlerUrl),
            paymaster: createBicoPaymasterClient({ paymasterUrl: this.paymasterUrl }),
        });
    }


    private async getAccountAddressFromSigner(): Promise<string> {
        // Calculate the counterfactual address without creating client
        return getContractAddress({
            from: this.account.address,
            nonce: 0n
        });
    }

    private async isAccountDeployed(address: string): Promise<boolean> {
        const bytecode = await this.publicClient.getBytecode({
            address: address as `0x${string}`
        });
        return !!bytecode && bytecode !== '0x';
    }

    private async handleAccountDeployment(): Promise<boolean> {
        const address = await this.getAccountAddressFromSigner();
        const isDeployed = await this.isAccountDeployed(address);

        if (!isDeployed) {
            logger.info('Account needs deployment, attempting to deploy...');
            try {
                // 1. Check EOA balance first
                const eoaBalance = await this.publicClient.getBalance({
                    address: this.account.address
                });

                logger.info(`EOA balance: ${formatEther(eoaBalance)} ETH`);
                logger.info(`Account address: ${this.account.address}`);
                // 2. Estimate deployment cost
                const { maxFeePerGas, maxPriorityFeePerGas } = await this.getGasFees();
                logger.info(`Max fee per gas: ${formatEther(maxFeePerGas)} ETH`);
                logger.info(`Max priority fee per gas: ${formatEther(maxPriorityFeePerGas)} ETH`);
                const estimatedGas = await this.publicClient.estimateContractGas({
                    account: this.account,
                    address: ACCOUNT_FACTORY_ADDRESS,
                    abi: [{
                        name: "deployAccount",
                        type: "function",
                        stateMutability: "nonpayable",
                        inputs: [
                            { type: "bytes", name: "data" },
                            { type: "uint256", name: "index" }
                        ],
                        outputs: []
                    }],
                    functionName: "deployAccount",
                    args: ["0x", 0n]
                });

                const estimatedCost = estimatedGas * maxFeePerGas;
                logger.info(`Estimated cost: ${formatEther(estimatedCost)} ETH`);
                logger.info(`EOA balance: ${formatEther(eoaBalance)} ETH`);

                if (eoaBalance < estimatedCost) {
                    const requiredEth = parseEther('0.01'); // Minimum recommended
                    throw new Error(
                        `Insufficient funds for deployment. Need ~${formatEther(estimatedCost)} ETH, ` +
                        `but only have ${formatEther(eoaBalance)} ETH. ` +
                        `Please send at least ${formatEther(requiredEth)} ETH to ${this.account.address}`
                    );
                }

                // 3. Get EOA wallet client for deployment
                const eoaClient = createWalletClient({
                    account: this.account,
                    chain: this.chain,
                    transport: http()
                });

                // 4. Prepare deployment transaction
                const factoryData = encodeFunctionData({
                    abi: [{
                        name: "deployAccount",
                        type: "function",
                        stateMutability: "nonpayable",
                        inputs: [
                            { type: "bytes", name: "data" },
                            { type: "uint256", name: "index" }
                        ],
                        outputs: []
                    }],
                    functionName: "deployAccount",
                    args: ["0x", 0n]
                });

                // 5. Send deployment transaction with buffer
                const hash = await eoaClient.sendTransaction({
                    to: ACCOUNT_FACTORY_ADDRESS,
                    data: factoryData,
                    maxFeePerGas: maxFeePerGas * 150n / 100n, // 50% buffer
                    maxPriorityFeePerGas: maxPriorityFeePerGas * 150n / 100n,
                    value: 0n
                });

                // 6. Wait for deployment confirmation
                const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
                logger.info(`Account deployed successfully: ${receipt.transactionHash}`);

                // Update account version after deployment
                this.accountVersion = 'V2';
                return true;
            } catch (error: any) {
                logger.error(`Account deployment failed: ${error.message}`);
                throw error;
            }
        }
        return false;
    }

    private async sendTransactionWithFallback(params: TransactionParams): Promise<TransactionResult> {
        const client = await this.createClient();
        const address = await client.account.address;

        try {
            // First try with sponsored mode
            try {
                return await this.sendTransactionDefault(params);
            } catch (sponsoredError) {
                if (sponsoredError.message.includes('AA33')) {
                    logger.warn('Sponsored failed, attempting fee-paid on Scroll');
                    return await this.sendTransactionDefault({
                        ...params,
                        mode: 'FEE'
                    });
                }
                throw sponsoredError;
            }
        } catch (error: any) {
            logger.error(`Scroll Sepolia transaction failed: ${error.message}`);
            throw error;
        }
    }


    public async migrateToNexus(): Promise<TransactionResult> {
        const address = await this.getAccountAddressFromSigner();

        try {
            // 1. Ensure account is deployed
            if (!await this.isAccountDeployed(address)) {
                await this.handleAccountDeployment();
            }

            // 2. Create V2 client for migration
            const v2Client = createSmartAccountClient({
                account: await toNexusAccount({
                    signer: this.account,
                    chain: this.chain,
                    transport: http(),
                }),
                transport: http(this.bundlerUrl),
                paymaster: createBicoPaymasterClient({ paymasterUrl: this.paymasterUrl }),
            });

            // 3. Prepare migration transactions
            const updateImplTx = {
                to: address,
                data: this.getUpdateImplementationCalldata()
            };

            const initNexusTx = {
                to: address,
                data: this.getInitNexusCalldata()
            };

            // 4. Send migration transaction
            logger.info('Starting migration to Nexus account...');
            const hash = await v2Client.sendTransaction(
                [updateImplTx, initNexusTx],
                {
                    paymasterServiceData: { mode: 'SPONSORED' },
                }
            );

            const receipt = await v2Client.waitForTransactionReceipt({ hash });
            logger.info(`Migration completed successfully: ${receipt.transactionHash}`);

            // Update account version after successful migration
            this.accountVersion = 'NEXUS';

            return {
                address,
                hash,
                receipt
            };
        } catch (error: any) {
            logger.error(`Migration failed: ${error.message}`);
            return {
                address,
                error: new Error(`Migration failed: ${error.message}`),
            };
        }
    }

    private getUpdateImplementationCalldata(): `0x${string}` {
        return encodeFunctionData({
            abi: [{
                name: "updateImplementation",
                type: "function",
                stateMutability: "nonpayable",
                inputs: [{ type: "address", name: "newImplementation" }],
                outputs: []
            }],
            functionName: "updateImplementation",
            args: [NEXUS_IMPLEMENTATION_ADDRESS],
        });
    }

    private getInitNexusCalldata(): `0x${string}` {
        const initData = encodeFunctionData({
            abi: [{
                name: "initNexusWithDefaultValidator",
                type: "function",
                stateMutability: "nonpayable",
                inputs: [{ type: "bytes", name: "data" }],
                outputs: []
            }],
            functionName: "initNexusWithDefaultValidator",
            args: [this.account.address]
        });

        return encodeFunctionData({
            abi: [{
                name: "initializeAccount",
                type: "function",
                stateMutability: "nonpayable",
                inputs: [{ type: "bytes", name: "data" }],
                outputs: []
            }],
            functionName: "initializeAccount",
            args: [encodeAbiParameters(
                [
                    { name: "bootstrap", type: "address" },
                    { name: "initData", type: "bytes" },
                ],
                [NEXUS_BOOTSTRAP_ADDRESS, initData]
            )],
        });
    }

    public async sendTransaction(params: TransactionParams): Promise<TransactionResult> {
        logger.info("Send Transaction process started");
        this.client = await this.createClient();
        logger.info(`Client created: ${this.client}`);
        const address = await this.client.account.address;

        try {
            // Only attempt deployment if required by chain
            // if (this.requiresDeployment) {
            //     await this.handleAccountDeployment();
            // }

            // // For Scroll Sepolia, try fee-paid mode first if paymaster fails
            // if (this.chain.id === scrollSepolia.id) {
            //     return this.sendTransactionWithFallback(params);
            // }


            let calls: any[] = [];

            if (params.contractCall) {
                const { contractAddress, abi, functionName, args = [], value = '0' } = params.contractCall;
                logger.info('Handling contract call');
                calls.push({
                    to: contractAddress as `0x${string}`,
                    data: encodeFunctionData({
                        abi,
                        functionName,
                        args,
                    }),
                    value: parseEther(value)
                });
            } else if (params.to) {
                logger.info('Handling simple ETH transfer');
                calls.push({
                    to: params.to as `0x${string}`,
                    value: parseEther(params.value || '0'),
                    data: params.data as `0x${string}` || undefined,
                });
            }

            const { maxFeePerGas, maxPriorityFeePerGas } = await this.getGasFees();

            // Try sponsored mode first, fallback to fee mode if fails
            let hash: Hash;
            try {
                logger.info('Attempting sponsored transaction');
                hash = await this.client.sendTransaction({
                    calls,
                    maxFeePerGas,
                    maxPriorityFeePerGas,
                    mode: params.mode || 'SPONSORED'
                });
            } catch (sponsoredError: any) {
                if (sponsoredError.message.includes('AA33') || sponsoredError.message.includes('reverted')) {
                    logger.warn('Sponsored transaction failed, attempting fee-paid transaction');
                    hash = await this.client.sendTransaction({
                        calls,
                        maxFeePerGas,
                        maxPriorityFeePerGas,
                        mode: 'FEE'
                    });
                } else {
                    throw sponsoredError;
                }
            }

            logger.info(`Transaction hash: ${hash}`);
            const receipt = await this.client.waitForTransactionReceipt({ hash });

            return {
                address,
                hash,
                receipt
            };
        } catch (error: any) {
            logger.error(`Transaction failed: ${error.message}`);
            if (error.details) {
                logger.error(`Error details: ${JSON.stringify(error.details)}`);
            }
            return {
                address,
                error: new Error(`Transaction failed: ${error.message}`),
            };
        }
    }

    public async sendETH(to: string, value: string = '0', mode?: 'SPONSORED' | 'FEE'): Promise<TransactionResult> {
        return this.sendTransaction({
            to,
            value,
            mode
        });
    }

    public async executeContractFunction(
        contractCall: ContractCall,
        mode?: 'SPONSORED' | 'FEE'
    ): Promise<TransactionResult> {
        return this.sendTransaction({
            contractCall,
            mode
        });
    }

    public async sendERC20(
        tokenAddress: string,
        to: string,
        amount: string,
        decimals: number = 18,
        mode?: 'SPONSORED' | 'FEE'
    ): Promise<TransactionResult> {
        const amountInUnits = parseUnits(amount, decimals);

        return this.executeContractFunction({
            contractAddress: tokenAddress,
            abi: erc20Abi,
            functionName: "transfer",
            args: [to as `0x${string}`, amountInUnits],
        }, mode);
    }
}