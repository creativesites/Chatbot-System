/**
 * MyaComposer
 *
 * The composer from artboards 1e and 1i, built to §5 of the design direction,
 * which treats this as a flagship surface rather than a text field with a
 * button beside it.
 *
 * Behaviours it owns:
 *   - grows line by line to a five-line ceiling, then scrolls internally
 *   - attachment thumbnails above the field, each removable
 *   - Send morphs into Stop while streaming — same position, same size
 *   - Return inserts a newline; sending is always a deliberate tap
 *   - disabled state is visible, not merely non-functional
 *
 * Icons come from react-native-vector-icons, which the app already links.
 * No new native dependency is introduced here on purpose: the next Android
 * build has to succeed, and an unverifiable native module is not worth the
 * fidelity difference on a handful of glyphs.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Platform,
} from 'react-native';
import Animated from 'react-native-reanimated';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MyaPressable from './MyaPressable';
import { useMotion } from './motion/useMotion';
import { MyaColors, MyaType, MyaRadii, MyaShadow } from './myaTheme';

const LINE_HEIGHT = 22;
const MAX_LINES = 5;
const MIN_FIELD_HEIGHT = 42;
const MAX_FIELD_HEIGHT = MIN_FIELD_HEIGHT + LINE_HEIGHT * (MAX_LINES - 1);

function Attachment({ item, onRemove }) {
  return (
    <View style={styles.thumbWrap}>
      {item.uri ? (
        <Image source={{ uri: item.uri }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbFallback]} />
      )}
      <TouchableOpacity
        onPress={() => onRemove && onRemove(item)}
        style={styles.removeBtn}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${item.fileName || 'attachment'}`}
      >
        <Ionicons name="close" size={12} color={MyaColors.ivory} />
      </TouchableOpacity>
    </View>
  );
}

export default function MyaComposer({
  value,
  onChangeText,
  onSend,
  onStop,
  onAttach,
  onVoice,
  attachments = [],
  onRemoveAttachment,
  isStreaming = false,
  placeholder = 'Ask Mya anything…',
  maxLength = 1000,
}) {
  const { popEntering } = useMotion();
  const [fieldHeight, setFieldHeight] = useState(MIN_FIELD_HEIGHT);
  const inputRef = useRef(null);

  const hasText = (value || '').trim().length > 0;
  const canSend = (hasText || attachments.length > 0) && !isStreaming;

  // Voice replaces Send only when there is genuinely nothing to send.
  // Never swap it in mid-compose — the target must not move under the thumb.
  const showVoice = !hasText && attachments.length === 0 && !isStreaming && !!onVoice;

  const handleContentSizeChange = useCallback((e) => {
    const h = e?.nativeEvent?.contentSize?.height ?? MIN_FIELD_HEIGHT;
    setFieldHeight(Math.min(Math.max(h, MIN_FIELD_HEIGHT), MAX_FIELD_HEIGHT));
  }, []);

  const atCeiling = fieldHeight >= MAX_FIELD_HEIGHT;

  const counter = useMemo(() => {
    const len = (value || '').length;
    return len >= 800 ? `${len}/${maxLength}` : null;
  }, [value, maxLength]);

  return (
    <View style={styles.shell}>
      {attachments.length > 0 && (
        <View style={styles.attachRow}>
          {attachments.map((a, i) => (
            <Attachment
              key={a.id || a.uri || `att-${i}`}
              item={a}
              onRemove={onRemoveAttachment}
            />
          ))}
        </View>
      )}

      <View style={styles.inputRow}>
        {onAttach ? (
        <TouchableOpacity
          onPress={onAttach}
          style={styles.circleBtn}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          accessibilityRole="button"
          accessibilityLabel="Add a photo"
        >
          <Ionicons name="add" size={22} color={MyaColors.ink55} />
        </TouchableOpacity>
        ) : null}

        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          onContentSizeChange={handleContentSizeChange}
          placeholder={placeholder}
          placeholderTextColor={MyaColors.inkText}
          multiline
          maxLength={maxLength}
          scrollEnabled={atCeiling}
          underlineColorAndroid="transparent"
          // Deliberately no onSubmitEditing: Return inserts a newline.
          // Submitting on Return in a multiline field is how half-written
          // messages get sent.
          blurOnSubmit={false}
          style={[styles.field, { height: fieldHeight }]}
          accessibilityLabel="Message Mya"
        />

        {isStreaming ? (
          <Animated.View key="stop" entering={popEntering()}>
            <MyaPressable
              onPress={onStop}
              haptic="light"
              style={[styles.circleBtn, styles.stopBtn]}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityRole="button"
              accessibilityLabel="Stop generating"
            >
              <View style={styles.stopSquare} />
            </MyaPressable>
          </Animated.View>
        ) : showVoice ? (
          <TouchableOpacity
            onPress={onVoice}
            style={styles.circleBtn}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityRole="button"
            accessibilityLabel="Speak to Mya"
          >
            <Ionicons name="mic-outline" size={20} color={MyaColors.ink55} />
          </TouchableOpacity>
        ) : (
          <Animated.View key="send" entering={popEntering()}>
            <MyaPressable
              onPress={canSend ? onSend : undefined}
              haptic="light"
              disabled={!canSend}
              style={[styles.circleBtn, canSend ? styles.sendOn : styles.sendOff]}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityRole="button"
              accessibilityLabel="Send message"
              accessibilityState={{ disabled: !canSend }}
            >
              <Ionicons name="arrow-up" size={20} color={MyaColors.ivory} />
            </MyaPressable>
          </Animated.View>
        )}
      </View>

      {counter ? <Text style={styles.counter}>{counter}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: MyaColors.ivory,
    borderRadius: MyaRadii.composer,
    padding: 3,
    borderWidth: 1,
    borderColor: MyaColors.ink05,
    ...MyaShadow.composer,
  },
  attachRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 9,
    paddingTop: 9,
    paddingBottom: 4,
  },
  thumbWrap: {
    width: 58,
    height: 58,
    marginRight: 8,
    marginBottom: 4,
  },
  thumb: {
    width: 58,
    height: 58,
    borderRadius: 12,
    backgroundColor: MyaColors.sand,
  },
  thumbFallback: {
    backgroundColor: MyaColors.blush,
  },
  removeBtn: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: MyaColors.onyx,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: MyaColors.ivory,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  circleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
  },
  sendOn: {
    backgroundColor: MyaColors.onyx,
  },
  sendOff: {
    backgroundColor: MyaColors.ink13,
  },
  stopBtn: {
    backgroundColor: MyaColors.blueberry,
  },
  stopSquare: {
    width: 11,
    height: 11,
    borderRadius: 2.5,
    backgroundColor: MyaColors.ivory,
  },
  field: {
    flex: 1,
    ...MyaType.input,
    lineHeight: LINE_HEIGHT,
    color: MyaColors.onyx,
    paddingHorizontal: 2,
    paddingTop: Platform.OS === 'ios' ? 11 : 9,
    paddingBottom: Platform.OS === 'ios' ? 11 : 9,
    margin: 0,
    textAlignVertical: 'center',
  },
  counter: {
    ...MyaType.quickReply,
    color: MyaColors.inkText,
    alignSelf: 'flex-end',
    paddingRight: 12,
    paddingBottom: 4,
  },
});
