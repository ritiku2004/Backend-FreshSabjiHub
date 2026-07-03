const { authService } = require('../../services/user');
const { responseHelper } = require('../../utils');

const sendOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return responseHelper.sendError(res, 400, 'Phone number is required');
    }
    // Simple 10-digit validation
    const cleanPhone = phone.trim().replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      return responseHelper.sendError(res, 400, 'Please enter a valid 10-digit phone number');
    }

    await authService.generateAndSendOtp(cleanPhone);
    return responseHelper.sendSuccess(res, 200, 'OTP sent successfully to your phone number');
  } catch (error) {
    console.error('Send OTP Error:', error);
    return responseHelper.sendError(res, 500, 'Failed to send OTP');
  }
};

const verifyOtpAndLogin = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return responseHelper.sendError(res, 400, 'Phone number and OTP are required');
    }

    const cleanPhone = phone.trim().replace(/[^0-9]/g, '');
    const result = await authService.verifyCustomOtpAndLogin(cleanPhone, otp);
    return responseHelper.sendSuccess(res, 200, 'Login successful', result);
  } catch (error) {
    console.error('Verify OTP Error:', error);
    return responseHelper.sendError(res, 401, error.message || 'Authentication failed');
  }
};

module.exports = {
  sendOtp,
  verifyOtpAndLogin
};
