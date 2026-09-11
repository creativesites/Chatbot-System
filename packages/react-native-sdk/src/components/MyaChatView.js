/**
 * MyaChatView (CommonJS)
 */

const React = require('react');
const { useState, useRef } = React;
const { defaultMyaTheme } = require('./theme');
const {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} = require('./nativePrimitives');
const { MyaChatBubble } = require('./MyaChatBubble');
const { MyaBlockRenderer } = require('./MyaBlockRenderer');
const { MyaQuickReplies } = require('./MyaQuickReplies');

/**
 * Weave prose and cards back into the order the model produced them.
 */
function interleave(text, blocks) {
  const body = text || '';
  const list = (blocks || [])
    .map((b, i) => ({ b, i, pos: typeof b.position === 'number' ? b.position : Infinity }))
    .sort((x, y) => (x.pos - y.pos) || (x.i - y.i));

  const items = [];
  let cursor = 0;

  for (const { b, pos } of list) {
    const at = Math.max(cursor, Math.min(Number.isFinite(pos) ? pos : body.length, body.length));
    const chunk = body.slice(cursor, at).trim();
    if (chunk) items.push({ kind: 'text', text: chunk });
    items.push({ kind: 'block', block: b });
    cursor = at;
  }

  const tail = body.slice(cursor).trim();
  if (tail) items.push({ kind: 'text', text: tail });
  return items;
}

