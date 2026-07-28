import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'api_service.dart';

class SocketService {
  static IO.Socket? _socket;
  static bool _isConnected = false;

  static IO.Socket? get socket => _socket;
  static bool get isConnected => _isConnected;

  static void initSocket(Map<String, dynamic> user, {Function(dynamic)? onMessageReceived, Function(dynamic)? onTypingStatus, Function(dynamic)? onPresenceUpdate, Function(dynamic)? onAITyping}) {
    if (_socket != null && _socket!.connected) return;

    // Derived socket endpoint matching API server host
    final socketUrl = ApiService.baseUrl.replaceAll('/api', '');

    _socket = IO.io(socketUrl, IO.OptionBuilder()
      .setTransports(['websocket'])
      .disableAutoConnect()
      .setExtraHeaders({'origin': '*'})
      .build());

    _socket!.connect();

    _socket!.onConnect((_) {
      _isConnected = true;
      print('[Socket.io Client] Connected to server.');
      _socket!.emit('setup', user);
    });

    _socket!.onDisconnect((_) {
      _isConnected = false;
      print('[Socket.io Client] Disconnected.');
    });

    _socket!.on('message_received', (data) {
      if (onMessageReceived != null) onMessageReceived(data);
    });

    _socket!.on('typing', (data) {
      if (onTypingStatus != null) onTypingStatus(data);
    });

    _socket!.on('stop_typing', (data) {
      if (onTypingStatus != null) onTypingStatus({...data, 'isTyping': false});
    });

    _socket!.on('user_presence', (data) {
      if (onPresenceUpdate != null) onPresenceUpdate(data);
    });

    _socket!.on('ai_typing', (data) {
      if (onAITyping != null) onAITyping(data);
    });
  }

  static void joinChat(String chatId) {
    _socket?.emit('join_chat', chatId);
  }

  static void leaveChat(String chatId) {
    _socket?.emit('leave_chat', chatId);
  }

  static void emitTyping(String chatId, String userId, String username) {
    _socket?.emit('typing', {'roomId': chatId, 'userId': userId, 'username': username});
  }

  static void emitStopTyping(String chatId, String userId) {
    _socket?.emit('stop_typing', {'roomId': chatId, 'userId': userId});
  }

  static void sendMessage({
    required String senderId,
    required String chatId,
    required String content,
    String type = 'text',
    String mediaUrl = '',
  }) {
    _socket?.emit('send_message', {
      'senderId': senderId,
      'chatId': chatId,
      'content': content,
      'type': type,
      'mediaUrl': mediaUrl,
    });
  }

  static void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    _isConnected = false;
  }
}
