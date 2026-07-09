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
            'https://api.tnstechnova.in/api/messages/send',
            {
                device_id: Number(process.env.WHATSAPP_DEVICE_ID) || 1,
                recipient,
                message_type: 'text',
                content: `Your FreshSabjiHub verification code is: *${otp}*\n\nThis code will expire in 5 minutes.\n\nDo not share this code with anyone.`
            },
            {
                headers: {
                    'X-API-Key': process.env.WHATSAPP_API_KEY,
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
