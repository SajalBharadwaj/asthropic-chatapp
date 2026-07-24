class UserModel {
  final String id;
  final String username;
  final String displayName;
  final String email;
  final String avatarUrl;
  final String statusMessage;
  final bool isOnline;
  final String? lastSeen;
  final bool isAI;

  UserModel({
    required this.id,
    required this.username,
    required this.displayName,
    required this.email,
    this.avatarUrl = '',
    this.statusMessage = 'Hey there! I am using Asthropic ChatApp.',
    this.isOnline = false,
    this.lastSeen,
    this.isAI = false,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['_id'] ?? json['id'] ?? '',
      username: json['username'] ?? '',
      displayName: json['displayName'] ?? json['username'] ?? 'User',
      email: json['email'] ?? '',
      avatarUrl: json['avatarUrl'] ?? '',
      statusMessage: json['statusMessage'] ?? 'Hey there! I am using Asthropic ChatApp.',
      isOnline: json['isOnline'] ?? false,
      lastSeen: json['lastSeen'],
      isAI: json['isAI'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'username': username,
      'displayName': displayName,
      'email': email,
      'avatarUrl': avatarUrl,
      'statusMessage': statusMessage,
      'isOnline': isOnline,
      'lastSeen': lastSeen,
      'isAI': isAI,
    };
  }
}
