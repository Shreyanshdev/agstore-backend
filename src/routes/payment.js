import express from 'express';
import { createOrder, verifyPayment, getPaymentStatus, refundPayment } from '../controllers/payment.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Public routes (no authentication required for payment processing)
router.post('/create-order', createOrder);
router.post('/verify-payment', verifyPayment);

// Protected routes (authentication required)
router.use(verifyToken);

// Get payment status for an order
router.get('/payment-status/:orderId', getPaymentStatus);

// Refund payment (admin only - add admin middleware if needed)
router.post('/refund', refundPayment);

export default router;