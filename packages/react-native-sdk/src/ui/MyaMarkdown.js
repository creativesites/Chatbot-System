/**
 * MyaMarkdown
 *
 * Mya's replies come back as markdown. Rendering them as one flat string is why
 * every answer previously collapsed into a wall of text.
 *
 * This renderer covers headings, bullet and numbered lists, bold, italic,
 * inline code, links, and dedicated block-level image rendering.
 *
 * Critical React Native Android Fix:
 * In React Native Android, remote network <Image> cannot be nested inside <Text>.
 * Doing so causes ReactTextView to either crash or render images with 0x0 dimensions.
 * All image representations (markdown ![alt](url), HTML <img src="..." />, and
 * standalone image URLs) are extracted as dedicated block-level View elements.
 */

import React, { useMemo, useState } from 'react';
import { View, Text, Image, Linking, ActivityIndicator, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { MyaColors, MyaType, MyaFonts } from './myaTheme';

const BULLET = /^\s*[-*•]\s+(.*)$/;
const NUMBERED = /^\s*(\d+)[.)]\s+(.*)$/;
const HEADING = /^\s*(#{1,6})\s+(.*)$/;
const HR = /^\s*(?:---|\*\*\*|___)\s*$/;

/** Inline spans: **bold**, *italic*, `code`, [text](url). */
const INLINE = /(!?\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|__[^_]+__|\*[^*\n]+\*|_[^_\n]+_|`[^`]+`)/g;

/** Images inside paragraphs or lines: ![alt](url), <img src="..." />, or [alt](url.jpg) */
const IMAGE_PATTERN = /(?:!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)|<img\s+[^>]*src=["'](https?:\/\/[^"'>\s]+)["'][^>]*\/?>|\[([^\]]*)\]\((https?:\/\/[^\s)]+\.(?:png|jpe?g|gif|webp|bmp)(?:\?[^\s)]*)?)\))/gi;

function ChatImage({ url, alt }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  if (!url) return null;

  return (
    <View style={styles.imageBlockWrap}>
      {error ? (
        <View style={styles.imageErrorBox}>
          <Ionicons name="image-outline" size={24} color={MyaColors.blueberry || '#4A4D68'} />
          <Text style={styles.imageErrorText}>{alt || 'Image reference'}</Text>
        </View>
      ) : (
        <View style={styles.imageInnerWrap}>
          <Image
            source={{ uri: url }}
            style={styles.chatImage}
            resizeMode="cover"
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setError(true);
            }}
            accessibilityLabel={alt || 'Visual reference'}
          />
          {loading && (
            <View style={styles.imageLoadingOverlay}>
              <ActivityIndicator size="small" color={MyaColors.coral || '#E7A690'} />
            </View>
          )}
        </View>
      )}
      {!!alt && alt.toLowerCase() !== 'image' && !error && (
        <Text style={styles.imageCaption} numberOfLines={2}>
          {alt}
        </Text>
      )}
    </View>
  );
}

function renderInline(text, keyPrefix, baseColor) {
  if (!text) return null;
  const parts = String(text).split(INLINE).filter((p) => p !== '' && p !== undefined);

  return parts.map((part, i) => {
    const key = `${keyPrefix}-i${i}`;

    if (/^\*\*[^*]+\*\*$/.test(part) || /^__[^_]+__$/.test(part)) {
      return (
        <Text key={key} style={styles.bold}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    if (/^\*[^*\n]+\*$/.test(part) || /^_[^_\n]+_$/.test(part)) {
      return (
        <Text key={key} style={styles.italic}>
          {part.slice(1, -1)}
        </Text>
      );
    }
    if (/^`[^`]+`$/.test(part)) {
      return (
        <Text key={key} style={styles.code}>
          {part.slice(1, -1)}
        </Text>
      );
    }
    // Markdown image inline fallback: never render <Image> inside <Text> on Android
    const imgLink = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(part);
    if (imgLink) {
      const [, alt, url] = imgLink;
      return (
        <Text
          key={key}
          style={styles.link}
          accessibilityRole="link"
          onPress={() => Linking.openURL(url).catch(() => {})}
        >
          📷 {alt || 'View Image'}
        </Text>
      );
    }

    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (link) {
      const [, label, url] = link;
      return (
        <Text
          key={key}
          style={styles.link}
          accessibilityRole="link"
          onPress={() => Linking.openURL(url).catch(() => {})}
        >
          {label}
        </Text>
      );
    }
    return (
      <Text key={key} style={{ color: baseColor }}>
        {part}
      </Text>
    );
  });
}

