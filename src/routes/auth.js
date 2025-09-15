import express from 'express';
import { fetchUser, loginCustomer, loginDeliveryPartner, refreshToken, logout } from '../controllers/auth/auth.js';
import { updateUserProfile, getDeliveryPartnerById, toggleCustomerSubscription } from '../controllers/userController.js';
import { verifyToken, authRateLimit } from '../middleware/auth.js';

const router = express.Router();

// Apply rate limiting to authentication endpoints
router.post('/customer/login', authRateLimit, loginCustomer);
router.post('/delivery/login', authRateLimit, loginDeliveryPartner);
router.post('/auth/refresh-token', authRateLimit, refreshToken);

// Protected routes
router.post('/auth/logout', verifyToken, logout);
router.get('/user', verifyToken, fetchUser);
router.put('/user/', verifyToken, updateUserProfile);
router.get('/delivery-partner/:id', verifyToken, getDeliveryPartnerById);
// Admin only (add admin middleware in future): toggle subscription
router.post('/admin/toggle-subscription', verifyToken, toggleCustomerSubscription);

export default router;