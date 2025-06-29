import { Router } from "express";
import developerRoutes from "./developer.routes.js";
import appRoutes from "./app.routes.js";
import socialLoginsRoutes from "./socialLogins.routes.js";

const router = Router();

router.use('/developers', developerRoutes);
router.use('/apps', appRoutes);
router.use('/oauth', socialLoginsRoutes);

export default router;