const pool = require('../config/db');

const getAllShops = async () => {
  const [rows] = await pool.query('SELECT * FROM shops ORDER BY created_at DESC');
  return rows;
};

const getShopById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM shops WHERE id = ?', [id]);
  return rows[0];
};

const getShopByZipcode = async (zipcode) => {
  const [rows] = await pool.query('SELECT * FROM shops WHERE zipcode = ? AND is_active = true', [zipcode]);
  return rows[0];
};

const createShop = async (shopData) => {
  const { name, address, city, zipcode, latitude, longitude, is_active } = shopData;
  const [result] = await pool.query(
    'INSERT INTO shops (name, address, city, zipcode, latitude, longitude, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [name, address, city, zipcode, latitude, longitude, is_active ?? true]
  );
  return result.insertId;
};

const updateShop = async (id, shopData) => {
  const { name, address, city, zipcode, latitude, longitude, is_active } = shopData;
  const [result] = await pool.query(
    'UPDATE shops SET name=?, address=?, city=?, zipcode=?, latitude=?, longitude=?, is_active=? WHERE id=?',
    [name, address, city, zipcode, latitude, longitude, is_active, id]
  );
  return result.affectedRows > 0;
};

const deleteShop = async (id) => {
  const [result] = await pool.query('DELETE FROM shops WHERE id = ?', [id]);
  return result.affectedRows > 0;
};

module.exports = {
  getAllShops,
  getShopById,
  getShopByZipcode,
  createShop,
  updateShop,
  deleteShop
};
