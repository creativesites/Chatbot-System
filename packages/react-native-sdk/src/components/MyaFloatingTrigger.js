/**
 * MyaFloatingTrigger (CommonJS)
 */

const React = require('react');
const { defaultMyaTheme } = require('./theme');
const { StyleSheet, Text, TouchableOpacity, View } = require('./nativePrimitives');

function MyaFloatingTrigger({
  onPress,
  unreadCount = 0,
  theme = {},
  position = 'bottom-right',
  label = 'M'
}) {
  const activeTheme = Object.assign({}, defaultMyaTheme, theme);

  return React.createElement(
    TouchableOpacity,
    {
      style: [
        styles.trigger,
        position === 'bottom-left' ? styles.bottomLeft : styles.bottomRight,
        {
          backgroundColor: activeTheme.colors.primary,
          borderColor: activeTheme.colors.accent || 'rgba(231, 166, 144, 0.4)'
        }
      ],
      onPress: onPress,
      activeOpacity: 0.85
    },
    React.createElement(
      Text,
      {
        style: [
          styles.triggerText,
          {
            color: activeTheme.colors.accent || activeTheme.colors.accentGold,
            fontFamily: activeTheme.typography.fontFamilyBold || 'Archivo-Bold'
          }
        ]
      },
      label
    ),
    unreadCount > 0
      ? React.createElement(
          View,
          {
            style: [
              styles.badgeContainer,
              { backgroundColor: activeTheme.colors.accent || activeTheme.colors.error }
            ]
          },
          React.createElement(
            Text,
            { style: styles.badgeText },
            unreadCount > 9 ? '9+' : String(unreadCount)
          )
        )
      : null
  );
}

const styles = StyleSheet.create({
  trigger: {
    position: 'absolute',
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 999
  },
  bottomRight: {
    right: 20
  },
  bottomLeft: {
    left: 20
  },
  triggerText: {
    fontSize: 22,
    fontFamily: 'Archivo-Bold',
    fontWeight: '800'
  },
  badgeContainer: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'Archivo-Bold',
    fontWeight: '800'
  }
});

module.exports = { MyaFloatingTrigger };
