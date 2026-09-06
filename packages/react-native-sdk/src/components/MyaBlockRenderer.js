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
const { View } = require('./nativePrimitives');

function MyaBlockRenderer({
  block,
  theme,
  onPressAction,
  onSelectQuickReply,
  onToggleRoutineStep,
  onPressJournalEntry,
  onBookConsultation
}) {
  if (!block) return null;

  const blockType = block.block_type || block.type;
  const data = block.data || {};

  switch (blockType) {
    case 'hair_profile_summary':
    case 'strand_dna':
    case 'hair_profile':
      return React.createElement(MyaStrandCard, {
        strandData: data,
        theme: theme
      });

    case 'routine_card':
    case 'routine':
    case 'hair_routine':
      return React.createElement(MyaRoutineChecklist, {
        routine: data,
        theme: theme,
        onToggleStep: onToggleRoutineStep
      });

    case 'goal_card':
    case 'hair_goal':
      return React.createElement(MyaGoalCard, {
        goal: data,
        theme: theme,
        onPressUpdate: onPressAction ? () => onPressAction('update_goal', data) : undefined
      });

    case 'journal_entry':
    case 'hair_journal':
      return React.createElement(MyaJournalCard, {
        entry: data,
        theme: theme,
        onPressEntry: onPressJournalEntry
      });

    case 'consultation_card':
    case 'specialist':
    case 'book_specialist':
      return React.createElement(MyaConsultationCard, {
        specialist: data.specialist || data,
        bookingUrl: data.bookingUrl,
        theme: theme,
        onBookConsultation: onBookConsultation || (onPressAction ? (s) => onPressAction('book_consultation', s) : undefined)
      });

    case 'quick_replies':
      return React.createElement(MyaQuickReplies, {
        replies: data.replies || data,
        theme: theme,
        onSelectReply: onSelectQuickReply || ((r) => onPressAction && onPressAction('quick_reply', r))
      });

    default:
      return React.createElement(View, null);
  }
}

module.exports = { MyaBlockRenderer };
