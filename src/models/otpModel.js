const pool = require('../config/db');

const saveOtp = async (email, otp, expiresAt) => {
  const [result] = await pool.query(
    'INSERT INTO otps (email, otp_code, expires_at) VALUES (?, ?, ?)',
    [email, otp, expiresAt]
  );
  return result.insertId;
};

const getValidOtp = async (email, otp) => {
  const [rows] = await pool.query(
    'SELECT * FROM otps WHERE email = ? AND otp_code = ? AND is_used = FALSE AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
    [email, otp]
  );
  return rows[0];
};

const markOtpAsUsed = async (id) => {
  await pool.query('UPDATE otps SET is_used = TRUE WHERE id = ?', [id]);
};

module.exports = {
  saveOtp,
  getValidOtp,
  markOtpAsUsed
};
