const pool = require('../config/db');

const getAllProducts = async () => {
  const [rows] = await pool.query(`
    SELECT p.*, c.name as category_name, GROUP_CONCAT(pc.category_id) as category_ids
    FROM products p
    JOIN categories c ON p.category_id = c.id
    LEFT JOIN product_categories pc ON p.id = pc.product_id
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `);
  return rows;
};

const getProductById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
  
  if (rows.length === 0) return null;
  const product = rows[0];

  // Fetch features
  const [features] = await pool.query('SELECT feature_name, feature_value FROM product_features WHERE product_id = ?', [id]);
  product.features = features;

  return product;
};

const createProduct = async (productData, featuresData = []) => {
  const { category_id, name, description, brand, mrp_price, quantity, quantity_type, sku, image_url, is_active, discount_percentage, type } = productData;
  
  // Auto-generate SKU if not provided
  let finalSku = sku && String(sku).trim() !== '' ? sku : null;
  if (!finalSku) {
    const namePrefix = name ? name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X') : 'PRD';
    finalSku = `${namePrefix}-${Math.floor(100000 + Math.random() * 900000)}`;
  }
  const finalBrand = brand && String(brand).trim() !== '' ? brand : null;
  const finalDescription = description && String(description).trim() !== '' ? description : null;
  const finalImageUrl = image_url && String(image_url).trim() !== '' ? image_url : null;
  
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      'INSERT INTO products ' +
      '(category_id, name, description, brand, mrp_price, quantity, quantity_type, sku, image_url, is_active, discount_percentage, `type`) ' +
      'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [category_id, name, finalDescription, finalBrand, mrp_price, quantity, quantity_type, finalSku, finalImageUrl, is_active ?? true, discount_percentage ?? 0.00, type || 'general']
    );
    const productId = result.insertId;

    // Sync to product_categories
    await connection.query(
      'INSERT INTO product_categories (product_id, category_id) VALUES (?, ?)',
      [productId, category_id]
    );

    if (featuresData && featuresData.length > 0) {
      const featureValues = featuresData.map(f => [productId, f.feature_name, f.feature_value]);
      await connection.query(
        'INSERT INTO product_features (product_id, feature_name, feature_value) VALUES ?',
        [featureValues]
      );
    }

    await connection.commit();
    return productId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const updateProduct = async (id, productData, featuresData = null) => {
  const { category_id, name, description, brand, mrp_price, quantity, quantity_type, sku, image_url, is_active, discount_percentage, type } = productData;
  
  const finalSku = sku && String(sku).trim() !== '' ? sku : null;
  const finalBrand = brand && String(brand).trim() !== '' ? brand : null;
  const finalDescription = description && String(description).trim() !== '' ? description : null;
  const finalImageUrl = image_url && String(image_url).trim() !== '' ? image_url : null;
  
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      'UPDATE products ' +
      'SET category_id=?, name=?, description=?, brand=?, mrp_price=?, quantity=?, quantity_type=?, sku=?, image_url=?, is_active=?, discount_percentage=?, `type`=? ' +
      'WHERE id=?',
      [category_id, name, finalDescription, finalBrand, mrp_price, quantity, quantity_type, finalSku, finalImageUrl, is_active ?? true, discount_percentage ?? 0.00, type || 'general', id]
    );

    // Sync to product_categories
    await connection.query(
      'INSERT IGNORE INTO product_categories (product_id, category_id) VALUES (?, ?)',
      [id, category_id]
    );

    if (featuresData !== null) {
      // Replace all features
      await connection.query('DELETE FROM product_features WHERE product_id = ?', [id]);
      if (featuresData.length > 0) {
        const featureValues = featuresData.map(f => [id, f.feature_name, f.feature_value]);
        await connection.query(
          'INSERT INTO product_features (product_id, feature_name, feature_value) VALUES ?',
          [featureValues]
        );
      }
    }

    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const deleteProduct = async (id) => {
  // Features are deleted automatically due to ON DELETE CASCADE
  const [result] = await pool.query('DELETE FROM products WHERE id = ?', [id]);
  return result.affectedRows > 0;
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};
