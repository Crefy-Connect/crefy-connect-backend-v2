import { Request, Response } from "express";
import { App } from "../models/app.models.js";
import { Developer } from "../models/developer.models.js";
import { mongodb_config } from "../config/index.js";
import logger from "../utils/logger.js";
import EmailService from "../services/email.service.js";
import { generateAppId, generateClientSecret, validateUrls } from "../utils/auth.js";

class AppController {
    /**
     * Create a new app
     */
    public async createApp(req: Request, res: Response): Promise<Response> {
        try {
            const developerId = (req as any).user.id;
            const { name, description, redirectUrls, iconUrl } = req.body;

            // Validate input
            if (!name) {
                return res.status(400).json({
                    success: false,
                    message: 'App name is required'
                });
            }

            if (!redirectUrls || redirectUrls.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'At least one redirect URL is required'
                });
            }

            // Validate URLs
            if (!validateUrls(redirectUrls)) {
                return res.status(400).json({
                    success: false,
                    message: 'One or more redirect URLs are invalid'
                });
            }

            // Create app - clientSecret and appId will be auto-generated
            const app = new App({
                developerId,
                name,
                description,
                redirectUrls,
                iconUrl
            });

            // Save app
            await app.save();

            logger.info(`New app created: ${name} by developer ${developerId}`);

            return res.status(201).json({
                success: true,
                message: 'App created successfully',
                data: {
                    id: app._id,
                    appId: app.appId,
                    name: app.name,
                    description: app.description,
                    redirectUrls: app.redirectUrls,
                    iconUrl: app.iconUrl,
                    createdAt: app.createdAt
                }
            });
        } catch (error) {
            logger.error(`Error creating app: ${error}`);
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    }

    /**
     * Update app with multiple URLs
     */
    public async updateApp(req: Request, res: Response): Promise<Response> {
        try {
            const developerId = (req as any).user.id;
            const { name, description, redirectUrls, iconUrl } = req.body;
            const appId = req.params.appId;
            const app = await App.findOne({ _id: appId, developerId });

            if (!app) {
                return res.status(404).json({
                    success: false,
                    message: 'App not found or not owned by developer'
                });
            }

            // Update only provided fields
            if (name) app.name = name;
            if (description) app.description = description;
            if (redirectUrls) {
                if (!validateUrls(redirectUrls)) {
                    return res.status(400).json({
                        success: false,
                        message: 'One or more redirect URLs are invalid'
                    });
                }
                app.redirectUrls = redirectUrls;
            }
            if (iconUrl) app.iconUrl = iconUrl;

            await app.save();

            logger.info(`App updated: ${app.appId} with ${app.redirectUrls.length} redirect URLs by developer ${developerId}`);

            return res.status(200).json({
                success: true,
                message: 'App updated successfully',
                data: {
                    id: app._id,
                    appId: app.appId,
                    name: app.name,
                    description: app.description,
                    redirectUrls: app.redirectUrls, // Return updated array
                    iconUrl: app.iconUrl,
                    updatedAt: app.updatedAt
                }
            });
        } catch (error) {
            logger.error(`Error updating app: ${error}`);
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    }

    /**
     * Get app by appId
     */
    public async getApp(req: Request, res: Response): Promise<Response> {
        try {
            const app = (req as any).developer_app;

            if (!app) {
                return res.status(404).json({
                    success: false,
                    message: 'App not found or not owned by developer'
                });
            }

            return res.status(200).json({
                success: true,
                message: 'App fetched successfully',
                data: {
                    id: app._id,
                    appId: app.appId,
                    name: app.name,
                    description: app.description,
                    redirectUrls: app.redirectUrls,
                    iconUrl: app.iconUrl,
                    createdAt: app.createdAt
                }
            });
        } catch (error) {
            logger.error(`Error fetching app: ${error}`);
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    }

    /**
     * Get all apps
     */
    public async getAllApps(req: Request, res: Response): Promise<Response> {
        try {
            const developerId = (req as any).user.id;

            const apps = await App.find({ developerId });

            if (!apps || apps.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'No apps found, please create an app'
                });
            }

            const appsData = apps.map(app => ({
                id: app._id,
                appId: app.appId,
                name: app.name,
                description: app.description,
                redirectUrls: app.redirectUrls,
                iconUrl: app.iconUrl,
                createdAt: app.createdAt
            }));

            return res.status(200).json({
                success: true,
                message: 'Apps fetched successfully',
                data: appsData
            });
        } catch (error) {
            logger.error(`Error fetching apps: ${error}`);
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    }

    /**
     * Delete app
     */
    public async deleteApp(req: Request, res: Response): Promise<Response> {
        try {
            const developerId = (req as any).user.id;
            const app = (req as any).developer_app;

            if (!app) {
                return res.status(404).json({
                    success: false,
                    message: 'App not found or not owned by developer'
                });
            }

            await app.deleteOne();

            logger.info(`App deleted: ${app.appId} by developer ${developerId}`);

            return res.status(200).json({
                success: true,
                message: 'App deleted successfully'
            });
        } catch (error) {
            logger.error(`Error deleting app: ${error}`);
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    }

}

export default new AppController();