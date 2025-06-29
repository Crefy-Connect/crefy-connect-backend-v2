import swaggerJsdoc from 'swagger-jsdoc';
import { server_config } from './index.js';
import { socialLoginsSwagger } from '../swagger/social.logins.swagger.js';

const baseDefinition = {
    openapi: '3.0.0',
    info: {
        title: 'Crefy Connect API',
        version: '1.0.0',
        description: 'API documentation for Crefy Connect developer services',
        contact: {
            name: 'API Support',
            email: 'info@crefy.xyz'
        }
    },
    servers: [
        {
            url: server_config.baseUrl + '/api/v1',
            description: `${server_config.environment} server`
        }
    ],
    components: {
        securitySchemes: {
            ApiKeyAuth: {
                type: 'apiKey',
                in: 'header',
                name: 'x-api-key'
            },
            BearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT'
            }
        },
        schemas: {
            Developer: {
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        example: '507f1f77bcf86cd799439011'
                    },
                    name: {
                        type: 'string',
                        example: 'John Doe'
                    },
                    email: {
                        type: 'string',
                        example: 'john@example.com'
                    },
                    isActive: {
                        type: 'boolean',
                        example: true
                    },
                    createdAt: {
                        type: 'string',
                        format: 'date-time'
                    }
                }
            },
            ErrorResponse: {
                type: 'object',
                properties: {
                    success: {
                        type: 'boolean',
                        example: false
                    },
                    message: {
                        type: 'string',
                        example: 'Error message'
                    }
                }
            },
            // Merge your social logins schemas
            ...socialLoginsSwagger.components?.schemas
        }
    },
    // Merge tags and paths from socialLoginsSwagger
    tags: [...(socialLoginsSwagger.tags || [])],
    paths: {
        ...(socialLoginsSwagger.paths || {})
    }
};

const options = {
    definition: baseDefinition,
    // Keep scanning route files for additional JSDoc comments
    apis: ['./src/routes/*.ts', './src/controllers/*.ts']
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;