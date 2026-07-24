import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/theme.dart';
import '../providers/auth_provider.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({Key? key}) : super(key: key);

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _emailLoginController = TextEditingController();
  final _passLoginController = TextEditingController();

  final _usernameSignupController = TextEditingController();
  final _displaySignupController = TextEditingController();
  final _emailSignupController = TextEditingController();
  final _passSignupController = TextEditingController();
  final _confirmPassSignupController = TextEditingController();

  bool _obscureLoginPass = true;
  bool _obscureSignPass = true;
  bool _obscureConfirmSignPass = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _emailLoginController.dispose();
    _passLoginController.dispose();
    _usernameSignupController.dispose();
    _displaySignupController.dispose();
    _emailSignupController.dispose();
    _passSignupController.dispose();
    _confirmPassSignupController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);

    return Scaffold(
      backgroundColor: AppTheme.backgroundDark,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryTeal.withOpacity(0.15),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.chat_bubble_rounded,
                    size: 64,
                    color: AppTheme.primaryTeal,
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Asthropic ChatApp',
                  style: TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.textPrimaryDark,
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Ultra-Fast Real-Time Messaging & AI Engine',
                  style: TextStyle(
                    fontSize: 13,
                    color: AppTheme.textSecondaryDark,
                  ),
                ),
                const SizedBox(height: 28),

                TabBar(
                  controller: _tabController,
                  indicatorColor: AppTheme.primaryTeal,
                  labelColor: AppTheme.primaryTeal,
                  unselectedLabelColor: AppTheme.textSecondaryDark,
                  tabs: const [
                    Tab(text: 'LOGIN'),
                    Tab(text: 'SIGN UP'),
                  ],
                ),
                const SizedBox(height: 20),

                if (authProvider.errorMessage != null)
                  Container(
                    margin: const EdgeInsets.only(bottom: 16),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.red.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      authProvider.errorMessage!,
                      style: const TextStyle(color: Colors.redAccent),
                    ),
                  ),

                SizedBox(
                  height: 380,
                  child: TabBarView(
                    controller: _tabController,
                    children: [
                      // 1. DIRECT EMAIL ID LOGIN TAB WITH SHOW/HIDE PASSWORD TOGGLE
                      Column(
                        children: [
                          TextField(
                            controller: _emailLoginController,
                            keyboardType: TextInputType.emailAddress,
                            decoration: const InputDecoration(
                              labelText: 'Email Address',
                              prefixIcon: Icon(Icons.email_outlined),
                            ),
                          ),
                          const SizedBox(height: 16),
                          TextField(
                            controller: _passLoginController,
                            obscureText: _obscureLoginPass,
                            decoration: InputDecoration(
                              labelText: 'Password',
                              prefixIcon: const Icon(Icons.lock_outline),
                              suffixIcon: IconButton(
                                icon: Icon(
                                  _obscureLoginPass ? Icons.visibility_off : Icons.visibility,
                                  color: AppTheme.textSecondaryDark,
                                ),
                                onPressed: () {
                                  setState(() => _obscureLoginPass = !_obscureLoginPass);
                                },
                              ),
                            ),
                          ),
                          const SizedBox(height: 24),
                          SizedBox(
                            width: double.infinity,
                            height: 48,
                            child: ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppTheme.primaryTeal,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(24),
                                ),
                              ),
                              onPressed: authProvider.isLoading
                                  ? null
                                  : () {
                                      authProvider.login(
                                        _emailLoginController.text.trim(),
                                        _passLoginController.text.trim(),
                                      );
                                    },
                              child: authProvider.isLoading
                                  ? const CircularProgressIndicator(color: Colors.white)
                                  : const Text(
                                      'LOG IN',
                                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                                    ),
                            ),
                          ),
                        ],
                      ),

                      // 2. SIGN UP TAB WITH CONFIRM PASSWORD & EYE ICON TOGGLES
                      SingleChildScrollView(
                        child: Column(
                          children: [
                            TextField(
                              controller: _usernameSignupController,
                              decoration: const InputDecoration(
                                labelText: 'Username',
                                prefixIcon: Icon(Icons.alternate_email),
                              ),
                            ),
                            const SizedBox(height: 12),
                            TextField(
                              controller: _displaySignupController,
                              decoration: const InputDecoration(
                                labelText: 'Display Name',
                                prefixIcon: Icon(Icons.badge_outlined),
                              ),
                            ),
                            const SizedBox(height: 12),
                            TextField(
                              controller: _emailSignupController,
                              keyboardType: TextInputType.emailAddress,
                              decoration: const InputDecoration(
                                labelText: 'Email Address',
                                prefixIcon: Icon(Icons.email_outlined),
                              ),
                            ),
                            const SizedBox(height: 12),
                            TextField(
                              controller: _passSignupController,
                              obscureText: _obscureSignPass,
                              decoration: InputDecoration(
                                labelText: 'Password',
                                prefixIcon: const Icon(Icons.lock_outline),
                                suffixIcon: IconButton(
                                  icon: Icon(
                                    _obscureSignPass ? Icons.visibility_off : Icons.visibility,
                                    color: AppTheme.textSecondaryDark,
                                  ),
                                  onPressed: () {
                                    setState(() => _obscureSignPass = !_obscureSignPass);
                                  },
                                ),
                              ),
                            ),
                            const SizedBox(height: 12),
                            TextField(
                              controller: _confirmPassSignupController,
                              obscureText: _obscureConfirmSignPass,
                              decoration: InputDecoration(
                                labelText: 'Confirm Password',
                                prefixIcon: const Icon(Icons.lock_reset),
                                suffixIcon: IconButton(
                                  icon: Icon(
                                    _obscureConfirmSignPass ? Icons.visibility_off : Icons.visibility,
                                    color: AppTheme.textSecondaryDark,
                                  ),
                                  onPressed: () {
                                    setState(() => _obscureConfirmSignPass = !_obscureConfirmSignPass);
                                  },
                                ),
                              ),
                            ),
                            const SizedBox(height: 16),
                            SizedBox(
                              width: double.infinity,
                              height: 48,
                              child: ElevatedButton(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppTheme.primaryTeal,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(24),
                                  ),
                                ),
                                onPressed: authProvider.isLoading
                                    ? null
                                    : () {
                                        if (_passSignupController.text != _confirmPassSignupController.text) {
                                          ScaffoldMessenger.of(context).showSnackBar(
                                            const SnackBar(content: Text('Passwords do not match!')),
                                          );
                                          return;
                                        }
                                        authProvider.signup(
                                          username: _usernameSignupController.text.trim(),
                                          displayName: _displaySignupController.text.trim(),
                                          email: _emailSignupController.text.trim(),
                                          password: _passSignupController.text.trim(),
                                        );
                                      },
                                child: authProvider.isLoading
                                    ? const CircularProgressIndicator(color: Colors.white)
                                    : const Text(
                                        'CREATE ACCOUNT',
                                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                                      ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
