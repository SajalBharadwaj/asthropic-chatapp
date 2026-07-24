import 'dart:convert';
import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:http/http.dart' as http;
import 'storage_service.dart';

class ApiService {
  // Dynamically resolve backend endpoint based on target platform
  static String get baseUrl {
    if (kIsWeb || (!kIsWeb && (Platform.isWindows || Platform.isLinux || Platform.isMacOS))) {
      return 'http://localhost:5000/api';
    }
    // Android Physical Device or Emulator fallback
    return 'http://10.0.2.2:5000/api'; // Or replace 10.0.2.2 with your computer's local IP (e.g. 192.168.1.5)
  }

  static Future<Map<String, String>> _getHeaders() async {
    final token = await StorageService.getToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  // Auth endpoints
  static Future<Map<String, dynamic>> login(String emailOrUsername, String password) async {
    final res = await http.post(
      Uri.parse('$baseUrl/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'emailOrUsername': emailOrUsername, 'password': password}),
    );
    final data = jsonDecode(res.body);
    if (res.statusCode == 200) {
      await StorageService.saveSession(data['token'], data);
      return data;
    } else {
      throw Exception(data['message'] ?? 'Login failed');
    }
  }

  static Future<Map<String, dynamic>> signup({
    required String username,
    required String displayName,
    required String email,
    required String password,
  }) async {
    final res = await http.post(
      Uri.parse('$baseUrl/auth/signup'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'username': username,
        'displayName': displayName,
        'email': email,
        'password': password,
      }),
    );
    final data = jsonDecode(res.body);
    if (res.statusCode == 201) {
      await StorageService.saveSession(data['token'], data);
      return data;
    } else {
      throw Exception(data['message'] ?? 'Signup failed');
    }
  }

  // Fetch Users for starting direct chats
  static Future<List<dynamic>> searchUsers(String query) async {
    final headers = await _getHeaders();
    final res = await http.get(
      Uri.parse('$baseUrl/auth/users?search=$query'),
      headers: headers,
    );
    if (res.statusCode == 200) {
      return jsonDecode(res.body);
    }
    return [];
  }

  // Fetch all chats
  static Future<List<dynamic>> fetchChats() async {
    final headers = await _getHeaders();
    final res = await http.get(Uri.parse('$baseUrl/chats'), headers: headers);
    if (res.statusCode == 200) {
      final list = jsonDecode(res.body);
      await StorageService.cacheChats(list);
      return list;
    }
    final cached = await StorageService.getCachedChats();
    return cached ?? [];
  }

  // Access or Create Direct Chat
  static Future<Map<String, dynamic>> accessChat(String userId) async {
    final headers = await _getHeaders();
    final res = await http.post(
      Uri.parse('$baseUrl/chats'),
      headers: headers,
      body: jsonEncode({'userId': userId}),
    );
    return jsonDecode(res.body);
  }

  // Create Group Chat
  static Future<Map<String, dynamic>> createGroupChat(String name, List<String> userIds) async {
    final headers = await _getHeaders();
    final res = await http.post(
      Uri.parse('$baseUrl/chats/group'),
      headers: headers,
      body: jsonEncode({'name': name, 'users': userIds}),
    );
    return jsonDecode(res.body);
  }

  // Fetch Messages for Chat
  static Future<List<dynamic>> fetchMessages(String chatId) async {
    final headers = await _getHeaders();
    final res = await http.get(
      Uri.parse('$baseUrl/chats/$chatId/messages'),
      headers: headers,
    );
    if (res.statusCode == 200) {
      final list = jsonDecode(res.body);
      await StorageService.cacheMessages(chatId, list);
      return list;
    }
    final cached = await StorageService.getCachedMessages(chatId);
    return cached ?? [];
  }

  // Standalone AI Assistant Query
  static Future<String> queryAI(String prompt) async {
    final headers = await _getHeaders();
    final res = await http.post(
      Uri.parse('$baseUrl/ai/query'),
      headers: headers,
      body: jsonEncode({'prompt': prompt}),
    );
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      return data['reply'] ?? 'No reply from AI';
    }
    return 'Unable to connect to AI assistant.';
  }
}
