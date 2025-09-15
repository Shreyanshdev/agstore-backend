import 'dotenv/config';
import MongoStore from 'connect-mongo';

export const PORT = process.env.PORT || 3000;
export const COOKIE_SECRET = process.env.COOKIE_PASSWORD ; // Changed to COOKIE_SECRET for Express
export const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
export const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

export const sessionStore = MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: "sessions",
    ttl: 14 * 24 * 60 * 60, // 14 days
    autoRemove: 'interval',
    autoRemoveInterval: 10 // In minutes. Default
});

sessionStore.on('error', (error) => {
    console.error('Session store error:', error);
});