function MyaChatView({
  messages = [],
  streamingText = '',
  isStreaming = false,
  activeBlocks = [],
  quickReplies = [],
  theme = {},
  title = 'MYA Hair AI',
  subtitle = 'Personalized Hair Care & Strand Intelligence',
  placeholder = 'Ask Mya about your hair journey...',
  onSendMessage,
  onSelectQuickReply,
  onPressAction,
  onToggleRoutineStep,
  onPressVoice,
  onClearSession
}) {
  const activeTheme = Object.assign({}, defaultMyaTheme, theme);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef(null);

  const handleSend = () => {
    const trimmed = (inputText || '').trim();
    if (!trimmed || isStreaming) return;
    if (onSendMessage) onSendMessage(trimmed);
    setInputText('');
  };

  const handleQuickReply = (reply) => {
    if (onSelectQuickReply) {
      onSelectQuickReply(reply);
    } else if (onSendMessage) {
      onSendMessage(reply.payload || reply.label);
    }
  };

  const renderMessageItem = ({ item }) => {
    const isUser = item.role === 'user';
    const messageBlocks = item.blocks || (item.metadata && item.metadata.blocks) || [];
    const messageQuickReplies = item.quickReplies || (item.metadata && item.metadata.quickReplies) || [];

    if (isUser || messageBlocks.length === 0) {
      return React.createElement(
        View,
        {
          key: item.id,
          style: [
            styles.messageRow,
            isUser ? styles.messageRowUser : styles.messageRowAssistant
          ]
        },
        React.createElement(MyaChatBubble, {
          role: item.role,
          content: item.content,
          timestamp: item.timestamp,
          theme: activeTheme
        }),
        !isUser && messageQuickReplies.length > 0 &&
          React.createElement(MyaQuickReplies, {
            replies: messageQuickReplies,
            theme: activeTheme,
            onSelectReply: handleQuickReply
          })
      );
    }

    // Interleaved message blocks and prose
    const interleaved = interleave(item.content, messageBlocks);

    return React.createElement(
      View,
      {
        key: item.id,
        style: [
          styles.messageRow,
          styles.messageRowAssistant
        ]
      },
      interleaved.map((entry, idx) => {
        if (entry.kind === 'text') {
          return React.createElement(MyaChatBubble, {
            key: `interleaved-text-${item.id}-${idx}`,
            role: item.role,
            content: entry.text,
            timestamp: idx === interleaved.length - 1 ? item.timestamp : null,
            theme: activeTheme
          });
        }
        return React.createElement(MyaBlockRenderer, {
          key: `interleaved-block-${item.id}-${idx}`,
          block: entry.block,
          theme: activeTheme,
          onPressAction: onPressAction,
          onToggleRoutineStep: onToggleRoutineStep,
          onSelectQuickReply: handleQuickReply
        });
      }),
      messageQuickReplies.length > 0 &&
        React.createElement(MyaQuickReplies, {
          replies: messageQuickReplies,
          theme: activeTheme,
          onSelectReply: handleQuickReply
        })
    );
  };

  return React.createElement(
    KeyboardAvoidingView,
    {
      style: [
        styles.container,
        { backgroundColor: activeTheme.colors.background }
      ],
      behavior: 'padding'
    },
    // Header Bar
    React.createElement(
      View,
      {
        style: [
          styles.header,
          {
            backgroundColor: activeTheme.colors.surface,
            borderBottomColor: activeTheme.colors.border
          }
        ]
      },
      React.createElement(
        View,
        { style: styles.headerLeft },
        React.createElement(
          View,
          {
            style: [
              styles.avatarBadge,
              { backgroundColor: activeTheme.colors.primary }
            ]
          },
          React.createElement(
            Text,
            { style: [styles.avatarText, { color: activeTheme.colors.accentGold }] },
            'M'
          )
        ),
        React.createElement(
          View,
          null,
          React.createElement(
            Text,
            {
              style: [
                styles.headerTitle,
                { color: activeTheme.colors.textPrimary }
              ]
            },
            title
          ),
          React.createElement(
            Text,
            {
              style: [
                styles.headerSubtitle,
                { color: activeTheme.colors.textSecondary }
              ]
            },
            subtitle
          )
        )
      ),
      onClearSession
        ? React.createElement(
            TouchableOpacity,
            {
              onPress: onClearSession,
              style: styles.resetButton,
              activeOpacity: 0.7
            },
            React.createElement(
              Text,
              {
                style: [
                  styles.resetButtonText,
                  { color: activeTheme.colors.textMuted }
                ]
              },
              'Reset'
            )
          )
        : null
    ),

    // Messages FlatList
    React.createElement(FlatList, {
      ref: flatListRef,
      data: messages,
      keyExtractor: (item) => item.id,
      renderItem: renderMessageItem,
      contentContainerStyle: styles.messagesContent,
      onContentSizeChange: () => {
        if (flatListRef.current && flatListRef.current.scrollToEnd) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      }
    }),

    // Streaming bubble in flight
    isStreaming
      ? React.createElement(
          View,
          { style: [styles.messageRow, styles.messageRowAssistant] },
          React.createElement(MyaChatBubble, {
            role: 'assistant',
            content: streamingText || '...',
            isStreaming: true,
            theme: activeTheme
          })
        )
      : null,

    // Active streaming generative blocks
    activeBlocks && activeBlocks.length > 0
      ? React.createElement(
          View,
          { style: styles.activeBlocksContainer },
          activeBlocks.map((block, idx) =>
            React.createElement(MyaBlockRenderer, {
              key: `active-block-${idx}`,
              block: block,
              theme: activeTheme,
              onPressAction: onPressAction,
              onSelectQuickReply: handleQuickReply
            })
          )
        )
      : null,

    // Quick Replies Tray
    quickReplies && quickReplies.length > 0
      ? React.createElement(MyaQuickReplies, {
          replies: quickReplies,
          theme: activeTheme,
          onSelectReply: handleQuickReply,
          disabled: isStreaming
        })
      : null,

    // Input Composer Bar
    React.createElement(
      View,
      {
        style: [
          styles.composerContainer,
          {
            backgroundColor: activeTheme.colors.surface,
            borderTopColor: activeTheme.colors.border
          }
        ]
      },
      onPressVoice
        ? React.createElement(
            TouchableOpacity,
            {
              style: [
                styles.micButton,
                { backgroundColor: activeTheme.colors.surfaceElevated }
              ],
              onPress: onPressVoice,
              activeOpacity: 0.7
            },
            React.createElement(
              Text,
              { style: { fontSize: 18 } },
              '🎙️'
            )
          )
        : null,
      React.createElement(TextInput, {
        style: [
          styles.input,
          {
            backgroundColor: activeTheme.colors.surfaceElevated,
            color: activeTheme.colors.textPrimary,
            borderColor: activeTheme.colors.border
          }
        ],
        placeholder: placeholder,
        placeholderTextColor: activeTheme.colors.textMuted,
        value: inputText,
        onChangeText: setInputText,
        multiline: false,
        editable: !isStreaming,
        returnKeyType: 'send',
        onSubmitEditing: handleSend
      }),
      React.createElement(
        TouchableOpacity,
        {
          style: [
            styles.sendButton,
            {
              backgroundColor:
                (inputText || '').trim() && !isStreaming
                  ? activeTheme.colors.primary
                  : activeTheme.colors.surfaceElevated
            }
          ],
          onPress: handleSend,
          disabled: !(inputText || '').trim() || isStreaming,
          activeOpacity: 0.8
        },
        isStreaming
          ? React.createElement(ActivityIndicator, {
              size: 'small',
              color: activeTheme.colors.accentGold
            })
          : React.createElement(
              Text,
              {
                style: [
                  styles.sendButtonText,
                  {
                    color: (inputText || '').trim()
                      ? activeTheme.colors.accentGold
                      : activeTheme.colors.textMuted
                  }
                ]
              },
              '↑'
            )
      )
    )
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  avatarBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  avatarText: {
    fontWeight: '800',
    fontSize: 16
  },
  headerTitle: {
    fontWeight: '700',
    fontSize: 15
  },
  headerSubtitle: {
    fontSize: 11
  },
  resetButton: {
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  resetButtonText: {
    fontSize: 12,
    fontWeight: '600'
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 24
  },
  messageRow: {
    marginVertical: 4
  },
  messageRowUser: {
    alignItems: 'flex-end'
  },
  messageRowAssistant: {
    alignItems: 'flex-start'
  },
  activeBlocksContainer: {
    paddingHorizontal: 16,
    marginVertical: 4
  },
  composerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1
  },
  micButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8
  },
  input: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    fontSize: 14
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8
  },
  sendButtonText: {
    fontSize: 18,
    fontWeight: '800'
  }
});

module.exports = { MyaChatView };
