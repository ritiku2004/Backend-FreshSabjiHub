const jwt = require('jsonwebtoken');
const { userModel, otpModel } = require('../../models');
const { emailSender } = require('../../utils');
const path = require('path');
const { sendSMS } = require('../smsService');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const generateAndSendOtp = async (phone) => {
  // Generate a random 6-digit OTP
  // For test phone numbers starting with '99999' or ending with '00000', use '123456'
  const otpCode = (phone.startsWith('99999') || phone.endsWith('00000')) ? '123456' : Math.floor(100000 + Math.random() * 900000).toString();
  
  // Set expiry to 5 minutes from now
  const expiresAt = new Date(Date.now() + 5 * 60000);
  
  await otpModel.saveOtp(phone, otpCode, expiresAt);
  
  // Send SMS via MSG91 (only if not a test number)
  if (!phone.startsWith('99999') && !phone.endsWith('00000')) {
      try {
          await sendSMS(phone, otpCode);
      } catch (err) {
          console.error("Failed to send OTP via SMS:", err);
          // throw new Error("Could not send SMS"); // Optional: throw error if critical
      }
  }

  return true; // Do not return the actual OTP code to the frontend
};

const verifyCustomOtpAndLogin = async (phone, otpCode) => {
  const validOtp = await otpModel.getValidOtp(phone, otpCode);
  
  if (!validOtp) {
    throw new Error('Invalid or expired OTP');
  }
  
  await otpModel.markOtpAsUsed(validOtp.id);

  let user = await userModel.getUserByPhone(phone);

  if (!user) {
    const userId = await userModel.createUser({ phone_number: phone });
    user = await userModel.getUserById(userId);
  }

  const token = jwt.sign(
    { id: user.id, phone_number: user.phone_number, role: 'user' },
    process.env.JWT_SECRET || 'your_jwt_secret_key_here',
    { expiresIn: '90d' }
  );

  return {
    user,
    token
  };
};

module.exports = {
  generateAndSendOtp,
  verifyCustomOtpAndLogin
};
