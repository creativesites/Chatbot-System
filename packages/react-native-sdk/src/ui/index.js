/**
 * @myavana/react-native-sdk/ui: the Mya conversation UI.
 *
 * Kept out of the headless entry (`src/index.js`) so the client, hook and
 * protocol code stay importable without react-native in tests and tooling.
 */

import MyaChat from './MyaChat';
import MyaComposer from './MyaComposer';
import MyaMessageRow, { ErrorRow } from './MyaMessageRow';
import MyaMarkdown from './MyaMarkdown';
import MyaWelcome from './MyaWelcome';
import MyaThinkingDots from './MyaThinkingDots';
import MyaSheet from './MyaSheet';
import MyaHistorySheet from './MyaHistorySheet';
import MyaAvatar from './MyaAvatar';
import useMyaKeyboard, { useKeyboardMarginStyle } from './useMyaKeyboard';
import MyaPresence from './MyaPresence';
import MyaPressable from './MyaPressable';
import MyaPetals from './MyaPetals';
import { MyaCapabilitiesProvider, useMyaCapabilities, useHaptics } from './capabilities';
import { MyaSprings, MyaDurations } from './motion/tokens';
import { useMotion } from './motion/useMotion';
import MyaRichBlock from './rich/MyaRichBlock';
import { MyaThemeProvider, useMyaTheme, MYAVANA_THEME } from './MyaThemeProvider';
import { MyaColors, MyaFonts, MyaType, MyaRadii, MyaMotion, MyaShadow, MYA_TOUCH } from './myaTheme';
import {
  BlockType as UiBlockType,
  registerComponent,
  registerComponents,
  resolveComponent,
  registeredTypes,
  isSuppressedType,
  SUPPRESSED_TYPES,
} from './rich/registry';

export {
  MyaChat,
  MyaComposer,
  MyaMessageRow,
  ErrorRow,
  MyaMarkdown,
  MyaWelcome,
  MyaThinkingDots,
  MyaSheet,
  MyaHistorySheet,
  MyaAvatar,
  useMyaKeyboard,
  useKeyboardMarginStyle,
  MyaPresence,
  MyaPressable,
  MyaPetals,
  MyaCapabilitiesProvider,
  useMyaCapabilities,
  useHaptics,
  MyaSprings,
  MyaDurations,
  useMotion,
  MyaRichBlock,
  MyaThemeProvider,
  useMyaTheme,
  MYAVANA_THEME,
  MyaColors,
  MyaFonts,
  MyaType,
  MyaRadii,
  MyaMotion,
  MyaShadow,
  MYA_TOUCH,
  UiBlockType,
  registerComponent,
  registerComponents,
  resolveComponent,
  registeredTypes,
  isSuppressedType,
  SUPPRESSED_TYPES,
};
