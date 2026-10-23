/**
 * MyaChat: the native Mya assistant screen body.
 *
 * Promoted from the app's MyaChatScreen (TASK-008 M2). Everything specific to a
 * host app (navigation, which screen the member is on, the camera and photo
 * picker, app-only menu items, extra modals) comes in through props, so the SDK
 * owns the whole conversation experience and the app owns only glue.
 *
 * Structural decisions carried over from the approved artboards (1a-1i):
 * 1. The list is INVERTED. Data is newest-first, rendered bottom-up.
 * 2. Keys are stable.
 * 3. The welcome experience is a sibling of the thread, so it leaves
 *    naturally when messages are present.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  StatusBar,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import MyaComposer from './MyaComposer';
import MyaMessageRow, { ErrorRow } from './MyaMessageRow';
import MyaWelcome from './MyaWelcome';
import MyaPresence from './MyaPresence';
import MyaPetals from './MyaPetals';
import { MyaCapabilitiesProvider, useHaptics } from './capabilities';
import { useMotion } from './motion/useMotion';
import MyaSheet from './MyaSheet';
import MyaHistorySheet from './MyaHistorySheet';
import useMyaKeyboard, { useKeyboardMarginStyle } from './useMyaKeyboard';
import { MyaColors, MyaFonts, MyaType, MYA_TOUCH } from './myaTheme';
import { moderateScale } from './scale';
import { MyaStorageProvider } from './checklistStore';
import { MyaOffersProvider } from './offers/OffersContext';
import { createFunnelTracker } from '../offers/funnel';
import { buildPostPurchaseMessage } from '../offers/serviceOffer';

import { useMyaChat } from '../hooks/useMyaChat';
import { normalizeAttachments } from '../client/attachments';

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** "Today", "Yesterday" or a date: shown above the first message of each day. */
function dayLabelFor(message, previous, now = new Date()) {
  const t = message && message.timestamp ? new Date(message.timestamp) : null;
  if (!t || Number.isNaN(t.getTime())) return null;
  const p = previous && previous.timestamp ? new Date(previous.timestamp) : null;
  if (p && !Number.isNaN(p.getTime()) && sameDay(t, p)) return null;
  if (sameDay(t, now)) return 'Today';
  const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (sameDay(t, y)) return 'Yesterday';
  return t.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function filterUserSalutations(text) {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/^(?:Hi|Hello|Hey|Greetings|Welcome|Dear)\s+[A-Za-z0-9_.-]+(?:\s+[A-Za-z0-9_.-]+)?[,!:]\s*/i, '')
    .replace(/^(?:Hi|Hello|Hey|Greetings)\s+there[,!:]\s*/i, '')
    .trim();
}

/**
 * @param {object} props
 * @param {string} props.apiBase                Mya API base URL (required)
 * @param {object} props.storage                SDK storage adapter (e.g. AsyncStorageAdapter)
 * @param {string} [props.userId]               Host-owned member id. Always wins over stored ids.
 * @param {string} [props.userName]
 * @param {() => Promise<string|null>} [props.getAuthToken]
 * @param {{name:string,title:string}} [props.screen]   Where the member came from
 * @param {Array<{id:string,label:string,prompt:string}>} [props.starters]
 * @param {(extra:object) => object} [props.getContext] Builds experienceContext for each turn
 * @param {() => void} [props.onBack]
 * @param {(action:object, payload:any) => boolean} [props.onBlockAction]  Return true if handled
 * @param {(opts:object, cb:Function) => void} [props.launchCamera]
 * @param {(opts:object, cb:Function) => void} [props.launchImageLibrary]
 * @param {boolean} [props.photosInChat=true]   One flag: false removes photo attach from chat
 * @param {Array} [props.menuItems]             Host menu entries: {key,icon,title,subtitle,onPress(api)}
 * @param {string} [props.initialPrompt]
 * @param {Array} [props.initialAttachments]
 * @param {() => Promise<string[]>} [props.getEntitlements]  Services the member already owns; sent every turn
 * @param {(offer:object) => boolean} [props.canHandleOffer]  Can the host fulfil this offer's native route?
 * @param {(offer:object) => Promise<{status:string}>} [props.onOpenPaywall]  Native purchase; resolve with purchase_completed | purchase_cancelled
 * @param {(url:string, offer:object) => Promise<void>} [props.onOpenLink]  In-app browser for web and booking links
 * @param {(name:string, params:object) => void} [props.analytics]  Mirror funnel events (e.g. Firebase)
 * @param {(cb:Function) => (() => void)} [props.subscribePurchases]  Purchases the host completes outside a card
 * @param {{haptics?:object, LinearGradient?:any, BlurView?:any}} [props.capabilities]  Optional host-provided native niceties
 * @param {string} [props.persistPrefix='mya']
 * @param {(api:object) => React.ReactNode} [props.children]  Host modals, rendered last
 */
