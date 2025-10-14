import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import { Server } from "socket.io";
import http from "http";
import swaggerUi from "swagger-ui-express";
import session from "express-session";
import MongoStore from "connect-mongo";
// components imports
import {
  mongodb_config,
  server_config,
  logger_config,
} from "./config/index.js";
import swaggerSpec from "./config/swagger.js";
import logger from "./utils/logger.js";
import apiRouter from "./routes/index.routes.js";
import { passportInit, passportSession } from "./config/passport.config.js";
import SocketManager from "./services/socket.manager.js";
import path from "path";
import { fileURLToPath } from "url";
import ejs from "ejs"; // Add this import
// import runTests from './elementtpay.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * App class
 * @description This class is the main application class
 * @returns void
 */
class App {
  public app: express.Application;
  public server: http.Server;
  public io: Server;

  /**
   * Constructor
   * @description This function initializes the application
   * @returns void
   */
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: "*", // Allow all origins
        methods: ["GET", "POST"],
        credentials: false, // Set to false when allowing all origins
      },
    });

    this.initializeMiddlewares();
    this.initializeSwagger();
    this.initializeDatabase();
    this.initializeSocketIO();
    this.initializeRoutes();
  }

  /**
   * Initialize request logging
   * @description This function initializes the request logging for the application
   * @returns void
   */
  private initializeRequestLogging(): void {
    this.app.use(
      (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
      ) => {
        const start = Date.now();

        // Get the client IP safely
        const getClientIp = () => {
          try {
            // Use headers first if behind proxy
            const forwarded = req.headers["x-forwarded-for"];
            const ip = forwarded
              ? typeof forwarded === "string"
                ? forwarded.split(",")[0]
                : forwarded[0].split(",")[0]
              : req.socket.remoteAddress;
            return ip || "unknown";
          } catch (err) {
            return "unknown";
          }
        };

        const clientIp = getClientIp();

        res.on("finish", () => {
          const duration = Date.now() - start;

          logger.info({
            message: "HTTP Request",
            method: req.method,
            url: req.originalUrl,
            path: req.path,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: clientIp, // Use our safe IP getter
            userAgent: req.headers["user-agent"],
            referrer: req.headers["referer"] || req.headers["referrer"],
            ...(server_config.environment === "development" && {
              headers: req.headers,
              body: req.body,
              query: req.query,
              params: req.params,
            }),
          });
        });

        next();
      }
    );
  }

  /**
   * Initialize middlewares
   * @description This function initializes the middlewares for the application
   * @returns void
   */
  private initializeMiddlewares(): void {
    this.app.set("trust proxy", server_config.trustProxy);

    // Security headers
    this.app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
              "'self'",
              "'unsafe-inline'",
              "cdn.jsdelivr.net",
              "unpkg.com",
            ],
            styleSrc: [
              "'self'",
              "'unsafe-inline'",
              "cdn.jsdelivr.net",
              "fonts.googleapis.com",
            ],
            imgSrc: ["'self'", "data:", "cdn.jsdelivr.net"],
            fontSrc: ["'self'", "fonts.gstatic.com"],
          },
        },
        crossOriginEmbedderPolicy: false,
      })
    );

    // CORS
    // this.app.use(cors({
    //     origin: [...server_config.corsOrigins, 'https://cdn.jsdelivr.net'],
    //     credentials: true,
    //     methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    //     allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
    // }));
    this.app.use(cors());

    // Rate limiting
    // const limiter = rateLimit({
    //     windowMs: 15 * 60 * 1000,
    //     max: 100,
    //     message: 'Too many requests from this IP, please try again later',
    //     standardHeaders: true,  // Enable standard rate limit headers
    //     legacyHeaders: false,  // Disable legacy headers
    //     validate: {
    //         trustProxy: false  // Explicitly set based on your environment
    //     }
    // });
    // this.app.use(limiter);

    // Custom request logging (add this before other middlewares)
    this.initializeRequestLogging();

    // Request logging
    this.app.use(
      morgan(logger_config.level, {
        stream: {
          write: (message: string) => logger.info(message.trim()),
        },
      })
    );

    // Body parser
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    this.app.use(
      session({
        name: "crefy.sid", // Add this - unique session cookie name
        secret:
          process.env.SESSION_SECRET || "fallback-secret-change-in-production", // Always provide fallback
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
          mongoUrl: mongodb_config.mongoUri,
          collectionName: "sessions",
          ttl: 24 * 60 * 60, // 24 hours in seconds
          autoRemove: "native", // automatically remove expired sessions
        }),
        cookie: {
          secure: server_config.environment === "production",
          httpOnly: true, // Important for security
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
          sameSite: server_config.environment === "production" ? "none" : "lax", // Important for OAuth
          domain:
            server_config.environment === "production"
              ? ".yourdomain.com"
              : undefined, // Set in production
        },
      })
    );

    this.app.use(passportInit);
    this.app.use(passportSession);

    // Compression
    this.app.use(compression());

    // home page
    this.app.get("/", (req: express.Request, res: express.Response) => {
      res.send("Welcome to Crefy Connect API");
    });

    // success page
    this.app.get("/success", (req: express.Request, res: express.Response) => {
      res.send("Successfully logged in and created a wallet");
    });
    this.app.set("view engine", "html");
    this.app.engine("html", ejs.renderFile);
    this.app.set("views", path.join(__dirname, "views"));
  }

  /**
   * Initialize database
   * @description This function initializes the database for the application
   * @returns void
   */
  private async initializeDatabase(): Promise<void> {
    try {
      await mongoose.connect(mongodb_config.mongoUri, {
        retryWrites: mongodb_config.retryWrites,
        w: mongodb_config.w,
      });
      logger.info("Connected to MongoDB");
      // runTests();
    } catch (error) {
      logger.error("Failed to connect to MongoDB", error);
      process.exit(1);
    }

    mongoose.connection.on("error", (error: Error) => {
      logger.error("MongoDB connection error", error);
    });

    mongoose.connection.on("disconnected", () => {
      logger.warn("MongoDB disconnected");
    });
  }

  /**
   * Initialize swagger
   * @description This function initializes the swagger for the application
   * @returns void
   */
  private initializeSwagger(): void {
    // Enable CORS for Swagger endpoints
    this.app.use("/private/0to1/api-docs", (req, res, next) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization"
      );
      next();
    });

    // Serve Swagger UI
    this.app.use(
      "/private/0to1/api-docs",
      swaggerUi.serve,
      swaggerUi.setup(swaggerSpec, {
        customSiteTitle: "Crefy Connect API",
        swaggerOptions: {
          persistAuthorization: true,
          tryItOutEnabled: true,
          // Explicitly set the URL if needed
          url: `${server_config.baseUrl}/api-docs.json`,
        },
      })
    );

    // JSON spec endpoint with CORS headers
    this.app.get("/private/0to1/api-docs.json", (req, res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Content-Type", "application/json");
      res.send(swaggerSpec);
    });

    logger.info(
      `Swagger docs available at ${server_config.baseUrl}/private/0to1/api-docs`
    );
  }

  /**
   * Initialize routes
   * @description This function initializes the routes for the application
   * @returns void
   */
  private initializeRoutes(): void {
    // Health check endpoint
    this.app.get("/health", (req: express.Request, res: express.Response) => {
      res.status(200).json({
        status: "UP",
        timestamp: new Date().toISOString(),
        environment: server_config.environment,
      });
    });

    // Other routes would go here
    this.app.use("/api/v1", apiRouter);

    // 404 handler
    this.app.use((req: express.Request, res: express.Response) => {
      res.status(404).json({
        success: false,
        message: "Resource not found",
      });
    });
  }

  /**
   * Initialize socket.io
   * @description This function initializes the socket.io for the application
   * @returns void
   */
  private initializeSocketIO(): void {
    // Initialize the SocketManager with our io instance
    const socketManager = SocketManager.getInstance();
    socketManager.initialize(this.io);
  }

  /**
   * Listen
   * @description This function listens to the server
   * @returns void
   */
  public listen(): void {
    this.server.listen(server_config.port, () => {
      logger.info(`
################################################
🚀 Server listening on port: ${server_config.port} 🚀
http://${server_config.baseUrl} -- server is running
http://${server_config.baseUrl}/api-docs -- swagger docs
################################################
            `);
    });
  }
}

export default App;
