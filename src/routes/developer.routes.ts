import { Router, RequestHandler } from "express";
import developerController from "../controllers/developer.controller.js";
import { authenticateDeveloper } from "../middlewares/auth.middleware.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Developers
 *   description: Developer management
 */

/**
 * @swagger
 * /developers/register:
 *   post:
 *     summary: Register a new developer
 *     tags: [Developers]
 *     requestBody: 
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 example: "john.doe@crefy.xyz"
 *               password:
 *                 type: string
 *                 example: "password123"
 *     responses:
 *       201:
 *         description: Developer registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Developer'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Developer already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 */
// @ts-ignore
router.post('/register', developerController.registerDeveloper);

/**
 * @swagger
 * /developers/verify-otp:
 *   post:
 *     summary: Verify developer OTP
 *     tags: [Developers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 example: "john.doe@crefy.xyz"
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *       400:
 *         description: Invalid OTP or OTP expired
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Developer not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Account already verified
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 */
// @ts-ignore
router.post('/verify-otp', developerController.verifyOTP);

/**
 * @swagger
 * /developers/resend-otp:
 *   post:
 *     summary: Resend OTP
 *     tags: [Developers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email    
 *             properties:
 *               email:
 *                 type: string
 *                 example: "john.doe@crefy.xyz"
 *     responses:
 *       200:
 *         description: OTP resent successfully
 *       400:
 *         description: Invalid email format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:   
 *         description: Developer not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:       
 *         description: Internal server error
 */
// @ts-ignore
router.post('/resend-otp', developerController.resendOTP);

/**
 * @swagger
 * /developers/login:
 *   post:
 *     summary: Login developer
 *     tags: [Developers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: "john.doe@crefy.xyz"
 *               password:
 *                 type: string
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Developer'
 *       400:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Developer not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 */
// @ts-ignore
router.post('/login', developerController.loginDeveloper);

// Protected routes (require API key)
router.use(authenticateDeveloper as RequestHandler);
/**
 * @swagger
 * /developers/profile:
 *   get:
 *     summary: Get current developer profile
 *     tags: [Developers]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Developer profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Developer'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Developer not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 */
// @ts-ignore
router.get('/profile', developerController.getDeveloperProfile);
/**
 * @swagger
 * /developers:
 *   delete:
 *     summary: Delete developer account
 *     tags: [Developers]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Developer deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Developer not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 */
// @ts-ignore
router.delete('/', developerController.deleteDeveloper);

export default router;  