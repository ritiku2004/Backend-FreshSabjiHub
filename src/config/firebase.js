const { initializeApp, cert } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');
require('dotenv').config();

let app = null;

try {
  if (process.env.FIREBASE_CREDENTIALS_PATH) {
    const serviceAccount = require(`../../${process.env.FIREBASE_CREDENTIALS_PATH}`);
    app = initializeApp({
      credential: cert(serviceAccount)
    });
    console.log('Firebase Admin initialized successfully');
  } else {
    console.warn('FIREBASE_CREDENTIALS_PATH not set in .env. Firebase Admin not initialized.');
  }
} catch (error) {
  console.error('Firebase Admin initialization error:', error.message);
}

module.exports = {
  app,
  messaging: app ? getMessaging(app) : null
};
