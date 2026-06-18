const { deviceTokenModel } = require('../../models');
const { responseHelper } = require('../../utils');

const registerToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return responseHelper.sendError(res, 400, 'FCM device token is required.');
    }

    const userId = req.user?.id || null;
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
