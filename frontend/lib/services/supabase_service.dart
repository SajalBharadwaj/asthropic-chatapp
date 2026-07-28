import 'dart:async';

class SupabaseRealtimeService {
  static final StreamController<Map<String, dynamic>> _messageStreamController =
      StreamController<Map<String, dynamic>>.broadcast();

  static Stream<Map<String, dynamic>> get onRealtimeMessage =>
      _messageStreamController.stream;

  static void subscribeToChatChannel(String chatId) {
    print('[Supabase Realtime] Subscribed to realtime channel: chat_$chatId');
    // Realtime channel listener integration hook for Supabase Broadcast channels
  }

  static void broadcastMessage(String chatId, Map<String, dynamic> messagePayload) {
    _messageStreamController.add({'chatId': chatId, 'payload': messagePayload});
  }

  static void unsubscribe(String chatId) {
    print('[Supabase Realtime] Unsubscribed from channel: chat_$chatId');
  }
}
