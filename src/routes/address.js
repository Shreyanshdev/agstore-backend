import express from 'express';
import {
    addAddress,
    getAddresses,
    updateAddress,
    deleteAddress,
    getAddressById,
} from '../controllers/address.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.use(verifyToken);

router.post('/addresses', addAddress);
router.get('/addresses', getAddresses);
router.put('/addresses/:addressId', updateAddress);
router.delete('/addresses/:addressId', deleteAddress);
router.get('/addresses/:addressId', getAddressById);

export default router;