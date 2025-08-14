import { Router } from "express";
import developerRoutes from "./developer.routes.js";
import appRoutes from "./app.routes.js";
import socialLoginsRoutes from "./socialLogins.routes.js";
import cryptoTransactionRoutes from "./cryptoTransaction.routes.js";
import ensRoutes from "./ens.routes.js";
import smsRoutes from "./sms.routes.js";

const router = Router();

router.use('/developers', developerRoutes);
router.use('/apps', appRoutes);
router.use('/oauth', socialLoginsRoutes);
router.use('/crypto', cryptoTransactionRoutes);
router.use('/ens', ensRoutes);
router.use('/sms', smsRoutes);

export default router;