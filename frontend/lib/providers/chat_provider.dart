import 'package:flutter/foundation.dart';
import '../models/chat_model.dart';
import '../models/message_model.dart';
import '../services/api_service.dart';
import '../services/socket_service.dart';
import '../services/storage_service.dart';

class ChatProvider extends ChangeNotifier {
  List<ChatModel> _chats = [];
  Map<String, List<MessageModel>> _chatMessages = {};
  Map<String, bool> _typingUsers = {}; // chatId -> isTyping
  Map<String, bool> _aiTypingStatus = {}; // chatId -> isAITyping
  bool _isLoading = false;

  List<ChatModel> get chats => _chats;
  bool get isLoading => _isLoading;
  bool isTyping(String chatId) => _typingUsers[chatId] ?? false;
  bool isAITyping(String chatId) => _aiTypingStatus[chatId] ?? false;

  List<MessageModel> getMessages(String chatId) {
    return _chatMessages[chatId] ?? [];
  }

  void initSocketListeners(String currentUserId) {
    SocketService.initSocket(
      {'_id': currentUserId},
      onMessageReceived: (data) => _handleIncomingMessage(data, currentUserId),
      onTypingStatus: (data) => _handleTypingEvent(data),
      onAITyping: (data) => _handleAITypingEvent(data),
    );
  }

  Future<void> fetchUserChats(String currentUserId) async {
    // 1. Instant cache load for zero load-time lag
    final cached = await StorageService.getCachedChats();
    if (cached != null) {
      _chats = cached.map((c) => ChatModel.fromJson(c, currentUserId)).toList();
      notifyListeners();
    }

    // 2. Fetch fresh network data in background
    _isLoading = true;
    notifyListeners();

    try {
      final freshChatsJson = await ApiService.fetchChats();
      _chats = freshChatsJson.map((c) => ChatModel.fromJson(c, currentUserId)).toList();
    } catch (e) {
      print('[ChatProvider] Fetch chats network error: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadMessages(String chatId) async {
    // Instant cache read
    final cached = await StorageService.getCachedMessages(chatId);
    if (cached != null) {
      _chatMessages[chatId] = cached.map((m) => MessageModel.fromJson(m)).toList();
      notifyListeners();
    }

    try {
      final messagesJson = await ApiService.fetchMessages(chatId);
      _chatMessages[chatId] = messagesJson.map((m) => MessageModel.fromJson(m)).toList();
      notifyListeners();
    } catch (e) {
      print('[ChatProvider] Fetch messages error: $e');
    }
  }

  void sendMessage({
    required String senderId,
    required String chatId,
    required String content,
    String type = 'text',
    String mediaUrl = '',
  }) {
    SocketService.sendMessage(
      senderId: senderId,
      chatId: chatId,
      content: content,
      type: type,
      mediaUrl: mediaUrl,
    );
  }

  void _handleIncomingMessage(dynamic data, String currentUserId) {
    try {
      final message = MessageModel.fromJson(data);
      final chatId = message.chatId;

      if (_chatMessages.containsKey(chatId)) {
        _chatMessages[chatId]!.add(message);
      } else {
        _chatMessages[chatId] = [message];
      }

      // Re-fetch chat list to reflect latest message timestamp & content
      fetchUserChats(currentUserId);
      notifyListeners();
    } catch (e) {
      print('[ChatProvider] Error handling incoming socket message: $e');
    }
  }

  void _handleTypingEvent(dynamic data) {
    if (data != null && data['roomId'] != null) {
      final chatId = data['roomId'].toString();
      final isTyping = data['isTyping'] ?? true;
      _typingUsers[chatId] = isTyping;
      notifyListeners();
    }
  }

  void _handleAITypingEvent(dynamic data) {
    if (data != null && data['chatId'] != null) {
      final chatId = data['chatId'].toString();
      final isTyping = data['isTyping'] ?? false;
      _aiTypingStatus[chatId] = isTyping;
      notifyListeners();
    }
  }

  void sendTyping(String chatId, String userId, String username) {
    SocketService.emitTyping(chatId, userId, username);
  }

  void sendStopTyping(String chatId, String userId) {
    SocketService.emitStopTyping(chatId, userId);
  }
}
