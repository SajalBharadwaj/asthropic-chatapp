import 'user_model.dart';

class MessageModel {
  final String id;
  final UserModel sender;
  final String chatId;
  final String content;
  final String type; // 'text', 'image', 'file', 'ai_response'
  final String mediaUrl;
  final bool isAIResponse;
  final DateTime createdAt;

  MessageModel({
    required this.id,
    required this.sender,
    required this.chatId,
    required this.content,
    this.type = 'text',
    this.mediaUrl = '',
    this.isAIResponse = false,
    required this.createdAt,
  });

  factory MessageModel.fromJson(Map<String, dynamic> json) {
    UserModel senderObj;
    if (json['sender'] is Map<String, dynamic>) {
      senderObj = UserModel.fromJson(json['sender']);
    } else {
      senderObj = UserModel(
        id: json['sender']?.toString() ?? '',
        username: 'User',
        displayName: 'User',
        email: '',
      );
    }

    return MessageModel(
      id: json['_id'] ?? json['id'] ?? UniqueKey().toString(),
      sender: senderObj,
      chatId: json['chat'] is Map ? json['chat']['_id'] : (json['chat']?.toString() ?? ''),
      content: json['content'] ?? '',
      type: json['type'] ?? 'text',
      mediaUrl: json['mediaUrl'] ?? '',
      isAIResponse: json['isAIResponse'] ?? false,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt']) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'sender': sender.toJson(),
      'chat': chatId,
      'content': content,
      'type': type,
      'mediaUrl': mediaUrl,
      'isAIResponse': isAIResponse,
      'createdAt': createdAt.toIso8601String(),
    };
  }
}

class UniqueKey {
  @override
  String toString() => DateTime.now().millisecondsSinceEpoch.toString();
}