export { dayLabelFor };

export default function MyaChat({
  apiBase,
  storage,
  userId,
  userName = '',
  getAuthToken,
  screen = { name: 'Dashboard', title: 'Dashboard' },
  starters = [],
  getContext,
  onBack,
  onBlockAction,
  launchCamera,
  launchImageLibrary,
  photosInChat = true,
  menuItems = [],
  initialPrompt,
  initialAttachments,
  getEntitlements,
  canHandleOffer,
  onOpenPaywall,
  onOpenLink,
  analytics,
  subscribePurchases,
  capabilities,
  persistPrefix = 'mya',
  children,
}) {
  const insets = useSafeAreaInsets();
  const { keyboardHeight, isKeyboardOpen } = useMyaKeyboard();
  const keyboardLift = useKeyboardMarginStyle(keyboardHeight);
  const { popEntering, timingTo } = useMotion();
  const haptics = useHaptics();
  const [celebrating, setCelebrating] = useState(false);
  // With a blur from the host, the header floats over the thread and the thread scrolls under it.
  const BlurView = capabilities && capabilities.BlurView;
  const [headerH, setHeaderH] = useState(0);

  // The header's hairline fades in once content scrolls under it.
  const scrolledSv = useSharedValue(0);
  const navBorderStyle = useAnimatedStyle(() => ({ opacity: scrolledSv.value }));

  const topInset =
    Platform.OS === 'ios'
      ? Math.max(insets.top, 44)
      : StatusBar.currentHeight ?? insets.top;

  const composerBottomPad = insets.bottom || 8;
  const listRef = useRef(null);

  const activeScreen = screen.name;
  const activeScreenTitle = screen.title;
  const firstName = String(userName || '').trim().split(/\s+/)[0] || '';

  const {
    messages,
    isStreaming,
    isThinking,
    error,
    sendMessage,
    setMessages,
    abortStream,
    restartConversation,
    loadConversation,
    fetchConversations,
    unsentDraft,
    clearUnsentDraft,
    client: myaClient,
  } = useMyaChat({
    apiBase,
    initialUserId: userId,
    storage,
    persistMessages: true,
    persistKey: `${persistPrefix}_chat_mobile_${userId || 'guest'}`,
  });

  // Draft persistence across navigation
  const draftKey = `${persistPrefix}_draft_${userId || 'guest'}`;
  const draftLoaded = useRef(false);

  // ---- Offers: entitlements every turn, funnel events, purchase moment ----
  const [entitlements, setEntitlements] = useState([]);
  const purchasedRef = useRef(new Set()); // bought in this session, before the host reports it
  const celebratedRef = useRef(new Set());

  const refreshEntitlements = useCallback(async () => {
    let list = [];
    try {
      const fromHost = getEntitlements ? await getEntitlements() : [];
      list = Array.isArray(fromHost) ? fromHost : [];
    } catch (e) {
      list = [];
    }
    const merged = Array.from(new Set([...list, ...purchasedRef.current]));
    setEntitlements(merged);
    if (myaClient && myaClient.setEntitlements) myaClient.setEntitlements(merged);
    return merged;
  }, [getEntitlements, myaClient]);

  useEffect(() => {
    refreshEntitlements();
  }, [refreshEntitlements]);

  const tracker = useMemo(
    () =>
      createFunnelTracker({
        send: (type, meta) => myaClient.trackEvent(type, meta),
        mirror: analytics,
        onError: (e) => {
          if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn('[Mya] funnel event failed:', e && e.message);
        },
      }),
    [myaClient, analytics]
  );

  // A confirmed purchase: remember it so the service is never re-offered, then
  // open Mya's next turn with the celebration. Fires once per service.
  const handlePurchaseCompleted = useCallback(
    (offer) => {
      const key = offer.service || offer.id;
      if (celebratedRef.current.has(key)) return;
      celebratedRef.current.add(key);
      purchasedRef.current.add(offer.entitlementKey || offer.service);
      purchasedRef.current.add(offer.service);
      refreshEntitlements();
      setMessages((prev) => [...prev, buildPostPurchaseMessage(offer)]);
      haptics.success();
      setCelebrating(true);
    },
    [refreshEntitlements, setMessages, haptics]
  );

  // Purchases the host completes outside a card (e.g. the store listener firing late).
  useEffect(() => {
    if (!subscribePurchases) return undefined;
    return subscribePurchases((evt) => {
      if (!evt || evt.status !== 'purchase_completed') return;
      const offer = evt.offer || { id: evt.service, service: evt.service, name: evt.name || evt.service, entitlementKey: evt.entitlementKey || null, priceDisplay: null, variant: null, cta: { route: 'native_iap' } };
      if (!celebratedRef.current.has(offer.service || offer.id)) tracker.track('purchase_completed', offer);
      handlePurchaseCompleted(offer);
    });
  }, [subscribePurchases, tracker, handlePurchaseCompleted]);

  const offersApi = useMemo(
    () => ({
      storage,
      entitlements,
      tracker,
      canHandle: (offer) => (canHandleOffer ? canHandleOffer(offer) : !!onOpenPaywall),
      openPaywall: (offer) => (onOpenPaywall ? onOpenPaywall(offer) : Promise.resolve({ status: 'unavailable' })),
      openLink: onOpenLink,
      onPurchaseCompleted: handlePurchaseCompleted,
    }),
    [storage, entitlements, tracker, canHandleOffer, onOpenPaywall, onOpenLink, handlePurchaseCompleted]
  );

  const [draft, setDraft] = useState('');
  const [attachments, setAttachments] = useState([]);
  // Reading older messages: don't yank the view, offer a way back instead.
  const [atLatest, setAtLatest] = useState(true);
  const [showAttachSheet, setShowAttachSheet] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [showHistorySheet, setShowHistorySheet] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.resolve(storage.getItem(draftKey))
      .then((saved) => {
        if (alive && saved) setDraft(saved);
      })
      .catch(() => {})
      .finally(() => {
        draftLoaded.current = true;
      });
    return () => {
      alive = false;
    };
  }, [draftKey, storage]);

  useEffect(() => {
    if (!draftLoaded.current) return;
    Promise.resolve(storage.setItem(draftKey, draft || '')).catch(() => {});
  }, [draft, draftKey, storage]);

  const send = useCallback(
    async (text, overrideAttachments = null) => {
      const activeAtts = overrideAttachments !== null ? overrideAttachments : attachments;
      const body = (text || '').trim();
      if (!body && activeAtts.length === 0) return;

      const context = getContext
        ? getContext({ screen: activeScreen, hasAttachedPhoto: activeAtts.length > 0 })
        : { screen: activeScreen, hasAttachedPhoto: activeAtts.length > 0 };

      // A photo is only mentioned to Mya once it can actually reach her.
      const { ready, rejected } = normalizeAttachments(activeAtts);
      let wire = body;
      if (activeAtts.length > 0 && rejected.length === 0) {
        const names = ready.map((a) => a.name || 'hair_photo.jpg').join(', ');
        wire = ('[Photo Attached: ' + names + '] ' + body).trim();
      }
      if (!wire) {
        Alert.alert('Photo not added', "That photo couldn't be prepared. Please try adding it again.");
        return;
      }

      const sentAttachments = activeAtts;

      setDraft('');
      setAttachments([]);

      await refreshEntitlements();
      await sendMessage(wire, context, { attachments: sentAttachments });
    },
    [attachments, activeScreen, sendMessage, getContext, refreshEntitlements]
  );

  // Handle initial prompt and initial attachments passed via route params
  const initialPromptSent = useRef(false);
  useEffect(() => {
    if ((initialPrompt || (initialAttachments && initialAttachments.length)) && !initialPromptSent.current) {
      initialPromptSent.current = true;
      const initialAtts = initialAttachments || [];
      if (initialAtts.length > 0) {
        setAttachments(initialAtts);
      }
      const prompt = initialPrompt || 'Here is a photo of my hair. What do you notice?';
      send(prompt, initialAtts);
    }
  }, [initialPrompt, initialAttachments, send]);

  const handleSend = useCallback(() => send(draft), [send, draft]);

  const handleStarter = useCallback((s) => send(s.prompt || s.label), [send]);

  const handleQuickReply = useCallback((payload) => send(payload), [send]);

  const handleBlockAction = useCallback(
    (action, payload) => {
      if (!action) return;
      const actionObj = typeof action === 'object' ? action : { type: action, payload };
      const effectivePayload = payload !== undefined ? payload : (actionObj.payload || {});
      const handled = onBlockAction ? onBlockAction(actionObj, effectivePayload) : false;
      if (!handled && typeof action === 'string') send(action);
    },
    [onBlockAction, send]
  );

  // A turn that failed before Mya said anything comes back to the composer.
  useEffect(() => {
    if (!unsentDraft) return;
    setDraft(String(unsentDraft.text || '').replace(/^\[Photo Attached:[^\]]*\]\s*/, ''));
    setAttachments(unsentDraft.attachments || []);
    clearUnsentDraft();
  }, [unsentDraft, clearUnsentDraft]);

  // Pass the member's token to the Mya client so the server can verify identity.
  useEffect(() => {
    let alive = true;
    if (!getAuthToken) return undefined;
    Promise.resolve(getAuthToken())
      .then((token) => {
        if (alive && token && myaClient && myaClient.setAuthToken) myaClient.setAuthToken(token);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [myaClient, getAuthToken]);

  // Retry logic (MYA-013): slice out failed turn and retry last user prompt cleanly
  const handleRetry = useCallback(() => {
    // A restored draft is the unsent turn: retrying means sending it again.
    if ((draft && draft.trim()) || attachments.length > 0) {
      send(draft, null);
      return;
    }
    if (!messages || messages.length === 0) return;
    let lastUserIdx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserIdx = i;
        break;
      }
    }
    if (lastUserIdx !== -1) {
      const textToRetry = messages[lastUserIdx].content;
      const pruned = messages.slice(0, lastUserIdx);
      setMessages(pruned);
      send(textToRetry);
    }
  }, [messages, send, setMessages, draft, attachments]);

  const handleAttach = useCallback(() => {
    setShowAttachSheet(true);
  }, []);

  const removeAttachment = useCallback((item) => {
    setAttachments((prev) => prev.filter((a) => a !== item));
  }, []);

  const handleRestart = useCallback(() => {
    Alert.alert(
      'New conversation',
      'Start a fresh chat with Mya? This will clear your current conversation history.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Start fresh', onPress: () => restartConversation() },
      ]
    );
  }, [restartConversation]);

  const data = useMemo(() => {
    const list = (Array.isArray(messages) ? messages : []).filter(
      (m) =>
        m &&
        ((m.content && String(m.content).trim().length > 0) ||
          (m.blocks && m.blocks.length > 0) ||
          (m.attachments && m.attachments.length > 0) ||
          m.isThinking)
    );
    const decorated = list.map((m, i) => {
      const isPhotoTurn =
        m.role !== 'user' &&
        i > 0 &&
        list[i - 1].role === 'user' &&
        ((list[i - 1].attachments && list[i - 1].attachments.length > 0) ||
          String(list[i - 1].content || '').includes('[Photo Attached:'));

      let content = m.content;
      let blocks = m.blocks ? [...m.blocks] : [];

      if (m.role !== 'user' && content) {
        content = filterUserSalutations(content);
      }

      return {
        ...m,
        content,
        blocks,
        isPhotoTurn,
        _dayLabel: dayLabelFor(m, i > 0 ? list[i - 1] : null),
        _showLabel: m.role !== 'user' && (i === 0 || list[i - 1].role === 'user'),
        _key: m.id || `${m.role}-${m.timestamp || ''}-${i}`,
      };
    });
    return decorated.reverse();
  }, [messages]);

  const isEmpty = data.length === 0;

  const renderItem = useCallback(
    ({ item }) => (
      <View style={styles.row}>
        {item._dayLabel ? (
          <View style={styles.daySep} accessibilityRole="header">
            <Text style={styles.daySepText}>{item._dayLabel}</Text>
          </View>
        ) : null}
        <MyaMessageRow
          message={item}
          showLabel={item._showLabel}
          onRetry={handleRetry}
          onQuickReply={handleQuickReply}
          onBlockAction={handleBlockAction}
        />
      </View>
    ),
    [handleRetry, handleQuickReply, handleBlockAction]
  );

  const keyExtractor = useCallback((item) => item._key, []);

  return (
    <MyaCapabilitiesProvider value={capabilities}>
    <MyaStorageProvider value={storage}>
    <MyaOffersProvider value={offersApi}>
    <View style={[styles.screen, { paddingTop: BlurView ? 0 : topInset }]}>
      <StatusBar barStyle="dark-content" />

      {/* Header: nav, hairline and context pill. Floats over the thread when a blur is provided. */}
      <View
        style={BlurView ? [styles.headerOverlay, { paddingTop: topInset }] : null}
        onLayout={BlurView ? (e) => setHeaderH(e.nativeEvent.layout.height) : undefined}
      >
      {BlurView ? (
        <>
          <BlurView
            style={StyleSheet.absoluteFill}
            blurType="light"
            blurAmount={18}
            reducedTransparencyFallbackColor={MyaColors.ivory}
          />
          <View style={[StyleSheet.absoluteFill, styles.headerTint]} pointerEvents="none" />
        </>
      ) : null}
      <View style={styles.nav}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.navBtn}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={24} color={MyaColors.onyx} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTitleContainer}
          onPress={() => setShowTooltip(true)}
          activeOpacity={0.78}
          hitSlop={{ top: 16, bottom: 16, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Mya Grounding Status"
        >
          <Text style={styles.navTitle}>Mya</Text>
          <MyaPresence size={22} mode={isThinking ? 'thinking' : isStreaming ? 'streaming' : 'idle'} />
        </TouchableOpacity>

        <View style={styles.navActions}>
          <TouchableOpacity
            onPress={handleRestart}
            style={styles.navBtnSmall}
            hitSlop={{ top: 16, bottom: 16, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="New conversation"
          >
            <Ionicons name="create-outline" size={22} color={MyaColors.onyx} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowHistorySheet(true)}
            style={styles.navBtnSmall}
            hitSlop={{ top: 16, bottom: 16, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Conversation history"
          >
            <Ionicons name="time-outline" size={22} color={MyaColors.onyx} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowMenu(true)}
            style={styles.navBtnSmall}
            hitSlop={{ top: 16, bottom: 16, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Mya Menu"
          >
            <Ionicons name="menu-outline" size={22} color={MyaColors.onyx} />
          </TouchableOpacity>
        </View>
      </View>

      <Animated.View style={[styles.navHairline, navBorderStyle]} pointerEvents="none" />

      {/* Context Pill (Artboards 1a–1i) */}
      <View style={styles.pillRow}>
        <View style={styles.pill}>
          <View style={styles.pillDot} />
          <Text style={styles.pillText}>
            {activeScreen && activeScreen !== 'Dashboard' && activeScreen !== 'MyaChatScreen'
              ? `Viewing your ${activeScreenTitle}`
              : 'Connected to your Hair Profile'}
          </Text>
        </View>
      </View>
      </View>

      {/* Grounding Tooltip Overlay (Artboard 1a/1b) */}
      {showTooltip && (
        <View style={styles.tooltipOverlay}>
          <TouchableOpacity
            style={styles.tooltipCloseArea}
            onPress={() => setShowTooltip(false)}
            activeOpacity={1}
            accessibilityRole="button"
            accessibilityLabel="Close tooltip"
          />
          <View style={styles.tooltipBox}>
            <View style={styles.tooltipHeader}>
              <Image
                source={require('./assets/myavana_small_logo.png')}
                style={styles.tooltipHeaderLogo}
                resizeMode="contain"
              />
              <Text style={styles.tooltipTitle}>Grounded Assistant</Text>
            </View>
            <Text style={styles.tooltipText}>
              Mya can see your strand profile and everything you've logged.
            </Text>
          </View>
        </View>
      )}

      {/* Attachment Sheet (Artboard 1f). Photos are context for Mya, not an analysis:
          the HairAI service does the measuring. */}
      {photosInChat ? (
        <MyaSheet
          visible={showAttachSheet}
          onClose={() => setShowAttachSheet(false)}
          title="Add a photo"
        >
          <TouchableOpacity
            style={styles.attachOption}
            onPress={() => {
              setShowAttachSheet(false);
              launchCamera && launchCamera({}, (res) => {
                const asset = res?.assets?.[0] || (res?.uri ? res : null);
                if (asset) setAttachments((prev) => [...prev, asset]);
              });
            }}
            activeOpacity={0.78}
          >
            <View style={styles.attachIconWrap}>
              <Ionicons name="camera-outline" size={22} color={MyaColors.onyx} />
            </View>
            <Text style={styles.attachOptionText}>Take a photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.attachOption}
            onPress={() => {
              setShowAttachSheet(false);
              launchImageLibrary && launchImageLibrary({}, (res) => {
                const asset = res?.assets?.[0] || (res?.uri ? res : null);
                if (asset) setAttachments((prev) => [...prev, asset]);
              });
            }}
            activeOpacity={0.78}
          >
            <View style={styles.attachIconWrap}>
              <Ionicons name="image-outline" size={22} color={MyaColors.onyx} />
            </View>
            <Text style={styles.attachOptionText}>Choose from library</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sheetCancelBtn}
            onPress={() => setShowAttachSheet(false)}
            activeOpacity={0.78}
          >
            <Text style={styles.sheetCancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </MyaSheet>
      ) : null}

      {/* Menu: host-specific entries first, then the entries every Mya has */}
      <MyaSheet
        visible={showMenu}
        onClose={() => setShowMenu(false)}
        title="Mya AI Concierge Menu"
      >
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={styles.menuItem}
            onPress={() => {
              setShowMenu(false);
              item.onPress && item.onPress({ send });
            }}
          >
            <Ionicons
              name={item.icon || 'sparkles-outline'}
              size={20}
              color={item.iconColor || MyaColors.berry}
              style={styles.menuItemIcon}
            />
            <View>
              <Text style={styles.menuItemText}>{item.title}</Text>
              {!!item.subtitle && <Text style={styles.menuItemSub}>{item.subtitle}</Text>}
            </View>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => {
            setShowMenu(false);
            setShowHistorySheet(true);
          }}
        >
          <Ionicons name="time-outline" size={20} color={MyaColors.berry} style={styles.menuItemIcon} />
          <View>
            <Text style={styles.menuItemText}>Past Conversations</Text>
            <Text style={styles.menuItemSub}>Browse previous chat history & advice</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, styles.menuItemLast]}
          onPress={() => {
            setShowMenu(false);
            handleRestart();
          }}
        >
          <Ionicons name="refresh-outline" size={20} color={MyaColors.berry} style={styles.menuItemIcon} />
          <View>
            <Text style={styles.menuItemText}>Reset Conversation</Text>
            <Text style={styles.menuItemSub}>Start a completely fresh chat session</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.sheetCancelBtn} onPress={() => setShowMenu(false)}>
          <Text style={styles.sheetCancelBtnText}>Close Menu</Text>
        </TouchableOpacity>
      </MyaSheet>

      {/* Conversation History Sheet (Artboard 1h) */}
      <MyaHistorySheet
        visible={showHistorySheet}
        onClose={() => setShowHistorySheet(false)}
        fetchConversations={fetchConversations}
        onSelectConversation={async (convId) => {
          try {
            await loadConversation(convId);
          } catch (err) {
            Alert.alert('History', 'Unable to load conversation history.');
          }
        }}
        onNewConversation={handleRestart}
      />

      {celebrating ? <MyaPetals onDone={() => setCelebrating(false)} /> : null}

      {/* Host modals (e.g. the app's Hair Weather) */}
      {typeof children === 'function' ? children({ send }) : children}

      {/* Main Thread Content */}
      {isEmpty ? (
        <View style={[styles.emptyWrap, BlurView && { paddingTop: headerH }]}>
          <MyaWelcome
            firstName={firstName}
            subtitle="I know your hair profile, your routine and everything you've logged. Ask me anything, or start here."
            starters={starters}
            onSelect={handleStarter}
          />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={data}
          inverted
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, BlurView && { paddingBottom: headerH }]}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          initialNumToRender={12}
          windowSize={11}
          scrollEventThrottle={64}
          onScroll={(e) => {
            const y = e.nativeEvent?.contentOffset?.y ?? 0;
            const near = y < 80;
            if (near !== atLatest) setAtLatest(near);
            const under = y > 8 ? 1 : 0;
            if (scrolledSv.value !== under) scrolledSv.value = timingTo(under, 'base');
          }}
          maintainVisibleContentPosition={atLatest ? undefined : { minIndexForVisible: 1 }}
        />
      )}

      {!isEmpty && !atLatest ? (
        <Animated.View style={styles.jumpWrap} entering={popEntering()}>
          <TouchableOpacity
            style={styles.jumpPill}
            onPress={() => listRef.current && listRef.current.scrollToOffset({ offset: 0, animated: true })}
            accessibilityRole="button"
            accessibilityLabel="Jump to latest message"
          >
            <Ionicons name="arrow-down" size={14} color={MyaColors.onyx} />
            <Text style={styles.jumpPillText}>Latest</Text>
          </TouchableOpacity>
        </Animated.View>
      ) : null}

      {/* Transport-level error (Artboard 1d / ErrorRow) */}
      {!!error && !isStreaming ? (
        <View style={styles.connWrap}>
          <ErrorRow onRetry={handleRetry} message={error && error.userMessage} />
        </View>
      ) : null}

      {/* Composer: flush to the keyboard when open, above the gesture bar when not */}
      <Animated.View
        style={[
          styles.composerWrap,
          keyboardLift,
          { paddingBottom: Platform.OS === 'ios' && isKeyboardOpen ? 0 : composerBottomPad },
        ]}
      >
        <MyaComposer
          value={draft}
          onChangeText={setDraft}
          onSend={handleSend}
          onStop={abortStream}
          onAttach={photosInChat ? handleAttach : undefined}
          onVoice={undefined}
          attachments={attachments}
          onRemoveAttachment={removeAttachment}
          isStreaming={isStreaming || isThinking}
        />
      </Animated.View>
    </View>
    </MyaOffersProvider>
    </MyaStorageProvider>
    </MyaCapabilitiesProvider>
  );
}

