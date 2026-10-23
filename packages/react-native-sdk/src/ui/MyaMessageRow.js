/**
 * MyaMessageRow
 *
 * One row in the thread, from artboards 1b, 1c, 1d and 1g.
 *
 * The bug this replaces: the previous screen passed flat props to the SDK's
 * MyaChatBubble, which reads a single `message` object. Every bubble rendered
 * an empty string on a white ground — the "tiny white bubbles" report. This
 * component owns its own contract so that mismatch cannot recur silently.
 *
 * Memoised, because an inverted FlatList re-renders aggressively while a reply
 * is streaming and only the tail row actually changes.
 */

import React, { memo } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Share } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, cancelAnimation } from 'react-native-reanimated';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MyaPresence from './MyaPresence';
import useInkPacing from './motion/useInkPacing';
import { useMotion } from './motion/useMotion';
import { errorCopy } from '../client/errors';
import MyaThinkingDots from './MyaThinkingDots';
import MyaLoadingDistraction from './MyaLoadingDistraction';
import MyaRichBlock from './rich/MyaRichBlock';
import MyaMarkdown from './MyaMarkdown';
import { MyaColors, MyaFonts, MyaType, MyaRadii, MyaShadow } from './myaTheme';

/**
 * Shown while Mya reads a turn that came with a photo. She is looking at the
 * picture, not analysing it: HairAI is the service that measures. So this says
 * what is true, with no scan line and no "strand DNA".
 */
export function MyaPhotoLookCard() {
  return (
    <View style={scannerStyles.card}>
      <View style={scannerStyles.header}>
        <Ionicons name="image-outline" size={14} color={MyaColors.coral} />
        <Text style={scannerStyles.title}>Looking at your photo...</Text>
      </View>
      <MyaThinkingDots />
    </View>
  );
}

const scannerStyles = StyleSheet.create({
  card: {
    padding: 14,
    backgroundColor: MyaColors.ivory,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: MyaColors.blueberryLine,
    alignSelf: 'flex-start',
    maxWidth: '86%',
    marginBottom: 8,
    ...MyaShadow.bubble,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontFamily: MyaFonts.semibold,
    fontSize: 13,
    color: MyaColors.blueberry,
    marginLeft: 6,
  },
  sub: {
    fontSize: 10,
    color: MyaColors.inkText,
    marginBottom: 10,
  },
  container: {
    height: 110,
    borderRadius: 8,
    backgroundColor: MyaColors.sand,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: MyaColors.ink06,
  },
  scannerLine: {
    height: 2,
    backgroundColor: MyaColors.coral,
    width: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 10,
  },
  skeleton: {
    flex: 1,
    backgroundColor: MyaColors.blueberryTint,
  },
});

function SenderLabel({ mode }) {
  return (
    <View style={styles.labelRow}>
      <MyaPresence size={18} mode={mode} />
      <Text style={styles.labelText}>Mya</Text>
    </View>
  );
}

/**
 * Shown when a reply is cut short. Inline in the thread — never an Alert and
 * never a banner. Any partial text that did arrive is kept above it.
 */
