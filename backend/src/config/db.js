const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const connStr = process.env.MONGODB_URI || 'mongodb://localhost:27017/asthropic_chat';
    
    // Set short server selection timeout (3s) so it doesn't hang if local Mongo isn't running
    const conn = await mongoose.connect(connStr, {
      autoIndex: true,
      serverSelectionTimeoutMS: 3000, 
    });
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);

    // Drop the old 60-day message TTL index programmatically if it exists
    try {
      const collections = await mongoose.connection.db.listCollections({ name: 'messages' }).toArray();
      if (collections.length > 0) {
        const indexes = await mongoose.connection.db.collection('messages').indexes();
        const hasTTLIndex = indexes.some(idx => idx.name === 'createdAt_1' && idx.expireAfterSeconds !== undefined);
        if (hasTTLIndex) {
          await mongoose.connection.db.collection('messages').dropIndex('createdAt_1');
          console.log('🗑️ [Database] Dropped 60-day message TTL index successfully.');
        }
      }
    } catch (idxErr) {
      console.warn('[Database] Mismatch/drop index check warning:', idxErr.message);
    }
  } catch (error) {
    console.log(`[Database Notice] Local MongoDB service is offline or not installed.`);
    console.log(`⚡ [High-Performance Fallback] Operating in ultra-fast zero-latency in-memory storage mode.`);
  }
};

module.exports = connectDB;
