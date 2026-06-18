const jwt = require('jsonwebtoken');
const { userModel, otpModel } = require('../../models');
const { emailSender } = require('../../utils');
require('dotenv').config();

const generateAndSendOtp = async (email) => {
  // Generate a random 6-digit OTP
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Set expiry to 5 minutes from now
  const expiresAt = new Date(Date.now() + 5 * 60000);
  
  await otpModel.saveOtp(email, otpCode, expiresAt);
  
  // Send OTP via email
  await emailSender.sendOtpEmail(email, otpCode);
  
  return true; // Do not return the actual OTP code to the frontend
};

const verifyCustomOtpAndLogin = async (email, otpCode) => {
  const validOtp = await otpModel.getValidOtp(email, otpCode);
  
  if (!validOtp) {
    throw new Error('Invalid or expired OTP');
  }
  
  await otpModel.markOtpAsUsed(validOtp.id);

  let user = await userModel.getUserByEmail(email);

  if (!user) {
    const userId = await userModel.createUser({ email });
    user = await userModel.getUserById(userId);
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: 'user' },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: '7d' }
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
