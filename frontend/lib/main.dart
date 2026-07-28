import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'config/theme.dart';
import 'providers/auth_provider.dart';
import 'providers/chat_provider.dart';
import 'providers/presence_provider.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const AsthropicChatApp());
}

class AsthropicChatApp extends StatelessWidget {
  const AsthropicChatApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => ChatProvider()),
        ChangeNotifierProvider(create: (_) => PresenceProvider()),
      ],
      child: Consumer<AuthProvider>(
        builder: (context, auth, _) {
          return MaterialApp(
            title: 'Asthropic ChatApp',
            debugShowCheckedModeBanner: false,
            theme: AppTheme.darkTheme,
            home: auth.isLoading
                ? const Scaffold(
                    backgroundColor: AppTheme.backgroundDark,
                    body: Center(
                      child: CircularProgressIndicator(color: AppTheme.primaryTeal),
                    ),
                  )
                : (auth.isAuthenticated ? const HomeScreen() : const LoginScreen()),
          );
        },
      ),
    );
  }
}
