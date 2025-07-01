// @ts-nocheck
import { toNexusAccount, createBicoPaymasterClient, createSmartAccountClient } from "@biconomy/abstractjs";
import { privateKeyToAccount, generatePrivateKey, Account } from "viem/accounts";
import { Chain, baseSepolia } from "viem/chains";
import { http, parseEther, Hash, TransactionReceipt } from "viem";
import { config } from "dotenv";
config();

type TransactionResult = {
    address: string;
    hash?: Hash;
    receipt?: TransactionReceipt;
    error?: unknown;
};

export class BiconomySmartAccount {
    private privateKey: string;
    private account: Account;
    private chain: Chain;
    private paymasterUrl: string;
    private bundlerUrl: string;

    constructor({
        privateKey = generatePrivateKey(),
        chain = baseSepolia,
        paymasterUrl = 'https://paymaster.biconomy.io/api/v2/84532/F7wyL1clz.75a64804-3e97-41fa-ba1e-33e98c2cc703',
        bundlerUrl = 'https://bundler.biconomy.io/api/v3/84532/nJPK7B3ru.dd7f7861-190d-41bd-af80-6877f74b8f44'
    }: {
        privateKey?: string;
        chain?: Chain;
        paymasterUrl?: string;
        bundlerUrl?: string;
    } = {}) {
        this.privateKey = privateKey;
        this.account = privateKeyToAccount(`0x${this.privateKey}`);
        this.chain = chain;
        this.paymasterUrl = paymasterUrl;
        this.bundlerUrl = bundlerUrl;
    }

    public async getAccountAddress(): Promise<string> {
        const client = await this.createClient();
        return client.account.address;
    }

    private async createClient() {
        return createSmartAccountClient({
            account: await toNexusAccount({
                signer: this.account,
                chain: this.chain,
                transport: http(),
            }),
            transport: http(this.bundlerUrl),
            paymaster: createBicoPaymasterClient({ paymasterUrl: this.paymasterUrl })
        });
    }

    public async sendTransaction(to: string, value: string = '0'): Promise<TransactionResult> {
        const client = await this.createClient();
        const address = await client.account.address;

        try {
            const hash = await client.sendTransaction({
                calls: [{
                    to: to as `0x${string}`,
                    value: parseEther(value)
                }]
            });

            console.log("Transaction hash: ", hash);

            const receipt = await client.waitForTransactionReceipt({ hash });
            console.log("Transaction receipt: ", receipt);

            return { address, hash, receipt };
        } catch (error) {
            console.error("Transaction failed:", error);
            return { address, error };
        }
    }

    public async createAndSendTransaction(): Promise<TransactionResult> {
        const address = await this.getAccountAddress();
        console.log("address", address);

        return this.sendTransaction('0xf5715961C550FC497832063a98eA34673ad7C816', '0');
    }
}

// Usage example:
// const biconomyAccount = new BiconomySmartAccount();
// const result = await biconomyAccount.createAndSendTransaction();