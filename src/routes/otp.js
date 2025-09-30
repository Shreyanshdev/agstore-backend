import express from 'express';
import msg91Service from '../services/msg91Service.js';

const router = express.Router();

// Store OTPs temporarily (in production, use Redis or database)
const otpStore = new Map();

// Create a separate rate limiter for OTP operations (more permissive)
const otpRateLimit = (req, res, next) => {
  const key = `otp:${req.ip}:${req.body.phoneNumber || 'unknown'}`;
  const limit = { windowMs: 2 * 60 * 1000, maxRequests: 5 }; // 5 requests per 2 minutes

  const now = Date.now();
  const windowStart = now - limit.windowMs;

  if (!otpStore.has(key)) {
    otpStore.set(key, []);
  }

  const requests = otpStore.get(key);
  const validRequests = requests.filter(timestamp => timestamp > windowStart);

  if (validRequests.length >= limit.maxRequests) {
    return res.status(429).json({
      success: false,
      message: "Too many OTP requests. Please wait before trying again.",
      error: "RATE_LIMIT_EXCEEDED"
    });
  }

  validRequests.push(now);
  otpStore.set(key, validRequests);
  next();
};

/**
 * Send OTP to phone number (NO AUTHENTICATION REQUIRED)
 * POST /api/otp/send
 * Body: { phoneNumber: "9876543210" }
 */
router.post('/send', (req, res, next) => {
    console.log('🔓 OTP send route - no auth required');
    next();
}, otpRateLimit, async (req, res) => {
    try {
        console.log('📱 Processing OTP send request');
        const { phoneNumber } = req.body;

        // Validate input
        if (!phoneNumber || typeof phoneNumber !== 'string') {
            return res.status(400).json({
                success: false,
                message: "Phone number is required",
                error: "INVALID_INPUT"
            });
        }

        // Validate phone number format
        if (!/^[6-9]\d{9}$/.test(phoneNumber)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9",
                error: "INVALID_PHONE_FORMAT"
            });
        }

        // Rate limiting: Check if OTP was sent recently (within last 2 minutes)
        const existingOtp = otpStore.get(phoneNumber);
        if (existingOtp && (new Date() - existingOtp.sentAt) < 2 * 60 * 1000) {
            return res.status(429).json({
                success: false,
                message: "OTP already sent. Please wait before requesting another OTP.",
                error: "RATE_LIMIT_EXCEEDED"
            });
        }

        // Generate OTP
        const otp = msg91Service.generateOTP(6);
        console.log('🔢 Generated OTP:', otp);
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

        // Send OTP via MSG91
        const msg91Response = await msg91Service.sendOTP(phoneNumber, otp);

        // Store OTP in memory (in production, use Redis with proper expiry)
        otpStore.set(phoneNumber, {
            otp,
            expiresAt,
            sentAt: new Date(),
            attempts: 0,
            phoneNumber: phoneNumber  // Add phone number for verification
        });

        console.log(`✅ OTP sent and stored for ${phoneNumber.substring(0, 3)}***${phoneNumber.substring(7)}`);

        return res.status(200).json({
            success: true,
            message: "OTP sent successfully",
            messageId: msg91Response.messageId,
            expiresIn: 600 // 10 minutes in seconds
        });

    } catch (error) {
        console.error("❌ Send OTP error:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to send OTP",
            error: "SERVER_ERROR"
        });
    }
});

/**
 * Verify OTP (NO AUTHENTICATION REQUIRED)
 * POST /api/otp/verify
 * Body: { phoneNumber: "9876543210", otp: "123456" }
 */
