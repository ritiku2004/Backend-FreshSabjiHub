const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const mainRoutes = require('./routes');

const app = express();

// Middlewares
app.use(cors());
app.use(morgan('dev'));

// Custom logging middleware for debugging cart requests
const fs = require('fs');
app.use((req, res, next) => {
  if (req.url.includes('/user/cart') || req.url.includes('/orders')) {
    const logData = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      query: req.query,
      body: req.body,
    };
    const logString = `\n--- REQUEST ---\n${JSON.stringify(logData, null, 2)}\n`;
    fs.appendFileSync(path.join(__dirname, '../request_logs.txt'), logString);

    const oldSend = res.json;
    res.json = function (body) {
      const responseLog = `--- RESPONSE ---\nStatus: ${res.statusCode}\nBody: ${JSON.stringify(body, null, 2)}\n---------------\n`;
      fs.appendFileSync(path.join(__dirname, '../request_logs.txt'), responseLog);
      return oldSend.call(this, body);
    };
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const uploadDir = process.env.UPLOAD_DIR 
  ? path.resolve(process.env.UPLOAD_DIR) 
  : path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadDir));

// Middleware to dynamically rewrite local host/IP image urls in responses to match the requesting client host
app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function (body) {
    const host = req.get('host');
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    if (body && typeof body === 'object') {
      replaceLocalhostInObject(body, host, protocol);
    }
    return originalJson.call(this, body);
  };
  next();
});

function replaceLocalhostInObject(obj, host, protocol) {
  if (!obj) return;
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      if (typeof obj[i] === 'object') {
        replaceLocalhostInObject(obj[i], host, protocol);
      } else if (typeof obj[i] === 'string') {
        obj[i] = replaceLocalhostInString(obj[i], host, protocol);
      }
    }
  } else if (typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === 'object') {
        replaceLocalhostInObject(obj[key], host, protocol);
      } else if (typeof obj[key] === 'string') {
        obj[key] = replaceLocalhostInString(obj[key], host, protocol);
      }
    }
  }
}

function replaceLocalhostInString(str, host, protocol) {
  if (typeof str !== 'string') return str;
  const regex = /https?:\/\/(localhost|127\.0\.0\.1|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+)?(\/uploads\/[^\s"'>]+)/gi;
  return str.replace(regex, (match, ipOrHost, port, path) => {
    return `${protocol}://${host}${path}`;
  });
}

// Routes
app.use('/api', mainRoutes);

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

module.exports = app;
