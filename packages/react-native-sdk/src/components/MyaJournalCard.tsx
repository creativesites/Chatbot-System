/**
 * MyaJournalCard
 *
 * Themeable mobile Hair Journal entry preview card.
 * Displays date, mood indicator, washday tag, journal notes, and photo thumbnail.
 */

import React from 'react';
import { defaultMyaTheme, MyaTheme } from './theme';
import { StyleSheet, Text, TouchableOpacity, View } from './nativePrimitives';

export interface HairJournalEntryData {
  id: string;
  date: string;
  mood?: string;
  notes: string;
  isWashDay?: boolean;
  productsUsed?: string[];
  photoUrl?: string;
}

export interface MyaJournalCardProps {
  entry: HairJournalEntryData;
  theme?: Partial<MyaTheme>;
  onPressEntry?: (entryId: string) => void;
}

export function MyaJournalCard({ entry, theme = {}, onPressEntry }: MyaJournalCardProps) {
  const activeTheme = { ...defaultMyaTheme, ...theme };

  return React.createElement(
    View,
    {
      style: [
        styles.card,
        {
          backgroundColor: activeTheme.colors.surface,
          borderColor: activeTheme.colors.border
        }
      ]
    },
    // Header
    React.createElement(
      View,
      { style: styles.headerRow },
      React.createElement(
        View,
        null,
        React.createElement(
          Text,
          { style: [styles.badge, { color: activeTheme.colors.accentGold }] },
          'HAIR JOURNAL LOG'
        ),
        React.createElement(
          Text,
          {
            style: [
              styles.dateText,
              {
                color: activeTheme.colors.textPrimary,
                fontSize: activeTheme.typography.fontSizeMedium
              }
            ]
          },
          entry.date || 'Today'
        )
      ),
      entry.mood &&
        React.createElement(
          View,
          {
            style: [
              styles.moodBadge,
              { backgroundColor: activeTheme.colors.surfaceElevated }
            ]
          },
          React.createElement(
            Text,
            { style: [styles.moodText, { color: activeTheme.colors.textSecondary }] },
            `Mood: ${entry.mood}`
          )
        )
    ),
    // Wash Day Tag
    entry.isWashDay &&
      React.createElement(
        View,
        { style: styles.tagRow },
        React.createElement(
          Text,
          {
            style: [
              styles.washDayTag,
              {
                backgroundColor: activeTheme.colors.accentGoldLight,
                color: activeTheme.colors.primary
              }
            ]
          },
          '✨ Wash Day Entry'
        )
      ),
    // Notes preview
    React.createElement(
      Text,
      {
        style: [
          styles.notesText,
          {
            color: activeTheme.colors.textSecondary,
            fontSize: activeTheme.typography.fontSizeSmall
          }
        ],
        numberOfLines: 3
      },
      entry.notes
    ),
    // Products used
    entry.productsUsed && entry.productsUsed.length > 0 &&
      React.createElement(
        Text,
        {
          style: [
            styles.productsText,
            { color: activeTheme.colors.textMuted }
          ]
        },
        `Products: ${entry.productsUsed.join(', ')}`
      ),
    // View entry button
    onPressEntry &&
      React.createElement(
        TouchableOpacity,
        {
          style: [styles.linkButton],
          onPress: () => onPressEntry(entry.id),
          activeOpacity: 0.7
        },
        React.createElement(
          Text,
          {
            style: [
              styles.linkText,
              { color: activeTheme.colors.accentGold }
            ]
          },
          'View Full Entry →'
        )
      )
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  badge: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2
  },
  dateText: {
    fontWeight: '700'
  },
  moodBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  moodText: {
    fontSize: 11,
    fontWeight: '600'
  },
  tagRow: {
    marginVertical: 4
  },
  washDayTag: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start'
  },
  notesText: {
    marginTop: 6,
    lineHeight: 18
  },
  productsText: {
    fontSize: 11,
    marginTop: 6
  },
  linkButton: {
    marginTop: 8,
    paddingVertical: 4
  },
  linkText: {
    fontSize: 12,
    fontWeight: '700'
  }
});