export function ErrorRow({ onRetry, message }) {
  return (
    <View style={styles.errorRow}>
      <View style={styles.errorGlyph}>
        <View style={styles.errorBar} />
      </View>
      <Text style={styles.errorText}>{message || "Something interrupted Mya's response."}</Text>
      <TouchableOpacity
        onPress={onRetry}
        style={styles.retryBtn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Retry"
      >
        <Ionicons name="refresh" size={13} color={MyaColors.coral} />
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

function QuickReplies({ replies, onSelect }) {
  if (!replies || replies.length === 0) return null;
  return (
    <View style={styles.qrWrap}>
      {replies.map((r, i) => {
        const label = typeof r === 'string' ? r : r.label || r.title || '';
        const payload = typeof r === 'string' ? r : r.payload || r.label || '';
        if (!label) return null;
        return (
          <TouchableOpacity
            key={r.id || `qr-${i}`}
            onPress={() => onSelect && onSelect(payload)}
            style={styles.qrPill}
            accessibilityRole="button"
            accessibilityLabel={label}
          >
            <Text style={styles.qrText}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/**
 * User photo sends carry a "[Photo Attached: name.jpg]" marker because that is
 * the wire contract the backend prompt path expects. It should never be shown
 * to the person who sent it, so split it off and render a chip instead.
 */
const PHOTO_MARKER = /^\s*\[Photo Attached:\s*([^\]]*)\]\s*/i;

function splitPhotoMarker(text) {
  const m = PHOTO_MARKER.exec(text || '');
  if (!m) return { body: text || '', photos: null };
  return { body: (text || '').replace(PHOTO_MARKER, ''), photos: m[1].trim() };
}

/**
 * Weave prose and cards back into the order the model produced them.
 *
 * Each block carries `position` - the length of the accumulated text at the
 * moment its frame arrived (stamped in useMyaChat). Splitting the prose at
 * those offsets reproduces text/card/text/card faithfully.
 *
 * Degrades safely: a block with no position sorts to the end, which is exactly
 * the old behaviour, so responses from an older backend still render correctly.
 */
function interleave(text, blocks) {
  const body = text || '';
  const list = (blocks || [])
    .map((b, i) => ({ b, i, pos: typeof b.position === 'number' ? b.position : Infinity }))
    .sort((x, y) => (x.pos - y.pos) || (x.i - y.i));

  const items = [];
  let cursor = 0;

  for (const { b, pos } of list) {
    const at = Math.max(cursor, Math.min(Number.isFinite(pos) ? pos : body.length, body.length));
    const chunk = body.slice(cursor, at).trim();
    if (chunk) items.push({ kind: 'text', text: chunk });
    items.push({ kind: 'block', block: b });
    cursor = at;
  }

  const tail = body.slice(cursor).trim();
  if (tail) items.push({ kind: 'text', text: tail });

  // The streaming cursor belongs on the last text run, wherever that ended up.
  for (let i = items.length - 1; i >= 0; i--) {
    if (items[i].kind === 'text') {
      items[i].last = true;
      break;
    }
  }
  return items;
}

/** A soft coral caret that breathes at the tail of streaming text. */
function Caret() {
  const { reduced } = useMotion();
  const o = useSharedValue(1);
  React.useEffect(() => {
    if (reduced) {
      o.value = 1;
      return undefined;
    }
    o.value = withRepeat(withSequence(withTiming(0.25, { duration: 550 }), withTiming(1, { duration: 550 })), -1, false);
    return () => cancelAnimation(o);
  }, [reduced, o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[styles.cursorBar, style]} />;
}

// Long-press a bubble to copy it: the system share sheet offers Copy without
// adding a clipboard dependency.
function shareText(text) {
  if (!text) return;
  try {
    Share.share({ message: String(text) });
  } catch (e) {
    // Sharing is a convenience; never break the thread over it.
  }
}

function MyaMessageRow({
  message,
  showLabel,
  onRetry,
  onQuickReply,
  onBlockAction,
}) {
  // Hooks first (they cannot sit after an early return). Replies we watched arrive
  // are released word by word; anything loaded from history shows at once.
  const { shown: shownText, complete: inkComplete } = useInkPacing(
    message ? message.content || '' : '',
    !!(message && message.isStreaming)
  );
  const { cardEntering, inkEntering, sendEntering } = useMotion();

  if (!message) return null;

  const isUser = message.role === 'user';
  const text = message.content || '';
  const streaming = !!message.isStreaming;
  const arriving = streaming || !inkComplete; // animate only what is arriving now, never rows mounting from history
  const failed = !!message.error;
  const attachments = message.attachments || [];
  const blocks = message.blocks || [];

  // Thinking: the assistant row exists but nothing has landed yet.
  //
  // This is deliberately NOT an early return. A block frame can arrive before
  // the first text delta, and returning here would swallow it — the card would
  // simply never appear. Instead the dots stand in for the missing bubble and
  // the block section below still runs.
  const awaitingFirstToken = !isUser && streaming && !text;

  if (isUser) {
    const { body, photos } = splitPhotoMarker(text);
    // A message the member just sent lifts from the composer into place; rows
    // mounting from history never animate.
    const justSent = message.timestamp && Date.now() - new Date(message.timestamp).getTime() < 2500;
    return (
      <Animated.View style={styles.userWrap} entering={justSent ? sendEntering() : undefined}>
        {attachments.map((a, i) => {
          const uri = typeof a === 'string' ? a : (a?.uri || a?.url || a?.imageUrl || a?.image_url);
          if (!uri) return null;
          return (
            <Image
              key={a?.id || uri || `ua-${i}`}
              source={{ uri }}
              style={styles.userAttachment}
              resizeMode="cover"
            />
          );
        })}
        {/*
          Fallback for a message restored from storage whose local file URI no
          longer resolves. Deliberately says "Photo" and never the raw filename:
          showing "hair_strand.jpg" where the picture should be is precisely the
          bug this replaces - a filename presented as though it were the image.
        */}
        {!!photos && attachments.length === 0 && (
          <View style={styles.photoChip}>
            <Ionicons name="image-outline" size={14} color={MyaColors.ink55} />
            <Text style={styles.photoChipText}>Photo</Text>
          </View>
        )}
        {!!body && (
          <TouchableOpacity
            activeOpacity={1}
            onLongPress={() => shareText(body)}
            style={styles.userBubble}
            accessible={true}
            accessibilityRole="text"
            accessibilityLabel={`You said: ${body}`}
            accessibilityHint="Long press to copy"
          >
            <Text style={styles.userText}>{body}</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    );
  }

  return (
    <View style={styles.assistantWrap}>
      {showLabel && <SenderLabel mode={streaming ? (text ? 'streaming' : 'thinking') : 'idle'} />}

      {awaitingFirstToken && blocks.length === 0 && (
        message.isPhotoTurn ? <MyaPhotoLookCard /> : <MyaLoadingDistraction />
      )}

      {/* Render assistant attachments if they exist (TASK_MSDK_003) */}
      {attachments.map((a, i) => {
        const uri = typeof a === 'string'
          ? a
          : (a?.uri || a?.url || a?.imageUrl || a?.image_url || a?.source_url || a?.sourceUrl);
        if (!uri) return null;
        return (
          <Image
            key={a?.id || uri || `aa-${i}`}
            source={{ uri }}
            style={styles.assistantAttachment}
            resizeMode="cover"
          />
        );
      })}

      {/* Render top-level message image if present and not in attachments */}
      {(() => {
        const topLevelImg = message.imageUrl || message.image_url || message.image;
        if (
          topLevelImg &&
          typeof topLevelImg === 'string' &&
          !attachments.some((a) => (typeof a === 'string' ? a : (a?.uri || a?.url)) === topLevelImg)
        ) {
          return (
            <Image
              source={{ uri: topLevelImg }}
              style={styles.assistantAttachment}
              resizeMode="cover"
            />
          );
        }
        return null;
      })()}

      {/*
        Interleaved rendering. A reply is a sequence, not "all prose then all
        cards": Mya can say something, show a routine, say something else, then
        show a product. Blocks carry the text offset they arrived at, so the
        prose is split at those offsets and the two are woven back together in
        the order the model actually produced them.
      */}
      {interleave(shownText, blocks.filter((b) => inkComplete || typeof b.position !== 'number' || b.position <= shownText.length)).map((item, i) =>
        item.kind === 'text' ? (
          <Animated.View key={`t-${i}`} entering={arriving ? inkEntering() : undefined}>
            <TouchableOpacity
              activeOpacity={1}
              onLongPress={() => shareText(item.text)}
              style={styles.assistantBubble}
              accessible={true}
              accessibilityRole="text"
              accessibilityLabel={`Mya said: ${item.text}`}
              accessibilityHint="Long press to copy"
            >
              <MyaMarkdown
                color={MyaColors.onyx}
                trailing={arriving && item.last ? <Caret /> : null}
              >
                {item.text}
              </MyaMarkdown>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <Animated.View
            key={item.block.id || `${message.id}-block-${i}`}
            entering={arriving ? cardEntering(0) : undefined}
          >
            <MyaRichBlock block={item.block} message={message} onAction={onBlockAction} />
          </Animated.View>
        )
      )}

      {!!message.stopped && !streaming && <Text style={styles.stoppedNote}>Reply stopped</Text>}

      {failed && (
        <ErrorRow
          onRetry={onRetry}
          message={message.errorKind ? errorCopy(message.errorKind) : undefined}
        />
      )}

      {!streaming && !failed && (
        <QuickReplies replies={message.actions} onSelect={onQuickReply} />
      )}
    </View>
  );
}

export default memo(MyaMessageRow, (prev, next) => {
  const a = prev.message || {};
  const b = next.message || {};
  if (
    a.id !== b.id ||
    a.content !== b.content ||
    a.isStreaming !== b.isStreaming ||
    a.isPhotoTurn !== b.isPhotoTurn ||
    a.error !== b.error ||
    a.stopped !== b.stopped ||
    a.errorKind !== b.errorKind ||
    prev.showLabel !== next.showLabel
  ) {
    return false;
  }
  const aBlocks = a.blocks || [];
  const bBlocks = b.blocks || [];
  if (aBlocks.length !== bBlocks.length) return false;
  for (let i = 0; i < aBlocks.length; i++) {
    if (
      aBlocks[i].id !== bBlocks[i].id ||
      JSON.stringify(aBlocks[i].data) !== JSON.stringify(bBlocks[i].data)
    ) {
      return false;
    }
  }
  const aActions = a.actions || [];
  const bActions = b.actions || [];
  if (aActions.length !== bActions.length) return false;
  return true;
});

const styles = StyleSheet.create({
  stoppedNote: {
    ...MyaType.errorNote,
    color: MyaColors.inkText,
    marginTop: 6,
  },
  userWrap: {
    alignItems: 'flex-end',
  },
  assistantWrap: {
    alignItems: 'flex-start',
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  labelText: {
    ...MyaType.senderLabel,
    color: MyaColors.blueberry,
    marginLeft: 7,
  },
  userBubble: {
    maxWidth: '80%',
    backgroundColor: MyaColors.onyx,
    paddingVertical: 12,
    paddingHorizontal: 15,
    ...MyaRadii.userBubble,
  },
  userText: {
    ...MyaType.message,
    lineHeight: 22,
    color: MyaColors.ivory,
  },
  photoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: MyaColors.ivory,
    borderWidth: 1,
    borderColor: MyaColors.ink07,
    borderRadius: 12,
    paddingVertical: 7,
    paddingHorizontal: 11,
    marginBottom: 8,
    maxWidth: '72%',
  },
  photoChipText: {
    ...MyaType.quickReply,
    color: MyaColors.inkText,
    marginLeft: 7,
    flexShrink: 1,
  },
  userAttachment: {
    width: 120,
    height: 120,
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: MyaColors.sand,
  },
  assistantAttachment: {
    width: 240,
    height: 170,
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: '#F5F5F7',
    borderWidth: 1,
    borderColor: '#EEECE1',
  },
  assistantBubble: {
    maxWidth: '86%',
    backgroundColor: MyaColors.ivory,
    paddingVertical: 13,
    paddingHorizontal: 15,
    ...MyaRadii.assistantBubble,
    ...MyaShadow.bubble,
  },
  cursorBar: {
    width: 2,
    height: 16,
    backgroundColor: MyaColors.coral,
    marginLeft: 3,
    marginBottom: -2,
    alignSelf: 'center',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingLeft: 2,
    width: '100%',
  },
  errorGlyph: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.4,
    borderColor: MyaColors.ink32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBar: {
    width: 1.4,
    height: 7,
    borderRadius: 1,
    backgroundColor: MyaColors.ink50,
  },
  errorText: {
    ...MyaType.errorNote,
    color: MyaColors.inkText,
    marginLeft: 10,
    flexShrink: 1,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    paddingHorizontal: 12,
    minHeight: 36,
    borderRadius: MyaRadii.pill,
    borderWidth: 1,
    borderColor: MyaColors.blueberryLine,
  },
  retryText: {
    ...MyaType.retry,
    color: MyaColors.blueberry,
    marginLeft: 5,
  },
  qrWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  qrPill: {
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: MyaRadii.pill,
    borderWidth: 1,
    borderColor: MyaColors.coralLine || MyaColors.blueberryLine,
    marginRight: 8,
    marginBottom: 8,
  },
  qrText: {
    ...MyaType.quickReply,
    color: MyaColors.onyx,
  },
});
