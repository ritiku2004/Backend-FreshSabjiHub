const axios = require('axios');
require('dotenv').config();

const sendSMS = async (mobileNumber, otp) => {
    try {
        const options = {
            method: 'POST',
            url: 'https://control.msg91.com/api/v5/flow/',
            headers: {
                'authkey': process.env.MSG91_AUTH_KEY,
                'content-type': 'application/json'
            },
            data: {
                template_id: process.env.MSG91_TEMPLATE_ID,
                short_url: "0", 
                recipients: [
                    {
                        mobiles: `91${mobileNumber}`, 
                        var1: otp
                    }
                ]
            }
        };

        const response = await axios.request(options);
        console.log(`[MSG91] SMS sent successfully to ${mobileNumber}:`, response.data);
        return response.data;
        
    } catch (error) {
        console.error('[MSG91] Error sending SMS:', error.response ? error.response.data : error.message);
        // We might not want to throw the error to prevent app crash if SMS fails, but usually we do:
        throw error;
    }
};

module.exports = {
    sendSMS
};