/**
 * Splits text into paragraph chunks and dedicated image blocks
 * so images are rendered inside native Views, avoiding React Native Android's
 * limitation with nested Image in Text.
 */
function extractImageBlocks(text) {
  if (!text) return [];
  const parts = [];
  let lastIndex = 0;
  let match;
  IMAGE_PATTERN.lastIndex = 0;

  while ((match = IMAGE_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const textChunk = text.slice(lastIndex, match.index).trim();
      if (textChunk) parts.push({ type: 'p', text: textChunk });
    }

    let url = '';
    let alt = '';

    if (match[2]) {
      // ![alt](url)
      alt = match[1] || '';
      url = match[2];
    } else if (match[3]) {
      // <img src="url" ...>
      url = match[3];
      const altM = /alt=["']([^"']*)["']/i.exec(match[0]);
      alt = altM ? altM[1] : '';
    } else if (match[5]) {
      // [alt](url.jpg)
      alt = match[4] || '';
      url = match[5];
    }

    if (url) {
      parts.push({ type: 'image', url, alt });
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    const textChunk = text.slice(lastIndex).trim();
    if (textChunk) parts.push({ type: 'p', text: textChunk });
  }

  return parts.length > 0 ? parts : [{ type: 'p', text }];
}

/**
 * Group raw lines into blocks. Extracts list items, headings, dividers,
 * and block-level images into structured blocks.
 */
function toBlocks(source) {
  const lines = String(source || '').split('\n');
  const blocks = [];
  let para = [];

  const flushPara = () => {
    if (para.length) {
      const combined = para.join(' ');
      const subBlocks = extractImageBlocks(combined);
      blocks.push(...subBlocks);
      para = [];
    }
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');

    if (!line.trim()) {
      flushPara();
      continue;
    }

    // Standalone image URL on a single line
    const standaloneImgUrl = /^\s*(https?:\/\/[^\s)]+\.(?:png|jpe?g|gif|webp)(?:\?[^\s)]*)?)\s*$/i.exec(line);
    if (standaloneImgUrl) {
      flushPara();
      blocks.push({ type: 'image', url: standaloneImgUrl[1], alt: '' });
      continue;
    }

    const hr = HR.exec(line);
    if (hr) {
      flushPara();
      blocks.push({ type: 'hr' });
      continue;
    }

    const h = HEADING.exec(line);
    if (h) {
      flushPara();
      blocks.push({ type: 'h', level: h[1].length, text: h[2] });
      continue;
    }

    const n = NUMBERED.exec(line);
    if (n) {
      flushPara();
      const last = blocks[blocks.length - 1];
      const item = { marker: `${n[1]}.`, text: n[2] };
      if (last && last.type === 'list' && last.ordered) last.items.push(item);
      else blocks.push({ type: 'list', ordered: true, items: [item] });
      continue;
    }

    const b = BULLET.exec(line);
    if (b) {
      flushPara();
      const last = blocks[blocks.length - 1];
      const item = { marker: '•', text: b[1] };
      if (last && last.type === 'list' && !last.ordered) last.items.push(item);
      else blocks.push({ type: 'list', ordered: false, items: [item] });
      continue;
    }

    para.push(line.trim());
  }
  flushPara();
  return blocks;
}

