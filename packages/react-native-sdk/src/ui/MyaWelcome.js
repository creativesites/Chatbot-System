/**
 * MyaWelcome
 *
 * Clean, brand-harmonized welcome experience for MYAVANA Assistant:
 * - Pure clean white background card matching app shell
 * - Minimal, uncluttered header with official MyaAvatar (Blueberry + Coral)
 * - Dynamic greeting tailored to user name and time of day in Archivo-Bold
 * - Clear guidance subtitle in Archivo-Regular
 * - Clean, elegant starter prompt buttons with zero icon clutter
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Animated,
  Easing,
  StyleSheet,
  AccessibilityInfo,
} from 'react-native';
import { MyaColors, MyaFonts, MyaShadow, MyaMotion } from './myaTheme';
import { moderateScale } from './scale';

function greetingFor(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function MyaWelcome({ firstName, subtitle, starters = [], onSelect }) {
  const enter = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    let mounted = true;
    Animated.timing(enter, {
      toValue: 1,
      duration: MyaMotion.base || 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    try {
      if (AccessibilityInfo?.isReduceMotionEnabled) {
        AccessibilityInfo.isReduceMotionEnabled()
          .then((reduced) => {
            if (mounted && reduced) enter.setValue(1);
          })
          .catch(() => {});
      }
    } catch (e) {
      // ignore
    }

    return () => {
      mounted = false;
    };
  }, [enter]);

  const name = (firstName || '').trim();
  const greeting = name ? `${greetingFor()}, ${name}.` : `${greetingFor()}.`;

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          opacity: enter,
          transform: [
            { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
          ],
        },
      ]}
    >
      <View style={styles.card}>
        {/* Banner Image Container */}
        <View style={styles.bannerWrap}>
          <Image
            source={require('./assets/mya_welcome_banner.jpg')}
            style={styles.bannerImage}
            resizeMode="cover"
          />
          <View style={styles.bannerGradientOverlay} />

          {/* Rounded MYAVANA Logo Badge floating on banner */}
          <View style={styles.avatarAnchor}>
            <View style={styles.avatarGlow}>
              <Image
                source={require('./assets/myavana_small_logo.png')}
                style={styles.welcomeLogo}
                resizeMode="cover"
              />
            </View>
          </View>
        </View>

        {/* Welcome Card Body */}
        <View style={styles.body}>
          {/* Greeting & Guidance */}
          <Text style={styles.greeting} accessibilityRole="header">
            {greeting}
          </Text>

          <Text style={styles.subtitle}>
            {subtitle || 'Your AI Hair Care Scientist is ready to guide your hair journey today.'}
          </Text>

          {/* Clean Starter Prompts (Uncluttered, No Icons) */}
          {starters && starters.length > 0 ? (
            <View style={styles.starters}>
              {starters.map((s, i) => (
                <TouchableOpacity
                  key={s.id || `starter-${i}`}
                  style={styles.starter}
                  onPress={() => onSelect && onSelect(s)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={s.label}
                >
                  <Text style={styles.starterText} numberOfLines={2}>
                    {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0F0F3',
    ...MyaShadow.bubble,
  },
  bannerWrap: {
    width: '100%',
    height: 125,
    position: 'relative',
    backgroundColor: MyaColors.sand,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerGradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(34, 35, 35, 0.08)',
  },
  avatarAnchor: {
    position: 'absolute',
    bottom: -22,
    left: 20,
    zIndex: 10,
  },
  avatarGlow: {
    width: 52,
    height: 52,
    borderRadius: 26,
    padding: 3,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...MyaShadow.bubble,
  },
  welcomeLogo: {
    width: 46,
    height: 46,
    borderRadius: 23,
    overflow: 'hidden',
  },
  body: {
    paddingTop: 30,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  greeting: {
    fontFamily: MyaFonts.bold,
    fontSize: moderateScale(22),
    color: MyaColors.onyx,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: MyaFonts.regular,
    fontSize: moderateScale(13.5),
    color: MyaColors.ink58,
    lineHeight: 19,
    marginBottom: 20,
  },
  starters: {
    gap: 9,
  },
  starter: {
    backgroundColor: MyaColors.stone,
    borderWidth: 1,
    borderColor: '#F0F0F3',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  starterText: {
    fontFamily: MyaFonts.medium,
    fontSize: moderateScale(13.5),
    color: MyaColors.onyx,
    lineHeight: 18.5,
  },
});
