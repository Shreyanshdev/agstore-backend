import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { connectDB } from './src/config/connect.js';
import { PORT } from './src/config/config.js';
import { registerRoutes } from './src/routes/index.js';
import { admin, buildAdminRouter } from './src/config/setup.js';
import session from 'express-session';
import { sessionStore } from './src/config/config.js';

const start = async () => {
    await connectDB();

    const app = express();
    const httpServer = createServer(app);
    const io = new Server(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
            credentials: true
        },
        pingTimeout: 60000,
        pingInterval: 25000,
        transports: ['websocket', 'polling'],
        allowEIO3: true,
    });

    app.set('io', io); // Make io accessible in routes

    // Secure CORS configuration
    const corsOptions = {
        origin: function (origin, callback) {
            // Allow requests with no origin (like mobile apps or curl requests)
            if (!origin) return callback(null, true);

            // In development, allow localhost
            if (process.env.NODE_ENV !== 'production') {
                if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('192.168.172.96')) {
                    return callback(null, true);
                }
            }

            // In production, only allow specific domains
            const allowedOrigins = process.env.ALLOWED_ORIGINS ?
                process.env.ALLOWED_ORIGINS.split(',') :
                ['https://yourdomain.com', 'https://www.yourdomain.com'];

            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            return callback(new Error('Not allowed by CORS'));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        maxAge: 86400, // 24 hours
        optionsSuccessStatus: 200
    };

    app.use(cors(corsOptions));

    // Security headers
    app.use((req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        next();
    });

    app.use(express.json({ limit: '10mb' })); // Limit request body size

    // Request logging middleware
    app.use((req, res, next) => {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] ${req.method} ${req.path} - IP: ${req.ip}`);
        next();
    });

    // Secure session configuration
    const sessionSecret = process.env.COOKIE_SECRET;
    if (!sessionSecret || sessionSecret.length < 32) {
        console.error('❌ COOKIE_SECRET must be at least 32 characters long');
        process.exit(1);
    }

    app.use(session({
        secret: sessionSecret,
        resave: false,
        saveUninitialized: false,
        store: sessionStore,
        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            sameSite: 'strict'
        },
        name: 'milk-delivery-session', // Change default session name
    }));

    const adminRouter = buildAdminRouter();
    app.use(admin.options.rootPath, adminRouter);

    registerRoutes(app);

    io.on('connection', (socket) => {
        console.log('User Connected YOOOO');

        socket.on("joinRoom", (orderId) => {
            socket.join(orderId);
            console.log(`User joined room: ${orderId}`);
        });

        socket.on("joinBranchRoom", (branchId) => {
            socket.join(`branch-${branchId}`);
            console.log(`Delivery partner joined branch room: branch-${branchId}`);
        });

        socket.on("joinCustomerRoom", (customerId) => {
            socket.join(`customer-${customerId}`); // Customers join room with customer- prefix
            console.log(`Customer joined room: customer-${customerId}`);
        });

        

        socket.on("joinDeliveryPartnerRoom", (partnerId) => {
            socket.join(`deliveryPartner-${partnerId}`);
            console.log(`Delivery partner joined room: deliveryPartner-${partnerId}`);
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });
    });

    httpServer.listen(PORT, '0.0.0.0', () => {
        console.log(`🌐 AgStore Express backend running on all interfaces:`);
        console.log(`   • Local: http://localhost:${PORT}`);
        console.log(`   • Network: http://0.0.0.0:${PORT}`);
        console.log(`   • iOS Simulator: http://localhost:${PORT}`);
        console.log(`   • Android Simulator: http://10.0.2.2:${PORT}`);
        console.log(`   • AdminJS dashboard: http://localhost:${PORT}${admin.options.rootPath}`);
    });
};

start();