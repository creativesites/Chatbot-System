/**
 * MyaQuickReplies (CommonJS)
 */

const React = require('react');
const { defaultMyaTheme } = require('./theme');
const { ScrollView, StyleSheet, Text, TouchableOpacity, View } = require('./nativePrimitives');

function MyaQuickReplies({
  replies,
  theme = {},
  onSelectReply,
  disabled = false
}) {
  if (!replies || replies.length === 0) return null;

  const activeTheme = Object.assign({}, defaultMyaTheme, theme);

  const normalizedReplies = replies.map((r, idx) => {
    if (typeof r === 'string') {
      return { id: `qr-${idx}`, label: r, payload: r };
    }
    return { id: (r && r.id) || `qr-${idx}`, label: (r && r.label) || '', payload: (r && (r.payload || r.label)) || '' };
  });

  return React.createElement(
    ScrollView,
    {
      horizontal: true,
      showsHorizontalScrollIndicator: false,
      style: styles.container,
      contentContainerStyle: styles.contentContainer
    },
    normalizedReplies.map((item) =>
      React.createElement(
        TouchableOpacity,
        {
          key: item.id,
          style: [
            styles.chip,
            {
              backgroundColor: activeTheme.colors.surface,
              borderColor: activeTheme.colors.accent || activeTheme.colors.accentGold,
              opacity: disabled ? 0.5 : 1
            }
          ],
          onPress: () => !disabled && onSelectReply && onSelectReply(item),
          disabled: disabled,
          activeOpacity: 0.7
        },
        React.createElement(
          Text,
          {
            style: [
              styles.chipText,
              {
                color: activeTheme.colors.textPrimary,
                fontSize: activeTheme.typography.fontSizeSmall,
                fontFamily: activeTheme.typography.fontFamilyMedium || 'Archivo-Medium',
                letterSpacing: activeTheme.typography.letterSpacingBody ?? -0.2
              }
            ]
          },
          item.label
        )
      )
    )
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
    maxHeight: 44
  },
  contentContainer: {
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center'
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  chipText: {
    fontFamily: 'Archivo-Medium',
    fontWeight: '600'
  }
});

module.exports = { MyaQuickReplies };
