const { initializeApp, cert } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');
require('dotenv').config();

let app = null;

try {
  let serviceAccount = null;

  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    };
  } else if (process.env.FIREBASE_CREDENTIALS_PATH) {
    try {
      serviceAccount = require(`../../${process.env.FIREBASE_CREDENTIALS_PATH}`);
    } catch (e) {
      console.warn(`Could not load credentials from path ${process.env.FIREBASE_CREDENTIALS_PATH}:`, e.message);
    }
  }

  if (serviceAccount) {
    app = initializeApp({
      credential: cert(serviceAccount)
    });
    console.log('Firebase Admin initialized successfully');
  } else {
    console.warn('Firebase credentials not found in environment variables. Firebase Admin not initialized.');
  }
} catch (error) {
  console.error('Firebase Admin initialization error:', error.message);
}

module.exports = {
  app,
  messaging: app ? getMessaging(app) : null
};
