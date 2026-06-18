const { categoryModel, productModel, shopModel, bannerModel } = require('../../models');
const { responseHelper } = require('../../utils');

const getBanners = async (req, res) => {
  try {
    const banners = await bannerModel.getAllActiveBanners();
    return responseHelper.sendSuccess(res, 200, 'Banners fetched successfully', banners);
  } catch (error) {
    return responseHelper.sendError(res, 500, 'Failed to fetch banners', error);
  }
};

const getCategories = async (req, res) => {
  try {
    const { shopId } = req.query;
    let categories;
    if (shopId) {
      categories = await categoryModel.getCategoriesByShopId(shopId);
    } else {
      categories = await categoryModel.getAllCategories();
    }
    return responseHelper.sendSuccess(res, 200, 'Categories fetched successfully', categories);
  } catch (error) {
    return responseHelper.sendError(res, 500, 'Failed to fetch categories', error);
  }
};

const getShopByZipcode = async (req, res) => {
  try {
    const { zipcode } = req.params;
    const shop = await shopModel.getShopByZipcode(zipcode);
    if (!shop) return responseHelper.sendError(res, 404, 'No service available at this location');
    return responseHelper.sendSuccess(res, 200, 'Shop fetched successfully', shop);
  } catch (error) {
    return responseHelper.sendError(res, 500, 'Failed to fetch shop', error);
  }
};

const getProducts = async (req, res) => {
  try {
    const products = await productModel.getAllProducts();
    return responseHelper.sendSuccess(res, 200, 'Products fetched successfully', products);
  } catch (error) {
    return responseHelper.sendError(res, 500, 'Failed to fetch products', error);
  }
};

const getProductById = async (req, res) => {
  try {
    const product = await productModel.getProductById(req.params.id);
    if (!product) return responseHelper.sendError(res, 404, 'Product not found');
    return responseHelper.sendSuccess(res, 200, 'Product fetched successfully', product);
  } catch (error) {
    return responseHelper.sendError(res, 500, 'Failed to fetch product', error);
  }
};

const getShops = async (req, res) => {
  try {
    const shops = await shopModel.getAllShops();
    return responseHelper.sendSuccess(res, 200, 'Shops fetched successfully', shops);
  } catch (error) {
    return responseHelper.sendError(res, 500, 'Failed to fetch shops', error);
  }
};

module.exports = {
  getBanners,
  getCategories,
  getShopByZipcode,
  getProducts,
  getProductById,
  getShops
};
