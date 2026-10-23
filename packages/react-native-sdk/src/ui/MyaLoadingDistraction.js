/**
 * MyaLoadingDistraction
 *
 * Implements the Official MYAVANA Brand Guidelines (Dec 2024):
 * - Core Values: Empowerment • Expertise • Innovation
 * - Colors: Onyx (#222323), Stone (#F5F5F7), Coral (#E7A690), Blush (#FCE5D7), Sand (#EEECE1), Blueberry (#4A4D68)
 * - Typography: Archivo family (Bold preheaders, Semibold subheaders, Regular body)
 *
 * Distraction UX: Keeps the user entertained and engaged during multi-second LLM responses
 * by rotating through general hair-care tips. The status line is only ever what
 * the server reported (or a plain "Checking your Hair Journey"): no invented steps.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useMotion } from './motion/useMotion';
import { MyaColors, MyaFonts, MyaShadow } from './myaTheme';
import { moderateScale } from './scale';

const HAIR_TIPS = [
  {
    tag: 'POROSITY & HYDRATION',
    title: 'Lift Your Cuticles',
    fact: 'Low porosity strands have tightly bound cuticles. Using warm water or gentle steam before deep conditioning opens cuticles for deeper moisture penetration.',
    icon: 'water-outline',
  },
  {
    tag: 'STRAND SCIENCE',
    title: 'Elasticity & Strength',
    fact: 'Healthy wet hair stretches a little and springs back without breaking. Elasticity is a good indicator of strand health.',
    icon: 'fitness-outline',
  },
  {
    tag: 'REGIMEN RULE',
    title: 'Moisturize Before Sealing',
    fact: 'Water is the true hydrator; oils and butters are sealants. Always apply a water-based leave-in first, then seal with your favorite oil or butter.',
    icon: 'sparkles-outline',
  },
  {
    tag: 'SCALP CARE',
    title: 'Stimulate Microcirculation',
    fact: 'A 3-minute gentle scalp massage daily boosts blood circulation to hair follicles, delivering oxygen and nutrients essential for optimal growth.',
    icon: 'leaf-outline',
  },
  {
    tag: 'PROTECTIVE STYLES',
    title: 'Hydrate Under Your Braids',
    fact: 'Even inside protective styles like braids or twists, your natural hair requires moisture. Spritz lightly with a water-based refresher every 3–4 days.',
    icon: 'shield-checkmark-outline',
  },
  {
    tag: 'HEAT DEFENSE',
    title: 'Preserve Curl Memory',
    fact: 'Always apply a silicone- or poly-based heat protectant before blow drying or silk pressing. It helps your hair hold on to its moisture.',
    icon: 'flame-outline',
  },
  {
    tag: 'NIGHTTIME RITUAL',
    title: 'Satin & Silk Protection',
    fact: 'Cotton pillowcases absorb natural hair oils and create friction. Sleeping on a satin or silk pillowcase prevents overnight moisture loss and breakage.',
    icon: 'moon-outline',
  },
  {
    tag: 'CLARIFYING RITUAL',
    title: 'Reset Your Strands',
    fact: 'Clarifying once a month eliminates mineral deposits and heavy product buildup, allowing moisturizers and styling creams to perform at their best.',
    icon: 'refresh-outline',
  },
  {
    tag: 'CURL DEFINITION',
    title: 'Style on Soaking Wet Hair',
    fact: 'Applying styling custards and gels to soaking wet hair encourages natural curl clumping, prevents flyaways, and dramatically reduces frizz.',
    icon: 'heart-outline',
  },
  {
    tag: 'EXPERT LAB BALANCE',
    title: 'Protein vs. Moisture',
    fact: 'If wet strands feel gummy or overly stretchy, your hair is craving protein. If strands feel stiff, rough, or brittle, prioritize deep moisture.',
    icon: 'flask-outline',
  },
];

const DEFAULT_STATUS = 'Checking your Hair Journey...';

export default function MyaLoadingDistraction({ status }) {
  const { reduced, timingTo } = useMotion();
  const [tipIndex, setTipIndex] = useState(0);

  const fade = useSharedValue(1);
  const pulse = useSharedValue(0.4);
  const sweep = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      pulse.value = 1;
      sweep.value = 0.4;
      return undefined;
    }
    pulse.value = withRepeat(withSequence(withTiming(1, { duration: 900 }), withTiming(0.35, { duration: 900 })), -1, false);
    sweep.value = 0;
    sweep.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.linear }), -1, false);
    return () => {
      cancelAnimation(pulse);
      cancelAnimation(sweep);
    };
  }, [reduced, pulse, sweep]);

  // Rotate the tip every 3.4 s with a cross-fade.
  useEffect(() => {
    const advance = () => setTipIndex((prev) => (prev + 1) % HAIR_TIPS.length);
    const interval = setInterval(() => {
      fade.value = timingTo(0, 'fast', (finished) => {
        'worklet';
        if (finished) runOnJS(advance)();
      });
      setTimeout(() => {
        fade.value = timingTo(1, 'base');
      }, 260);
    }, 3400);
    return () => clearInterval(interval);
  }, [fade, timingTo]);

  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));
  const sweepStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -80 + sweep.value * 340 }] }));
  const tipStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  const currentTip = HAIR_TIPS[tipIndex];

  return (
    <View style={styles.card}>
      {/* Header Row: Mya status & animated pulse */}
      <View style={styles.headerRow}>
        <Animated.View style={[styles.pulseDotWrap, pulseStyle]}>
          <Ionicons name="sparkles" size={13} color={MyaColors.coral || '#E7A690'} />
        </Animated.View>
        <Text style={styles.statusText}>{status || DEFAULT_STATUS}</Text>
      </View>

      {/* Progress Track */}
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressBar, sweepStyle]} />
      </View>

      {/* Rotating Hair Tip Box */}
      <Animated.View style={[styles.tipContainer, tipStyle]}>
        <View style={styles.tipHeader}>
          <View style={styles.tagBadge}>
            <Text style={styles.tagText}>{currentTip.tag}</Text>
          </View>
          <Ionicons name={currentTip.icon} size={15} color={MyaColors.blueberry || '#4A4D68'} />
        </View>

        <Text style={styles.tipTitle}>{currentTip.title}</Text>
        <Text style={styles.tipFact}>{currentTip.fact}</Text>
      </Animated.View>

      {/* Brand sign-off micro tag */}
      <View style={styles.footerRow}>
        <Text style={styles.footerText}>MYAVANA • HAIR CARE TIPS</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F5F5F7', // Stone (#F5F5F7) per Brand Guidelines
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EEECE1',     // Sand (#EEECE1) warm foundation border
    padding: 14,
    maxWidth: '88%',
    alignSelf: 'flex-start',
    marginBottom: 8,
    ...MyaShadow.bubble,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  pulseDotWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FCE5D7', // Blush (#FCE5D7) soft accent
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  statusText: {
    fontFamily: MyaFonts.semibold || 'Archivo-SemiBold',
    fontSize: moderateScale(11.5),
    color: '#222323',          // Onyx (#222323)
    flexShrink: 1,
  },
  progressTrack: {
    height: 3,
    backgroundColor: '#EEECE1', // Sand foundation
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 10,
    width: '100%',
  },
  progressBar: {
    width: 90,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#E7A690', // Coral signature accent
  },
  tipContainer: {
    backgroundColor: '#FFFFFF',  // White ground
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EEECE1',
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  tagBadge: {
    backgroundColor: '#FCE5D7', // Blush (#FCE5D7) pill fill
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    fontFamily: MyaFonts.bold || 'Archivo-Bold',
    fontSize: moderateScale(9),
    color: '#222323',          // Onyx
    letterSpacing: 0.5,
  },
  tipTitle: {
    fontFamily: MyaFonts.semibold || 'Archivo-SemiBold',
    fontSize: moderateScale(12.5),
    color: '#222323',          // Onyx
    marginBottom: 4,
  },
  tipFact: {
    fontFamily: MyaFonts.regular || 'Archivo-Regular',
    fontSize: moderateScale(11.5),
    color: '#4A4D68',          // Blueberry subtle contrast
    lineHeight: moderateScale(16),
  },
  footerRow: {
    marginTop: 8,
    alignItems: 'center',
  },
  footerText: {
    fontFamily: MyaFonts.semibold || 'Archivo-SemiBold',
    fontSize: moderateScale(8.5),
    color: '#4A4D68',          // Blueberry
    letterSpacing: 0.8,
    opacity: 0.7,
  },
});
