import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // WhatsApp Signature Colors
  static const Color primaryTeal = Color(0xFF00A884);
  static const Color primaryDarkTeal = Color(0xFF008069);
  static const Color backgroundDark = Color(0xFF111B21);
  static const Color cardDark = Color(0xFF202C33);
  static const Color chatWallpaperDark = Color(0xFF0B141A);
  
  // Message Bubble Colors
  static const Color myBubbleDark = Color(0xFF005C4B);
  static const Color otherBubbleDark = Color(0xFF202C33);
  static const Color aiBubbleDark = Color(0xFF1F2C34);
  
  // Accents
  static const Color accentGreen = Color(0xFF25D366);
  static const Color onlineGreen = Color(0xFF00E676);
  static const Color offlineGray = Color(0xFF8696A0);
  static const Color textPrimaryDark = Color(0xFFE9EDEF);
  static const Color textSecondaryDark = Color(0xFF8696A0);

  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      primaryColor: primaryTeal,
      scaffoldBackgroundColor: backgroundDark,
      colorScheme: const ColorScheme.dark(
        primary: primaryTeal,
        secondary: primaryDarkTeal,
        surface: cardDark,
        background: backgroundDark,
        onBackground: textPrimaryDark,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: cardDark,
        elevation: 0,
        titleTextStyle: GoogleFonts.inter(
          fontSize: 19,
          fontWeight: FontWeight.w600,
          color: textPrimaryDark,
        ),
        iconTheme: const IconThemeData(color: textPrimaryDark),
      ),
      textTheme: GoogleFonts.interTextTheme(ThemeData.dark().textTheme).copyWith(
        bodyLarge: const TextStyle(color: textPrimaryDark, fontSize: 16),
        bodyMedium: const TextStyle(color: textPrimaryDark, fontSize: 14),
        bodySmall: const TextStyle(color: textSecondaryDark, fontSize: 12),
      ),
      floatingActionButtonTheme: const FloatingActionButtonThemeData(
        backgroundColor: primaryTeal,
        foregroundColor: Colors.white,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: cardDark,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(24),
          borderSide: BorderSide.none,
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        hintStyle: const TextStyle(color: textSecondaryDark),
      ),
    );
  }
}
