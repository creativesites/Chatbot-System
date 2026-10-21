/**
 * MyaConsultationCard (CommonJS)
 */

const React = require('react');
const { defaultMyaTheme } = require('./theme');
const { StyleSheet, Text, TouchableOpacity, View } = require('./nativePrimitives');

function MyaConsultationCard({
  specialist = {},
  bookingUrl,
  theme = {},
  onBookConsultation
}) {
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
    // Header Tag
    React.createElement(
      View,
      { style: styles.tagRow },
      React.createElement(
        Text,
        {
          style: [
            styles.badge,
            {
              backgroundColor: activeTheme.colors.accentLight || activeTheme.colors.accentGoldLight,
              color: activeTheme.colors.primary,
              fontFamily: activeTheme.typography.fontFamilyBold || 'Archivo-Bold'
            }
          ]
        },
        '🔬 CERTIFIED SPECIALIST'
      ),
      specialist.rating
        ? React.createElement(
            Text,
            {
              style: [
                styles.ratingText,
                {
                  color: activeTheme.colors.accent || activeTheme.colors.accentGold,
                  fontFamily: activeTheme.typography.fontFamilyBold || 'Archivo-Bold'
                }
              ]
            },
            `★ ${Number(specialist.rating).toFixed(1)}`
          )
        : null
    ),
    // Specialist Details
    React.createElement(
      View,
      { style: styles.profileContainer },
      React.createElement(
        Text,
        {
          style: [
            styles.nameText,
            {
              color: activeTheme.colors.textPrimary,
              fontSize: activeTheme.typography.fontSizeLarge,
              fontFamily: activeTheme.typography.fontFamilyBold || 'Archivo-Bold',
              letterSpacing: activeTheme.typography.letterSpacingHeading ?? -0.3
            }
          ]
        },
        specialist.name || 'Hair Specialist'
      ),
      React.createElement(
        Text,
        {
          style: [
            styles.titleText,
            {
              color: activeTheme.colors.textSecondary,
              fontSize: activeTheme.typography.fontSizeSmall,
              fontFamily: activeTheme.typography.fontFamilyRegular || 'Archivo-Regular'
            }
          ]
        },
        specialist.title || 'Trichology Consultant'
      )
    ),
    // Specialties list
    specialist.specialties && specialist.specialties.length > 0
      ? React.createElement(
          View,
          { style: styles.specialtiesWrap },
          specialist.specialties.map((item, idx) =>
            React.createElement(
              View,
              {
                key: idx,
                style: [
                  styles.specialtyChip,
                  { backgroundColor: activeTheme.colors.surfaceElevated }
                ]
              },
              React.createElement(
                Text,
                {
                  style: [
                    styles.specialtyText,
                    {
                      color: activeTheme.colors.textSecondary,
                      fontFamily: activeTheme.typography.fontFamilyMedium || 'Archivo-Medium'
                    }
                  ]
                },
                item
              )
            )
          )
        )
      : null,
    // Available slot
    specialist.availableSlot
      ? React.createElement(
          Text,
          {
            style: [
              styles.slotText,
              {
                color: activeTheme.colors.textMuted,
                fontFamily: activeTheme.typography.fontFamilyRegular || 'Archivo-Regular'
              }
            ]
          },
          `Next available: ${specialist.availableSlot}`
        )
      : null,
    // Action CTA
    React.createElement(
      TouchableOpacity,
      {
        style: [
          styles.actionButton,
          { backgroundColor: activeTheme.colors.primary }
        ],
        onPress: () => onBookConsultation && onBookConsultation(specialist),
        activeOpacity: 0.8
      },
      React.createElement(
        Text,
        {
          style: [
            styles.actionButtonText,
            {
              color: '#FFFFFF',
              fontFamily: activeTheme.typography.fontFamilyBold || 'Archivo-Bold'
            }
          ]
        },
        'Book 1:1 Hair Consultation'
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
  tagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  badge: {
    fontSize: 10,
    fontFamily: 'Archivo-Bold',
    fontWeight: '800',
    letterSpacing: 0.8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  ratingText: {
    fontFamily: 'Archivo-Bold',
    fontWeight: '700',
    fontSize: 12
  },
  profileContainer: {
    marginBottom: 8
  },
  nameText: {
    fontFamily: 'Archivo-Bold',
    fontWeight: '700'
  },
  titleText: {
    fontFamily: 'Archivo-Regular',
    marginTop: 2
  },
  specialtiesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8
  },
  specialtyChip: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 6,
    marginBottom: 6
  },
  specialtyText: {
    fontSize: 11,
    fontFamily: 'Archivo-Medium',
    fontWeight: '600'
  },
  slotText: {
    fontSize: 12,
    fontFamily: 'Archivo-Regular',
    marginBottom: 12,
    fontStyle: 'italic'
  },
  actionButton: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  actionButtonText: {
    fontFamily: 'Archivo-Bold',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.3
  }
});

module.exports = { MyaConsultationCard };
