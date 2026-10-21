/**
 * MyaHistorySheet
 *
 * Implements Artboard 1h: Conversation history sheet.
 * Shows past conversation threads grouped by day (TODAY, YESTERDAY, date),
 * with topic-derived titles, a search filter, and a fixed "New conversation" CTA.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Animated,
  Easing,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { moderateScale } from './scale';
import { MyaColors, MyaFonts, MyaType } from './myaTheme';

function formatGroupDate(dateStr) {
  if (!dateStr) return 'EARLIER';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'EARLIER';

  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  if (isToday) return 'TODAY';

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return 'YESTERDAY';

  const months = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

export function deriveTopicTitle(item) {
  if (item.title && item.title !== 'Hair Discussion' && item.title !== 'New Conversation' && !item.title.toLowerCase().startsWith('conversation')) {
    return item.title;
  }
  const text = item.summary || item.preview || item.lastMessage || '';
  if (!text) return 'Hair Care Consultation';

  const lower = text.toLowerCase();
  if (lower.includes('wash') || lower.includes('shampoo')) return 'Wash Day & Cleansing Routine';
  if (lower.includes('frizz') || lower.includes('humidity') || lower.includes('weather')) return 'Weather & Frizz Protection';
  if (lower.includes('dry') || lower.includes('moistur') || lower.includes('hydrate')) return 'Moisture & Deep Hydration';
  if (lower.includes('scalp') || lower.includes('itch') || lower.includes('flake')) return 'Scalp Health & Soothing Care';
  if (lower.includes('product') || lower.includes('recommend')) return 'Custom Product Recommendations';
  if (lower.includes('curl') || lower.includes('pattern') || lower.includes('definition')) return 'Curl Pattern & Definition';
  if (lower.includes('grow') || lower.includes('retention') || lower.includes('length')) return 'Growth & Length Retention';
  if (lower.includes('porosity')) return 'Hair Porosity & Regimen';
  if (lower.includes('protein') || lower.includes('damage') || lower.includes('break')) return 'Strength & Repair Strategy';
  if (lower.includes('diary') || lower.includes('routine')) return 'Daily Hair Routine & Diary';

  const clean = text.replace(/^[#*>\s]+/, '').replace(/^hello\s*,?\s*/i, '').replace(/^hi\s*,?\s*/i, '').trim();
  const firstSentence = clean.split(/[.?!:\n]/)[0].trim();
  if (firstSentence.length > 3) {
    return firstSentence.length > 40 ? firstSentence.slice(0, 37) + '...' : firstSentence;
  }
  return 'Personalized Hair Consultation';
}

