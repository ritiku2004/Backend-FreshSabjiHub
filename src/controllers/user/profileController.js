const { responseHelper, ipHelper } = require('../../utils');
const { userModel } = require('../../models');

const getProfile = async (req, res) => {
  try {
    const userId = req.user.id; // comes from authMiddleware
    const user = await userModel.getUserById(userId);

    if (!user) {
      return responseHelper.sendError(res, 404, 'User not found');
    }

    return responseHelper.sendSuccess(res, 200, 'Profile fetched successfully', user);
  } catch (error) {
    console.error('Get Profile Error:', error);
    return responseHelper.sendError(res, 500, 'Failed to fetch profile');
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email, phone_number, profile_picture_url } = req.body;
    
    if (!name) {
      return responseHelper.sendError(res, 400, 'Name is required');
    }

    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');

    await userModel.updateUserProfile(userId, firstName, lastName, email, phone_number, profile_picture_url);
    
    const user = await userModel.getUserById(userId);

    return responseHelper.sendSuccess(res, 200, 'Profile updated successfully', user);
  } catch (error) {
    console.error('Update Profile Error:', error);
    return responseHelper.sendError(res, 500, 'Failed to update profile');
  }
};

const saveAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const addressData = req.body;
    
    if (!addressData.address_line1 || !addressData.city || !addressData.zipcode) {
      return responseHelper.sendError(res, 400, 'Required address fields missing');
    }

    const insertId = await userModel.saveUserAddress(userId, addressData);
    return responseHelper.sendSuccess(res, 201, 'Address saved successfully', { id: insertId });
  } catch (error) {
    console.error('Save Address Error:', error);
    return responseHelper.sendError(res, 500, 'Failed to save address');
  }
};

const getAddresses = async (req, res) => {
  try {
    const userId = req.user.id;
    const addresses = await userModel.getUserAddresses(userId);
    return responseHelper.sendSuccess(res, 200, 'Addresses fetched successfully', addresses);
  } catch (error) {
    console.error('Get Addresses Error:', error);
    return responseHelper.sendError(res, 500, 'Failed to fetch addresses');
  }
};

const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return responseHelper.sendError(res, 400, 'No file uploaded');
    }

    const userId = req.user.id;
    const fileUrl = ipHelper.getFormattedUrl(req, req.file);
    
    // Save the avatar URL directly in the database
    await userModel.updateUserProfilePicture(userId, fileUrl);

    return responseHelper.sendSuccess(res, 200, 'Avatar uploaded successfully', { url: fileUrl });
  } catch (error) {
    console.error('Upload Avatar Error:', error);
    return responseHelper.sendError(res, 500, 'Failed to upload avatar');
  }
};

const deleteAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const addressId = req.params.id;
    const success = await userModel.deleteUserAddress(userId, addressId);
    if (!success) {
      return responseHelper.sendError(res, 404, 'Address not found or unauthorized');
    }
    return responseHelper.sendSuccess(res, 200, 'Address deleted successfully');
  } catch (error) {
    console.error('Delete Address Error:', error);
    return responseHelper.sendError(res, 500, 'Failed to delete address');
  }
};

module.exports = {
  getProfile,
  updateProfile,
  saveAddress,
  getAddresses,
  uploadAvatar,
  deleteAddress
};
