import { Customer, DeliveryPartner } from "../../models/user.js";
import jwt from "jsonwebtoken";
// import bcrypt from "bcrypt"; // COMMENTED OUT FOR TESTING - Delivery Partner passwords stored in plain text
import crypto from "crypto";

/*
 * BCRYPT DISABLED FOR TESTING
 * ===========================
 * To re-enable bcrypt for delivery partners:
 * 1. Uncomment the bcrypt import above
 * 2. Uncomment the bcrypt.compare() line in loginDeliveryPartner function
 * 3. Uncomment password validation if desired
 * 4. Uncomment account locking logic if desired
 * 5. For MongoDB GUI: Store plain text passwords, bcrypt will handle hashing when enabled
 */

// Generate secure random secrets
const generateSecureSecret = (length = 64) => {
    return crypto.randomBytes(length).toString('hex');
};

// Validate environment variables
const validateEnvironment = () => {
    if (!process.env.ACCESS_TOKEN_SECRET || process.env.ACCESS_TOKEN_SECRET.length < 32) {
        console.error("❌ ACCESS_TOKEN_SECRET must be at least 32 characters long");
        process.exit(1);
    }
    if (!process.env.REFRESH_TOKEN_SECRET || process.env.REFRESH_TOKEN_SECRET.length < 32) {
        console.error("❌ REFRESH_TOKEN_SECRET must be at least 32 characters long");
        process.exit(1);
    }
    if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) {
        console.error("❌ JWT_REFRESH_SECRET must be at least 32 characters long");
        process.exit(1);
    }
};

// Validate input data
const validatePhone = (phone) => {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone);
};

const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const validatePassword = (password) => {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
};

const generateToken = (user) => {
    const payload = {
        userId: user._id,
        role: user.role,
        iat: Math.floor(Date.now() / 1000),
    };

    const accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "15m", // Short-lived access tokens
        issuer: "milk-delivery-app",
        audience: user.role
    });

    const refreshToken = jwt.sign({
        userId: user._id,
        role: user.role,
        tokenId: crypto.randomUUID(), // Unique token ID for rotation
    }, process.env.REFRESH_TOKEN_SECRET, {
        expiresIn: "7d",
        issuer: "milk-delivery-app",
        audience: user.role
    });

    return { accessToken, refreshToken };
};

// Initialize validation
validateEnvironment();

export const loginCustomer = async (req, res) => {
    try {
        const { phone } = req.body;

        // Validate input
        if (!phone || typeof phone !== 'string') {
            return res.status(400).json({
                message: "Phone number is required",
                error: "INVALID_INPUT"
            });
        }

        if (!validatePhone(phone)) {
            return res.status(400).json({
                message: "Please enter a valid 10-digit Indian mobile number",
                error: "INVALID_PHONE_FORMAT"
            });
        }

        // Find or create customer
        let customer = await Customer.findOne({ phone }).select('-password');

        if (!customer) {
            // Rate limiting: Check if phone was recently registered
            const recentRegistration = await Customer.findOne({
                phone,
                createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // 5 minutes
            });

            if (recentRegistration) {
                return res.status(429).json({
                    message: "Too many registration attempts. Please try again later.",
                    error: "RATE_LIMIT_EXCEEDED"
                });
            }

            customer = new Customer({
                phone,
                role: 'Customer',
                isActivated: true,
                lastLogin: new Date()
            });
            await customer.save();
        } else {
            // Update last login
            customer.lastLogin = new Date();
            await customer.save();
        }

        const { accessToken, refreshToken } = generateToken(customer);

        // Log successful login (without sensitive data)
        console.log(`✅ Customer login successful: ${phone.substring(0, 3)}***${phone.substring(7)}`);

        return res.status(200).json({
            message: "Login successful",
            accessToken,
            refreshToken,
            customer: {
                _id: customer._id,
                phone: customer.phone,
                role: customer.role,
                isActivated: customer.isActivated,
                isSubscription: customer.isSubscription
            }
        });

    } catch (error) {
        console.error("❌ Customer login error:", error.message);
        return res.status(500).json({
            message: "Internal server error",
            error: "SERVER_ERROR"
        });
    }
}

