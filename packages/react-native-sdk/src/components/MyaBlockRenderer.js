/**
 * MyaBlockRenderer (CommonJS)
 */

const React = require('react');
const { MyaStrandCard } = require('./MyaStrandCard');
const { MyaRoutineChecklist } = require('./MyaRoutineChecklist');
const { MyaGoalCard } = require('./MyaGoalCard');
const { MyaJournalCard } = require('./MyaJournalCard');
const { MyaConsultationCard } = require('./MyaConsultationCard');
const { MyaQuickReplies } = require('./MyaQuickReplies');
const { MyaMediaCard } = require('./MyaMediaCard');
const { MyaProductCard } = require('./MyaProductCard');
const { defaultMyaTheme } = require('./theme');
const { StyleSheet, Text, View } = require('./nativePrimitives');

function MyaBlockRenderer({
  block,
  theme,
  onPressAction,
  onSelectQuickReply,
  onToggleRoutineStep,
  onPressJournalEntry,
  onBookConsultation,
  onPressMedia,
  onPressProduct,
  onFitRoutine
}) {
  if (!block) return null;

  const activeTheme = Object.assign({}, defaultMyaTheme, theme);
  const blockType = block.block_type || block.type;
  const data = block.data || {};

  switch (blockType) {
    case 'hair_profile_summary':
    case 'hair_profile_card':
    case 'profile_card':
    case 'strand_dna':
    case 'hair_profile':
      return React.createElement(MyaStrandCard, {
        strandData: data,
        theme: activeTheme
      });

    case 'today_checklist':
    case 'routine_checklist':
    case 'routine_card':
    case 'routine':
    case 'hair_routine':
      return React.createElement(MyaRoutineChecklist, {
        routine: data,
        theme: activeTheme,
        onToggleStep: onToggleRoutineStep || (onPressAction ? (stepId, nextVal) => onPressAction('toggle_routine_step', { stepId, isCompleted: nextVal, routine: data }) : undefined)
      });

    case 'goal_card':
    case 'goal_progress':
    case 'goal_list':
    case 'hair_goal':
      return React.createElement(MyaGoalCard, {
        goal: data,
        theme: activeTheme,
        onUpdateGoal: onPressAction ? () => onPressAction('update_goal', data) : undefined,
        onPressUpdate: onPressAction ? () => onPressAction('update_goal', data) : undefined
      });

    case 'product':
    case 'product_card':
    case 'product_list':
      return React.createElement(MyaProductCard, {
        product: data,
        theme: activeTheme,
        onPressProduct: onPressProduct || (onPressAction ? (p) => onPressAction('view_product', p) : undefined),
        onFitRoutine: onFitRoutine || (onPressAction ? (p) => onPressAction('fit_into_routine', p) : undefined),
        onPressAction: onPressAction
      });

    case 'journal_entry':
    case 'journey_progress':
    case 'hair_journal':
      return React.createElement(MyaJournalCard, {
        entry: data,
        theme: activeTheme,
        onPressEntry: onPressJournalEntry || (onPressAction ? () => onPressAction('view_journal_entry', data) : undefined)
      });

    case 'consultation_card':
    case 'service_card':
    case 'specialist':
    case 'book_specialist':
      return React.createElement(MyaConsultationCard, {
        specialist: data.specialist || data,
        bookingUrl: data.bookingUrl,
        theme: activeTheme,
        onBookConsultation: onBookConsultation || (onPressAction ? (s) => onPressAction('book_consultation', s) : undefined)
      });

    case 'media_card':
    case 'hairstyle_card':
    case 'hair_media':
      return React.createElement(MyaMediaCard, {
        media: data,
        theme: activeTheme,
        onPressAction: onPressAction,
        onPressMedia: onPressMedia || (onPressAction ? (m) => onPressAction('view_media', m) : undefined)
      });

    case 'quick_replies':
      return React.createElement(MyaQuickReplies, {
        replies: data.replies || data,
        theme: activeTheme,
        onSelectReply: onSelectQuickReply || ((r) => onPressAction && onPressAction('quick_reply', r))
      });

    default: {
      const title = data.title || data.heading || data.name || data.label;
      const text = data.text || data.summary || data.description || data.notes;
      if (title || text) {
        return React.createElement(
          View,
          {
            style: [
              styles.fallbackCard,
              {
                backgroundColor: activeTheme.colors.surface,
                borderColor: activeTheme.colors.border
              }
            ]
          },
          title
            ? React.createElement(
                Text,
                {
                  style: [
                    styles.fallbackTitle,
                    {
                      color: activeTheme.colors.textPrimary,
                      fontFamily: activeTheme.typography.fontFamilyBold || 'Archivo-Bold'
                    }
                  ]
                },
                String(title)
              )
            : null,
          text
            ? React.createElement(
                Text,
                {
                  style: [
                    styles.fallbackText,
                    {
                      color: activeTheme.colors.textSecondary,
                      fontFamily: activeTheme.typography.fontFamilyRegular || 'Archivo-Regular'
                    }
                  ]
                },
                String(text)
              )
            : null
        );
      }
      return React.createElement(View, null);
    }
  }
}

const styles = StyleSheet.create({
  fallbackCard: {
    marginVertical: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1
  },
  fallbackTitle: {
    fontSize: 14,
    marginBottom: 4
  },
  fallbackText: {
    fontSize: 12.5,
    lineHeight: 18
  }
});

module.exports = { MyaBlockRenderer };