router.post('/verify', otpRateLimit, async (req, res) => {
    try {
        const { phoneNumber, otp } = req.body;

        // Validate input
        if (!phoneNumber || !otp) {
            return res.status(400).json({
                success: false,
                message: "Phone number and OTP are required",
                error: "INVALID_INPUT"
            });
        }

        if (typeof phoneNumber !== 'string' || typeof otp !== 'string') {
            return res.status(400).json({
                success: false,
                message: "Phone number and OTP must be strings",
                error: "INVALID_INPUT_TYPE"
            });
        }

        // Validate phone number format
        if (!/^[6-9]\d{9}$/.test(phoneNumber)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid 10-digit Indian mobile number",
                error: "INVALID_PHONE_FORMAT"
            });
        }

        // Get stored OTP data
        const storedOtpData = otpStore.get(phoneNumber);
        console.log('🔢 Stored OTP Data:', storedOtpData);

        if (!storedOtpData) {
            return res.status(400).json({
                success: false,
                message: "No OTP found. Please request OTP first.",
                error: "OTP_NOT_FOUND"
            });
        }

        // Check if OTP has expired
        if (new Date() > storedOtpData.expiresAt) {
            otpStore.delete(phoneNumber); // Clean up expired OTP
            return res.status(400).json({
                success: false,
                message: "OTP has expired. Please request a new OTP.",
                error: "OTP_EXPIRED"
            });
        }

        // Check if too many attempts (max 3 attempts)
        if (storedOtpData.attempts >= 3) {
            otpStore.delete(phoneNumber); // Clean up after max attempts
            return res.status(400).json({
                success: false,
                message: "Too many incorrect attempts. Please request a new OTP.",
                error: "MAX_ATTEMPTS_EXCEEDED"
            });
        }

        // Debug logging
        console.log('🔢 Stored OTP Data:', storedOtpData);
        console.log('🔢 Input OTP:', otp);
        console.log('🔢 Phone Number:', phoneNumber);

        // Verify OTP
        const isValid = msg91Service.verifyOTP(phoneNumber, otp, storedOtpData);

        if (!isValid) {
            // Increment attempts
            storedOtpData.attempts += 1;
            otpStore.set(phoneNumber, storedOtpData);

            const remainingAttempts = 3 - storedOtpData.attempts;

            return res.status(400).json({
                success: false,
                message: `Invalid OTP. ${remainingAttempts} attempts remaining.`,
                error: "INVALID_OTP"
            });
        }

        // OTP is valid - clean up and return success
        otpStore.delete(phoneNumber);

        console.log(`✅ OTP verified successfully for ${phoneNumber.substring(0, 3)}***${phoneNumber.substring(7)}`);

        return res.status(200).json({
            success: true,
            message: "OTP verified successfully",
            phoneNumber: phoneNumber,
            verified: true
        });

    } catch (error) {
        console.error("❌ Verify OTP error:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to verify OTP",
            error: "SERVER_ERROR"
        });
    }
});

/**
 * Resend OTP (NO AUTHENTICATION REQUIRED)
 * POST /api/otp/resend
 * Body: { phoneNumber: "9876543210" }
 */
router.post('/resend', otpRateLimit, async (req, res) => {
    try {
        const { phoneNumber } = req.body;

        // Validate input
        if (!phoneNumber || typeof phoneNumber !== 'string') {
            return res.status(400).json({
                success: false,
                message: "Phone number is required",
                error: "INVALID_INPUT"
            });
        }

        // Validate phone number format
        if (!/^[6-9]\d{9}$/.test(phoneNumber)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid 10-digit Indian mobile number",
                error: "INVALID_PHONE_FORMAT"
            });
        }

        // Clean up any existing OTP for this number
        otpStore.delete(phoneNumber);

        // Use the same logic as send OTP
        const otp = msg91Service.generateOTP(6);
        console.log('🔢 Generated OTP:', otp);
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

        // Send OTP via MSG91
        const msg91Response = await msg91Service.sendOTP(phoneNumber, otp);

        // Store OTP in memory
        otpStore.set(phoneNumber, {
            otp,
            expiresAt,
            sentAt: new Date(),
            attempts: 0,
            phoneNumber: phoneNumber  // Add phone number for verification
        });

        console.log(`✅ OTP resent successfully to ${phoneNumber.substring(0, 3)}***${phoneNumber.substring(7)}`);

        return res.status(200).json({
            success: true,
            message: "OTP resent successfully",
            messageId: msg91Response.messageId,
            expiresIn: 600 // 10 minutes in seconds
        });

    } catch (error) {
        console.error("❌ Resend OTP error:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to resend OTP",
            error: "SERVER_ERROR"
        });
    }
});

/**
 * Clean up expired OTPs (for maintenance)
 * This could be called by a cron job or cleanup function
 */
export const cleanupExpiredOTPs = () => {
    const now = new Date();
    let cleanedCount = 0;

    for (const [phoneNumber, otpData] of otpStore.entries()) {
        if (now > otpData.expiresAt) {
            otpStore.delete(phoneNumber);
            cleanedCount++;
        }
    }

    if (cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanedCount} expired OTPs`);
    }

    return cleanedCount;
};

export default router;