export default function MyaMarkdown({ children, color = MyaColors.onyx, trailing = null }) {
  const blocks = useMemo(() => toBlocks(children), [children]);

  // Nothing markdown-ish found and no image: render as a single Text so the streaming
  // cursor stays on the same line as the last word.
  if (blocks.length === 1 && blocks[0].type === 'p') {
    return (
      <Text style={[styles.body, { color }]}>
        {renderInline(blocks[0].text, 'b0', color)}
        {trailing}
      </Text>
    );
  }

  const lastIndex = blocks.length - 1;

  return (
    <View>
      {blocks.map((block, bi) => {
        const isLast = bi === lastIndex;

        if (block.type === 'image') {
          return (
            <View key={`b${bi}`} style={bi > 0 ? styles.blockGap : null}>
              <ChatImage url={block.url} alt={block.alt} />
              {isLast ? trailing : null}
            </View>
          );
        }

        if (block.type === 'hr') {
          return <View key={`b${bi}`} style={styles.hr} />;
        }

        if (block.type === 'h') {
          const isSubhead = block.level >= 3;
          return (
            <Text
              key={`b${bi}`}
              style={[
                styles.heading,
                isSubhead && styles.subheading,
                bi > 0 && styles.blockGap,
                { color },
              ]}
              accessibilityRole="header"
            >
              {renderInline(block.text, `b${bi}`, color)}
              {isLast ? trailing : null}
            </Text>
          );
        }

        if (block.type === 'list') {
          return (
            <View key={`b${bi}`} style={bi > 0 ? styles.blockGap : null}>
              {block.items.map((item, ii) => (
                <View key={`b${bi}-${ii}`} style={styles.listRow}>
                  <Text style={[styles.marker, { color: MyaColors.berry }]}>{item.marker}</Text>
                  <Text style={[styles.body, styles.listText, { color }]}>
                    {renderInline(item.text, `b${bi}-${ii}`, color)}
                    {isLast && ii === block.items.length - 1 ? trailing : null}
                  </Text>
                </View>
              ))}
            </View>
          );
        }

        return (
          <Text key={`b${bi}`} style={[styles.body, bi > 0 && styles.blockGap, { color }]}>
            {renderInline(block.text, `b${bi}`, color)}
            {isLast ? trailing : null}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    ...MyaType.message,
    lineHeight: 23,
  },
  blockGap: {
    marginTop: 10,
  },
  heading: {
    fontFamily: MyaFonts.semibold,
    fontSize: MyaType.message.fontSize + 2,
    lineHeight: 24,
  },
  subheading: {
    fontSize: MyaType.message.fontSize + 0.5,
    fontFamily: MyaFonts.semibold,
    color: MyaColors.onyx,
  },
  hr: {
    height: 1,
    backgroundColor: MyaColors.ink06,
    marginVertical: 10,
  },
  bold: {
    fontFamily: MyaFonts.semibold,
  },
  italic: {
    fontStyle: 'italic',
  },
  code: {
    fontFamily: 'Menlo',
    fontSize: MyaType.message.fontSize - 1.5,
    backgroundColor: MyaColors.sand,
  },
  link: {
    color: MyaColors.blueberry,
    textDecorationLine: 'underline',
  },
  imageBlockWrap: {
    width: '100%',
    maxWidth: 270,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F5F5F7',
    borderWidth: 1,
    borderColor: '#EEECE1',
    marginVertical: 6,
  },
  imageInnerWrap: {
    position: 'relative',
    width: '100%',
    height: 175,
    backgroundColor: '#EEECE1',
  },
  chatImage: {
    width: '100%',
    height: '100%',
  },
  imageLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245,245,247,0.7)',
  },
  imageErrorBox: {
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#F5F5F7',
  },
  imageErrorText: {
    fontFamily: MyaFonts.regular,
    fontSize: 12,
    color: '#4A4D68',
    marginTop: 6,
    textAlign: 'center',
  },
  imageCaption: {
    fontFamily: MyaFonts.medium,
    fontSize: 11.5,
    color: '#222323',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEECE1',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 5,
  },
  marker: {
    ...MyaType.message,
    lineHeight: 23,
    fontFamily: MyaFonts.semibold,
    minWidth: 20,
  },
  listText: {
    flex: 1,
  },
});
