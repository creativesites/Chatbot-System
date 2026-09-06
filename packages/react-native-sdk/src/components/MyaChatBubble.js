/**
 * MyaChatBubble (JavaScript implementation)
 */

const React = require('react');
const { defaultMyaTheme } = require('./theme');
const { View, Text, StyleSheet } = require('./nativePrimitives');

function formatTimestamp(isoString) {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function MyaChatBubble(props) {
  const { message = {}, theme = {} } = props;
  const activeTheme = { ...defaultMyaTheme, ...theme };
  const isUser = message.role === 'user';
  const isError = message.error;

  const bubbleBg = isUser
    ? activeTheme.colors.userBubbleBackground
    : isError
    ? '#FFEBEE'
    : activeTheme.colors.assistantBubbleBackground;

  const textColor = isUser
    ? activeTheme.colors.userBubbleText
    : isError
    ? activeTheme.colors.error
    : activeTheme.colors.assistantBubbleText;

  return React.createElement(
    View,
    {
      style: [
        styles.container,
        isUser ? styles.containerUser : styles.containerAssistant
      ]
    },
    !isUser &&
      React.createElement(
        Text,
        { style: [styles.senderLabel, { color: activeTheme.colors.accentGold }] },
        'MYAVANA Hair AI'
      ),
    React.createElement(
      View,
      {
        style: [
          styles.bubble,
          {
            backgroundColor: bubbleBg,
            borderColor: isUser ? 'transparent' : activeTheme.colors.border,
            borderWidth: isUser ? 0 : 1
          }
        ]
      },
      React.createElement(
        Text,
        {
          style: [
            styles.messageText,
            {
              color: textColor,
              fontSize: activeTheme.typography.fontSizeMedium
            }
          ]
        },
        message.content || (message.isStreaming ? 'Thinking...' : '')
      ),
      message.isStreaming &&
        Boolean(message.content) &&
        React.createElement(
          Text,
          { style: [styles.streamingCursor, { color: activeTheme.colors.accentGold }] },
          ' ▍'
        )
    ),
    React.createElement(
      Text,
      {
        style: [
          styles.timestamp,
          {
            color: activeTheme.colors.textMuted,
            fontSize: activeTheme.typography.fontSizeSmall,
            textAlign: isUser ? 'right' : 'left'
          }
        ]
      },
      formatTimestamp(message.timestamp)
    )
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
    paddingHorizontal: 12,
    maxWidth: '85%'
  },
  containerUser: {
    alignSelf: 'flex-end'
  },
  containerAssistant: {
    alignSelf: 'flex-start'
  },
  senderLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.8
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  messageText: {
    lineHeight: 20
  },
  streamingCursor: {
    fontSize: 14,
    fontWeight: '700'
  },
  timestamp: {
    marginTop: 3,
    paddingHorizontal: 2
  }
});

module.exports = {
  MyaChatBubble
};
