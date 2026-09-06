/**
 * MyaConsultationCard
 *
 * Themeable card for booking or reviewing a 1:1 consultation with a
 * certified MYAVANA Hair Specialist / Trichologist.
 */
import React from 'react';
import { defaultMyaTheme } from './theme';
import { StyleSheet, Text, TouchableOpacity, View } from './nativePrimitives';
export function MyaConsultationCard({ specialist, bookingUrl, theme = {}, onBookConsultation }) {
    const activeTheme = { ...defaultMyaTheme, ...theme };
    return React.createElement(View, {
        style: [
            styles.card,
            {
                backgroundColor: activeTheme.colors.surface,
                borderColor: activeTheme.colors.border
            }
        ]
    }, 
    // Header Tag
    React.createElement(View, { style: styles.tagRow }, React.createElement(Text, {
        style: [
            styles.badge,
            {
                backgroundColor: activeTheme.colors.accentGoldLight,
                color: activeTheme.colors.primary
            }
        ]
    }, '🔬 CERTIFIED SPECIALIST'), specialist.rating &&
        React.createElement(Text, { style: [styles.ratingText, { color: activeTheme.colors.accentGold }] }, `★ ${specialist.rating.toFixed(1)}`)), 
    // Specialist Details
    React.createElement(View, { style: styles.profileContainer }, React.createElement(Text, {
        style: [
            styles.nameText,
            {
                color: activeTheme.colors.textPrimary,
                fontSize: activeTheme.typography.fontSizeLarge
            }
        ]
    }, specialist.name), React.createElement(Text, {
        style: [
            styles.titleText,
            {
                color: activeTheme.colors.textSecondary,
                fontSize: activeTheme.typography.fontSizeSmall
            }
        ]
    }, specialist.title)), 
    // Specialties list
    specialist.specialties && specialist.specialties.length > 0 &&
        React.createElement(View, { style: styles.specialtiesWrap }, specialist.specialties.map((item, idx) => React.createElement(View, {
            key: idx,
            style: [
                styles.specialtyChip,
                { backgroundColor: activeTheme.colors.surfaceElevated }
            ]
        }, React.createElement(Text, {
            style: [
                styles.specialtyText,
                { color: activeTheme.colors.textSecondary }
            ]
        }, item)))), 
    // Available slot
    specialist.availableSlot &&
        React.createElement(Text, {
            style: [
                styles.slotText,
                { color: activeTheme.colors.textMuted }
            ]
        }, `Next available: ${specialist.availableSlot}`), 
    // Action CTA
    React.createElement(TouchableOpacity, {
        style: [
            styles.actionButton,
            { backgroundColor: activeTheme.colors.primary }
        ],
        onPress: () => onBookConsultation && onBookConsultation(specialist),
        activeOpacity: 0.8
    }, React.createElement(Text, {
        style: [
            styles.actionButtonText,
            { color: activeTheme.colors.accentGold }
        ]
    }, 'Book 1:1 Hair Consultation')));
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
        fontWeight: '800',
        letterSpacing: 0.8,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6
    },
    ratingText: {
        fontWeight: '700',
        fontSize: 12
    },
    profileContainer: {
        marginBottom: 8
    },
    nameText: {
        fontWeight: '700'
    },
    titleText: {
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
        fontWeight: '600'
    },
    slotText: {
        fontSize: 12,
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
        fontWeight: '700',
        fontSize: 13,
        letterSpacing: 0.3
    }
});
//# sourceMappingURL=MyaConsultationCard.js.map