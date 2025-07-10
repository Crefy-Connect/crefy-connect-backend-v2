// backend/server.ts
import express from 'express';
import cors from 'cors';
import {
    createMeeClient,
    toMultichainNexusAccount,
    getMeeScanLink,
} from '@biconomy/abstractjs';
import { http, erc20Abi } from 'viem';
import { baseSepolia } from 'viem/chains';

const app = express();
app.use(cors());
app.use(express.json());

const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

class MeeService {
    private meeClient: any;
    private orchestrator: any;

    async initialize(userAddress: string) {
        this.orchestrator = await toMultichainNexusAccount({
            chains: [baseSepolia],
            transports: [http()],
            signer: {
                getAddress: () => Promise.resolve(userAddress),
                signMessage: () => Promise.reject(new Error('Signing must be done by frontend')),
                signTypedData: () => Promise.reject(new Error('Signing must be done by frontend'))
            }
        });

        this.meeClient = await createMeeClient({ account: this.orchestrator });
    }

    async prepareTransfer(recipients: string[]) {
        const transfers = await Promise.all(
            recipients.map(recipient =>
                this.orchestrator.buildComposable({
                    type: 'default',
                    data: {
                        abi: erc20Abi,
                        chainId: baseSepolia.id,
                        to: USDC_ADDRESS,
                        functionName: 'transfer',
                        args: [recipient, 1n * 10n ** 6n] // 1 USDC
                    }
                })
            )
        );

        const totalAmount = BigInt(transfers.length) * 1_000_000n;

        return {
            fusionQuote: await this.meeClient.getFusionQuote({
                instructions: transfers,
                trigger: {
                    chainId: baseSepolia.id,
                    tokenAddress: USDC_ADDRESS,
                    amount: totalAmount
                },
                feeToken: {
                    address: USDC_ADDRESS,
                    chainId: baseSepolia.id
                }
            }),
            transfers
        };
    }
}

const meeService = new MeeService();

// API Endpoints
app.post('/api/initialize', async (req, res) => {
    try {
        const { userAddress } = req.body;
        await meeService.initialize(userAddress);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/prepare-transfer', async (req, res) => {
    try {
        const { recipients } = req.body;
        const result = await meeService.prepareTransfer(recipients);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});