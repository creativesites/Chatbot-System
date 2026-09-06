const theme = require('./theme');
const chatBubble = require('./MyaChatBubble');
const strandCard = require('./MyaStrandCard');
const routineChecklist = require('./MyaRoutineChecklist');
const goalCard = require('./MyaGoalCard');
const journalCard = require('./MyaJournalCard');
const consultationCard = require('./MyaConsultationCard');
const quickReplies = require('./MyaQuickReplies');
const blockRenderer = require('./MyaBlockRenderer');
const chatView = require('./MyaChatView');
const floatingTrigger = require('./MyaFloatingTrigger');
const nativePrimitives = require('./nativePrimitives');

module.exports = {
  ...theme,
  ...chatBubble,
  ...strandCard,
  ...routineChecklist,
  ...goalCard,
  ...journalCard,
  ...consultationCard,
  ...quickReplies,
  ...blockRenderer,
  ...chatView,
  ...floatingTrigger,
  ...nativePrimitives
};
