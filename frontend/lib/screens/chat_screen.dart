import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:emoji_picker_flutter/emoji_picker_flutter.dart';
import '../config/theme.dart';
import '../models/chat_model.dart';
import '../providers/auth_provider.dart';
import '../providers/chat_provider.dart';
import '../providers/presence_provider.dart';
import '../widgets/chat_bubble.dart';
import '../widgets/typing_indicator.dart';
import '../widgets/presence_badge.dart';

class ChatScreen extends StatefulWidget {
  final ChatModel chat;

  const ChatScreen({Key? key, required this.chat}) : super(key: key);

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  bool _showEmoji = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final chatProvider = Provider.of<ChatProvider>(context, listen: false);
      chatProvider.loadMessages(widget.chat.id);
    });
  }

  void _sendMessage({String type = 'text', String mediaUrl = ''}) {
    final text = _messageController.text.trim();
    if (text.isEmpty && type == 'text') return;

    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final chatProvider = Provider.of<ChatProvider>(context, listen: false);

    if (authProvider.currentUser != null) {
      chatProvider.sendMessage(
        senderId: authProvider.currentUser!.id,
        chatId: widget.chat.id,
        content: text.isEmpty ? (type == 'image' ? '📷 Photo' : '📎 Attachment') : text,
        type: type,
        mediaUrl: mediaUrl,
      );
      _messageController.clear();
      _scrollToBottom();
    }
  }

  void _scrollToBottom() {
    if (_scrollController.hasClients) {
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent + 100,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final chatProvider = Provider.of<ChatProvider>(context);
    final presenceProvider = Provider.of<PresenceProvider>(context);

    final currentUserId = authProvider.currentUser?.id ?? '';
    final messages = chatProvider.getMessages(widget.chat.id);
    final isTyping = chatProvider.isTyping(widget.chat.id);
    final isAITyping = chatProvider.isAITyping(widget.chat.id);

    // Determine partner presence if direct chat
    bool isPartnerOnline = false;
    if (!widget.chat.isGroupChat && widget.chat.users.isNotEmpty) {
      final partner = widget.chat.users.firstWhere(
        (u) => u.id != currentUserId,
        orElse: () => widget.chat.users.first,
      );
      isPartnerOnline = presenceProvider.isUserOnline(partner.id);
    }

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 0,
        title: Row(
          children: [
            CircleAvatar(
              backgroundColor: AppTheme.primaryDarkTeal,
              radius: 18,
              child: Text(
                widget.chat.chatName.isNotEmpty ? widget.chat.chatName[0].toUpperCase() : 'C',
                style: const TextStyle(color: Colors.white, fontSize: 16),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.chat.chatName,
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  if (!widget.chat.isGroupChat)
                    Row(
                      children: [
                        PresenceBadge(isOnline: isPartnerOnline),
                        const SizedBox(width: 6),
                        Text(
                          isPartnerOnline ? 'online' : 'offline',
                          style: TextStyle(
                            fontSize: 12,
                            color: isPartnerOnline ? AppTheme.onlineGreen : AppTheme.offlineGray,
                          ),
                        ),
                      ],
                    ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.auto_awesome, color: Colors.amber),
            tooltip: 'Insert @gemini trigger',
            onPressed: () {
              _messageController.text = '@gemini ';
              _messageController.selection = TextSelection.fromPosition(
                TextPosition(offset: _messageController.text.length),
              );
            },
          ),
          IconButton(icon: const Icon(Icons.more_vert), onPressed: () {}),
        ],
      ),
      body: Container(
        color: AppTheme.chatWallpaperDark,
        child: Column(
          children: [
            Expanded(
              child: ListView.builder(
                controller: _scrollController,
                padding: const EdgeInsets.symmetric(vertical: 8),
                itemCount: messages.length,
                itemBuilder: (context, index) {
                  final msg = messages[index];
                  final isMe = msg.sender.id == currentUserId;
                  return ChatBubble(message: msg, isMe: isMe);
                },
              ),
            ),

            if (isTyping) const TypingIndicatorWidget(),
            if (isAITyping) const TypingIndicatorWidget(isAI: true),

            // Input Bar
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
              color: AppTheme.backgroundDark,
              child: Row(
                children: [
                  IconButton(
                    icon: Icon(
                      _showEmoji ? Icons.keyboard : Icons.sentiment_satisfied_alt,
                      color: AppTheme.textSecondaryDark,
                    ),
                    onPressed: () {
                      setState(() => _showEmoji = !_showEmoji);
                    },
                  ),
                  Expanded(
                    child: TextField(
                      controller: _messageController,
                      onChanged: (val) {
                        if (val.isNotEmpty) {
                          chatProvider.sendTyping(widget.chat.id, currentUserId, authProvider.currentUser?.displayName ?? '');
                        } else {
                          chatProvider.sendStopTyping(widget.chat.id, currentUserId);
                        }
                      },
                      onSubmitted: (_) => _sendMessage(),
                      decoration: const InputDecoration(
                        hintText: 'Type a message or @gemini...',
                        contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      ),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.attach_file, color: AppTheme.textSecondaryDark),
                    onPressed: () {
                      // Demo Image Attachment Simulation
                      _sendMessage(type: 'image', mediaUrl: 'https://picsum.photos/400/300');
                    },
                  ),
                  const SizedBox(width: 4),
                  CircleAvatar(
                    backgroundColor: AppTheme.primaryTeal,
                    radius: 22,
                    child: IconButton(
                      icon: const Icon(Icons.send_rounded, color: Colors.white, size: 20),
                      onPressed: () => _sendMessage(),
                    ),
                  ),
                ],
              ),
            ),

            // Emoji Picker Drawer
            if (_showEmoji)
              SizedBox(
                height: 250,
                child: EmojiPicker(
                  onEmojiSelected: (category, emoji) {
                    _messageController.text += emoji.emoji;
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }
}
