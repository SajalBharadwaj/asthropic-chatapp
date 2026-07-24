const { db, isFirebaseConnected } = require('../config/firebase');
const supabase = require('../config/supabase');

const isSupabaseConnected = process.env.SUPABASE_URL && 
                             process.env.SUPABASE_KEY && 
                             !process.env.SUPABASE_KEY.includes('your_service_role_key_here') &&
                             !process.env.SUPABASE_KEY.includes('your-supabase');

// In-memory references to populate
let inMemoryMessagesRef = [];
let globalUsersMapRef = null;

const initDbService = (inMemoryMessages, globalUsersMap) => {
  inMemoryMessagesRef = inMemoryMessages;
  globalUsersMapRef = globalUsersMap;
};

// Sync active local variables with Firestore and/or Supabase
const syncFromFirestore = async () => {
  // ── Sync from Supabase first (if configured) ──
  if (isSupabaseConnected) {
    try {
      console.log('🔄 [Supabase] Syncing data from Supabase Postgres...');
      
      // Load Users
      const { data: usersData, error: usersErr } = await supabase
        .from('users')
        .select('*');
        
      if (!usersErr && usersData && globalUsersMapRef) {
        usersData.forEach(u => {
          const mapped = {
            _id: u.id,
            username: u.username,
            email: u.email,
            password: u.password,
            displayName: u.display_name,
            avatarUrl: u.avatar_url,
            role: u.role,
            isPro: u.is_pro,
            isOnline: u.is_online,
            lastSeen: u.last_seen,
            createdAt: u.created_at
          };
          globalUsersMapRef.set(u.id, mapped);
        });
        console.log(`👤 [Supabase] Synced ${usersData.length} users from Postgres.`);
      }

      // Load Messages
      const { data: msgsData, error: msgsErr } = await supabase
        .from('messages')
        .select('*')
        .order('timestamp', { ascending: true });

      if (!msgsErr && msgsData) {
        inMemoryMessagesRef.length = 0;
        msgsData.forEach(m => {
          const mapped = {
            id: m.id,
            _id: m.id,
            sender: m.sender_id,
            chat: m.chat_id,
            text: m.text,
            mediaUrl: m.media_url,
            fileName: m.file_name,
            fileSize: m.file_size,
            isVoice: m.is_voice,
            createdAt: m.timestamp
          };
          inMemoryMessagesRef.push(mapped);
        });
        console.log(`💬 [Supabase] Synced ${msgsData.length} messages from Postgres.`);
      }
    } catch (e) {
      console.error('❌ [Supabase] Sync error:', e.message);
    }
  }

  // ── Sync from Firebase ──
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
  // ── Save to Supabase ──
  if (isSupabaseConnected) {
    try {
      const senderId = (msgObj.sender && typeof msgObj.sender === 'object') ? msgObj.sender._id : msgObj.sender;
      const { error } = await supabase
        .from('messages')
        .upsert({
          id: msgObj.id || msgObj._id || 'msg_' + Date.now(),
          sender_id: senderId || null,
          chat_id: msgObj.chat || 'general_room',
          text: msgObj.text || '',
          media_url: msgObj.mediaUrl || null,
          file_name: msgObj.fileName || null,
          file_size: msgObj.fileSize || null,
          is_voice: !!msgObj.isVoice,
          timestamp: msgObj.createdAt || new Date().toISOString()
        });
      if (error) throw error;
      console.log(`✅ [Supabase] Message saved to Postgres.`);
    } catch (err) {
      console.error('❌ [Supabase] Error saving message:', err.message);
    }
  }

  // ── Save to Firebase ──
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
  // ── Save to Supabase ──
  if (isSupabaseConnected) {
    try {
      const { error } = await supabase
        .from('users')
        .upsert({
          id: (userObj._id || userObj.id).toString(),
          username: userObj.username,
          email: userObj.email,
          password: userObj.password,
          display_name: userObj.displayName || null,
          avatar_url: userObj.avatarUrl || null,
          role: userObj.role || 'user',
          is_pro: !!userObj.isPro,
          is_online: !!userObj.isOnline,
          last_seen: userObj.lastSeen || new Date().toISOString(),
          created_at: userObj.createdAt || new Date().toISOString()
        });
      if (error) throw error;
      console.log(`👤 [Supabase] User ${(userObj._id || userObj.id)} saved to Postgres.`);
    } catch (err) {
      console.error('❌ [Supabase] Error saving user:', err.message);
    }
  }

  // ── Save to Firebase ──
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
  // ── Delete from Supabase ──
  if (isSupabaseConnected) {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);
      if (error) throw error;
      console.log(`🗑️ [Supabase] Message ${messageId} deleted from Postgres.`);
    } catch (err) {
      console.error('❌ [Supabase] Error deleting message:', err.message);
    }
  }

  // ── Delete from Firebase ──
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

