import { Router } from 'express';
import { CryptoTransactionController } from '../controllers/cryptoTransaction.controller.js';
import { checkWalletAuthenticated } from '../middlewares/auth.middleware.js';
const router = Router();
const controller = new CryptoTransactionController();
// ***************************************************************************************************** //
// Crypto Transaction Routes
// ***************************************************************************************************** //
// @ts-ignore
router.post('/send-eth', checkWalletAuthenticated, controller.sendETH.bind(controller));
// @ts-ignore
router.post('/send-erc20', checkWalletAuthenticated, controller.sendERC20.bind(controller));
// @ts-ignore
router.get('/wallet-info', checkWalletAuthenticated, controller.getWalletInfo.bind(controller));
// @ts-ignore
router.post('/execute-contract', checkWalletAuthenticated, controller.executeContractFunction.bind(controller));
// @ts-ignore
router.get('/supported-chains', controller.getSupportedChains.bind(controller));
export default router;
