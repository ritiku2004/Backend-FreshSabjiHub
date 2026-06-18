const jwt = require('jsonwebtoken');
const { responseHelper } = require('../utils');

const verifyAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return responseHelper.sendError(res, 401, 'Access denied. No token provided.');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    if (decoded.role !== 'admin') {
      return responseHelper.sendError(res, 403, 'Access denied. Requires admin privileges.');
    }
    req.admin = decoded;
    next();
  } catch (ex) {
    return responseHelper.sendError(res, 400, 'Invalid token.');
  }
};

const authenticateJWT = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return responseHelper.sendError(res, 401, 'Access denied. No token provided.');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here');
    req.user = decoded;
    next();
  } catch (ex) {
    return responseHelper.sendError(res, 400, 'Invalid token.');
  }
};

module.exports = {
  verifyAdmin,
  authenticateJWT
};
