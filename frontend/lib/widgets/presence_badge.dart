import 'package:flutter/material.dart';
import '../config/theme.dart';

class PresenceBadge extends StatelessWidget {
  final bool isOnline;

  const PresenceBadge({Key? key, required this.isOnline}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 12,
      height: 12,
      decoration: BoxDecoration(
        color: isOnline ? AppTheme.onlineGreen : AppTheme.offlineGray,
        shape: BoxShape.circle,
        border: Border.all(color: AppTheme.backgroundDark, width: 2),
      ),
    );
  }
}
