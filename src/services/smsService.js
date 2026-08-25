const axios = require('axios');
require('dotenv').config();

/**
 * Send OTP via WhatsApp using the TNSTechnova API.
 * Kept as `sendSMS` so existing callers (authService) need no changes.
 */
const sendSMS = async (mobileNumber, otp) => {
    try {
        // Format recipient: add 91 country code for Indian numbers
        const recipient = `91${mobileNumber}`;

        const response = await axios.post(
            'https://official.technovicsolutions.com/api/v1/messages/template',
            {
                phone: recipient,
                template_name: 'login_verification_otp',
                language: 'en',
                variables: [String(otp)],
                button_variables: [
                    {
                        index: 0,
                        sub_type: 'url',
                        text: String(otp)
                    }
                ]
            },
            {
                headers: {
                    'X-API-Key': '8701b828ee4143b76d32fd7136a5c3b645bc3ea54fc34dad6af2a918d81e514a',
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log(`[WhatsApp OTP] Message sent successfully to ${mobileNumber}:`, response.data);
        return response.data;

    } catch (error) {
        console.error(
            '[WhatsApp OTP] Error sending message:',
            error.response ? error.response.data : error.message
        );
        throw error;
    }
};

module.exports = {
    sendSMS
};
