import { Router } from "express";
import { authenticateDeveloper } from "../middlewares/auth.middleware.js";
import AppController from "../controllers/app.controller.js";
const router = Router();
/**
 * @swagger
 * tags:
 *   name: Apps
 *   description: App management
 */
/**
 * @swagger
 * components:
 *   schemas:
 *     App:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: 507f1f77bcf86cd799439011
 *         appId:
 *           type: string
 *           example: app_123456789
 *         name:
 *           type: string
 *           example: My Awesome App
 *         description:
 *           type: string
 *           example: A description of my app
 *         redirectUrls:
 *           type: array
 *           items:
 *             type: string
 *           example: ["https://myapp.com/callback", "https://dev.myapp.com/callback"]
 *         iconUrl:
 *           type: string
 *           example: https://myapp.com/icon.png
 *         createdAt:
 *           type: string
 *           format: date-time
 *     AppCreate:
 *       type: object
 *       required:
 *         - name
 *         - redirectUrls
 *       properties:
 *         name:
 *           type: string
 *           example: My Awesome App
 *         description:
 *           type: string
 *           example: A description of my app
 *         redirectUrls:
 *           type: array
 *           items:
 *             type: string
 *           example: ["https://myapp.com/callback"]
 *         iconUrl:
 *           type: string
 *           example: https://myapp.com/icon.png
 *     AppUpdate:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           example: Updated App Name
 *         description:
 *           type: string
 *           example: Updated description
 *         redirectUrls:
 *           type: array
 *           items:
 *             type: string
 *           example: ["https://updated.myapp.com/callback"]
 *         iconUrl:
 *           type: string
 *           example: https://updated.myapp.com/icon.png
 */
/**
 * @swagger
 * /apps:
 *   post:
 *     summary: Create a new app
 *     tags: [Apps]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AppCreate'
 *     responses:
 *       201:
 *         description: App created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/App'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
// @ts-ignore
router.post('/', authenticateDeveloper, AppController.createApp);
/**
 * @swagger
 * /apps:
 *   get:
 *     summary: Get all apps for the authenticated developer
 *     tags: [Apps]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of apps
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/App'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: No apps found
 *       500:
 *         description: Internal server error
 */
// @ts-ignore
router.get('/', authenticateDeveloper, AppController.getAllApps);
/**
 * @swagger
 * /apps/{appId}:
 *   get:
 *     summary: Get app by ID
 *     tags: [Apps]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appId
 *         schema:
 *           type: string
 *         required: true
 *         description: App ID
 *     responses:
 *       200:
 *         description: App details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/App'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: App not found
 *       500:
 *         description: Internal server error
 */
// @ts-ignore
router.get('/:appId', authenticateDeveloper, AppController.getApp);
/**
 * @swagger
 * /apps/{appId}:
 *   put:
 *     summary: Update app
 *     tags: [Apps]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appId
 *         schema:
 *           type: string
 *         required: true
 *         description: App ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AppUpdate'
 *     responses:
 *       200:
 *         description: App updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/App'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: App not found
 *       500:
 *         description: Internal server error
 */
// @ts-ignore
router.put('/:appId', authenticateDeveloper, AppController.updateApp);
/**
 * @swagger
 * /apps/{appId}:
 *   delete:
 *     summary: Delete app
 *     tags: [Apps]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appId
 *         schema:
 *           type: string
 *         required: true
 *         description: App ID
 *     responses:
 *       200:
 *         description: App deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: App not found
 *       500:
 *         description: Internal server error
 */
// @ts-ignore
router.delete('/:appId', authenticateDeveloper, AppController.deleteApp);
export default router;