export const loginDeliveryPartner = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
            return res.status(400).json({
                message: "Email and password are required",
                error: "INVALID_INPUT"
            });
        }

        // if (!validateEmail(email)) {
        //     return res.status(400).json({
        //         message: "Please enter a valid email address",
        //         error: "INVALID_EMAIL_FORMAT"
        //     });
        // }

        // COMMENTED OUT PASSWORD VALIDATION FOR TESTING - Allow any password format
        // if (!validatePassword(password)) {
        //     return res.status(400).json({
        //         message: "Password must be at least 8 characters with uppercase, lowercase, and number",
        //         error: "INVALID_PASSWORD_FORMAT"
        //     });
        // }

        // Find delivery partner
        const deliveryPartner = await DeliveryPartner.findOne({ email });

        if (!deliveryPartner) {
            return res.status(401).json({
                message: "Invalid email or password",
                error: "INVALID_CREDENTIALS"
            });
        }

        // COMMENTED OUT ACCOUNT LOCKING FOR TESTING
        // Check if account is locked due to failed attempts
        // if (deliveryPartner.accountLocked && deliveryPartner.lockUntil > Date.now()) {
        //     const remainingTime = Math.ceil((deliveryPartner.lockUntil - Date.now()) / 1000 / 60);
        //     return res.status(423).json({
        //         message: `Account locked. Try again in ${remainingTime} minutes`,
        //         error: "ACCOUNT_LOCKED"
        //     });
        // }

        // Verify password - COMMENTED OUT BCRYPT FOR TESTING
        if (!deliveryPartner.password) {
            return res.status(401).json({
                message: "Invalid email or password",
                error: "INVALID_CREDENTIALS"
            });
        }

        // COMMENTED OUT BCRYPT FOR TESTING - Using plain text comparison
        // const isValidPassword = await bcrypt.compare(password, deliveryPartner.password);
        const isValidPassword = password === deliveryPartner.password;

        if (!isValidPassword) {
            // COMMENTED OUT FAILED LOGIN ATTEMPTS LOGIC FOR TESTING
            // Increment failed login attempts
            // deliveryPartner.failedLoginAttempts = (deliveryPartner.failedLoginAttempts || 0) + 1;

            // Lock account after 5 failed attempts
            // if (deliveryPartner.failedLoginAttempts >= 5) {
            //     deliveryPartner.accountLocked = true;
            //     deliveryPartner.lockUntil = Date.now() + (15 * 60 * 1000); // 15 minutes
            //     deliveryPartner.failedLoginAttempts = 0;
            // }

            // await deliveryPartner.save();

            return res.status(401).json({
                message: "Invalid email or password",
                error: "INVALID_CREDENTIALS"
            });
        }

        // COMMENTED OUT FAILED ATTEMPTS RESET FOR TESTING
        // Reset failed attempts and unlock account on successful login
        // deliveryPartner.failedLoginAttempts = 0;
        // deliveryPartner.accountLocked = false;
        // deliveryPartner.lockUntil = undefined;
        deliveryPartner.lastLogin = new Date();

        await deliveryPartner.save();

        const { accessToken, refreshToken } = generateToken(deliveryPartner);

        // Log successful login (without sensitive data)
        console.log(`✅ Delivery partner login successful: ${email.split('@')[0]}@***`);

        return res.status(200).json({
            message: "Login successful",
            accessToken,
            refreshToken,
            deliveryPartner: {
                _id: deliveryPartner._id,
                name: deliveryPartner.name,
                email: deliveryPartner.email,
                role: deliveryPartner.role,
                phone: deliveryPartner.phone
            }
        });

    } catch (error) {
        console.error("❌ Delivery partner login error:", error.message);
        return res.status(500).json({
            message: "Internal server error",
            error: "SERVER_ERROR"
        });
    }
};

export const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken || typeof refreshToken !== 'string') {
            return res.status(400).json({
                message: "Refresh token is required",
                error: "INVALID_INPUT"
            });
        }

        // Verify refresh token
        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

        if (!decoded || !decoded.userId || !decoded.role) {
            return res.status(401).json({
                message: "Invalid refresh token",
                error: "INVALID_TOKEN"
            });
        }

        // Find user
        let user;
        if (decoded.role === 'Customer') {
            user = await Customer.findById(decoded.userId).select('-password');
        } else if (decoded.role === 'DeliveryPartner') {
            user = await DeliveryPartner.findById(decoded.userId).select('-password');
        } else {
            return res.status(401).json({
                message: "Invalid user role",
                error: "INVALID_ROLE"
            });
        }

        if (!user) {
            return res.status(404).json({
                message: "User not found",
                error: "USER_NOT_FOUND"
            });
        }

        // Check if user is active
        if (user.role === 'DeliveryPartner' && user.accountLocked) {
            return res.status(423).json({
                message: "Account is locked",
                error: "ACCOUNT_LOCKED"
            });
        }

        // Generate new tokens
        const { accessToken, refreshToken: newRefreshToken } = generateToken(user);

        console.log(`🔄 Token refreshed for ${decoded.role}: ${decoded.userId}`);

        return res.status(200).json({
            message: "Tokens refreshed successfully",
            accessToken,
            refreshToken: newRefreshToken,
            user: {
                _id: user._id,
                role: user.role,
                ...(user.role === 'Customer' ? { phone: user.phone } : { email: user.email })
            }
        });

    } catch (error) {
        console.error("❌ Refresh token error:", error.message);

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                message: "Refresh token expired",
                error: "TOKEN_EXPIRED"
            });
        }

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                message: "Invalid refresh token",
                error: "INVALID_TOKEN"
            });
        }

        return res.status(500).json({
            message: "Internal server error",
            error: "SERVER_ERROR"
        });
    }
}

export const fetchUser = async (req, res) => {
    try{
        const {userId, role} = req.user;
        let user;

        if(role=== 'Customer') {
            user = await Customer.findById(userId);
        }
        else if(role === 'DeliveryPartner') {
            user = await DeliveryPartner.findById(userId);
        }
        else {
            return res.status(401).json({ message: "Unauthorized" });
        }

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        return res.status(200).json({
            message: "User fetched successfully",
            user
        });
    }
    catch(error) {
        console.error("Fetch user error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export const logout = async (req, res) => {
    try {
        // For stateless JWTs, server-side logout is often just a formality.
        // The actual logout happens on the client by removing the token.
        return res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
        console.error("Logout error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};