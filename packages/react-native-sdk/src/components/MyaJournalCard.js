/**
 * MyaJournalCard (CommonJS)
 */

const React = require('react');
const { defaultMyaTheme } = require('./theme');
const { StyleSheet, Text, TouchableOpacity, View } = require('./nativePrimitives');

function MyaJournalCard({ entry, theme = {}, onPressEntry }) {
  const activeTheme = Object.assign({}, defaultMyaTheme, theme);

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
          {
            style: [
              styles.badge,
              {
                color: activeTheme.colors.accent,
                fontFamily: activeTheme.typography.fontFamilyBold,
                letterSpacing: 1.2
              }
            ]
          },
          'HAIR JOURNAL LOG'
        ),
        React.createElement(
          Text,
          {
            style: [
              styles.dateText,
              {
                color: activeTheme.colors.textPrimary,
                fontFamily: activeTheme.typography.fontFamilyBold,
                fontSize: activeTheme.typography.fontSizeMedium
              }
            ]
          },
          (entry && entry.date) || 'Today'
        )
      ),
      entry && entry.mood
        ? React.createElement(
            View,
            {
              style: [
                styles.moodBadge,
                { backgroundColor: activeTheme.colors.surfaceElevated }
              ]
            },
            React.createElement(
              Text,
              {
                style: [
                  styles.moodText,
                  {
                    color: activeTheme.colors.textSecondary,
                    fontFamily: activeTheme.typography.fontFamilyMedium
                  }
                ]
              },
              `Mood: ${entry.mood}`
            )
          )
        : null
    ),
    // Wash Day Tag
    entry && entry.isWashDay
      ? React.createElement(
          View,
          { style: styles.tagRow },
          React.createElement(
            Text,
            {
              style: [
                styles.washDayTag,
                {
                  backgroundColor: activeTheme.colors.accentLight,
                  color: activeTheme.colors.primary,
                  fontFamily: activeTheme.typography.fontFamilyBold
                }
              ]
            },
            '✨ Wash Day Entry'
          )
        )
      : null,
    // Notes preview
    React.createElement(
      Text,
      {
        style: [
          styles.notesText,
          {
            color: activeTheme.colors.textSecondary,
            fontFamily: activeTheme.typography.fontFamilyRegular,
            fontSize: activeTheme.typography.fontSizeSmall
          }
        ],
        numberOfLines: 3
      },
      entry && entry.notes
    ),
    // Products used
    entry && entry.productsUsed && entry.productsUsed.length > 0
      ? React.createElement(
          Text,
          {
            style: [
              styles.productsText,
              {
                color: activeTheme.colors.textMuted,
                fontFamily: activeTheme.typography.fontFamilyMedium
              }
            ]
          },
          `Products: ${entry.productsUsed.join(', ')}`
        )
      : null,
    // View entry button
    onPressEntry && entry && entry.id
      ? React.createElement(
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
                {
                  color: activeTheme.colors.accent,
                  fontFamily: activeTheme.typography.fontFamilyBold
                }
              ]
            },
            'View Full Entry →'
          )
        )
      : null
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
    letterSpacing: 1.2,
    fontFamily: 'Archivo-Bold',
    marginBottom: 2
  },
  dateText: {
    fontWeight: '700',
    fontFamily: 'Archivo-Bold'
  },
  moodBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  moodText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Archivo-Medium'
  },
  tagRow: {
    marginVertical: 4
  },
  washDayTag: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Archivo-Bold',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start'
  },
  notesText: {
    marginTop: 6,
    lineHeight: 18,
    fontFamily: 'Archivo-Regular'
  },
  productsText: {
    fontSize: 11,
    fontFamily: 'Archivo-Medium',
    marginTop: 6
  },
  linkButton: {
    marginTop: 8,
    paddingVertical: 4
  },
  linkText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Archivo-Bold'
  }
});

module.exports = { MyaJournalCard };
