/**
 * MyaQuickReplies
 *
 * Horizontal scrolling quick replies / action suggestions tray for mobile.
 */

import React from 'react';
import { defaultMyaTheme, MyaTheme } from './theme';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from './nativePrimitives';

export interface QuickReplyItem {
  id?: string;
  label: string;
  payload?: string;
}

export interface MyaQuickRepliesProps {
  replies: (QuickReplyItem | string)[];
  theme?: Partial<MyaTheme>;
  onSelectReply: (reply: QuickReplyItem) => void;
  disabled?: boolean;
}

export function MyaQuickReplies({
  replies,
  theme = {},
  onSelectReply,
  disabled = false
}: MyaQuickRepliesProps) {
  if (!replies || replies.length === 0) return null;

  const activeTheme = { ...defaultMyaTheme, ...theme };

  const normalizedReplies: QuickReplyItem[] = replies.map((r, idx) => {
    if (typeof r === 'string') {
      return { id: `qr-${idx}`, label: r, payload: r };
    }
    return { id: r.id || `qr-${idx}`, label: r.label, payload: r.payload || r.label };
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
              borderColor: activeTheme.colors.accentGold,
              opacity: disabled ? 0.5 : 1
            }
          ],
          onPress: () => !disabled && onSelectReply(item),
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
                fontSize: activeTheme.typography.fontSizeSmall
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
    fontWeight: '600'
  }
});
