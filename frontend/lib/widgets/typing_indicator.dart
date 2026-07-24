import 'package:flutter/material.dart';
import 'package:flutter_spinkit/flutter_spinkit.dart';
import '../config/theme.dart';

class TypingIndicatorWidget extends StatelessWidget {
  final bool isAI;

  const TypingIndicatorWidget({Key? key, this.isAI = false}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      margin: const EdgeInsets.only(left: 12, bottom: 6),
      decoration: BoxDecoration(
        color: isAI ? AppTheme.aiBubbleDark : AppTheme.otherBubbleDark,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (isAI) ...[
            const Icon(Icons.auto_awesome, color: Colors.amber, size: 14),
            const SizedBox(width: 6),
            const Text(
              'Asthropic AI is thinking...',
              style: TextStyle(color: Colors.amber, fontSize: 12, fontStyle: FontStyle.italic),
            ),
            const SizedBox(width: 8),
          ] else ...[
            const Text(
              'typing',
              style: TextStyle(color: AppTheme.accentGreen, fontSize: 12, fontStyle: FontStyle.italic),
            ),
            const SizedBox(width: 6),
          ],
          SpinKitThreeBounce(
            color: isAI ? Colors.amber : AppTheme.accentGreen,
            size: 12.0,
          ),
        ],
      ),
    );
  }
}
