import 'package:flutter/foundation.dart';
import '../services/socket_service.dart';

class PresenceProvider extends ChangeNotifier {
  final Map<String, bool> _onlineStatusMap = {};
  final Map<String, String> _lastSeenMap = {};

  bool isUserOnline(String userId) => _onlineStatusMap[userId] ?? false;
  String? getLastSeen(String userId) => _lastSeenMap[userId];

  void initPresenceListeners() {
    SocketService.initSocket(
      {},
      onPresenceUpdate: (data) {
        if (data != null && data['userId'] != null) {
          final userId = data['userId'].toString();
          final isOnline = data['isOnline'] ?? false;
          final lastSeen = data['lastSeen'];

          _onlineStatusMap[userId] = isOnline;
          if (lastSeen != null) {
            _lastSeenMap[userId] = lastSeen.toString();
          }
          notifyListeners();
        }
      },
    );
  }
}
