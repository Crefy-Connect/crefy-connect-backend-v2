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
    from: Address;
    to: Address;
    id: bigint | string | number;
    amount?: bigint | string | number;
    data?: string;
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

        const normalizedName = normalize(ensName);
        const parentNode = labelhash(normalizedName);

        return this.prepareTransaction(
            contractAddress,
            abi,
            "createSubnameRegistrar",
            [parentNode],
            BigInt(0),
            from
        );
    }

    public async prepareNameWrapperTransfer(
        contractAddress: Address,
        abi: Abi,
        params: NameWrapperTransferParams
    ): Promise<PreparedTransaction> {
        try {
            // Convert all parameters to the correct types
            const from = params.from;
            const to = params.to;
            const id = BigInt(params.id);
            const amount = params.amount ? BigInt(params.amount) : BigInt(1);
            const data = params.data || toHex(new Uint8Array()); // Default to empty bytes

            // Validate addresses
            if (!/^0x[a-fA-F0-9]{40}$/.test(from)) {
                throw new Error("Invalid 'from' address");
            }
            if (!/^0x[a-fA-F0-9]{40}$/.test(to)) {
                throw new Error("Invalid 'to' address");
            }

            return this.prepareTransaction(
                contractAddress,
                abi,
                "safeTransferFrom",
                [from, to, id, amount, data],
                BigInt(0), // Typically no value needed for transfers
                from
            );
        } catch (error) {
            logger.error(`Error preparing NameWrapper transfer: ${error}`);
            throw new Error(`Failed to prepare NameWrapper transfer: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}