/**
 * @file socketService.js
 * @description Clean, Stable Real-Time Communications Engine (Socket.io)
 * Reverts complex queues to direct Socket.io room broadcasting.
 * Supports WebRTC call signaling, live typing statuses, and authoritative server timestamps.
 */

const mongoose = require('mongoose');
const presenceService = require('./presenceService');
const geminiService = require('./geminiService');
const Message = require('../models/Message');
const Chat = require('../models/Chat');

// Socket routing lookups: userId -> active socketId
const userSockets = new Map();
const onlineUsersMap = new Map();
const inMemoryMessages = [];
const dbService = require('./dbService');
const activeCallSessions = new Map();

const sendSystemCallMessage = async (io, roomId, text, senderId) => {
  const isMongoConnected = mongoose.connection.readyState === 1;
  const msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
  const senderData = onlineUsersMap.get(senderId) || { displayName: 'System', username: 'system', avatarUrl: '' };

  let newMessage = {
    _id: msgId,
    messageId: msgId,
    sender: {
      _id: senderId,
      displayName: senderData.displayName || 'System',
      username: senderData.username || 'system',
      avatarUrl: senderData.avatarUrl || ''
    },
    chat: roomId,
    content: text,
    type: 'text',
    createdAt: new Date().toISOString(),
    isDelivered: true
  };

  if (isMongoConnected) {
    try {
      const Message = require('../models/Message');
      const Chat = require('../models/Chat');
      const targetChatId = roomId === 'general_room' ? '600000000000000000000001' : roomId;
      const saved = await Message.create({
        sender: senderId,
        chat: targetChatId,
        content: text,
        type: 'text',
        createdAt: new Date()
      });
      newMessage._id = saved._id;
      newMessage.messageId = saved._id.toString();
      await Chat.findByIdAndUpdate(targetChatId, { latestMessage: saved._id });
    } catch (e) {
      console.error('[System Msg DB Error]:', e.message);
    }
  } else {
    inMemoryMessages.push(newMessage);
    dbService.saveMessage(newMessage);
  }

  io.to(roomId).emit('message_received', newMessage);
  io.to(roomId).emit('receive_message', newMessage);
};

/**
 * Initializes the Socket.io real-time engine
 * @param {object} io - The Socket.io server instance
 */
