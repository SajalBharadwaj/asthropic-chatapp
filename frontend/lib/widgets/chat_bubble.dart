import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../config/theme.dart';
import '../models/message_model.dart';

class ChatBubble extends StatelessWidget {
  final MessageModel message;
  final bool isMe;

  const ChatBubble({
    Key? key,
    required this.message,
    required this.isMe,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final formattedTime = DateFormat('hh:mm a').format(message.createdAt);
    final isAI = message.isAIResponse || message.sender.isAI;

    Color bubbleColor = isMe
        ? AppTheme.myBubbleDark
        : (isAI ? AppTheme.aiBubbleDark : AppTheme.otherBubbleDark);

    String avatarChar = isAI
        ? '🤖'
        : (message.sender.displayName.isNotEmpty ? message.sender.displayName[0].toUpperCase() : 'U');

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      child: Row(
        mainAxisAlignment: isMe ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!isMe) ...[
            CircleAvatar(
              radius: 16,
              backgroundColor: isAI ? Colors.amber : AppTheme.primaryDarkTeal,
              child: Text(
                avatarChar,
                style: TextStyle(
                  color: isAI ? Colors.black : Colors.white,
                  fontSize: isAI ? 14 : 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            const SizedBox(width: 8),
          ],
          Container(
            constraints: BoxConstraints(
              maxWidth: MediaQuery.of(context).size.width * 0.72,
            ),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: bubbleColor,
              borderRadius: BorderRadius.only(
                topLeft: const Radius.circular(14),
                topRight: const Radius.circular(14),
                bottomLeft: Radius.circular(isMe ? 14 : 2),
                bottomRight: Radius.circular(isMe ? 2 : 14),
              ),
              boxShadow: const [
                BoxShadow(
                  color: Colors.black12,
                  blurRadius: 2,
                  offset: Offset(0, 1),
                )
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                // FULL SENDER NAME DISPLAYED CLEARLY ABOVE TEXT
                Text(
                  isAI ? 'Asthropic Gemini AI' : message.sender.displayName,
                  style: TextStyle(
                    color: isMe
                        ? const Color(0xFF53BDEB)
                        : (isAI ? Colors.amber : AppTheme.accentGreen),
                    fontWeight: FontWeight.bold,
                    fontSize: 12.5,
                  ),
                ),
                const SizedBox(height: 3),
                if (message.type == 'image' && message.mediaUrl.isNotEmpty)
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Image.network(
                      message.mediaUrl,
                      height: 180,
                      width: double.infinity,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => const Container(
                        height: 120,
                        color: Colors.black26,
                        child: Center(child: Icon(Icons.broken_image, color: Colors.white54)),
                      ),
                    ),
                  ),
                Text(
                  message.content,
                  style: const TextStyle(
                    color: AppTheme.textPrimaryDark,
                    fontSize: 14.5,
                    height: 1.3,
                  ),
                ),
                const SizedBox(height: 4),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    Text(
                      formattedTime,
                      style: const TextStyle(
                        color: AppTheme.textSecondaryDark,
                        fontSize: 10.5,
                      ),
                    ),
                    if (isMe) ...[
                      const SizedBox(width: 4),
                      const Icon(
                        Icons.done_all,
                        size: 14,
                        color: Color(0xFF53BDEB),
                      ),
                    ]
                  ],
                ),
              ],
            ),
          ),
          if (isMe) ...[
            const SizedBox(width: 8),
            CircleAvatar(
              radius: 16,
              backgroundColor: AppTheme.primaryTeal,
              child: Text(
                avatarChar,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ]
        ],
      ),
    );
  }
}
