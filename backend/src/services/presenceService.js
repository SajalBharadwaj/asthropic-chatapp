const User = require('../models/User');
const mongoose = require('mongoose');

const localPresenceMap = new Map();

const presenceService = {
  /**
   * Sets the user's presence state to Online in cache, MongoDB (if active),
   * and in-memory fallback mappings.
   * @param {string} userId - Target user ID
   * @param {string} socketId - Active socket connection identifier
   */
  async setUserOnline(userId, socketId) {
    try {
      const lastSeenDate = new Date();
      const presenceData = {
        isOnline: true,
        socketId,
        lastSeen: lastSeenDate.toISOString(),
      };
      
      // Update local memory cache
      localPresenceMap.set(userId, presenceData);
      
      const isMongoConnected = mongoose.connection.readyState === 1;
      if (isMongoConnected) {
        // Update DB asynchronously
        User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: lastSeenDate }).exec().catch(() => {});
      }

      // Update in-memory global fallback store if active
      if (global.globalUsersMap) {
        for (const [key, val] of global.globalUsersMap.entries()) {
          if (val && val._id === userId) {
            val.isOnline = true;
            val.lastSeen = lastSeenDate.toISOString();
          }
        }
        if (global.saveFallbackStore) {
          global.saveFallbackStore();
        }
      }

      return presenceData;
    } catch (err) {
      console.error('[Presence] Error setting online:', err.message);
    }
  },

  /**
   * Sets the user's presence state to Offline in cache, MongoDB (if active),
   * and in-memory fallback mappings.
   * @param {string} userId - Target user ID
   */
  async setUserOffline(userId) {
    try {
      const lastSeenDate = new Date();
      const presenceData = {
        isOnline: false,
        socketId: null,
        lastSeen: lastSeenDate.toISOString(),
      };
      
      // Update local memory cache
      localPresenceMap.set(userId, presenceData);

      const isMongoConnected = mongoose.connection.readyState === 1;
      if (isMongoConnected) {
        // Update DB asynchronously
        User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: lastSeenDate }).exec().catch(() => {});
      }

      // Update in-memory global fallback store if active
      if (global.globalUsersMap) {
        for (const [key, val] of global.globalUsersMap.entries()) {
          if (val && val._id === userId) {
            val.isOnline = false;
            val.lastSeen = lastSeenDate.toISOString();
          }
        }
        if (global.saveFallbackStore) {
          global.saveFallbackStore();
        }
      }

      return presenceData;
    } catch (err) {
      console.error('[Presence] Error setting offline:', err.message);
    }
  },

  /**
   * Resolves the presence state metadata for a user.
   * @param {string} userId - Target user ID
   */
  async getUserPresence(userId) {
    try {
      const cached = localPresenceMap.get(userId);
      if (cached) return cached;

      const isMongoConnected = mongoose.connection.readyState === 1;
      if (isMongoConnected) {
        const user = await User.findById(userId).select('isOnline lastSeen').lean();
        if (!user) return { isOnline: false, lastSeen: null };
        const data = { isOnline: user.isOnline, lastSeen: user.lastSeen };
        localPresenceMap.set(userId, data);
        return data;
      } else {
        if (global.globalUsersMap) {
          for (const val of global.globalUsersMap.values()) {
            if (val && val._id === userId) {
              return { isOnline: !!val.isOnline, lastSeen: val.lastSeen || null };
            }
          }
        }
        return { isOnline: false, lastSeen: null };
      }
    } catch (err) {
      return { isOnline: false, lastSeen: null };
    }
  }
};

module.exports = presenceService;


module.exports = presenceService;
