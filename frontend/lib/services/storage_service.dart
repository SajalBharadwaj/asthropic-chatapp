import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class StorageService {
  static const String _keyToken = 'auth_token';
  static const String _keyUser = 'auth_user';
  static const String _keyChatsCache = 'cached_chats';
  static const String _keyMessagesPrefix = 'cached_messages_';

  static Future<void> saveSession(String token, Map<String, dynamic> userJson) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyToken, token);
    await prefs.setString(_keyUser, jsonEncode(userJson));
  }

  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyToken);
  }

  static Future<Map<String, dynamic>?> getUser() async {
    final prefs = await SharedPreferences.getInstance();
    final userStr = prefs.getString(_keyUser);
    if (userStr != null) {
      return jsonDecode(userStr);
    }
    return null;
  }

  static Future<void> clearSession() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyToken);
    await prefs.remove(_keyUser);
    await prefs.remove(_keyChatsCache);
  }

  // Instant Startup Local Caching Layer
  static Future<void> cacheChats(List<dynamic> chatsJson) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyChatsCache, jsonEncode(chatsJson));
  }

  static Future<List<dynamic>?> getCachedChats() async {
    final prefs = await SharedPreferences.getInstance();
    final data = prefs.getString(_keyChatsCache);
    if (data != null) {
      return jsonDecode(data);
    }
    return null;
  }

  static Future<void> cacheMessages(String chatId, List<dynamic> messagesJson) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('$_keyMessagesPrefix$chatId', jsonEncode(messagesJson));
  }

  static Future<List<dynamic>?> getCachedMessages(String chatId) async {
    final prefs = await SharedPreferences.getInstance();
    final data = prefs.getString('$_keyMessagesPrefix$chatId');
    if (data != null) {
      return jsonDecode(data);
    }
    return null;
  }
}