function initializeSockets(io) {
  io.on('connection', (socket) => {
    console.log(`[Socket.io] New connection: ${socket.id}`);

    // Standard Setup Listener: Map socket, join personal room, set user online
    socket.on('setup', async (userData) => {
      if (!userData || (!userData._id && !userData.id)) return;
      const userId = (userData._id || userData.id).toString();
      const realName = userData.displayName || userData.username || 'Member';
      const avatarUrl = userData.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(realName)}`;

      socket.userId = userId;
      userSockets.set(userId, socket.id);
      
      const activeUserObj = {
        _id: userId,
        displayName: realName,
        username: userData.username || realName,
        email: userData.email || '',
        avatarUrl: avatarUrl,
        isOnline: true,
        lastSeen: new Date().toISOString()
      };

      onlineUsersMap.set(userId, activeUserObj);
      socket.join(userId);

      await presenceService.setUserOnline(userId, socket.id);

      // Initialize the General Chat document in MongoDB if connected
      if (mongoose.connection.readyState === 1) {
        try {
          const generalChatExists = await Chat.findById('600000000000000000000001');
          if (!generalChatExists) {
            await Chat.create({
              _id: '600000000000000000000001',
              chatName: 'General Chat',
              isGroupChat: true,
              users: []
            });
            console.log('📌 [Database] General Chat document initialized.');
          }
        } catch (err) {
          console.warn('[Database] General chat room initialization warning:', err.message);
        }
      }

      io.emit('online_users_list', Array.from(onlineUsersMap.values()));
      io.emit('user_presence', { userId, isOnline: true, user: activeUserObj });
      socket.emit('connected');
    });

    // Profile Updates
    socket.on('update_profile', ({ userId, displayName, avatarUrl }) => {
      if (onlineUsersMap.has(userId)) {
        const userObj = onlineUsersMap.get(userId);
        if (displayName) userObj.displayName = displayName;
        if (avatarUrl) userObj.avatarUrl = avatarUrl;
        onlineUsersMap.set(userId, userObj);
      }
      io.emit('online_users_list', Array.from(onlineUsersMap.values()));
      io.emit('profile_updated', { userId, displayName, avatarUrl });
    });

    // Logout
    socket.on('logout', async () => {
      if (socket.userId) {
        userSockets.delete(socket.userId);
        onlineUsersMap.delete(socket.userId);
        await presenceService.setUserOffline(socket.userId);

        io.emit('online_users_list', Array.from(onlineUsersMap.values()));
        io.emit('user_presence', {
          userId: socket.userId,
          isOnline: false,
          lastSeen: new Date().toISOString()
        });
        socket.userId = null;
      }
    });

    // Message Deletion
    socket.on('delete_message', async ({ messageId, roomId, deleteType, userId }) => {
      try {
        const isMongoConnected = mongoose.connection.readyState === 1;
        if (isMongoConnected) {
          await Message.findByIdAndDelete(messageId);
        } else {
          const index = inMemoryMessages.findIndex(m => m._id === messageId || m.messageId === messageId);
          if (index !== -1) {
            inMemoryMessages.splice(index, 1);
          }
          await dbService.deleteMessage(messageId);
        }
        io.to(roomId).emit('message_deleted', { messageId, roomId, deleteType: 'everyone' });
      } catch (err) {
        console.error('[Socket Delete Message Error]:', err.message);
      }
    });

    socket.on('delete_messages_bulk', async ({ messageIds, roomId, deleteType }) => {
      try {
        const isMongoConnected = mongoose.connection.readyState === 1;
        for (const msgId of messageIds) {
          if (isMongoConnected) {
            await Message.findByIdAndDelete(msgId);
          } else {
            const index = inMemoryMessages.findIndex(m => m._id === msgId || m.messageId === msgId);
            if (index !== -1) {
              inMemoryMessages.splice(index, 1);
            }
            await dbService.deleteMessage(msgId);
          }
        }
        io.to(roomId).emit('messages_deleted_bulk', { messageIds, roomId, deleteType: 'everyone' });
      } catch (err) {
        console.error('[Socket Bulk Delete Error]:', err.message);
      }
    });

    // WebRTC Signaling Events
    socket.on('call_user', ({ userToCall, offer, from, callerName, callerAvatar }) => {
      const recipientSocketId = userSockets.get(userToCall);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('incoming_call', { offer, from, callerName, callerAvatar });
      }
      
      const sorted = [from, userToCall].sort();
      activeCallSessions.set(from, {
        recipientId: userToCall,
        callerName: callerName || 'User',
        status: 'ringing',
        startTime: null,
        roomId: `dm_${sorted[0]}_${sorted[1]}`
      });
    });

    socket.on('accept_call', ({ to, answer }) => {
      const callerSocketId = userSockets.get(to);
      if (callerSocketId) {
        io.to(callerSocketId).emit('call_accepted', { answer });
      }
      const session = activeCallSessions.get(to);
      if (session) {
        session.status = 'active';
        session.startTime = Date.now();
      }
    });

    socket.on('reject_call', ({ to }) => {
      const callerSocketId = userSockets.get(to);
      if (callerSocketId) {
        io.to(callerSocketId).emit('call_rejected');
      }
      const session = activeCallSessions.get(to);
      if (session) {
        session.status = 'rejected';
        const recUser = onlineUsersMap.get(session.recipientId) || { displayName: 'Member' };
        if (global.recordCallAudit) {
          global.recordCallAudit(session.callerName, recUser.displayName || 'Member', 'Declined');
        }
        sendSystemCallMessage(io, session.roomId, `📞 Voice Call - Declined`, to);
        activeCallSessions.delete(to);
      }
    });

    socket.on('end_call', ({ to }) => {
      const otherSocketId = userSockets.get(to);
      if (otherSocketId) {
        io.to(otherSocketId).emit('call_ended');
      }
      
      let callerIdKey = null;
      let session = null;
      
      for (const [callerId, s] of activeCallSessions.entries()) {
        if (callerId === socket.userId || s.recipientId === socket.userId) {
          callerIdKey = callerId;
          session = s;
          break;
        }
      }
      
      if (session && callerIdKey) {
        const recUser = onlineUsersMap.get(session.recipientId) || { displayName: 'Member' };
        if (session.status === 'ringing') {
          if (global.recordCallAudit) {
            global.recordCallAudit(session.callerName, recUser.displayName || 'Member', 'Missed');
          }
          sendSystemCallMessage(io, session.roomId, `📞 Voice Call - Missed`, callerIdKey);
        } else if (session.status === 'active' && session.startTime) {
          const durationSec = Math.floor((Date.now() - session.startTime) / 1000);
          const durationStr = durationSec < 60 ? `${durationSec} sec` : `${Math.floor(durationSec / 60)} min ${durationSec % 60} sec`;
          if (global.recordCallAudit) {
            global.recordCallAudit(session.callerName, recUser.displayName || 'Member', 'Accepted', durationStr);
          }
          sendSystemCallMessage(io, session.roomId, `📞 Voice Call ended (${durationStr})`, callerIdKey);
        }
        activeCallSessions.delete(callerIdKey);
      }
    });

    socket.on('ice_candidate', ({ to, candidate }) => {
      const otherSocketId = userSockets.get(to);
      if (otherSocketId) {
        io.to(otherSocketId).emit('ice_candidate', { candidate });
      }
    });

    // Room joins & state hooks
    socket.on('get_online_users', () => {
      socket.emit('online_users_list', Array.from(onlineUsersMap.values()));
    });

    socket.on('join_chat', (roomId) => {
      socket.join(roomId);
    });

    socket.on('leave_chat', (roomId) => {
      socket.leave(roomId);
    });

    socket.on('typing', ({ roomId, userId, username }) => {
      socket.to(roomId).emit('typing', { roomId, userId, username });
    });

    socket.on('stop_typing', ({ roomId, userId }) => {
      socket.to(roomId).emit('stop_typing', { roomId, userId });
    });

    socket.on('mark_messages_read', ({ roomId, userId }) => {
      socket.to(roomId).emit('messages_read', { roomId, readerId: userId });
    });

    // Standard Real-Time Message Sender & Receiver Broadcaster (Direct Sync)
    socket.on('send_message', async (messageData) => {
      try {
        const { senderId, chatId, content, type = 'text', mediaUrl = '', fileName = '', fileType = '', audioUrl = '', messageId } = messageData;
        if (!senderId || !chatId || (!content && !mediaUrl && !audioUrl)) return;

        const senderData = onlineUsersMap.get(senderId) || {
          _id: senderId,
          displayName: messageData.senderName || 'Member',
          username: messageData.senderUsername || 'member',
          avatarUrl: messageData.senderAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(messageData.senderName || 'Member')}`
        };

        const msgId = messageId || 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
        const serverTime = new Date();
        const isMongoConnected = mongoose.connection.readyState === 1;
        let newMessage;

        const targetChatId = chatId === 'general_room' ? '600000000000000000000001' : chatId;

        if (isMongoConnected) {
          newMessage = await Message.create({
            sender: senderId,
            chat: targetChatId,
            content: content || fileName || 'Media Attachment',
            type,
            mediaUrl: mediaUrl || audioUrl,
            readBy: [senderId],
            createdAt: serverTime,
            isDelivered: true,
            replyTo: messageData.replyTo || null
          });
          newMessage = await newMessage.populate('sender', 'username displayName avatarUrl');
          newMessage = await newMessage.populate('chat');
          await Chat.findByIdAndUpdate(targetChatId, { latestMessage: newMessage._id });
        } else {
          newMessage = {
            _id: msgId,
            messageId: msgId,
            sender: {
              _id: senderData._id,
              displayName: senderData.displayName,
              username: senderData.username,
              avatarUrl: senderData.avatarUrl
            },
            chat: targetChatId,
            content: content || fileName || (audioUrl ? 'Voice Note' : 'Media Attachment'),
            type,
            mediaUrl: mediaUrl || audioUrl,
            fileName,
            fileType,
            audioUrl,
            createdAt: serverTime.toISOString(),
            isDelivered: true,
            replyTo: messageData.replyTo || null
          };
          inMemoryMessages.push(newMessage);
          dbService.saveMessage(newMessage);
        }

        // Re-map chat ID to general_room if it matches the general chat ObjectId in broadcast payloads
        const payload = newMessage.toObject ? newMessage.toObject() : { ...newMessage };
        payload.chat = chatId;
        payload.messageId = msgId;

        // Direct standard emit broadcasting to room sessions
        io.to(chatId).emit('message_received', payload);
        io.to(chatId).emit('receive_message', payload);

        // Also emit directly to recipient individual rooms for real-time background sync
        if (chatId.startsWith('dm_')) {
          const parts = chatId.replace('dm_', '').split('_');
          parts.forEach(uId => {
            if (uId) {
              io.to(uId).emit('message_received', newMessage);
              io.to(uId).emit('receive_message', newMessage);
            }
          });
        }

        // AI Bot response hook
        if (content && (content.toLowerCase().startsWith('@gemini') || content.toLowerCase().startsWith('@ai'))) {
          const prompt = content.replace(/^@(gemini|ai)\s*/i, '').trim();
          io.to(chatId).emit('ai_typing', { chatId, isTyping: true });

          geminiService.generateResponse(prompt).then(async (aiReplyText) => {
            const aiMessage = {
              _id: 'ai_msg_' + Date.now(),
              sender: {
                _id: 'ai_bot',
                displayName: 'Asthropic Gemini AI',
                username: 'gemini_ai',
                avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Gemini',
                isAI: true
              },
              chat: chatId,
              content: aiReplyText,
              type: 'ai_response',
              isAIResponse: true,
              createdAt: new Date().toISOString()
            };

            io.to(chatId).emit('ai_typing', { chatId, isTyping: false });
            io.to(chatId).emit('message_received', aiMessage);
            io.to(chatId).emit('receive_message', aiMessage);
          });
        }
      } catch (err) {
        console.error('[Socket Send Message Error]:', err.message);
      }
    });

    // Disconnect event handler
    socket.on('disconnect', async () => {
      if (socket.userId) {
        userSockets.delete(socket.userId);
        onlineUsersMap.delete(socket.userId);
        await presenceService.setUserOffline(socket.userId);

        io.emit('online_users_list', Array.from(onlineUsersMap.values()));
        io.emit('user_presence', {
          userId: socket.userId,
          isOnline: false,
          lastSeen: new Date().toISOString()
        });
      }
    });
  });
}

module.exports = { initializeSockets, userSockets, onlineUsersMap, inMemoryMessages };
