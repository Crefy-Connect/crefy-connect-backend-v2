import {
    type Address,
    type Hash,
    encodeFunctionData,
    type Abi,
    createPublicClient,
    http,
    type PublicClient,
    toHex,
    encodeAbiParameters,
    parseAbiParameters
} from "viem";
import { normalize, labelhash } from "viem/ens";
import { ChainUtils } from "../config/chains.config.js";
import logger from "../utils/logger.js";

interface PreparedTransaction {
    to: Address;
    data: Hash;
    value?: string;
    gas?: string;
    from?: Address;
    chainId?: number;
}

interface NameWrapperTransferParams {
    operator: Address;
    approved: boolean;
}

export class Web3Service {
    private publicClient!: PublicClient;
    private chain;

    constructor(chainName: string) {
        const chain = ChainUtils.getChainByName(chainName);
        if (!chain) {
            throw new Error(`Chain not found: ${chainName}`);
        }

        this.chain = chain;
        this.initializeClient();
    }

    private initializeClient() {
        this.publicClient = createPublicClient({
            chain: this.chain,
            transport: http()
        });
    }

    public async prepareTransaction(
        contractAddress: Address,
        abi: Abi,
        functionName: string,
        args: any[] = [],
        value: bigint = BigInt(0),
        from?: Address
    ): Promise<PreparedTransaction> {
        try {
            const data = encodeFunctionData({
                abi,
                functionName,
                args
            });

            let estimatedGas: bigint;
            try {
                estimatedGas = await this.publicClient.estimateContractGas({
                    address: contractAddress,
                    abi,
                    functionName,
                    args,
                    value,
                    account: from // Optional
                });
            } catch (error) {
                logger.error(`Gas estimation failed: ${error}`);
                estimatedGas = BigInt(500000); // Default gas limit
            }

            return {
                to: contractAddress,
                data,
                value: value.toString(),
                gas: estimatedGas.toString(),
                from,
                chainId: Number(this.chain.id)
            };
        } catch (error) {
            logger.error(`Error preparing transaction: ${error}`);
            throw new Error(`Failed to prepare transaction: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    public async prepareENSRegistrarCreation(
        contractAddress: Address,
        abi: Abi,
        ensName: string,
        from?: Address
    ): Promise<PreparedTransaction> {
        if (!ensName || typeof ensName !== "string") {
            throw new Error("ENS name must be a valid string");
        }

        // const normalizedName = normalize(ensName);
        // const parentNode = labelhash(normalizedName);

        return this.prepareTransaction(
            contractAddress,
            abi,
            "createSubnameRegistrar",
            [ensName],
            BigInt(0),
            from
        );
    }

    public async prepareNameWrapperTransfer(
        contractAddress: Address,
        abi: Abi,
        params: { operator: Address, approved: boolean }
    ): Promise<PreparedTransaction> {
        try {
            const { operator, approved } = params;

            // Validate operator address
            if (!/^0x[a-fA-F0-9]{40}$/.test(operator)) {
                throw new Error("Invalid operator address");
            }

            // Prepare the transaction data
            const txData = encodeFunctionData({
                abi,
                functionName: 'setApprovalForAll',
                args: [operator, approved]
            });

            // Estimate gas
            let estimatedGas: bigint;
            try {
                estimatedGas = await this.publicClient.estimateContractGas({
                    address: contractAddress,
                    abi,
                    functionName: 'setApprovalForAll',
                    args: [operator, approved],
                    account: operator // Need an account for estimation
                });
            } catch (error) {
                logger.error(`Gas estimation failed: ${error}`);
                estimatedGas = BigInt(500000); // Default gas limit
            }

            return {
                to: contractAddress,
                data: txData,
                value: '0', // No value needed for approvals
                gas: estimatedGas.toString(),
                from: operator, // The account that will be sending the transaction
                chainId: Number(this.chain.id)
            };
        } catch (error) {
            logger.error(`Error preparing NameWrapper approval: ${error}`);
            throw new Error(`Failed to prepare NameWrapper approval: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}