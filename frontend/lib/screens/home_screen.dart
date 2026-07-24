import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../config/theme.dart';
import '../models/chat_model.dart';
import '../models/user_model.dart';
import '../providers/auth_provider.dart';
import '../providers/chat_provider.dart';
import '../providers/presence_provider.dart';
import '../services/api_service.dart';
import '../widgets/presence_badge.dart';
import 'chat_screen.dart';
import 'group_create_screen.dart';
import 'ai_assistant_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({Key? key}) : super(key: key);

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TextEditingController _searchController = TextEditingController();
  List<UserModel> _userSearchResults = [];
  bool _isSearching = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      final chatProvider = Provider.of<ChatProvider>(context, listen: false);
      final presenceProvider = Provider.of<PresenceProvider>(context, listen: false);

      if (authProvider.currentUser != null) {
        chatProvider.initSocketListeners(authProvider.currentUser!.id);
        chatProvider.fetchUserChats(authProvider.currentUser!.id);
        presenceProvider.initPresenceListeners();
      }
    });
  }

  void _onSearchUsers(String query) async {
    if (query.trim().isEmpty) {
      setState(() => _userSearchResults = []);
      return;
    }
    setState(() => _isSearching = true);
    try {
      final results = await ApiService.searchUsers(query);
      setState(() {
        _userSearchResults = results.map((u) => UserModel.fromJson(u)).toList();
      });
    } catch (e) {
      print('User search error: $e');
    } finally {
      setState(() => _isSearching = false);
    }
  }

  void _startDirectChat(UserModel targetUser) async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final chatProvider = Provider.of<ChatProvider>(context, listen: false);

    try {
      final chatJson = await ApiService.accessChat(targetUser.id);
      final chat = ChatModel.fromJson(chatJson, authProvider.currentUser?.id ?? '');
      await chatProvider.fetchUserChats(authProvider.currentUser?.id ?? '');
      
      _searchController.clear();
      setState(() => _userSearchResults = []);

      Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => ChatScreen(chat: chat)),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not open chat: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final authUser = Provider.of<AuthProvider>(context).currentUser;
    final chatProvider = Provider.of<ChatProvider>(context);
    final presenceProvider = Provider.of<PresenceProvider>(context);

    final directChats = chatProvider.chats.where((c) => !c.isGroupChat).toList();
    final groupChats = chatProvider.chats.where((c) => c.isGroupChat).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Asthropic ChatApp', style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.auto_awesome, color: Colors.amber),
            tooltip: 'Open AI Assistant',
            onPressed: () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const AIAssistantScreen()));
            },
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () {
              Provider.of<AuthProvider>(context, listen: false).logout();
            },
          )
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppTheme.primaryTeal,
          indicatorWeight: 3,
          labelColor: AppTheme.primaryTeal,
          unselectedLabelColor: AppTheme.textSecondaryDark,
          tabs: const [
            Tab(text: 'CHATS'),
            Tab(text: 'GROUPS'),
            Tab(text: 'GEMINI AI'),
          ],
        ),
      ),
      body: Column(
        children: [
          // Quick Contact Search Bar
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: TextField(
              controller: _searchController,
              onChanged: _onSearchUsers,
              decoration: const InputDecoration(
                hintText: 'Search or start new chat...',
                prefixIcon: Icon(Icons.search, color: AppTheme.textSecondaryDark),
              ),
            ),
          ),

          if (_userSearchResults.isNotEmpty || _isSearching)
            Expanded(
              child: Container(
                color: AppTheme.cardDark,
                child: _isSearching
                    ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryTeal))
                    : ListView.builder(
                        itemCount: _userSearchResults.length,
                        itemBuilder: (context, index) {
                          final user = _userSearchResults[index];
                          final isOnline = presenceProvider.isUserOnline(user.id);
                          return ListTile(
                            leading: Stack(
                              children: [
                                CircleAvatar(
                                  backgroundColor: AppTheme.primaryDarkTeal,
                                  child: Text(user.displayName[0].toUpperCase(), style: const TextStyle(color: Colors.white)),
                                ),
                                Positioned(
                                  right: 0,
                                  bottom: 0,
                                  child: PresenceBadge(isOnline: isOnline),
                                ),
                              ],
                            ),
                            title: Text(user.displayName, style: const TextStyle(color: AppTheme.textPrimaryDark, fontWeight: FontWeight.bold)),
                            subtitle: Text('@${user.username}', style: const TextStyle(color: AppTheme.textSecondaryDark)),
                            trailing: const Icon(Icons.chat, color: AppTheme.primaryTeal),
                            onTap: () => _startDirectChat(user),
                          );
                        },
                      ),
              ),
            )
          else
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  // CHATS TAB
                  _buildChatList(directChats, authUser?.id ?? '', presenceProvider),

                  // GROUPS TAB
                  _buildChatList(groupChats, authUser?.id ?? '', presenceProvider),

                  // AI ASSISTANT EMBED TAB
                  const AIAssistantScreen(),
                ],
              ),
            ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppTheme.primaryTeal,
        onPressed: () {
          Navigator.push(context, MaterialPageRoute(builder: (_) => const GroupCreateScreen()));
        },
        child: const Icon(Icons.group_add, color: Colors.white),
      ),
    );
  }

  Widget _buildChatList(List<ChatModel> chatList, String currentUserId, PresenceProvider presenceProvider) {
    if (chatList.isEmpty) {
      return const Center(
        child: Text(
          'No active conversations yet.\nSearch above to start chatting!',
          textAlign: TextAlign.center,
          style: TextStyle(color: AppTheme.textSecondaryDark),
        ),
      );
    }

    return ListView.separated(
      itemCount: chatList.length,
      separatorBuilder: (_, __) => const Divider(color: Colors.white10, height: 1),
      itemBuilder: (context, index) {
        final chat = chatList[index];
        final latestMsg = chat.latestMessage;

        bool isPartnerOnline = false;
        if (!chat.isGroupChat && chat.users.isNotEmpty) {
          final partner = chat.users.firstWhere(
            (u) => u.id != currentUserId,
            orElse: () => chat.users.first,
          );
          isPartnerOnline = presenceProvider.isUserOnline(partner.id);
        }

        return ListTile(
          leading: Stack(
            children: [
              CircleAvatar(
                backgroundColor: chat.isGroupChat ? Colors.indigo : AppTheme.primaryDarkTeal,
                radius: 24,
                child: Icon(
                  chat.isGroupChat ? Icons.group : Icons.person,
                  color: Colors.white,
                ),
              ),
              if (!chat.isGroupChat)
                Positioned(
                  right: 0,
                  bottom: 0,
                  child: PresenceBadge(isOnline: isPartnerOnline),
                ),
            ],
          ),
          title: Text(
            chat.chatName,
            style: const TextStyle(
              fontWeight: FontWeight.bold,
              color: AppTheme.textPrimaryDark,
              fontSize: 16,
            ),
          ),
          subtitle: Text(
            latestMsg != null ? latestMsg.content : 'Tap to open chat',
            maxLines: 1,
            overflow: TextSpanOverflow.ellipsis,
            style: const TextStyle(color: AppTheme.textSecondaryDark, fontSize: 14),
          ),
          trailing: Text(
            latestMsg != null ? DateFormat('hh:mm a').format(latestMsg.createdAt) : '',
            style: const TextStyle(color: AppTheme.textSecondaryDark, fontSize: 11),
          ),
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => ChatScreen(chat: chat)),
            );
          },
        );
      },
    );
  }
}
