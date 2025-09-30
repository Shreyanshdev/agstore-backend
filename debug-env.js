#!/usr/bin/env node

import dotenv from 'dotenv';

console.log('🔍 Debugging Environment Variables...\n');

// Load environment variables
dotenv.config();

console.log('📋 Environment Variables:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'NOT SET'}`);
console.log(`   MSG91_AUTH_KEY: ${process.env.MSG91_AUTH_KEY || 'NOT SET'}`);
console.log(`   MSG91_SENDER_ID: ${process.env.MSG91_SENDER_ID || 'NOT SET'}`);
console.log(`   MSG91_ROUTE: ${process.env.MSG91_ROUTE || 'NOT SET'}`);
console.log(`   MONGO_URI: ${process.env.MONGO_URI ? 'SET' : 'NOT SET'}`);
console.log(`   RAZORPAY_KEY_ID: ${process.env.RAZORPAY_KEY_ID ? 'SET' : 'NOT SET'}`);

console.log('\n🔧 All Environment Variables:');
Object.keys(process.env)
  .filter(key => key.includes('MSG91') || key.includes('RAZORPAY') || key.includes('MONGO'))
  .forEach(key => {
    console.log(`   ${key}: ${process.env[key] ? 'SET' : 'NOT SET'}`);
  });
