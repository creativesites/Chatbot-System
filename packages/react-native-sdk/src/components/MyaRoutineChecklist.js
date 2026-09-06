/**
 * MyaRoutineChecklist (JavaScript implementation)
 */

const React = require('react');
const { defaultMyaTheme } = require('./theme');
const { View, Text, TouchableOpacity, StyleSheet } = require('./nativePrimitives');

function renderStepItem(step, theme, onToggle) {
  const isChecked = Boolean(step.isCompleted);

  return React.createElement(
    TouchableOpacity,
    {
      key: step.id,
      style: [
        styles.stepItem,
        { borderBottomColor: theme.colors.border }
      ],
      onPress: () => onToggle && onToggle(step.id, !isChecked),
      activeOpacity: 0.7
    },
    React.createElement(
      View,
      {
        style: [
          styles.checkbox,
          {
            borderColor: isChecked ? theme.colors.accentGold : theme.colors.border,
            backgroundColor: isChecked ? theme.colors.accentGold : 'transparent'
          }
        ]
      },
      isChecked &&
        React.createElement(
          Text,
          { style: styles.checkmark },
          '✓'
        )
    ),
    React.createElement(
      View,
      { style: styles.stepDetails },
      React.createElement(
        View,
        { style: styles.stepHeaderRow },
        React.createElement(
          Text,
          {
            style: [
              styles.stepTitle,
              {
                color: isChecked ? theme.colors.textMuted : theme.colors.textPrimary,
                textDecorationLine: isChecked ? 'line-through' : 'none'
              }
            ]
          },
          step.title
        ),
        step.durationMinutes &&
          React.createElement(
            Text,
            { style: [styles.duration, { color: theme.colors.textMuted }] },
            `${step.durationMinutes}m`
          )
      ),
      step.description &&
        React.createElement(
          Text,
          { style: [styles.stepDesc, { color: theme.colors.textSecondary }] },
          step.description
        ),
      step.productRecommendation &&
        React.createElement(
          Text,
          { style: [styles.productTag, { color: theme.colors.accentGold }] },
          `✨ ${step.productRecommendation}`
        )
    )
  );
}

function MyaRoutineChecklist(props) {
  const { routine = {}, theme = {}, onToggleStep } = props;
  const activeTheme = { ...defaultMyaTheme, ...theme };
  const steps = routine.steps || [];
  const completedCount = steps.filter((s) => s.isCompleted).length;
  const progressPercent = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;

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
          { style: [styles.frequency, { color: activeTheme.colors.accentGold }] },
          (routine.frequency || 'Daily Hair Regimen').toUpperCase()
        ),
        React.createElement(
          Text,
          {
            style: [
              styles.title,
              {
                color: activeTheme.colors.textPrimary,
                fontSize: activeTheme.typography.fontSizeTitle
              }
            ]
          },
          routine.title || 'Personalized Hair Routine'
        )
      ),
      React.createElement(
        Text,
        { style: [styles.counter, { color: activeTheme.colors.textSecondary }] },
        `${completedCount}/${steps.length}`
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
            width: `${progressPercent}%`,
            backgroundColor: activeTheme.colors.accentGold
          }
        ]
      })
    ),
    React.createElement(
      View,
      { style: styles.stepsList },
      ...steps.map((step) => renderStepItem(step, activeTheme, onToggleStep))
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
    marginBottom: 8
  },
  frequency: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2
  },
  title: {
    fontWeight: '700'
  },
  counter: {
    fontSize: 14,
    fontWeight: '700'
  },
  progressBarBackground: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3
  },
  stepsList: {
    marginTop: 4
  },
  stepItem: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    alignItems: 'flex-start'
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800'
  },
  stepDetails: {
    flex: 1
  },
  stepHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1
  },
  duration: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 6
  },
  stepDesc: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16
  },
  productTag: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4
  }
});

module.exports = {
  MyaRoutineChecklist
};
