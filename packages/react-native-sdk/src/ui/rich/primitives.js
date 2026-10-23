/**
 * Shared primitives for Mya rich components.
 *
 * These exist so every card is visibly one family rather than a pile of
 * separately-styled boxes. If a card needs a shell, an eyebrow, a meter or a
 * CTA, it takes it from here — that consistency is the whole difference between
 * a system and "more cards".
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MyaAnimatedCheck from '../MyaAnimatedCheck';
import { moderateScale } from '../scale';
import { MyaColors, MyaType, MyaRadii, MyaFonts } from '../myaTheme';

/** The one card surface. Ivory on sand, hairline border, no shadow. */
export function CardShell({ eyebrow, icon = 'sparkles', children, style }) {
  return (
    <View style={[styles.card, style]}>
      {!!eyebrow && (
        <View style={styles.eyebrowRow}>
          <Ionicons name={icon} size={11} color={MyaColors.berry} />
          <Text style={styles.eyebrow}>{String(eyebrow).toUpperCase()}</Text>
        </View>
      )}
      {children}
    </View>
  );
}

export function CardTitle({ children }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function CardBody({ children }) {
  return <Text style={styles.body}>{children}</Text>;
}

export function Divider() {
  return <View style={styles.divider} />;
}

/**
 * A labelled meter. Used by hair insight and goal progress so "moisture" and
 * "72% complete" read as the same kind of fact.
 */
export function Meter({ label, value, max = 100, valueLabel }) {
  const pct = Math.max(0, Math.min(1, max ? Number(value) / Number(max) : 0));
  return (
    <View style={styles.meterRow}>
      <View style={styles.meterHead}>
        <Text style={styles.meterLabel}>{label}</Text>
        {!!valueLabel && <Text style={styles.meterValue}>{valueLabel}</Text>}
      </View>
      <View style={styles.meterTrack}>
        <View style={[styles.meterFill, { width: `${pct * 100}%` }]} />
      </View>
    </View>
  );
}

/** Primary call to action. Berry text + chevron, never a heavy filled button. */
export function CardCta({ label, onPress, icon = 'arrow-forward' }) {
  if (!label) return null;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.cta}
      hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={styles.ctaText}>{label}</Text>
      <Ionicons name={icon} size={13} color={MyaColors.berry} />
    </TouchableOpacity>
  );
}

/** Filled button, for the one action a card actively wants you to take. */
export function CardButton({ label, onPress }) {
  if (!label) return null;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.button}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </TouchableOpacity>
  );
}

/**
 * Renders a block's `actions` array. The first action gets the filled
 * treatment, the rest are quieter — a card should have one obvious next step.
 */
export function CardActions({ actions, onAction }) {
  const list = Array.isArray(actions) ? actions.filter((a) => a && a.label) : [];
  if (list.length === 0) return null;
  return (
    <View style={styles.actionsRow}>
      {list.map((a, i) =>
        i === 0 ? (
          <CardButton key={a.type || i} label={a.label} onPress={() => onAction && onAction(a)} />
        ) : (
          <CardCta key={a.type || i} label={a.label} onPress={() => onAction && onAction(a)} />
        )
      )}
    </View>
  );
}

/** Numbered or bulleted step, shared by routine and journey cards. Supports interactive toggling. */
export function StepRow({
  marker,
  title,
  meta,
  last,
  interactive = false,
  checked = false,
  onToggle,
}) {
  const rowContent = (
    <View style={[styles.stepRow, !last && styles.stepDivider]}>
      {interactive ? (
        <View
          style={[
            styles.stepCheckbox,
            checked ? styles.stepCheckboxChecked : styles.stepCheckboxUnchecked,
          ]}
        >
          {checked ? (
            <MyaAnimatedCheck size={12} color={MyaColors.ivory} />
          ) : (
            <Text style={styles.stepMarkerSmall}>{marker}</Text>
          )}
        </View>
      ) : (
        <Text style={styles.stepMarker}>{marker}</Text>
      )}
      <Text
        style={[styles.stepTitle, checked && styles.stepTitleChecked]}
        numberOfLines={2}
      >
        {title}
      </Text>
      {!!meta && (
        <Text style={[styles.stepMeta, checked && styles.stepMetaChecked]}>
          {meta}
        </Text>
      )}
    </View>
  );

  if (interactive && onToggle) {
    return (
      <TouchableOpacity
        onPress={() => onToggle(!checked)}
        activeOpacity={0.7}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={`${title}${checked ? ', completed' : ''}`}
        style={styles.stepTouchable}
      >
        {rowContent}
      </TouchableOpacity>
    );
  }

  return rowContent;
}

const styles = StyleSheet.create({
  card: {
    maxWidth: '86%',
    backgroundColor: MyaColors.ivory,
    borderWidth: 1,
    borderColor: MyaColors.ink07,
    borderRadius: MyaRadii.card,
    padding: 14,
    marginTop: 10,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 11,
  },
  eyebrow: {
    fontFamily: MyaFonts.semibold,
    fontSize: moderateScale(9.5),
    letterSpacing: 1.5,
    color: MyaColors.berry,
    marginLeft: 6,
  },
  title: {
    fontFamily: MyaFonts.semibold,
    fontSize: moderateScale(15),
    color: MyaColors.onyx,
    marginBottom: 4,
  },
  body: {
    ...MyaType.errorNote,
    color: MyaColors.inkText,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: MyaColors.ink06,
    marginVertical: 10,
  },
  meterRow: {
    marginTop: 10,
  },
  meterHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 5,
  },
  meterLabel: {
    ...MyaType.errorNote,
    color: MyaColors.inkText,
  },
  meterValue: {
    fontFamily: MyaFonts.semibold,
    fontSize: moderateScale(12.5),
    color: MyaColors.onyx,
  },
  meterTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: MyaColors.blush,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: MyaColors.berry,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 36,
    marginRight: 14,
  },
  ctaText: {
    fontFamily: MyaFonts.semibold,
    fontSize: moderateScale(13.5),
    color: MyaColors.berry,
    marginRight: 6,
  },
  button: {
    backgroundColor: MyaColors.onyx,
    borderRadius: 14,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
    marginRight: 10,
  },
  buttonText: {
    fontFamily: MyaFonts.semibold,
    fontSize: moderateScale(13.5),
    color: MyaColors.ivory,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  stepDivider: {
    borderBottomWidth: 1,
    borderBottomColor: MyaColors.ink06,
  },
  stepMarker: {
    fontFamily: MyaFonts.semibold,
    fontSize: moderateScale(12.5),
    color: MyaColors.berry,
    minWidth: 22,
  },
  stepTitle: {
    ...MyaType.errorNote,
    color: MyaColors.onyx,
    flex: 1,
  },
  stepTitleChecked: {
    textDecorationLine: 'line-through',
    color: MyaColors.ink30,
  },
  stepMeta: {
    ...MyaType.quickReply,
    color: MyaColors.inkText,
    marginLeft: 10,
  },
  stepMetaChecked: {
    color: MyaColors.ink30,
  },
  stepTouchable: {
    minHeight: 44,
    justifyContent: 'center',
  },
  stepCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  stepCheckboxUnchecked: {
    borderWidth: 1.5,
    borderColor: MyaColors.ink15,
    backgroundColor: 'transparent',
  },
  stepCheckboxChecked: {
    backgroundColor: MyaColors.berry,
  },
  stepMarkerSmall: {
    fontFamily: MyaFonts.semibold,
    fontSize: moderateScale(11),
    color: MyaColors.ink60,
  },
});
