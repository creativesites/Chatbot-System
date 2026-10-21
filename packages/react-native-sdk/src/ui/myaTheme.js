/**
 * Mya design tokens.
 *
 * Restyled per Candace's brand direction (2026-09): clean white ground and
 * the app's existing Archivo family, so Mya reads as part of MYAVANA rather
 * than a separate product. Bubble/accent colours are unchanged — they were
 * already sampled from src/constants/colors.js (Secondary, Primary, peach).
 */

import { moderateScale } from './scale';

export const MyaColors = {
  // Official MYAVANA Brand Colors (Dec 2024 Guidelines)
  brandOnyx: '#222323',
  brandStone: '#F5F5F7',
  brandWhite: '#FFFFFF',
  brandSand: '#EEECE1',
  brandCoral: '#E7A690',
  brandBlush: '#FCE5D7',
  brandBlueberry: '#4A4D68',

  // Ground and surfaces
  sand: '#FFFFFF',        // the chat ground — clean white, matches app shell
  surfaceSand: '#EEECE1', // warm foundation
  stone: '#F5F5F7',       // neutral surface
  ivory: '#FFFFFF',       // assistant bubbles, composer, sheets
  onyx: '#222323',        // primary dark / copy ground

  // Identity & Accents
  coral: '#E7A690',       // signature accent
  blush: '#FCE5D7',       // secondary soft accent (Blush)
  blueberry: '#4A4D68',   // primary brand accent (Blueberry)
  berry: '#4A4D68',       // mapped to Blueberry to eliminate brown everywhere

  // Derived alphas (design uses these exact values)
  ink90: 'rgba(34,35,35,.9)',
  ink70: 'rgba(34,35,35,.7)',
  ink58: 'rgba(34,35,35,.58)',
  ink56: 'rgba(34,35,35,.56)',
  ink55: 'rgba(34,35,35,.55)',
  ink50: 'rgba(34,35,35,.5)',
  ink45: 'rgba(34,35,35,.45)',
  ink42: 'rgba(34,35,35,.42)',
  ink40: 'rgba(34,35,35,.4)',
  ink32: 'rgba(34,35,35,.32)',
  ink26: 'rgba(34,35,35,.26)',
  ink16: 'rgba(34,35,35,.16)',
  ink13: 'rgba(34,35,35,.13)',   // disabled send
  ink09: 'rgba(34,35,35,.09)',
  ink07: 'rgba(34,35,35,.07)',
  ink06: 'rgba(34,35,35,.06)',
  ink05: 'rgba(34,35,35,.05)',

  // Blueberry alphas (replacing legacy brown 123,81,81)
  blueberryTint: 'rgba(74,77,104,.08)',
  blueberryLine: 'rgba(74,77,104,.22)',
  blueberrySoft: 'rgba(74,77,104,.14)',
  berryTint: 'rgba(74,77,104,.08)',
  berryLine: 'rgba(74,77,104,.22)',
  berrySoft: 'rgba(74,77,104,.14)',

  coralTint: 'rgba(231,166,144,.12)',
  coralLine: 'rgba(231,166,144,.32)',

  scrim: 'rgba(34,35,35,.34)',        // behind bottom sheets
};

/**
 * Archivo — the app's official typeface per Dec 2024 Brand Guidelines.
 * Linked natively in assets/fonts/ across Android & iOS.
 */
export const MyaFonts = {
  regular: 'Archivo-Regular',
  medium: 'Archivo-Medium',
  semibold: 'Archivo-SemiBold',
  bold: 'Archivo-Bold',
  serif: 'Archivo-Bold',
};

export const MyaType = {
  greeting: {
    fontFamily: MyaFonts.serif,
    fontSize: moderateScale(30),
    lineHeight: moderateScale(35),
    letterSpacing: -0.3,
  },
  greetingSub: {
    fontFamily: MyaFonts.regular,
    fontSize: moderateScale(14.5),
    lineHeight: moderateScale(22),
  },
  message: {
    fontFamily: MyaFonts.regular,
    fontSize: moderateScale(15),
  },
  starter: {
    fontFamily: MyaFonts.regular,
    fontSize: moderateScale(14.5),
  },
  navTitle: {
    fontFamily: MyaFonts.semibold,
    fontSize: moderateScale(16.5),
  },
  senderLabel: {
    fontFamily: MyaFonts.semibold,
    fontSize: moderateScale(12),
    letterSpacing: 0.24,
  },
  contextPill: {
    fontFamily: MyaFonts.medium,
    fontSize: moderateScale(11.5),
  },
  quickReply: {
    fontFamily: MyaFonts.regular,
    fontSize: moderateScale(12.5),
  },
  input: {
    fontFamily: MyaFonts.regular,
    fontSize: moderateScale(15.5),
  },
  errorNote: {
    fontFamily: MyaFonts.regular,
    fontSize: moderateScale(13),
  },
  retry: {
    fontFamily: MyaFonts.semibold,
    fontSize: moderateScale(13),
  },
};

/** Bubble geometry — the 5pt tail corner is what makes these read as speech. */
export const MyaRadii = {
  userBubble: { borderTopLeftRadius: 18, borderTopRightRadius: 18, borderBottomRightRadius: 5, borderBottomLeftRadius: 18 },
  assistantBubble: { borderTopLeftRadius: 18, borderTopRightRadius: 18, borderBottomRightRadius: 18, borderBottomLeftRadius: 5 },
  card: 18,
  starter: 16,
  composer: 26,
  sheet: 26,
  pill: 999,
};

/**
 * Motion. Everything is 180–220ms except the keyboard, which must borrow the
 * system's own duration so the composer never races the IME.
 */
export const MyaMotion = {
  fast: 180,
  base: 200,
  slow: 220,
  stagger: 60,
};

/** Assistant bubbles lift barely. Nothing else in the thread has a shadow. */
export const MyaShadow = {
  bubble: {
    shadowColor: '#1E1B1B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.045,
    shadowRadius: 2,
    elevation: 1,
  },
  composer: {
    shadowColor: '#1E1B1B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sheet: {
    shadowColor: '#1E1B1B',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 16,
  },
};

/** Every tappable thing is at least this big. */
export const MYA_TOUCH = 44;
