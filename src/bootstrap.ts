import { english, generateMnemonic, mnemonicToAccount } from 'viem/accounts';

export class WalletGenerationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'WalletGenerationError';
    }
}

interface WalletInfo {
    address: string;
    privateKey: string;
    mnemonic: string;
    publicKey: string;
}

class WalletGenerationService {
    public async generateAddress(): Promise<WalletInfo> {
        try {
            const mnemonic: string = generateMnemonic(english, 128);
            const account = mnemonicToAccount(mnemonic);
            const hdKey = account.getHdKey();
            const derivedKey = hdKey.derive("m/44'/60'/0'/0/0");
            const privateKeyBuffer = derivedKey.privateKey;

            if (!privateKeyBuffer || privateKeyBuffer.length !== 32) {
                throw new WalletGenerationError("Failed to generate a valid private key.");
            }

            const privateKey: string = `0x${Buffer.from(privateKeyBuffer).toString('hex')}`;
            const address: string = account.address;
            const publicKey: string = account.publicKey;

            if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
                throw new WalletGenerationError("Generated address is invalid.");
            }
            return {
                address,
                privateKey,
                mnemonic,
                publicKey
            };
        } catch (err: unknown) {
            console.error("Wallet generation failed:", err);
            const message = err instanceof Error ? err.message : "Unknown error occurred";
            throw new WalletGenerationError(message);
        }
    }
}


(async () => {
    const walletGenerationService = new WalletGenerationService();
    const wallet = await walletGenerationService.generateAddress();
    console.log(wallet);
})();