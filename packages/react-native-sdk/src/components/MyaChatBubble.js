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

/**
 * Parses simple inline markdown (bold **text**, italic *text*) into nested Text components.
 */
function renderFormattedContent(rawText, baseStyle) {
  if (!rawText) return null;
  const lines = rawText.split('\n');

  return lines.map((line, lineIdx) => {
    const parts = [];
    const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          React.createElement(Text, { key: `txt-${lineIdx}-${lastIndex}` }, line.substring(lastIndex, match.index))
        );
      }
      const token = match[0];
      if (token.startsWith('**') && token.endsWith('**')) {
        parts.push(
          React.createElement(
            Text,
            { key: `b-${lineIdx}-${match.index}`, style: { fontWeight: '700' } },
            token.slice(2, -2)
          )
        );
      } else if (token.startsWith('*') && token.endsWith('*')) {
        parts.push(
          React.createElement(
            Text,
            { key: `i-${lineIdx}-${match.index}`, style: { fontStyle: 'italic' } },
            token.slice(1, -1)
          )
        );
      }
      lastIndex = match.index + token.length;
    }

    if (lastIndex < line.length) {
      parts.push(
        React.createElement(Text, { key: `txt-${lineIdx}-${lastIndex}` }, line.substring(lastIndex))
      );
    }

    const isBullet = line.trim().startsWith('•') || line.trim().startsWith('- ') || line.trim().startsWith('* ');

    return React.createElement(
      Text,
      {
        key: `l-${lineIdx}`,
        style: [baseStyle, isBullet ? { paddingLeft: 4 } : null]
      },
      ...parts,
      lineIdx < lines.length - 1 ? '\n' : ''
    );
  });
}

function MyaChatBubble(props) {
  const { message = {}, theme = {}, role, content, timestamp, isStreaming, error } = props;
  const activeTheme = Object.assign({}, defaultMyaTheme, theme);

  // Dual contract: support both props.message and flat props
  const effectiveRole = role || message.role || 'assistant';
  const effectiveContent = content !== undefined ? content : (message.content || '');
  const effectiveTimestamp = timestamp || message.timestamp;
  const effectiveIsStreaming = isStreaming !== undefined ? isStreaming : Boolean(message.isStreaming);
  const effectiveError = error !== undefined ? error : Boolean(message.error);

  const isUser = effectiveRole === 'user';
  const isError = effectiveError;

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

  const displayText = effectiveContent || (effectiveIsStreaming ? 'Thinking...' : '');

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
      renderFormattedContent(
        displayText,
        Object.assign({}, styles.messageText, {
          color: textColor,
          fontSize: activeTheme.typography.fontSizeMedium
        })
      ),
      effectiveIsStreaming &&
        Boolean(effectiveContent) &&
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
      formatTimestamp(effectiveTimestamp)
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
