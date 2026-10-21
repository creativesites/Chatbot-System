/**
 * MyaGoalCard (JavaScript implementation)
 */

const React = require('react');
const { defaultMyaTheme } = require('./theme');
const { View, Text, TouchableOpacity, StyleSheet } = require('./nativePrimitives');

function MyaGoalCard(props) {
  const { goal = {}, theme = {}, onUpdateGoal, onPressUpdate } = props;
  const handleUpdate = onUpdateGoal || onPressUpdate;
  const activeTheme = { ...defaultMyaTheme, ...theme };
  const progress = Math.min(100, Math.max(0, goal.progressPercent ?? 45));

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
              styles.categoryBadge,
              {
                color: activeTheme.colors.accent || activeTheme.colors.accentGold,
                fontFamily: activeTheme.typography.fontFamilyBold || 'Archivo-Bold'
              }
            ]
          },
          (goal.category || 'HAIR GOAL').toUpperCase()
        ),
        React.createElement(
          Text,
          {
            style: [
              styles.title,
              {
                color: activeTheme.colors.textPrimary,
                fontSize: activeTheme.typography.fontSizeTitle,
                fontFamily: activeTheme.typography.fontFamilyBold || 'Archivo-Bold',
                letterSpacing: activeTheme.typography.letterSpacingHeading ?? -0.3
              }
            ]
          },
          goal.title || 'Hair Growth Goal'
        )
      ),
      React.createElement(
        View,
        {
          style: [
            styles.percentTag,
            { backgroundColor: activeTheme.colors.surfaceElevated }
          ]
        },
        React.createElement(
          Text,
          {
            style: [
              styles.percentText,
              {
                color: activeTheme.colors.accent || activeTheme.colors.accentGold,
                fontFamily: activeTheme.typography.fontFamilyBold || 'Archivo-Bold'
              }
            ]
          },
          `${progress}%`
        )
      )
    ),
    React.createElement(
      View,
      {
        style: [
          styles.progressBarBackground,
          { backgroundColor: activeTheme.colors.surfaceElevated }
        ]
      },
      React.createElement(View, {
        style: [
          styles.progressBarFill,
          {
            width: `${progress}%`,
            backgroundColor: goal.isCompleted
              ? activeTheme.colors.success
              : (activeTheme.colors.accent || activeTheme.colors.accentGold)
          }
        ]
      })
    ),
    React.createElement(
      View,
      { style: styles.infoRow },
      goal.currentMilestone &&
        React.createElement(
          Text,
          {
            style: [
              styles.milestoneText,
              {
                color: activeTheme.colors.textSecondary,
                fontFamily: activeTheme.typography.fontFamilyMedium || 'Archivo-Medium'
              }
            ]
          },
          `🎯 ${goal.currentMilestone}`
        ),
      goal.targetDate &&
        React.createElement(
          Text,
          {
            style: [
              styles.dateText,
              {
                color: activeTheme.colors.textMuted,
                fontFamily: activeTheme.typography.fontFamilyRegular || 'Archivo-Regular'
              }
            ]
          },
          `Target: ${goal.targetDate}`
        )
    ),
    handleUpdate &&
      React.createElement(
        TouchableOpacity,
        {
          style: [
            styles.actionButton,
            {
              backgroundColor: activeTheme.colors.surfaceElevated,
              borderColor: activeTheme.colors.border
            }
          ],
          onPress: () => handleUpdate(goal.id || goal),
          activeOpacity: 0.7
        },
        React.createElement(
          Text,
          {
            style: [
              styles.actionButtonText,
              {
                color: activeTheme.colors.textPrimary,
                fontFamily: activeTheme.typography.fontFamilyMedium || 'Archivo-Medium'
              }
            ]
          },
          'Update Goal Progress'
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
    alignItems: 'flex-start',
    marginBottom: 10
  },
  categoryBadge: {
    fontSize: 10,
    fontFamily: 'Archivo-Bold',
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4
  },
  title: {
    fontFamily: 'Archivo-Bold',
    fontWeight: '700'
  },
  percentTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  percentText: {
    fontSize: 13,
    fontFamily: 'Archivo-Bold',
    fontWeight: '800'
  },
  progressBarBackground: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  milestoneText: {
    fontSize: 12,
    fontFamily: 'Archivo-Medium',
    fontWeight: '500'
  },
  dateText: {
    fontSize: 11,
    fontFamily: 'Archivo-Regular'
  },
  actionButton: {
    marginTop: 12,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1
  },
  actionButtonText: {
    fontSize: 12,
    fontFamily: 'Archivo-Medium',
    fontWeight: '600'
  }
});

module.exports = {
  MyaGoalCard
};
