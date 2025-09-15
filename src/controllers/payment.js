import razorpay from '../config/razorpay.js';
import crypto from 'crypto';
import Order from '../models/order.js'; // Import the Order model

import mongoose from 'mongoose';

// Enhanced payment order creation with validation
export const createOrder = async (req, res) => {
    const { amount, currency, receipt, orderType, orderId } = req.body;

    // Enhanced validation
    if (!amount || !currency || !receipt) {
        return res.status(400).json({ 
            success: false,
            error: "Missing required fields: amount, currency, receipt" 
        });
    }

    // Validate amount
    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({ 
            success: false,
            error: "Invalid amount. Must be a positive number." 
        });
    }

    // Validate currency
    if (currency !== 'INR') {
        return res.status(400).json({ 
            success: false,
            error: "Only INR currency is supported" 
        });
    }

    try {
        // If orderId is provided, validate the order exists and is in correct state
        if (orderId) {
            if (!mongoose.Types.ObjectId.isValid(orderId)) {
                return res.status(400).json({ 
                    success: false,
                    error: "Invalid order ID format" 
                });
            }

            const order = await Order.findById(orderId);
            if (!order) {
                return res.status(404).json({ 
                    success: false,
                    error: "Order not found" 
                });
            }

            // Check if order is in a state that allows payment
            if (!['pending', 'created'].includes(order.status)) {
                return res.status(400).json({ 
                    success: false,
                    error: `Order cannot be paid. Current status: ${order.status}` 
                });
            }

            // Validate amount matches order total (items + delivery fee)
            const expectedAmount = Number(order.totalPrice || 0) + Number(order.deliveryFee || 0);
            if (Math.abs(numericAmount - expectedAmount) > 0.01) { // Allow small floating point differences
                return res.status(400).json({ 
                    success: false,
                    error: `Amount mismatch. Expected: ${expectedAmount}, Received: ${numericAmount}` 
                });
            }
        }

        // Special handling for addProduct order type (no existing order validation needed)
        if (orderType === 'addProduct') {
            console.log('✅ Creating Razorpay order for add product payment:', { 
                amount: numericAmount, 
                currency, 
                receipt,
                orderType 
            });
            // No additional validation needed for add product payments
        }

        const options = {
            amount: Math.round(numericAmount * 100), // To paise
            currency: currency,
            receipt: receipt,
            notes: {
                orderId: orderId || null,
                orderType: orderType || 'regular',
                timestamp: new Date().toISOString()
            }
        };

        const order = await razorpay.orders.create(options);
        console.log("✅ Razorpay order created successfully:", {
            id: order.id,
            amount: order.amount,
            currency: order.currency,
            status: order.status
        });
        
        res.json({
            success: true,
            ...order
        });
    } catch (error) {
        console.error("Razorpay order creation failed:", error);
        res.status(500).json({ 
            success: false,
            error: error?.message || "Failed to create Razorpay order" 
        });
    }
};

// Enhanced payment verification with comprehensive validation
export const verifyPayment = async (req, res) => {
    const session = await mongoose.startSession();
    
    try {
        const { order_id, payment_id, signature, appOrderId, amount, isAddProductPayment } = req.body;

        // Enhanced validation
        if (!order_id || !payment_id || !signature) {
            return res.status(400).json({ 
                success: false,
                error: "Missing required fields for verification" 
            });
        }

        // Validate signature format
        if (typeof signature !== 'string' || signature.length !== 64) {
            return res.status(400).json({ 
                success: false,
                error: "Invalid signature format" 
            });
        }

        // Verify Razorpay signature
        const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
        hmac.update(`${order_id}|${payment_id}`);
        const generated_signature = hmac.digest('hex');

        if (generated_signature !== signature) {
            console.error("Payment verification failed - invalid signature");
            return res.status(400).json({ 
                success: false, 
                error: "Payment verification failed - invalid signature" 
            });
        }

        // Start transaction for atomic operations
        await session.startTransaction();

        // Process order payment
        if (appOrderId) {
            const orderResult = await processOrderPayment(appOrderId, {
                order_id,
                payment_id,
                signature,
                amount
            }, session);

            if (!orderResult.success) {
                await session.abortTransaction();
                return res.status(400).json({ 
                    success: false,
                    error: orderResult.error 
                });
            }
        }

        

        // Commit transaction
        await session.commitTransaction();

        res.json({ 
            success: true, 
            message: "Payment verified successfully",
            order_id,
            payment_id,
            appOrderId: appOrderId || null
        });

    } catch (error) {
        // Abort transaction on error
        await session.abortTransaction();
        console.error("Payment verification error:", error);
        res.status(500).json({ 
            success: false, 
            error: "Internal server error during payment verification" 
        });
    } finally {
        // End session
        await session.endSession();
    }
};

