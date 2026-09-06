/**
 * MyaFloatingTrigger
 *
 * Floating Action Button (FAB) launcher for the Mya AI concierge on mobile.
 * Positioned fixed/absolute at the bottom corner with MYAVANA gold branding.
 */

import React from 'react';
import { defaultMyaTheme, MyaTheme } from './theme';
import { StyleSheet, Text, TouchableOpacity, View } from './nativePrimitives';

export interface MyaFloatingTriggerProps {
  onPress: () => void;
  unreadCount?: number;
  theme?: Partial<MyaTheme>;
  position?: 'bottom-right' | 'bottom-left';
  label?: string;
}

export function MyaFloatingTrigger({
  onPress,
  unreadCount = 0,
  theme = {},
  position = 'bottom-right',
  label = 'M'
}: MyaFloatingTriggerProps) {
  const activeTheme = { ...defaultMyaTheme, ...theme };

  return React.createElement(
    TouchableOpacity,
    {
      style: [
        styles.trigger,
        position === 'bottom-left' ? styles.bottomLeft : styles.bottomRight,
        {
          backgroundColor: activeTheme.colors.primary,
          borderColor: activeTheme.colors.accentGold
        }
      ],
      onPress,
      activeOpacity: 0.85
    },
    React.createElement(
      Text,
      {
        style: [
          styles.triggerText,
          { color: activeTheme.colors.accentGold }
        ]
      },
      label
    ),
    unreadCount > 0 &&
      React.createElement(
        View,
        {
          style: [
            styles.badgeContainer,
            { backgroundColor: activeTheme.colors.error }
          ]
        },
        React.createElement(
          Text,
          { style: styles.badgeText },
          unreadCount > 9 ? '9+' : String(unreadCount)
        )
      )
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
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
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
    fontWeight: '800'
  }
});
