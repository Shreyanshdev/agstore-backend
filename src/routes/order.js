import express from 'express';
import {
    confirmOrder,
    createOrder,
    getOrders,
    getOrderById,
    updateOrderStatus,
    deleteOrder,
    getOrderTrackingInfo,
    getActiveOrderForUser,
    getMyOrderHistory,
    confirmDeliveryReceipt,
    acceptOrder,
    pickupOrder,
    markOrderAsDelivered,
    getAvailableOrders,
    getCurrentOrders,
    getHistoryOrders,
    updateDeliveryPartnerLocation,
    getOptimizedRoute,
    getGoogleMapsDirections,
    cancelOrder
} from "../controllers/order/order.js";

import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

router.use(verifyToken);

router.post("/order", createOrder);
router.get("/order", getOrders);
router.get("/order/available/:branchId", getAvailableOrders);
router.get("/order/current/:deliveryPartnerId", getCurrentOrders);
router.get("/order/history/:deliveryPartnerId", getHistoryOrders);
router.get("/order/active/user", getActiveOrderForUser);
router.get("/orders/my-history", getMyOrderHistory);
router.get("/order/:orderId", getOrderById);
router.get("/order/:orderId/tracking", getOrderTrackingInfo);
router.post("/order/:orderId/confirm", confirmOrder);
router.post("/order/:orderId/accept", acceptOrder);
router.post("/order/:orderId/pickup", pickupOrder);
router.post("/order/:orderId/mark-delivered", markOrderAsDelivered);
router.patch("/order/:orderId/location", updateDeliveryPartnerLocation);
router.post("/order/:orderId/optimize-route", getOptimizedRoute);
router.post("/order/:orderId/google-directions", getGoogleMapsDirections);
router.patch("/order/:orderId/status", updateOrderStatus);
router.patch("/order/:orderId/confirm-receipt", verifyToken, confirmDeliveryReceipt);
router.post("/order/:orderId/cancel", cancelOrder);
router.delete('/orders/:orderId', deleteOrder);

export default router;