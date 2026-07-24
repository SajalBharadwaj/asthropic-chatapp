const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Message = require('../models/Message');
const Chat = require('../models/Chat');

/**
 * AUTOMATED BACKGROUND CLEANUP DAEMON SCRIPT (1-YEAR RETENTION POLICY)
 * Safely retains chats & backup data for up to 365 days, permanently deleting records & media older than 1 year.
 */
async function runAutomatedCleanup(retentionDays = 365) {
  // Check if MongoDB is connected
  if (mongoose.connection.readyState !== 1) {
    console.log(`🧹 [AUTO CLEANUP] Skipped: Operating in high-speed in-memory mode (MongoDB offline).`);
    return { status: 'skipped_offline' };
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  console.log(`=======================================================`);
  console.log(`🧹 [AUTO CLEANUP DAEMON STARTED]`);
  console.log(`📅 Retention Policy: Safely storing data for ${retentionDays} days`);
  console.log(`🧹 Purging expired data created before ${cutoffDate.toISOString()}`);

  let deletedMessagesCount = 0;
  let deletedFilesCount = 0;

  try {
    // 1. Find messages older than 60 days
    const oldMessages = await Message.find({ createdAt: { $lt: cutoffDate } });

    // Delete associated physical media files
    for (const msg of oldMessages) {
      if (msg.mediaUrl && msg.mediaUrl.startsWith('/uploads/')) {
        const filePath = path.join(__dirname, '../../', msg.mediaUrl);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
            deletedFilesCount++;
          } catch (e) {
            console.error(`[Cleanup Error] Failed to delete file ${filePath}:`, e.message);
          }
        }
      }
    }

    // 2. Permanently delete messages older than 60 days
    const deleteResult = await Message.deleteMany({ createdAt: { $lt: cutoffDate } });
    deletedMessagesCount = deleteResult.deletedCount || 0;

    // 3. Remove inactive empty chats older than 60 days
    const activeChatIds = await Message.distinct('chat');
    const emptyChatsResult = await Chat.deleteMany({
      _id: { $nin: activeChatIds },
      updatedAt: { $lt: cutoffDate }
    });

    console.log(`✅ [1-YEAR CLEANUP COMPLETE]`);
    console.log(`   - Messages Purged (> 365 Days): ${deletedMessagesCount}`);
    console.log(`   - Media Files Purged: ${deletedFilesCount}`);
    console.log(`   - Inactive Chats Purged: ${emptyChatsResult.deletedCount || 0}`);
    console.log(`=======================================================`);

    return {
      deletedMessagesCount,
      deletedFilesCount,
      deletedChatsCount: emptyChatsResult.deletedCount || 0,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(`❌ [CLEANUP NOTICE]:`, error.message);
  }
}

// Enable standalone CLI execution
if (require.main === module) {
  const connectDB = require('../config/db');
  const dotenv = require('dotenv');
  dotenv.config();

  connectDB().then(async () => {
    await runAutomatedCleanup(process.env.TTL_DAYS || 365);
    if (mongoose.connection.readyState === 1) {
      mongoose.connection.close();
    }
    process.exit(0);
  });
}

module.exports = runAutomatedCleanup;