// Get payment status for an order
export const getPaymentStatus = async (req, res) => {
    try {
        const { orderId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({ 
                success: false,
                error: "Invalid order ID format" 
            });
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ 
                success: false,
                error: "Order not found" 
            });
        }

        res.json({
            success: true,
            orderId: order._id,
            status: order.status,
            paymentStatus: order.paymentStatus || 'pending',
            paymentDetails: order.paymentDetails || null,
            totalAmount: order.totalPrice
        });

    } catch (error) {
        console.error("Get payment status error:", error);
        res.status(500).json({ 
            success: false, 
            error: "Internal server error" 
        });
    }
};

// Refund payment (admin functionality)
export const refundPayment = async (req, res) => {
    try {
        const { paymentId, amount, reason } = req.body;

        if (!paymentId) {
            return res.status(400).json({ 
                success: false,
                error: "Payment ID is required" 
            });
        }

        const refundData = {
            payment_id: paymentId,
            amount: amount ? Math.round(Number(amount) * 100) : undefined, // Convert to paise
            notes: {
                reason: reason || 'Customer request',
                refundedAt: new Date().toISOString()
            }
        };

        const refund = await razorpay.payments.refund(paymentId, refundData);
        console.log("Refund processed:", refund);

        res.json({
            success: true,
            message: "Refund processed successfully",
            refund
        });

    } catch (error) {
        console.error("Refund error:", error);
        res.status(500).json({ 
            success: false, 
            error: error?.message || "Failed to process refund" 
        });
    }
};

// Process order payment with validation
async function processOrderPayment(orderId, paymentData, session) {
    try {
        const { order_id, payment_id, signature, amount } = paymentData;

        // Validate order ID format
        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return { success: false, error: "Invalid order ID format" };
        }

        // Find order with session for transaction
        const order = await Order.findById(orderId).session(session);
        if (!order) {
            return { success: false, error: "Order not found" };
        }

        // Check if order is in a state that allows payment verification
        if (!['pending', 'created'].includes(order.status)) {
            return { success: false, error: `Order cannot be verified. Current status: ${order.status}` };
        }

        // Validate amount if provided (totalPrice already includes deliveryFee)
        if (amount) {
            const expectedAmount = order.totalPrice;
            const receivedAmount = Number(amount);
            if (Math.abs(receivedAmount - expectedAmount) > 0.01) {
                return { success: false, error: `Amount mismatch. Expected: ${expectedAmount}, Received: ${receivedAmount}` };
            }
        }

        // Check for duplicate payment processing
        if (order.paymentStatus === 'verified' || order.paymentStatus === 'completed') {
            return { success: false, error: "Payment already processed for this order" };
        }

        // Update order with payment information
        order.paymentStatus = 'verified';
        order.paymentDetails = {
            razorpayOrderId: order_id,
            razorpayPaymentId: payment_id,
            razorpaySignature: signature,
            verifiedAt: new Date(),
            amount: amount || order.totalPrice
        };
        order.updatedAt = new Date();

        await order.save({ session });
        console.log(`Order ${orderId} payment verified and status updated to accepted.`);

        return { success: true };
    } catch (error) {
        console.error("Process order payment error:", error);
        return { success: false, error: "Failed to process order payment" };
    }
}


