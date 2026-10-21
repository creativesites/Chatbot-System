/**
 * MyaLoadingDistraction
 *
 * Implements the Official MYAVANA Brand Guidelines (Dec 2024):
 * - Core Values: Empowerment • Expertise • Innovation
 * - Colors: Onyx (#222323), Stone (#F5F5F7), Coral (#E7A690), Blush (#FCE5D7), Sand (#EEECE1), Blueberry (#4A4D68)
 * - Typography: Archivo family (Bold preheaders, Semibold subheaders, Regular body)
 *
 * Distraction UX: Keeps the user entertained and engaged during multi-second LLM responses
 * by rotating through lab-grounded hair science facts and dynamic status phases.
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Animated, Easing, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
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
    fact: 'Healthy hair strands can stretch up to 30% of their original length when wet and retract back without breaking. Elasticity is your best indicator of strand health.',
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
    fact: 'Always apply a silicone- or poly-based heat protectant before blow drying or silk pressing. It reduces internal moisture evaporation by up to 50%.',
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

const PHASES = [
  'Consulting MYAVANA hair intelligence...',
  'Cross-referencing strand porosity & curl dynamics...',
  'Analyzing lab-backed formulations...',
  'Personalizing your recommended regimen...',
  'Composing tailored advice...',
];

export default function MyaLoadingDistraction() {
  const [tipIndex, setTipIndex] = useState(0);
  const [phaseIndex, setPhaseIndex] = useState(0);

  // Animations
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Pulse animation for header indicator
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // Progress sweep
  useEffect(() => {
    const progress = Animated.loop(
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 2400,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    progress.start();
    return () => progress.stop();
  }, [progressAnim]);

  // Cycle tips and phases every 3.4 seconds with smooth cross-fade
  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        setTipIndex((prev) => (prev + 1) % HAIR_TIPS.length);
        setPhaseIndex((prev) => (prev + 1) % PHASES.length);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 350,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }).start();
      });
    }, 3400);

    return () => clearInterval(interval);
  }, [fadeAnim]);

  const currentTip = HAIR_TIPS[tipIndex];
  const currentPhase = PHASES[phaseIndex];

  return (
    <View style={styles.card}>
      {/* Header Row: Mya status & animated pulse */}
      <View style={styles.headerRow}>
        <Animated.View style={[styles.pulseDotWrap, { opacity: pulseAnim }]}>
          <Ionicons name="sparkles" size={13} color={MyaColors.coral || '#E7A690'} />
        </Animated.View>
        <Text style={styles.statusText}>{currentPhase}</Text>
      </View>

      {/* Progress Track */}
      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressBar,
            {
              transform: [
                {
                  translateX: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-80, 260],
                  }),
                },
              ],
            },
          ]}
        />
      </View>

      {/* Rotating Hair Tip Box */}
      <Animated.View style={[styles.tipContainer, { opacity: fadeAnim }]}>
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
        <Text style={styles.footerText}>MYAVANA HAIR LABS • EXPERTISE & SCIENCE</Text>
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
