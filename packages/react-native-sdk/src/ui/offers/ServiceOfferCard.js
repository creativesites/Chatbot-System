/**
 * ServiceOfferCard: renders a `service_offer` block.
 *
 * Shows the store name, the server's price (or none), what is included, one
 * reason drawn from the member's own HairID, one primary action and a quiet
 * "Not now". It renders nothing when the offer is malformed, already owned,
 * already dismissed, or the host cannot fulfil its route, so Mya never sells
 * something the member can't get.
 *
 * Premium motion and the gradient hairline arrive in M4; this is the working,
 * on-brand version with the behaviour that matters (routing, events, respect
 * for "Not now").
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withDelay, withTiming } from 'react-native-reanimated';
import MyaPressable from '../MyaPressable';
import { useMotion } from '../motion/useMotion';
import { useMyaCapabilities } from '../capabilities';
import { MyaColors, MyaType, MyaFonts, MyaRadii } from '../myaTheme';
import { moderateScale } from '../scale';
import { useMyaOffers } from './OffersContext';
import { normalizeServiceOffer, buildTaggedUrl, isOwned } from '../../offers/serviceOffer';
import { isDismissed, dismiss } from '../../offers/dismissals';

const NATIVE_ROUTES = ['native_iap', 'native_subscription'];

// One slow sheen across a card the first time it appears, never repeated.
const sheenPlayed = new Set();

function Sheen({ offerId }) {
  const { reduced } = useMotion();
  const play = !reduced && !sheenPlayed.has(offerId);
  const x = useSharedValue(-120);
  React.useEffect(() => {
    if (!play) return;
    sheenPlayed.add(offerId);
    x.value = withDelay(500, withTiming(420, { duration: 1700 }));
  }, [play, offerId, x]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { skewX: '-14deg' }] }));
  if (!play) return null;
  return <Animated.View pointerEvents="none" style={[styles.sheen, style]} />;
}

export default function ServiceOfferCard({ block }) {
  const ctx = useMyaOffers();
  const { LinearGradient } = useMyaCapabilities();
  const parsed = useMemo(() => normalizeServiceOffer(block), [block]);
  const offer = parsed.ok ? parsed.offer : null;

  const [dismissedChecked, setDismissedChecked] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);
  const inFlight = useRef(false); // state updates are async; a ref stops a same-tick double tap

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // "Not now" survives reloads: never re-show a dismissed card from the cached thread.
  useEffect(() => {
    let alive = true;
    if (!offer) return undefined;
    isDismissed(ctx && ctx.storage, offer.id).then((d) => {
      if (alive) {
        setDismissed(d);
        setDismissedChecked(true);
      }
    });
    return () => {
      alive = false;
    };
  }, [offer, ctx]);

  const owned = !!offer && isOwned(offer, ctx && ctx.entitlements);
  const native = !!offer && NATIVE_ROUTES.indexOf(offer.cta.route) !== -1;
  const fulfillable = !!ctx && (!native || (ctx.canHandle ? ctx.canHandle(offer) : !!ctx.openPaywall));
  const visible = !!offer && !!ctx && dismissedChecked && !dismissed && !owned && fulfillable;

  useEffect(() => {
    if (visible) ctx.tracker.offerShown(offer);
  }, [visible, offer, ctx]);

  if (!visible) return null;
  const { tracker } = ctx;

  const onPrimary = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      await tracker.track('offer_tapped', offer);
      if (native) {
        await tracker.track('paywall_opened', offer);
        const outcome = (await ctx.openPaywall(offer)) || {};
        if (outcome.status === 'purchase_completed') {
          await tracker.track('purchase_completed', offer);
          ctx.onPurchaseCompleted && ctx.onPurchaseCompleted(offer);
        } else if (outcome.status === 'purchase_cancelled') {
          await tracker.track('purchase_cancelled', offer);
        }
      } else {
        const url = buildTaggedUrl(offer.cta.url, offer.service);
        if (ctx.openLink) await ctx.openLink(url, offer);
        else await Linking.openURL(url);
        await tracker.track(offer.cta.route === 'calendly' ? 'consult_booking_opened' : 'link_opened', offer, { url });
      }
    } catch (e) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn('[ServiceOfferCard] action failed:', e && e.message);
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  const onNotNow = async () => {
    setDismissed(true);
    await tracker.track('offer_dismissed', offer);
    await dismiss(ctx.storage, offer.id);
  };

  // The jewel: a blush-to-coral hairline when a gradient is available, a plain
  // coral hairline when not. Either way it is one card, one border.
  const frame = (inner) =>
    LinearGradient ? (
      <LinearGradient
        colors={[MyaColors.blush, MyaColors.coral, '#F3C9B8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientFrame}
        accessibilityRole="summary"
        accessibilityLabel={`MYAVANA service: ${offer.name}`}
      >
        <View style={styles.gradientInner}>{inner}</View>
      </LinearGradient>
    ) : (
      <View style={styles.card} accessibilityRole="summary" accessibilityLabel={`MYAVANA service: ${offer.name}`}>
        {inner}
      </View>
    );

  return frame(
    <>
      <Sheen offerId={offer.id} />
      <Text style={styles.eyebrow}>A MYAVANA service</Text>
      <Text style={styles.name}>{offer.name}</Text>
      {!!offer.priceDisplay && <Text style={styles.price}>{offer.priceDisplay}</Text>}

      {offer.includes.length > 0 && (
        <View style={styles.list}>
          {offer.includes.map((line, i) => (
            <View key={i} style={styles.li}>
              <View style={styles.dot} />
              <Text style={styles.liText}>{line}</Text>
            </View>
          ))}
        </View>
      )}

      {!!offer.reason && (
        <View style={styles.why}>
          <Text style={styles.whyText}>{offer.reason}</Text>
        </View>
      )}

      <MyaPressable
        style={[styles.cta, busy && styles.ctaBusy]}
        onPress={onPrimary}
        haptic="medium"
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={offer.cta.label}
        accessibilityState={{ disabled: busy }}
      >
        <Text style={styles.ctaText}>{offer.cta.label}</Text>
      </MyaPressable>

      <TouchableOpacity
        style={styles.notNow}
        onPress={onNotNow}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Not now"
      >
        <Text style={styles.notNowText}>Not now</Text>
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 10,
    padding: moderateScale(18),
    borderRadius: MyaRadii.card + 4,
    backgroundColor: MyaColors.ivory,
    borderWidth: 1.5,
    borderColor: MyaColors.coralLine,
    maxWidth: '92%',
    overflow: 'hidden',
  },
  gradientFrame: {
    marginTop: 10,
    padding: 1.5,
    borderRadius: MyaRadii.card + 4,
    maxWidth: '92%',
  },
  gradientInner: {
    padding: moderateScale(18),
    borderRadius: MyaRadii.card + 2.5,
    backgroundColor: MyaColors.ivory,
    overflow: 'hidden',
  },
  sheen: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 70,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  eyebrow: {
    ...MyaType.senderLabel,
    color: MyaColors.ink55,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  name: {
    fontFamily: MyaFonts.semibold,
    fontSize: moderateScale(18),
    lineHeight: moderateScale(24),
    color: MyaColors.onyx,
    letterSpacing: -0.2,
  },
  price: {
    ...MyaType.errorNote,
    color: MyaColors.ink55,
    marginTop: 3,
  },
  list: { marginTop: 12 },
  li: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 7 },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: MyaColors.coral,
    marginTop: 8,
    marginRight: 10,
  },
  liText: { flex: 1, ...MyaType.starter, color: MyaColors.ink70 },
  why: {
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    backgroundColor: MyaColors.coralTint,
    borderWidth: 1,
    borderColor: MyaColors.coralLine,
  },
  whyText: { ...MyaType.errorNote, color: MyaColors.onyx },
  cta: {
    marginTop: 16,
    minHeight: 48,
    borderRadius: 999,
    backgroundColor: MyaColors.onyx,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaBusy: { opacity: 0.6 },
  ctaText: { fontFamily: MyaFonts.semibold, fontSize: moderateScale(14.5), color: '#FFFFFF' },
  notNow: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  notNowText: { ...MyaType.errorNote, color: MyaColors.ink55 },
});
