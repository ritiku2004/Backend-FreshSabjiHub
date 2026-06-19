const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const app = require('./app');
const pool = require('./config/db');

// Parse PORT to an integer so Node binds to a TCP port and stays alive
const PORT = parseInt(process.env.PORT || '3000', 10);

process.on('uncaughtException', (err) => {
  require('fs').appendFileSync('crash_log.txt', new Date().toISOString() + ' uncaughtException: ' + (err.stack || err) + '\n');
  process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
  require('fs').appendFileSync('crash_log.txt', new Date().toISOString() + ' unhandledRejection: ' + (reason.stack || reason) + '\n');
});

// Test DB Connection before starting server
pool.getConnection()
  .then((connection) => {
    console.log('Database connected successfully');
    connection.release();
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to the database:', err.message);
    process.exit(1);
  });
// Force nodemon restart for connection pool refresh 
