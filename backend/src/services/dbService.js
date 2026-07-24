const { db, isFirebaseConnected } = require('../config/firebase');

// In-memory references to populate
let inMemoryMessagesRef = [];
let globalUsersMapRef = null;

const initDbService = (inMemoryMessages, globalUsersMap) => {
  inMemoryMessagesRef = inMemoryMessages;
  globalUsersMapRef = globalUsersMap;
};

// Sync active local variables with Firestore
const syncFromFirestore = async () => {
  if (!isFirebaseConnected || !db) return;
  try {
    console.log('🔄 [Firebase] Syncing data from Firestore...');
    
    // Load Users
    const usersSnapshot = await db.collection('users').get();
    if (!usersSnapshot.empty && globalUsersMapRef) {
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        globalUsersMapRef.set(userData._id || userData.id, userData);
      });
      console.log(`👤 [Firebase] Synced ${usersSnapshot.size} users from Firestore.`);
    }

    // Load Messages
    const messagesSnapshot = await db.collection('messages').orderBy('createdAt', 'asc').get();
    if (!messagesSnapshot.empty) {
      inMemoryMessagesRef.length = 0;
      messagesSnapshot.forEach(doc => {
        inMemoryMessagesRef.push(doc.data());
      });
      console.log(`💬 [Firebase] Synced ${messagesSnapshot.size} messages from Firestore.`);
    }
  } catch (error) {
    console.error('❌ [Firebase] Sync error:', error.message);
  }
};

// Save a new message
const saveMessage = async (msgObj) => {
  if (!isFirebaseConnected || !db) return;
  try {
    const docId = msgObj.id || msgObj._id || 'msg_' + Date.now();
    await db.collection('messages').doc(docId).set(msgObj);
    console.log(`✅ [Firebase] Message ${docId} saved to Firestore.`);
  } catch (error) {
    console.error('❌ [Firebase] Error saving message:', error.message);
  }
};

// Save or Update a User
const saveUser = async (userObj) => {
  if (!isFirebaseConnected || !db) return;
  try {
    const docId = userObj._id || userObj.id;
    if (docId) {
      await db.collection('users').doc(docId.toString()).set(userObj, { merge: true });
      console.log(`👤 [Firebase] User ${docId} saved/updated in Firestore.`);
    }
  } catch (error) {
    console.error('❌ [Firebase] Error saving user:', error.message);
  }
};

// Delete a message
const deleteMessage = async (messageId) => {
  if (!isFirebaseConnected || !db) return;
  try {
    await db.collection('messages').doc(messageId).delete();
    console.log(`🗑️ [Firebase] Message ${messageId} deleted from Firestore.`);
  } catch (error) {
    console.error('❌ [Firebase] Error deleting message:', error.message);
  }
};

module.exports = {
  initDbService,
  syncFromFirestore,
  saveMessage,
  saveUser,
  deleteMessage
};