export function deriveTopicSummary(item) {
  const title = deriveTopicTitle(item);
  let summary = item.summary || item.preview || item.lastMessage || '';
  if (!summary || summary === title) {
    return 'Detailed regimen, custom product picks & expert guidance tailored for your hair texture.';
  }
  summary = summary.replace(/```[\s\S]*?```/g, '').replace(/[#*_`]/g, '').trim();
  return summary.length > 95 ? summary.slice(0, 92) + '...' : summary;
}

function formatItemTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
}

export default function MyaHistorySheet({
  visible,
  onClose,
  onSelectConversation,
  onNewConversation,
  fetchConversations,
}) {
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState([]);

  useEffect(() => {
    if (visible) {
      Animated.timing(anim, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();

      if (typeof fetchConversations === 'function') {
        setLoading(true);
        fetchConversations()
          .then((list) => {
            if (Array.isArray(list)) setConversations(list);
          })
          .catch((err) => {
            console.warn('[MyaHistorySheet] fetchConversations error:', err);
          })
          .finally(() => {
            setLoading(false);
          });
      }
    } else {
      anim.setValue(0);
      setSearch('');
    }
  }, [visible, anim, fetchConversations]);

  const handleClose = () => {
    Animated.timing(anim, {
      toValue: 0,
      duration: 200,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      if (onClose) onClose();
    });
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = Array.isArray(conversations) ? conversations : [];
    if (!q) return list;
    return list.filter(
      (c) =>
        (c.summary && c.summary.toLowerCase().includes(q)) ||
        (c.title && c.title.toLowerCase().includes(q))
    );
  }, [conversations, search]);

  const grouped = useMemo(() => {
    const groups = [];
    let currentGroup = null;

    filtered.forEach((item) => {
      const groupKey = formatGroupDate(item.updatedAt || item.createdAt);
      if (!currentGroup || currentGroup.title !== groupKey) {
        currentGroup = { title: groupKey, data: [] };
        groups.push(currentGroup);
      }
      currentGroup.data.push(item);
    });

    return groups;
  }, [filtered]);

  if (!visible) return null;

  return (
    <View style={styles.backdrop}>
      <TouchableOpacity
        style={styles.scrimTouch}
        onPress={handleClose}
        activeOpacity={1}
        accessibilityRole="button"
        accessibilityLabel="Close conversation history"
      />

      <Animated.View
        style={[
          styles.sheet,
          {
            transform: [
              {
                translateY: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [650, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.handle} />

        {/* Search Bar */}
        <View style={styles.searchRow}>
          <Ionicons name="search" size={17} color={MyaColors.ink45} style={styles.searchIcon} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search conversations"
            placeholderTextColor={MyaColors.ink42}
            style={styles.searchInput}
            clearButtonMode="while-editing"
            autoCorrect={false}
          />
        </View>

        {/* List of past conversations grouped by day */}
        <View style={styles.listContainer}>
          {loading && conversations.length === 0 ? (
            <View style={styles.centerWrap}>
              <ActivityIndicator color={MyaColors.berry} size="small" />
            </View>
          ) : grouped.length === 0 ? (
            <View style={styles.centerWrap}>
              <Text style={styles.emptyText}>
                {search ? 'No conversations found' : 'No past conversations yet'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={grouped}
              keyExtractor={(item, index) => item.title + index}
              renderItem={({ item: group }) => (
                <View style={styles.groupSection}>
                  <Text style={styles.groupHeader}>{group.title}</Text>
                  {group.data.map((c) => {
                    const title = deriveTopicTitle(c);
                    const summary = deriveTopicSummary(c);
                    const timeStr = formatItemTime(c.updatedAt || c.createdAt);
                    return (
                      <TouchableOpacity
                        key={c.id || c.conversationId}
                        style={styles.convoRow}
                        onPress={() => {
                          handleClose();
                          if (onSelectConversation) {
                            onSelectConversation(c.id || c.conversationId);
                          }
                        }}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={title}
                      >
                        <View style={styles.convoIconWrap}>
                          <Ionicons name="chatbubble-ellipses-outline" size={18} color={MyaColors.berry} />
                        </View>
                        <View style={styles.convoBody}>
                          <View style={styles.convoHeaderRow}>
                            <Text style={styles.convoTitle} numberOfLines={1}>
                              {title}
                            </Text>
                            {timeStr ? <Text style={styles.convoTime}>{timeStr}</Text> : null}
                          </View>
                          <Text style={styles.convoSummary} numberOfLines={2}>
                            {summary}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={15} color={MyaColors.ink30} style={styles.convoArrow} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>

        {/* Bottom Fixed CTA: New Conversation */}
        <View style={[styles.footerWrap, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity
            style={styles.newConvoBtn}
            onPress={() => {
              handleClose();
              if (onNewConversation) onNewConversation();
            }}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Start a new conversation"
          >
            <Ionicons name="add" size={20} color={MyaColors.ivory} style={styles.newConvoIcon} />
            <Text style={styles.newConvoText}>New conversation</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: MyaColors.scrim,
    zIndex: 1200,
    justifyContent: 'flex-end',
  },
  scrimTouch: {
    flex: 1,
  },
  sheet: {
    backgroundColor: MyaColors.ivory,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    height: '82%',
    paddingTop: 10,
    shadowColor: MyaColors.onyx,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 12,
    borderTopWidth: 1,
    borderColor: MyaColors.berryLine,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: MyaColors.ink16,
    alignSelf: 'center',
    marginBottom: 14,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    backgroundColor: MyaColors.sand,
    borderRadius: 14,
    marginHorizontal: 18,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: MyaFonts.regular,
    fontSize: moderateScale(14.5),
    color: MyaColors.onyx,
    paddingVertical: 0,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 18,
  },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    ...MyaType.quickReply,
    color: MyaColors.ink45,
    fontSize: moderateScale(13),
  },
  groupSection: {
    marginBottom: 8,
  },
  groupHeader: {
    fontFamily: MyaFonts.semibold,
    fontSize: moderateScale(10),
    letterSpacing: 1.6,
    color: MyaColors.ink40,
    paddingTop: 14,
    paddingBottom: 4,
  },
  convoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: MyaColors.ink05,
  },
  convoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(235, 114, 85, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  convoBody: {
    flex: 1,
    marginRight: 8,
  },
  convoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  convoTitle: {
    fontFamily: MyaFonts.semibold,
    fontSize: moderateScale(14),
    color: MyaColors.onyx,
    flex: 1,
    marginRight: 6,
  },
  convoTime: {
    fontFamily: MyaFonts.regular,
    fontSize: moderateScale(11),
    color: MyaColors.ink40,
  },
  convoSummary: {
    fontFamily: MyaFonts.regular,
    fontSize: moderateScale(12.5),
    color: MyaColors.ink55,
    lineHeight: 17,
  },
  convoArrow: {
    marginLeft: 4,
  },
  footerWrap: {
    paddingHorizontal: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: MyaColors.ink06,
    backgroundColor: MyaColors.ivory,
  },
  newConvoBtn: {
    height: 48,
    backgroundColor: MyaColors.onyx,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newConvoIcon: {
    marginRight: 8,
  },
  newConvoText: {
    fontFamily: MyaFonts.semibold,
    fontSize: moderateScale(14.5),
    color: MyaColors.ivory,
  },
});
