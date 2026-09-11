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
const mediaCard = require('./MyaMediaCard');

// Note: `./nativePrimitives` is a headless-safe RN loader for internal use by
// the components above (MyaChatBubble, MyaStrandCard, etc.). It is
// deliberately NOT spread into these exports — doing so previously leaked
// View/Text/TextInput/StyleSheet/Platform/FlatList onto the public package
// root (`require('@myavana/react-native-sdk').View`), a namespace collision
// risk for anything that isn't actually part of this SDK's public API.

module.exports = {
  ...theme,
  ...chatBubble,
  ...strandCard,
  ...routineChecklist,
  ...goalCard,
  ...journalCard,
  ...consultationCard,
  ...mediaCard,
  ...quickReplies,
  ...blockRenderer,
  ...chatView,
  ...floatingTrigger
};
