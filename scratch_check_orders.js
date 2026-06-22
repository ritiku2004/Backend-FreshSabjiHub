const pool = require('./src/config/db');

async function checkOrders() {
  try {
    const [rows] = await pool.query('SELECT id, order_number, shop_id, status, total_amount, created_at FROM orders ORDER BY id DESC LIMIT 5');
    console.log('Latest Orders in Database:', rows);
    process.exit(0);
  } catch (error) {
    console.error('Error querying orders:', error);
    process.exit(1);
  }
}

checkOrders();
