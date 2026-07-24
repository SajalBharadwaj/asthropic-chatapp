import 'package:flutter/foundation.dart';
import '../models/user_model.dart';
import '../services/api_service.dart';
import '../services/storage_service.dart';
import '../services/socket_service.dart';

class AuthProvider extends ChangeNotifier {
  UserModel? _currentUser;
  bool _isLoading = true;
  String? _errorMessage;

  UserModel? get currentUser => _currentUser;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  bool get isAuthenticated => _currentUser != null;

  AuthProvider() {
    _loadUserFromCache();
  }

  Future<void> _loadUserFromCache() async {
    _isLoading = true;
    notifyListeners();
    try {
      final userJson = await StorageService.getUser();
      if (userJson != null) {
        _currentUser = UserModel.fromJson(userJson);
        SocketService.initSocket(userJson);
      }
    } catch (e) {
      print('[Auth] Cache read error: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> login(String emailOrUsername, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final data = await ApiService.login(emailOrUsername, password);
      _currentUser = UserModel.fromJson(data);
      SocketService.initSocket(data);
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> signup({
    required String username,
    required String displayName,
    required String email,
    required String password,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final data = await ApiService.signup(
        username: username,
        displayName: displayName,
        email: email,
        password: password,
      );
      _currentUser = UserModel.fromJson(data);
      SocketService.initSocket(data);
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    SocketService.disconnect();
    await StorageService.clearSession();
    _currentUser = null;
    notifyListeners();
  }
}
