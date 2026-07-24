const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');
const fs = require('fs');

let db = null;
let isFirebaseConnected = false;

try {
  const serviceAccountPath = path.join(__dirname, '..', '..', 'firebase-service-account.json');
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.cert(serviceAccount)
    });
    db = getFirestore();
    isFirebaseConnected = true;
    console.log('🔥 [Firebase] Admin SDK Initialized. Firestore Connected.');
  } else {
    console.log('⚠️ [Firebase] firebase-service-account.json not found. Firestore features disabled.');
  }
} catch (error) {
  console.error('❌ [Firebase] Initialization failed:', error.message);
}

module.exports = {
  admin,
  db,
  isFirebaseConnected
};
