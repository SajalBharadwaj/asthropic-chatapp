import 'user_model.dart';
import 'message_model.dart';

class ChatModel {
  final String id;
  final String chatName;
  final bool isGroupChat;
  final List<UserModel> users;
  final MessageModel? latestMessage;
  final UserModel? groupAdmin;
  final String groupIcon;

  ChatModel({
    required this.id,
    required this.chatName,
    required this.isGroupChat,
    required this.users,
    this.latestMessage,
    this.groupAdmin,
    this.groupIcon = '',
  });

  factory ChatModel.fromJson(Map<String, dynamic> json, String currentUserId) {
    List<UserModel> userList = [];
    if (json['users'] != null && json['users'] is List) {
      userList = (json['users'] as List)
          .map((u) => UserModel.fromJson(u is Map<String, dynamic> ? u : {'_id': u}))
          .toList();
    }

    String computedName = json['chatName'] ?? '';
    if (!json['isGroupChat'] && computedName == 'sender') {
      final otherUser = userList.firstWhere(
        (u) => u.id != currentUserId,
        orElse: () => userList.isNotEmpty ? userList.first : UserModel(id: '', username: 'Chat', displayName: 'Chat', email: ''),
      );
      computedName = otherUser.displayName;
    }

    return ChatModel(
      id: json['_id'] ?? '',
      chatName: computedName,
      isGroupChat: json['isGroupChat'] ?? false,
      users: userList,
      latestMessage: json['latestMessage'] != null && json['latestMessage'] is Map<String, dynamic>
          ? MessageModel.fromJson(json['latestMessage'])
          : null,
      groupAdmin: json['groupAdmin'] != null && json['groupAdmin'] is Map<String, dynamic>
          ? UserModel.fromJson(json['groupAdmin'])
          : null,
      groupIcon: json['groupIcon'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'chatName': chatName,
      'isGroupChat': isGroupChat,
      'users': users.map((u) => u.toJson()).toList(),
      'latestMessage': latestMessage?.toJson(),
      'groupIcon': groupIcon,
    };
  }
}
