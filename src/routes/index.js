import express from 'express';
import addressRoutes from './address.js';
import authRoutes from './auth.js';
import orderRoutes from './order.js';
import paymentRoutes from './payment.js';
import productRoutes from './products.js';
import profileRoutes from './profileRoutes.js';

import branchRoutes from './branch.js';



const router = express.Router();

export const registerRoutes = (app) => {
    app.use('/', authRoutes);
    app.use('/', addressRoutes);
    app.use('/', orderRoutes);
    app.use('/', paymentRoutes);
    app.use('/', productRoutes);
    app.use('/', profileRoutes);
    
    app.use('/', branchRoutes);

};