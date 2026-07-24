import 'package:flutter/material.dart';
import 'package:flutter_spinkit/flutter_spinkit.dart';
import '../config/theme.dart';
import '../services/api_service.dart';

class AIAssistantScreen extends StatefulWidget {
  const AIAssistantScreen({Key? key}) : super(key: key);

  @override
  State<AIAssistantScreen> createState() => _AIAssistantScreenState();
}

class _AIAssistantScreenState extends State<AIAssistantScreen> {
  final TextEditingController _promptController = TextEditingController();
  final List<Map<String, String>> _messages = [
    {
      'sender': 'ai',
      'text': 'Hello! I am Asthropic AI powered by Gemini. How can I assist your team or answer your questions today?'
    }
  ];
  bool _isLoading = false;

  void _sendPrompt() async {
    final text = _promptController.text.trim();
    if (text.isEmpty || _isLoading) return;

    setState(() {
      _messages.add({'sender': 'user', 'text': text});
      _promptController.clear();
      _isLoading = true;
    });

    try {
      final reply = await ApiService.queryAI(text);
      setState(() {
        _messages.add({'sender': 'ai', 'text': reply});
      });
    } catch (e) {
      setState(() {
        _messages.add({'sender': 'ai', 'text': 'Failed to reach AI service: $e'});
      });
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Row(
          children: [
            Icon(Icons.auto_awesome, color: Colors.amber),
            SizedBox(width: 8),
            Text('Asthropic AI Workspace'),
          ],
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final msg = _messages[index];
                final isUser = msg['sender'] == 'user';
                return Align(
                  alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    margin: const EdgeInsets.symmetric(vertical: 6),
                    padding: const EdgeInsets.all(14),
                    constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.8),
                    decoration: BoxDecoration(
                      color: isUser ? AppTheme.myBubbleDark : AppTheme.aiBubbleDark,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (!isUser)
                          const Padding(
                            padding: EdgeInsets.only(bottom: 4),
                            child: Text(
                              'Gemini 2.5 Flash Engine',
                              style: TextStyle(color: Colors.amber, fontSize: 11, fontWeight: FontWeight.bold),
                            ),
                          ),
                        Text(
                          msg['text']!,
                          style: const TextStyle(color: AppTheme.textPrimaryDark, fontSize: 15),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
          if (_isLoading)
            Container(
              padding: const EdgeInsets.all(12),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  SpinKitThreeBounce(color: Colors.amber, size: 16),
                  SizedBox(width: 8),
                  Text('Thinking...', style: TextStyle(color: Colors.amber, fontSize: 13)),
                ],
              ),
            ),
          Container(
            padding: const EdgeInsets.all(12),
            color: AppTheme.cardDark,
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _promptController,
                    onSubmitted: (_) => _sendPrompt(),
                    decoration: const InputDecoration(
                      hintText: 'Ask Gemini AI anything...',
                      border: InputBorder.none,
                    ),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.send_rounded, color: AppTheme.primaryTeal),
                  onPressed: _sendPrompt,
                )
              ],
            ),
          ),
        ],
      ),
    );
  }
}
