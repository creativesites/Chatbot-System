/**
 * MyaRoutineChecklist (JavaScript implementation)
 */

const React = require('react');
const { defaultMyaTheme } = require('./theme');
const { View, Text, TouchableOpacity, StyleSheet } = require('./nativePrimitives');

function renderStepItem(step, idx, theme, isChecked, onToggle) {
  const stepObj = typeof step === 'string' ? { id: `step-${idx}`, title: step } : step;
  const stepId = stepObj.id || `step-${idx}`;
  const title = stepObj.title || stepObj.text || stepObj.name || `Step ${idx + 1}`;

  return React.createElement(
    TouchableOpacity,
    {
      key: stepId,
      style: [
        styles.stepItem,
        { borderBottomColor: theme.colors.border }
      ],
      onPress: () => onToggle && onToggle(stepId, !isChecked),
      activeOpacity: 0.7,
      accessibilityRole: 'checkbox',
      accessibilityState: { checked: isChecked },
      accessibilityLabel: `${title}${isChecked ? ', completed' : ''}`
    },
    React.createElement(
      View,
      {
        style: [
          styles.checkbox,
          {
            borderColor: isChecked ? (theme.colors.accent || theme.colors.accentGold) : theme.colors.border,
            backgroundColor: isChecked ? (theme.colors.accent || theme.colors.accentGold) : 'transparent'
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
                textDecorationLine: isChecked ? 'line-through' : 'none',
                fontFamily: theme.typography.fontFamilyMedium || 'Archivo-Medium'
              }
            ]
          },
          title
        ),
        stepObj.durationMinutes &&
          React.createElement(
            Text,
            {
              style: [
                styles.duration,
                {
                  color: theme.colors.textMuted,
                  fontFamily: theme.typography.fontFamilyRegular || 'Archivo-Regular'
                }
              ]
            },
            `${stepObj.durationMinutes}m`
          )
      ),
      stepObj.description &&
        React.createElement(
          Text,
          {
            style: [
              styles.stepDesc,
              {
                color: theme.colors.textSecondary,
                fontFamily: theme.typography.fontFamilyRegular || 'Archivo-Regular'
              }
            ]
          },
          stepObj.description
        ),
      stepObj.productRecommendation &&
        React.createElement(
          Text,
          {
            style: [
              styles.productTag,
              {
                color: theme.colors.accent || theme.colors.accentGold,
                fontFamily: theme.typography.fontFamilyMedium || 'Archivo-Medium'
              }
            ]
          },
          `✨ ${stepObj.productRecommendation}`
        )
    )
  );
}

function MyaRoutineChecklist(props) {
  const { routine = {}, theme = {}, onToggleStep } = props;
  const activeTheme = { ...defaultMyaTheme, ...theme };
  const rawSteps = routine.steps || routine.items || [];
  
  // Optimistic local state
  const [completedMap, setCompletedMap] = React.useState(() => {
    const map = {};
    rawSteps.forEach((s, idx) => {
      const id = (typeof s === 'object' && s.id) || `step-${idx}`;
      if (typeof s === 'object' && (s.isCompleted || s.completed)) {
        map[id] = true;
      }
    });
    return map;
  });

  const handleToggle = (stepId, nextVal) => {
    setCompletedMap((prev) => ({
      ...prev,
      [stepId]: nextVal
    }));
    if (onToggleStep) {
      onToggleStep(stepId, nextVal);
    }
  };

  const completedCount = rawSteps.filter((s, idx) => {
    const id = (typeof s === 'object' && s.id) || `step-${idx}`;
    return Boolean(completedMap[id]);
  }).length;
  const progressPercent = rawSteps.length > 0 ? Math.round((completedCount / rawSteps.length) * 100) : 0;

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
              styles.frequency,
              {
                color: activeTheme.colors.accent || activeTheme.colors.accentGold,
                fontFamily: activeTheme.typography.fontFamilyBold || 'Archivo-Bold'
              }
            ]
          },
          (routine.frequency || 'Daily Hair Regimen').toUpperCase()
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
          routine.title || 'Personalized Hair Routine'
        )
      ),
      React.createElement(
        Text,
        {
          style: [
            styles.counter,
            {
              color: activeTheme.colors.textSecondary,
              fontFamily: activeTheme.typography.fontFamilyBold || 'Archivo-Bold'
            }
          ]
        },
        `${completedCount}/${rawSteps.length}`
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
            backgroundColor: activeTheme.colors.accent || activeTheme.colors.accentGold
          }
        ]
      })
    ),
    React.createElement(
      View,
      { style: styles.stepsList },
      rawSteps.map((step, idx) => {
        const id = (typeof step === 'object' && step.id) || `step-${idx}`;
        return renderStepItem(step, idx, activeTheme, Boolean(completedMap[id]), handleToggle);
      })
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
    fontFamily: 'Archivo-Bold',
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2
  },
  title: {
    fontFamily: 'Archivo-Bold',
    fontWeight: '700'
  },
  counter: {
    fontSize: 14,
    fontFamily: 'Archivo-Bold',
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
    fontFamily: 'Archivo-Bold',
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
    fontFamily: 'Archivo-Medium',
    fontWeight: '600',
    flex: 1
  },
  duration: {
    fontSize: 11,
    fontFamily: 'Archivo-Medium',
    fontWeight: '600',
    marginLeft: 6
  },
  stepDesc: {
    fontSize: 12,
    fontFamily: 'Archivo-Regular',
    marginTop: 2,
    lineHeight: 16
  },
  productTag: {
    fontSize: 11,
    fontFamily: 'Archivo-Medium',
    fontWeight: '600',
    marginTop: 4
  }
});

module.exports = {
  MyaRoutineChecklist
};
