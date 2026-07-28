import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/theme.dart';
import '../models/user_model.dart';
import '../services/api_service.dart';
import '../providers/auth_provider.dart';
import '../providers/chat_provider.dart';

class GroupCreateScreen extends StatefulWidget {
  const GroupCreateScreen({Key? key}) : super(key: key);

  @override
  State<GroupCreateScreen> createState() => _GroupCreateScreenState();
}

class _GroupCreateScreenState extends State<GroupCreateScreen> {
  final _groupNameController = TextEditingController();
  final _searchController = TextEditingController();
  List<UserModel> _searchResults = [];
  final List<UserModel> _selectedUsers = [];
  bool _isSearching = false;
  bool _isCreating = false;

  void _onSearch(String query) async {
    if (query.trim().isEmpty) {
      setState(() => _searchResults = []);
      return;
    }
    setState(() => _isSearching = true);
    try {
      final results = await ApiService.searchUsers(query);
      setState(() {
        _searchResults = results.map((u) => UserModel.fromJson(u)).toList();
      });
    } catch (e) {
      print('Search error: $e');
    } finally {
      setState(() => _isSearching = false);
    }
  }

  void _toggleUserSelection(UserModel user) {
    setState(() {
      if (_selectedUsers.any((u) => u.id == user.id)) {
        _selectedUsers.removeWhere((u) => u.id == user.id);
      } else {
        _selectedUsers.add(user);
      }
    });
  }

  void _createGroup() async {
    if (_groupNameController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a group name')),
      );
      return;
    }
    if (_selectedUsers.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select at least 1 member')),
      );
      return;
    }

    setState(() => _isCreating = true);
    try {
      final userIds = _selectedUsers.map((u) => u.id).toList();
      await ApiService.createGroupChat(_groupNameController.text.trim(), userIds);
      
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      final chatProvider = Provider.of<ChatProvider>(context, listen: false);
      if (authProvider.currentUser != null) {
        await chatProvider.fetchUserChats(authProvider.currentUser!.id);
      }

      Navigator.pop(context);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to create group: $e')),
      );
    } finally {
      setState(() => _isCreating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('New Group'),
        actions: [
          IconButton(
            icon: _isCreating
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Icon(Icons.check, color: AppTheme.primaryTeal),
            onPressed: _isCreating ? null : _createGroup,
          )
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: TextField(
              controller: _groupNameController,
              decoration: const InputDecoration(
                labelText: 'Group Subject / Name',
                prefixIcon: Icon(Icons.group_work_outlined),
              ),
            ),
          ),
          if (_selectedUsers.isNotEmpty)
            Container(
              height: 50,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                itemCount: _selectedUsers.length,
                itemBuilder: (context, index) {
                  final user = _selectedUsers[index];
                  return Padding(
                    padding: const EdgeInsets.only(right: 8.0),
                    child: Chip(
                      avatar: CircleAvatar(
                        backgroundColor: AppTheme.primaryTeal,
                        child: Text(user.displayName[0].toUpperCase(), style: const TextStyle(color: Colors.white, fontSize: 12)),
                      ),
                      label: Text(user.displayName),
                      onDeleted: () => _toggleUserSelection(user),
                      deleteIconColor: Colors.white54,
                      backgroundColor: AppTheme.cardDark,
                    ),
                  );
                },
              ),
            ),
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: TextField(
              controller: _searchController,
              onChanged: _onSearch,
              decoration: const InputDecoration(
                hintText: 'Search contacts to add...',
                prefixIcon: Icon(Icons.search),
              ),
            ),
          ),
          Expanded(
            child: _isSearching
                ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryTeal))
                : ListView.builder(
                    itemCount: _searchResults.length,
                    itemBuilder: (context, index) {
                      final user = _searchResults[index];
                      final isSelected = _selectedUsers.any((u) => u.id == user.id);
                      return ListTile(
                        leading: CircleAvatar(
                          backgroundColor: AppTheme.primaryDarkTeal,
                          child: Text(user.displayName[0].toUpperCase(), style: const TextStyle(color: Colors.white)),
                        ),
                        title: Text(user.displayName, style: const TextStyle(color: AppTheme.textPrimaryDark)),
                        subtitle: Text('@${user.username}', style: const TextStyle(color: AppTheme.textSecondaryDark)),
                        trailing: Icon(
                          isSelected ? Icons.check_circle : Icons.circle_outlined,
                          color: isSelected ? AppTheme.primaryTeal : AppTheme.textSecondaryDark,
                        ),
                        onTap: () => _toggleUserSelection(user),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
