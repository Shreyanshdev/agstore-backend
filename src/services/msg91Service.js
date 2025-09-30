import axios from 'axios';

/**
 * MSG91 OTP Service
 * Handles sending and verifying OTP via MSG91 API
 */
class MSG91Service {
    constructor() {
        this.authKey = process.env.MSG91_AUTH_KEY;
        this.senderId = process.env.MSG91_SENDER_ID || 'VERIFY';
        this.route = process.env.MSG91_ROUTE || '4'; // Transactional route

        if (!this.authKey) {
            console.error('❌ MSG91_AUTH_KEY environment variable is required');
            throw new Error('MSG91 configuration missing');
        }
    }

    /**
     * Send OTP to a phone number
     * @param {string} phoneNumber - Phone number in format: 9876543210
     * @param {string} otp - OTP to send (4-6 digits)
     * @returns {Promise<Object>} - Response from MSG91 API
     */
    async sendOTP(phoneNumber, otp) {
        try {
            // Validate phone number format (Indian mobile number)
            if (!/^[6-9]\d{9}$/.test(phoneNumber)) {
                throw new Error('Invalid phone number format. Must be 10-digit Indian mobile number.');
            }

            const message = `Your OTP is: ${otp}. Valid for 10 minutes. Do not share with anyone.`;

            console.log(`📱 Sending OTP to ${phoneNumber.substring(0, 3)}***${phoneNumber.substring(7)}`);

            // MSG91 API endpoint and parameters
            const url = 'https://control.msg91.com/api/sendhttp.php';
            const params = {
                authkey: this.authKey,
                mobiles: phoneNumber,
                message: message,
                sender: this.senderId,
                route: this.route,
                country: '91',
                response: 'json'
            };

            const response = await axios.get(url, { params, timeout: 10000 });

            if (response.data && response.data.type === 'success') {
                console.log(`✅ OTP sent successfully to ${phoneNumber.substring(0, 3)}***${phoneNumber.substring(7)}`);
                return {
                    success: true,
                    messageId: response.data.message || 'OTP_SENT',
                    phoneNumber: phoneNumber
                };
            } else {
                throw new Error(response.data?.message || 'Failed to send OTP');
            }

        } catch (error) {
            console.error('❌ MSG91 send OTP error:', error.message);
            throw new Error(`Failed to send OTP: ${error.message}`);
        }
    }

    /**
     * Generate a random OTP
     * @param {number} length - Length of OTP (default: 6)
     * @returns {string} - Generated OTP
     */
    generateOTP(length = 6) {
        const digits = '0123456789';
        let otp = '';

        for (let i = 0; i < length; i++) {
            otp += digits[Math.floor(Math.random() * digits.length)];
        }

        return otp;
    }

    /**
     * Verify OTP (This is handled by storing OTP in database and comparing)
     * @param {string} phoneNumber - Phone number
     * @param {string} otp - OTP entered by user
     * @param {Object} storedOTPData - Stored OTP data from database
     * @returns {boolean} - Whether OTP is valid
     */
    verifyOTP(phoneNumber, otp, storedOTPData) {
        try {
            // Check if OTP exists
            if (!storedOTPData || !storedOTPData.otp) {
                return false;
            }

            // Check if OTP has expired
            if (new Date() > storedOTPData.expiresAt) {
                return false;
            }

            // Check if phone number matches
            if (storedOTPData.phoneNumber !== phoneNumber) {
                return false;
            }

            // Check if OTP matches
            const otpMatches = storedOTPData.otp === otp;
            console.log('🔢 OTP matches:', otpMatches);
            
            return otpMatches;


        } catch (error) {
            console.error('❌ OTP verification error:', error.message);
            return false;
        }
    }

    /**
     * Format phone number for MSG91 (ensure it starts with country code)
     * @param {string} phoneNumber - Phone number
     * @returns {string} - Formatted phone number
     */
    formatPhoneNumber(phoneNumber) {
        // Remove any non-digit characters
        const cleaned = phoneNumber.replace(/\D/g, '');

        // If it starts with 0, remove it (assuming it's Indian number)
        if (cleaned.startsWith('0')) {
            return cleaned.substring(1);
        }

        // If it doesn't start with country code, assume Indian (91)
        if (!cleaned.startsWith('91') && cleaned.length === 10) {
            return `91${cleaned}`;
        }

        return cleaned;
    }
}

// Export singleton instance
export default new MSG91Service();
