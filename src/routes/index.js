import express from 'express';
import addressRoutes from './address.js';
import authRoutes from './auth.js';
import orderRoutes from './order.js';
import paymentRoutes from './payment.js';
import otpRoutes from './otp.js';
import productRoutes from './products.js';
import profileRoutes from './profileRoutes.js';

import branchRoutes from './branch.js';



const router = express.Router();

export const registerRoutes = (app) => {
    // Register public routes first (no authentication required)
    app.use('/', authRoutes);
    app.use('/otp', otpRoutes); // Mount OTP routes with /otp prefix
    
    // Register protected routes (authentication required)
    app.use('/', addressRoutes);
    app.use('/', orderRoutes);
    app.use('/', paymentRoutes);
    app.use('/', productRoutes);
    app.use('/', profileRoutes);
    app.use('/', branchRoutes);

};