const { deviceTokenModel } = require('../../models');
const { responseHelper } = require('../../utils');
const jwt = require('jsonwebtoken');

const registerToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return responseHelper.sendError(res, 400, 'FCM device token is required.');
    }

    // Attempt optional authentication decoding if Bearer token is provided
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const jwtToken = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(jwtToken, process.env.JWT_SECRET || 'your_jwt_secret_key_here');
        userId = decoded.id;
      } catch (err) {
        console.warn('Optional JWT verification failed in registerToken:', err.message);
      }
    }

    await deviceTokenModel.saveToken({
      userId,
      token,
      isAdmin: false
    });

    return responseHelper.sendSuccess(res, 200, 'FCM token registered successfully.');
  } catch (error) {
    console.error('Error registering FCM token:', error);
    return responseHelper.sendError(res, 500, 'Failed to register FCM token.', error);
  }
};

module.exports = {
  registerToken
};