const styles = StyleSheet.create({
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 5,
    overflow: 'hidden',
  },
  headerTint: {
    backgroundColor: 'rgba(252, 229, 215, 0.18)',
  },
  navHairline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: MyaColors.ink13,
  },
  jumpWrap: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 96,
  },
  daySep: {
    alignSelf: 'center',
    marginTop: 14,
    marginBottom: 8,
  },
  daySepText: {
    ...MyaType.contextPill,
    color: MyaColors.ink45,
  },
  jumpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: MYA_TOUCH - 4,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: MyaColors.ivory,
    borderWidth: 1,
    borderColor: MyaColors.ink09,
  },
  jumpPillText: {
    ...MyaType.quickReply,
    color: MyaColors.onyx,
  },
  screen: {
    flex: 1,
    backgroundColor: MyaColors.sand,
  },
  nav: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginTop: Platform.OS === 'ios' ? 0 : moderateScale(36),
    zIndex: 100,
    elevation: 4,
  },
  navBtn: {
    width: MYA_TOUCH,
    height: MYA_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    ...MyaType.navTitle,
    color: MyaColors.onyx,
  },
  navTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerMyaLogo: {
    width: 24,
    height: 24,
    marginLeft: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },
  tooltipHeaderLogo: {
    width: 20,
    height: 20,
    marginRight: 8,
    borderRadius: 10,
    overflow: 'hidden',
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navBtnSmall: {
    width: MYA_TOUCH,
    height: MYA_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Sheet Items (Artboards 1f & 1h)
  attachOptionStrand: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: MyaColors.ivory,
    borderWidth: 1,
    borderColor: MyaColors.berrySoft,
    marginBottom: 10,
  },
  attachIconWrapBlush: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: MyaColors.blush,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  attachOptionTextWrap: {
    flex: 1,
  },
  attachOptionTitle: {
    fontFamily: MyaFonts.semibold,
    fontSize: moderateScale(14),
    color: MyaColors.onyx,
  },
  attachOptionSub: {
    ...MyaType.quickReply,
    color: MyaColors.ink56,
    fontSize: moderateScale(11),
    marginTop: 2,
  },
  attachOption: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: MyaColors.ivory,
    borderWidth: 1,
    borderColor: MyaColors.ink06,
    marginBottom: 10,
  },
  attachIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: MyaColors.sand,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  attachOptionText: {
    fontFamily: MyaFonts.medium,
    fontSize: moderateScale(14),
    color: MyaColors.onyx,
  },
  sheetCancelBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: MyaColors.sand,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  sheetCancelBtnText: {
    fontFamily: MyaFonts.semibold,
    fontSize: moderateScale(13),
    color: MyaColors.ink56,
  },

  // Menu Sheet Items
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: MyaColors.ink06,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemIcon: {
    marginRight: 14,
  },
  menuItemText: {
    fontFamily: MyaFonts.semibold,
    fontSize: moderateScale(13),
    color: MyaColors.onyx,
  },
  menuItemSub: {
    ...MyaType.quickReply,
    color: MyaColors.ink45,
    fontSize: moderateScale(10.5),
    marginTop: 1,
  },

  // Grounding Tooltip Overlay
  tooltipOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1100,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MyaColors.scrim,
  },
  tooltipCloseArea: {
    ...StyleSheet.absoluteFillObject,
  },
  tooltipBox: {
    width: '82%',
    backgroundColor: MyaColors.ivory,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: MyaColors.berryLine,
    shadowColor: MyaColors.onyx,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  tooltipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tooltipHeaderIcon: {
    marginRight: 8,
  },
  tooltipTitle: {
    fontFamily: MyaFonts.semibold,
    fontSize: moderateScale(14),
    color: MyaColors.berry,
  },
  tooltipText: {
    ...MyaType.message,
    fontSize: moderateScale(13),
    color: MyaColors.onyx,
    lineHeight: 19,
  },

  // Context Pill (Artboards 1a & 1b)
  pillRow: {
    alignItems: 'center',
    paddingBottom: 12,
    paddingTop: 4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: MyaColors.berryTint,
    maxWidth: '88%',
  },
  pillDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: MyaColors.berry,
    marginRight: 7,
  },
  pillText: {
    ...MyaType.contextPill,
    color: MyaColors.berry,
  },

  emptyWrap: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
  listContent: {
    paddingHorizontal: 18,
    paddingTop: 6,
  },
  row: {
    marginTop: 16,
  },
  connWrap: {
    marginHorizontal: 18,
    marginBottom: 6,
  },
  composerWrap: {
    paddingHorizontal: 14,
    paddingTop: 12,
  },
});
