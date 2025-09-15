import jwt from "jsonwebtoken";
import { Customer, DeliveryPartner, Admin } from "../models/user.js";

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map();

// Rate limiting configuration - Relaxed for development
const RATE_LIMITS = {
  AUTH: { windowMs: 60 * 1000, maxRequests: 20 }, // 20 requests per minute for auth (development)
  GENERAL: { windowMs: 60 * 1000, maxRequests: 200 } // 200 requests per minute general (development)
};

const checkRateLimit = (key, limit) => {
  const now = Date.now();
  const windowStart = now - limit.windowMs;

  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, []);
  }

  const requests = rateLimitStore.get(key);
  const validRequests = requests.filter(timestamp => timestamp > windowStart);

  if (validRequests.length >= limit.maxRequests) {
    return false; // Rate limit exceeded
  }

  validRequests.push(now);
  rateLimitStore.set(key, validRequests);

  // Cleanup old entries periodically
  if (Math.random() < 0.01) { // 1% chance to cleanup
    for (const [k, v] of rateLimitStore.entries()) {
      const cleaned = v.filter(timestamp => timestamp > windowStart);
      if (cleaned.length === 0) {
        rateLimitStore.delete(k);
      } else {
        rateLimitStore.set(k, cleaned);
      }
    }
  }

  return true;
};

export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
      return res.status(401).json({
        message: "Authorization header is required",
        error: "MISSING_AUTH_HEADER"
      });
    }

    if (typeof authHeader !== 'string') {
      return res.status(401).json({
        message: "Invalid authorization header format",
        error: "INVALID_AUTH_FORMAT"
      });
    }

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: "Authorization header must start with 'Bearer '",
        error: "INVALID_BEARER_FORMAT"
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token || token.trim() === '' || token === 'null' || token === 'undefined') {
      return res.status(401).json({
        message: "Access token is required",
        error: "MISSING_TOKEN"
      });
    }

    // Rate limiting for token verification
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    if (!checkRateLimit(`token_verify_${clientIP}`, RATE_LIMITS.GENERAL)) {
      return res.status(429).json({
        message: "Too many requests. Please try again later.",
        error: "RATE_LIMIT_EXCEEDED"
      });
    }

    // Verify JWT token with comprehensive error handling
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, {
      issuer: "milk-delivery-app",
      audience: ["Customer", "DeliveryPartner"]
    });

    if (!decoded || !decoded.userId || !decoded.role) {
      return res.status(401).json({
        message: "Invalid token payload",
        error: "INVALID_TOKEN_PAYLOAD"
      });
    }

    // Validate role
    if (!["Customer", "DeliveryPartner"].includes(decoded.role)) {
      return res.status(401).json({
        message: "Invalid user role",
        error: "INVALID_ROLE"
      });
    }

    let user;
    switch (decoded.role) {
      case 'Customer':
        user = await Customer.findById(decoded.userId).select('-password'); // Exclude password
        break;
      case 'DeliveryPartner':
        user = await DeliveryPartner.findById(decoded.userId).select('-password');
        break;
      case 'Admin': // Although not in audience, good to handle if token somehow has this role
        user = await Admin.findById(decoded.userId).select('-password');
        break;
      default:
        return res.status(401).json({
          message: "Unknown user role",
          error: "UNKNOWN_ROLE"
        });
    }

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        error: "USER_NOT_FOUND"
      });
    }

    // Attach full user object to request
    req.user = user;

    // Log successful verification (without sensitive data)
    console.log(`✅ Token verified for ${decoded.role}: ${decoded.userId.substring(0, 8)}...`);

    next();

  } catch (error) {
    console.error("❌ Token verification error:", error.message);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: "Access token has expired",
        error: "TOKEN_EXPIRED"
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        message: "Invalid access token",
        error: "INVALID_TOKEN"
      });
    }

    if (error.name === 'NotBeforeError') {
      return res.status(401).json({
        message: "Token not active yet",
        error: "TOKEN_NOT_ACTIVE"
      });
    }

    return res.status(401).json({
      message: "Token verification failed",
      error: "VERIFICATION_FAILED"
    });
  }
};

// Rate limiting middleware for auth endpoints
export const authRateLimit = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  const identifier = req.body?.phone || req.body?.email || clientIP;

  if (!checkRateLimit(`auth_${identifier}`, RATE_LIMITS.AUTH)) {
    return res.status(429).json({
      message: "Too many authentication attempts. Please try again later.",
      error: "AUTH_RATE_LIMIT_EXCEEDED"
    });
  }

  next();
};

export const optionalVerifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];

    // If no auth header, proceed without user
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];

    // If token is missing or invalid, proceed without user
    if (!token || token.trim() === '' || token === 'null' || token === 'undefined') {
      return next();
    }

    // Rate limiting for token verification (optional, can be removed for optional token)
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    if (!checkRateLimit(`token_verify_${clientIP}`, RATE_LIMITS.GENERAL)) {
      // If rate limit exceeded, still send 429
      return res.status(429).json({
        message: "Too many requests. Please try again later.",
        error: "RATE_LIMIT_EXCEEDED"
      });
    }

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, {
      issuer: "milk-delivery-app",
      audience: ["Customer", "DeliveryPartner"]
    });

    if (!decoded || !decoded.userId || !decoded.role) {
      return next(); // Invalid token payload, proceed without user
    }

    if (!["Customer", "DeliveryPartner"].includes(decoded.role)) {
      return next(); // Invalid user role, proceed without user
    }

    let user;
    switch (decoded.role) {
      case 'Customer':
        user = await Customer.findById(decoded.userId).select('-password');
        break;
      case 'DeliveryPartner':
        user = await DeliveryPartner.findById(decoded.userId).select('-password');
        break;
      case 'Admin':
        user = await Admin.findById(decoded.userId).select('-password');
        break;
      default:
        return next(); // Unknown role, proceed without user
    }

    if (!user) {
      return next(); // User not found, proceed without user
    }

    req.user = user;
    console.log(`✅ Optional Token verified for ${decoded.role}: ${decoded.userId.substring(0, 8)}...`);
    next();

  } catch (error) {
    // Log the error but proceed to next middleware/route handler
    console.error("❌ Optional Token verification error:", error.message);
    next();
  }
};