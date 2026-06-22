const pool = require('./src/config/db');

async function checkTokens() {
  try {
    const [rows] = await pool.query('SELECT * FROM device_tokens');
    console.log('Registered Device Tokens:', rows);
    process.exit(0);
  } catch (error) {
    console.error('Error querying tokens:', error);
    process.exit(1);
  }
}

checkTokens();
