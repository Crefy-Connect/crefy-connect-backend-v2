import { english, generateMnemonic, mnemonicToAccount, privateKeyToAccount } from 'viem/accounts';
import { toHex } from 'viem/utils';

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

            // Get the private key directly from the account
            const privateKey = toHex(account.getHdKey().privateKey!);

            // Verify the address matches when creating from private key
            const privateKeyAccount = privateKeyToAccount(privateKey);

            if (account.address.toLowerCase() !== privateKeyAccount.address.toLowerCase()) {
                throw new WalletGenerationError("Address mismatch between mnemonic and private key derivation");
            }

            return {
                address: account.address,
                privateKey,
                mnemonic,
                publicKey: account.publicKey
            };
        } catch (err: unknown) {
            console.error("Wallet generation failed:", err);
            const message = err instanceof Error ? err.message : "Unknown error occurred";
            throw new WalletGenerationError(message);
        }
    }
}

export default new WalletGenerationService();