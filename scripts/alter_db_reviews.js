const pool = require('../src/config/db');

async function alterDbReviews() {
  try {
    console.log('Starting DB alteration to add review columns to orders table...');

    const connection = await pool.getConnection();

    try {
      // Check if columns already exist
      const [columns] = await connection.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'orders' 
        AND COLUMN_NAME = 'rating'
      `);

      if (columns.length === 0) {
        await connection.query(`
          ALTER TABLE orders 
          ADD COLUMN rating INT DEFAULT NULL,
          ADD COLUMN review_comment TEXT DEFAULT NULL
        `);
        console.log('Successfully added rating and review_comment columns to orders table.');
      } else {
        console.log('Columns rating and review_comment already exist in orders table.');
      }
    } finally {
      connection.release();
    }

    console.log('DB alteration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error altering DB:', error);
    process.exit(1);
  }
}

alterDbReviews();
