const fs = require('fs');
const path = require('path');

const b64Path = path.join(__dirname, '../packages/widget/assets/mya-logo.b64');
let logoB64 = '';
if (fs.existsSync(b64Path)) {
    logoB64 = fs.readFileSync(b64Path, 'utf8').trim();
}

const widgetCode = `/**
 * Mya — Native AI Companion for MYAVANA Hair Journey (myhairjourney.ai)
 *
 * Luxury Mobile-First Floating AI Workspace & Hair Companion:
 *   - Official MYAVANA Brand Script Logo & Crisp Vector SVG Iconography (Zero Emojis)
 *   - Mobile-First Multi-View Navigation:
 *       1. Chat (Google AI Studio Command Center Workspace)
 *       2. Journey Stories (Visual milestone progress reels & photo timeline)
 *       3. Conversation History (Searchable sessions, "+ New Chat", resumption)
 *       4. Profile & Strand DNA (WordPress user data, bottom sheet / modal & quick actions)
 *   - Gemini Live Voice Chat (Web Audio fluid orb, acoustic barge-in, commit)
 *   - Composer Voice Dictation via gemini-3.5-transcribe with domain biasing
 *   - Tier-1 Generative UI Cards (goal_card, today_checklist, hair_profile, consultation)
 *   - Document Your Journey Photo Staging (Preserving HairAI CNN boundary)
 *
 * Public API:
 *   MyavanaWidget.init(options)
 *   MyavanaWidget.setContext(context)
 *   MyavanaWidget.logEvent(eventType, metadata)
 *   MyavanaWidget.open()
 *   MyavanaWidget.close()
 *   MyavanaWidget.toggleExpand()
 *   MyavanaWidget.switchView(viewName)
 *   MyavanaWidget.sendMessage(text)
 *   MyavanaWidget.startLiveVoice()
 *   MyavanaWidget.endLiveVoice()
 *   MyavanaWidget.openProfile()
 */
(function (window, document) {
    'use strict';

    var USER_ID_KEY = 'myavana_widget_user_id';
    var CONVERSATION_ID_KEY = 'myavana_widget_conversation_id';

    var MYA_LOGO_DATA_URI = 'data:image/png;base64,${logoB64}';

    var COLORS = {
        onyx: '#222323',
        onyxSoft: '#2e2f30',
        onyxDark: '#18191a',
        stone: '#f5f5f7',
        stoneAlt: '#ebebed',
        sand: '#eeece1',
        coral: '#e7a690',
        coralDark: '#d4956f',
        lightCoral: '#fce5d7',
        blueberry: '#4a4d68',
        muted: '#6e6e73',
        emerald: '#2e7d32',
        emeraldBg: '#e8f5e9',
        border: 'rgba(34, 35, 35, 0.08)',
        borderHover: 'rgba(34, 35, 35, 0.16)',
        white: '#ffffff'
    };

    // Elegant Vector SVG Icon Library (Zero Emojis)
    var ICONS = {
        chat: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
        stories: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8" fill="currentColor"/></svg>',
        history: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
        profile: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
        camera: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
        image: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
        journal: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="15" y2="11"/></svg>',
        goal: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
        routine: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="m9 14 2 2 4-4"/></svg>',
        mic: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>',
        micMute: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>',
        paperclip: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>',
        send: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>',
        plus: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
        close: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
        expand: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>',
        compress: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>',
        info: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
        check: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
        clock: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
        stop: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>',
        chevronRight: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
        search: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
        plusCircle: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
        sparkles: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>'
    };

    var state = {
        apiBase: '',
        position: 'bottom-left',
        userId: 'candace-demo',
        conversationId: null,
        open: false,
        expanded: false,
        infoOpen: false,
        drawerOpen: false,
        activeView: 'chat', // 'chat' | 'stories' | 'history'
        experienceContext: {
            surface: 'myhairjourney.ai',
            page: '/',
            view: 'home'
        },
        els: {},
        isStreaming: false,
        stagedPhoto: null,
        audioListening: false,
        activeStatusEl: null,
        // Voice Dictation
        dictationRecorder: null,
        dictationChunks: [],
        dictationStream: null,
        // Live Voice State
        liveVoiceState: 'idle',
        liveVoiceAudioCtx: null,
        liveVoiceAnalyser: null,
        liveVoiceStream: null,
        liveVoiceRecognition: null,
        liveVoiceTimer: null,
        liveVoiceDuration: 0,
        liveVoiceRaf: null,
        liveVoiceMuted: false,
        liveTurns: [],
        liveBlocks: [],
        bargeInFrames: 0,
        // Data Cache
        userProfile: null,
        journeyStories: [],
        conversationList: []
    };

    function safeStorageGet(key) {
        try { return window.localStorage.getItem(key); } catch (e) { return null; }
    }
    function safeStorageSet(key, value) {
        try { window.localStorage.setItem(key, value); } catch (e) { /* ignore */ }
    }

    function uuid() {
        if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = (Math.random() * 16) | 0, v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }

    function ensureIdentity() {
        var userId = safeStorageGet(USER_ID_KEY);
        if (!userId) {
            userId = 'candace-demo';
            safeStorageSet(USER_ID_KEY, userId);
        }
        var conversationId = safeStorageGet(CONVERSATION_ID_KEY);
        if (!conversationId) {
            conversationId = uuid();
            safeStorageSet(CONVERSATION_ID_KEY, conversationId);
        }
        state.userId = userId;
        state.conversationId = conversationId;
    }

    function getMyaLogoHtml(size, extraClass) {
        size = size || 26;
        extraClass = extraClass || '';
        return '<span class="mya-logo-badge ' + extraClass + '" style="width:' + size + 'px;height:' + size + 'px;"><img src="' + MYA_LOGO_DATA_URI + '" class="mya-logo-img" style="width:100%;height:100%;border-radius:50%;object-fit:cover;display:block;" alt="MYAVANA" /></span>';
    }

    // ---- CSS Design System (Mobile-First Luxury Styling) ----

    function injectStyles() {
        if (document.getElementById('myavana-widget-styles')) return;
        var style = document.createElement('style');
        style.id = 'myavana-widget-styles';
        style.textContent = [
            '@import url("https://fonts.googleapis.com/css2?family=Archivo:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap");',

            // Keyframe Animations
            '@keyframes myaFadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}',
            '@keyframes myaSlideUp{from{opacity:0;transform:translateY(16px) scale(0.98)}to{opacity:1;transform:translateY(0) scale(1)}}',
            '@keyframes myaPulse{0%{box-shadow:0 0 0 0 rgba(231,166,144,0.4)}70%{box-shadow:0 0 0 10px rgba(231,166,144,0)}100%{box-shadow:0 0 0 0 rgba(231,166,144,0)}}',
            '@keyframes myaShimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}',
            '@keyframes myaWave{0%,100%{height:6px}50%{height:18px}}',
            '@keyframes myaSheetSlideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}',

            // Logo Badge & Branding
            '.mya-logo-badge{display:inline-flex;align-items:center;justify-content:center;border-radius:50%;overflow:hidden;flex-shrink:0;box-shadow:0 2px 8px rgba(0,0,0,0.14);border:1px solid rgba(231,166,144,0.3);background:' + COLORS.onyx + ';}',
            '.mya-logo-badge.glow{box-shadow:0 0 12px rgba(231,166,144,0.5);border-color:' + COLORS.coral + ';}',

            // Launcher Button (Mobile-First Floating Companion Pill)
            '.mya-launcher{position:fixed;bottom:24px;left:24px;height:52px;padding:0 18px 0 10px;border-radius:9999px;',
            'background:' + COLORS.onyx + ';color:#ffffff;border:1px solid rgba(255,255,255,0.14);cursor:pointer;',
            'box-shadow:0 10px 28px rgba(0,0,0,0.2), 0 2px 8px rgba(231,166,144,0.2);',
            'display:flex;align-items:center;gap:10px;font-family:Archivo,-apple-system,sans-serif;font-size:14px;font-weight:600;',
            'z-index:999998;transition:all 0.22s cubic-bezier(0.4,0,0.2,1);outline:none;user-select:none;}',
            '.mya-launcher:hover{transform:translateY(-2px);box-shadow:0 14px 34px rgba(0,0,0,0.26), 0 4px 14px rgba(231,166,144,0.35);background:' + COLORS.onyxSoft + ';}',
            '.mya-launcher-badge{background:' + COLORS.coral + ';color:' + COLORS.onyx + ';font-size:10px;font-weight:700;padding:2px 7px;border-radius:9999px;text-transform:uppercase;letter-spacing:0.04em;}',
            '.mya-launcher.is-right{left:auto;right:24px;}',

            // Main AI Workspace Panel
            '.mya-panel{position:fixed;bottom:88px;left:24px;width:440px;max-width:94vw;height:680px;max-height:86vh;',
            'background:#ffffff;border-radius:24px;box-shadow:0 24px 60px rgba(0,0,0,0.18), 0 8px 24px rgba(231,166,144,0.12);',
            'display:flex;flex-direction:column;overflow:hidden;font-family:Archivo,-apple-system,sans-serif;z-index:999999;',
            'border:1px solid ' + COLORS.border + ';animation:myaSlideUp 0.26s cubic-bezier(0.16,1,0.3,1);transition:width 0.25s ease, height 0.25s ease;}',
            '.mya-panel.is-right{left:auto;right:24px;}',
            '.mya-panel.is-expanded{width:600px;height:740px;max-height:90vh;}',

            // Header (Clean, Premium, Brand Logo)
            '.mya-header{background:#ffffff;color:' + COLORS.onyx + ';padding:12px 16px;border-bottom:1px solid ' + COLORS.border + ';',
            'display:flex;align-items:center;justify-content:space-between;user-select:none;backdrop-filter:blur(10px);}',
            '.mya-header-left{display:flex;align-items:center;gap:8px;}',
            '.mya-header-title{display:flex;align-items:center;gap:6px;font-size:15px;font-weight:700;letter-spacing:-0.01em;}',
            '.mya-context-pill{display:inline-flex;align-items:center;gap:5px;background:' + COLORS.stone + ';color:' + COLORS.blueberry + ';',
            'font-size:11px;font-weight:600;padding:3px 9px;border-radius:9999px;border:1px solid ' + COLORS.border + ';}',
            '.mya-context-dot{width:6px;height:6px;border-radius:50%;background:' + COLORS.coral + ';display:inline-block;}',
            '.mya-header-actions{display:flex;align-items:center;gap:4px;}',
            '.mya-btn-icon{background:transparent;border:none;color:' + COLORS.muted + ';width:32px;height:32px;border-radius:50%;',
            'display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px;transition:all 0.15s ease;}',
            '.mya-btn-icon:hover{background:' + COLORS.stone + ';color:' + COLORS.onyx + ';}',
            '.mya-btn-icon.mobile-back{display:none;}',

            // Live Voice Header Action Button
            '.mya-btn-live-voice{background:linear-gradient(135deg,' + COLORS.onyx + ' 0%,' + COLORS.onyxSoft + ' 100%);color:#ffffff;',
            'border:1px solid rgba(231,166,144,0.4);border-radius:9999px;padding:5px 11px;font-size:11.5px;font-weight:600;cursor:pointer;',
            'display:inline-flex;align-items:center;gap:6px;transition:all 0.18s ease;box-shadow:0 2px 6px rgba(0,0,0,0.08);}',
            '.mya-btn-live-voice:hover{background:' + COLORS.coral + ';color:' + COLORS.onyx + ';border-color:' + COLORS.coral + ';transform:translateY(-1px);}',

            // Multi-View Navigation Bar (Chat | Stories | History | Profile)
            '.mya-nav-strip{background:' + COLORS.stone + ';border-bottom:1px solid ' + COLORS.border + ';display:flex;padding:4px 8px;gap:4px;user-select:none;}',
            '.mya-nav-item{flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:8px 4px;border-radius:10px;',
            'font-size:11.5px;font-weight:600;color:' + COLORS.muted + ';background:transparent;border:none;cursor:pointer;transition:all 0.16s ease;}',
            '.mya-nav-item:hover{color:' + COLORS.onyx + ';background:rgba(255,255,255,0.6);}',
            '.mya-nav-item.active{color:' + COLORS.onyx + ';background:#ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.04);font-weight:700;}',
            '.mya-nav-dot{width:5px;height:5px;border-radius:50%;background:' + COLORS.coral + ';display:inline-block;}',

            // Views Container
            '.mya-view-container{flex:1;overflow:hidden;position:relative;display:flex;flex-direction:column;}',
            '.mya-view{flex:1;display:none;flex-direction:column;overflow-y:auto;position:relative;scroll-behavior:smooth;}',
            '.mya-view.active{display:flex;}',

            // View 1: Stream (Chat View)
            '.mya-stream{flex:1;overflow-y:auto;padding:16px;background:' + COLORS.stone + ';scroll-behavior:smooth;-webkit-overflow-scrolling:touch;}',

            // View 2: Hair Journey Stories View
            '.mya-stories-view{padding:16px;background:' + COLORS.stone + ';gap:16px;}',
            '.mya-stories-reel{display:flex;gap:12px;overflow-x:auto;padding-bottom:10px;scroll-snap-type:x mandatory;}',
            '.mya-story-circle-wrap{display:flex;flex-direction:column;align-items:center;gap:5px;cursor:pointer;flex-shrink:0;scroll-snap-align:start;}',
            '.mya-story-ring{width:60px;height:60px;border-radius:50%;padding:2.5px;background:linear-gradient(135deg,' + COLORS.coral + ',' + COLORS.blueberry + ');display:flex;align-items:center;justify-content:center;transition:transform 0.18s ease;}',
            '.mya-story-circle-wrap:hover .mya-story-ring{transform:scale(1.05);}',
            '.mya-story-avatar{width:100%;height:100%;border-radius:50%;object-fit:cover;border:2px solid #ffffff;}',
            '.mya-story-label{font-size:10.5px;font-weight:600;color:' + COLORS.onyx + ';max-width:68px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
            '.mya-story-add-card{width:60px;height:60px;border-radius:50%;border:2px dashed ' + COLORS.coral + ';background:#ffffff;display:flex;align-items:center;justify-content:center;color:' + COLORS.coralDark + ';cursor:pointer;}',

            // Stories Timeline Card Feed
            '.mya-story-card{background:#ffffff;border:1px solid ' + COLORS.border + ';border-radius:18px;overflow:hidden;margin-bottom:14px;box-shadow:0 4px 16px rgba(0,0,0,0.03);}',
            '.mya-story-card-img{width:100%;height:190px;object-fit:cover;}',
            '.mya-story-card-body{padding:14px;}',
            '.mya-story-card-meta{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;}',

            // View 3: Conversation History View
            '.mya-history-view{padding:16px;background:' + COLORS.stone + ';gap:12px;}',
            '.mya-history-toolbar{display:flex;gap:8px;align-items:center;margin-bottom:12px;}',
            '.mya-new-chat-btn{flex:1;background:' + COLORS.onyx + ';color:#ffffff;border:none;border-radius:12px;padding:10px 14px;',
            'font-size:12.5px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;transition:background 0.16s ease;}',
            '.mya-new-chat-btn:hover{background:' + COLORS.coralDark + ';}',
            '.mya-history-search{width:100%;background:#ffffff;border:1px solid ' + COLORS.border + ';border-radius:12px;padding:8px 12px 8px 34px;',
            'font-size:12.5px;outline:none;font-family:Archivo,sans-serif;}',
            '.mya-history-search:focus{border-color:' + COLORS.coral + ';}',
            '.mya-history-group-title{font-size:11px;font-weight:700;color:' + COLORS.blueberry + ';text-transform:uppercase;letter-spacing:0.05em;margin:12px 0 6px;}',
            '.mya-history-item{background:#ffffff;border:1px solid ' + COLORS.border + ';border-radius:12px;padding:11px 14px;margin-bottom:6px;',
            'display:flex;align-items:center;justify-content:space-between;cursor:pointer;transition:all 0.16s ease;}',
            '.mya-history-item:hover{background:' + COLORS.stoneAlt + ';border-color:' + COLORS.coral + ';transform:translateY(-1px);}',

            // Mobile-First Profile Bottom Sheet / Desktop Modal (.mya-profile-sheet)
            '.mya-profile-sheet{position:absolute;inset:0;background:rgba(0,0,0,0.5);z-index:40;display:none;align-items:flex-end;backdrop-filter:blur(4px);}',
            '.mya-profile-sheet-content{width:100%;max-height:85vh;background:#ffffff;border-radius:24px 24px 0 0;padding:16px 20px 24px;',
            'overflow-y:auto;animation:myaSheetSlideUp 0.24s cubic-bezier(0.16,1,0.3,1);box-shadow:0 -10px 30px rgba(0,0,0,0.15);}',
            '.mya-sheet-handle{width:40px;height:4px;background:' + COLORS.sand + ';border-radius:9999px;margin:0 auto 14px;}',
            '.mya-profile-user-card{display:flex;align-items:center;gap:12px;margin-bottom:16px;padding-bottom:14px;border-bottom:1px solid ' + COLORS.border + ';}',
            '.mya-profile-user-avatar{width:52px;height:52px;border-radius:50%;object-fit:cover;border:2px solid ' + COLORS.coral + ';}',
            '.mya-profile-stats-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px;}',
            '.mya-profile-action-btn{width:100%;background:' + COLORS.stone + ';border:1px solid ' + COLORS.border + ';border-radius:12px;',
            'padding:10px 14px;font-size:12.5px;font-weight:600;color:' + COLORS.onyx + ';text-align:left;margin-bottom:6px;cursor:pointer;',
            'display:flex;align-items:center;justify-content:space-between;transition:all 0.16s ease;}',
            '.mya-profile-action-btn:hover{background:' + COLORS.lightCoral + ';border-color:' + COLORS.coral + ';}',

            // Jump to bottom indicator
            '.mya-jump-btn{position:sticky;bottom:8px;margin:0 auto;display:none;background:' + COLORS.onyx + ';color:#ffffff;',
            'border:none;border-radius:9999px;padding:6px 14px;font-size:11.5px;font-weight:600;cursor:pointer;',
            'box-shadow:0 4px 12px rgba(0,0,0,0.18);z-index:5;animation:myaFadeIn 0.2s ease;}',

            // Messages & Markdown
            '.mya-msg-row{display:flex;flex-direction:column;margin-bottom:14px;animation:myaFadeIn 0.22s ease;}',
            '.mya-msg-header{display:flex;align-items:center;gap:6px;font-size:11.5px;font-weight:600;color:' + COLORS.muted + ';margin-bottom:4px;padding:0 2px;}',
            '.mya-msg{max-width:88%;padding:12px 16px;border-radius:18px;font-size:13.5px;line-height:1.55;word-break:break-word;}',
            '.mya-msg.user{background:' + COLORS.onyx + ';color:#ffffff;margin-left:auto;border-bottom-right-radius:4px;}',
            '.mya-msg.assistant{background:#ffffff;color:' + COLORS.onyx + ';margin-right:auto;border-bottom-left-radius:4px;',
            'border:1px solid ' + COLORS.border + ';box-shadow:0 2px 6px rgba(0,0,0,0.03);}',

            // Status Indicator (Zero Telemetry)
            '.mya-status-indicator{display:inline-flex;align-items:center;gap:8px;padding:6px 12px;background:#ffffff;',
            'border:1px solid ' + COLORS.border + ';border-radius:9999px;font-size:12px;font-weight:500;color:' + COLORS.blueberry + ';',
            'margin-bottom:10px;box-shadow:0 2px 6px rgba(0,0,0,0.03);animation:myaFadeIn 0.2s ease;}',
            '.mya-status-shimmer{background:linear-gradient(90deg,' + COLORS.blueberry + ' 0%,' + COLORS.coral + ' 50%,' + COLORS.blueberry + ' 100%);',
            'background-size:200% 100%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;animation:myaShimmer 2.5s infinite linear;}',

            // Generative UI Semantic Cards
            '.mya-card{background:#ffffff;border:1px solid ' + COLORS.border + ';border-radius:18px;padding:16px;margin:10px 0;',
            'box-shadow:0 4px 16px rgba(0,0,0,0.04);max-width:94%;animation:myaFadeIn 0.25s ease;}',
            '.mya-card-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;}',
            '.mya-pill{display:inline-block;padding:3px 9px;border-radius:9999px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;background:' + COLORS.lightCoral + ';color:' + COLORS.onyx + ';}',
            '.mya-card-title{font-size:14.5px;font-weight:700;color:' + COLORS.onyx + ';margin:4px 0 0;letter-spacing:-0.01em;}',

            // Goal Card
            '.mya-goal-card{border-left:4px solid ' + COLORS.coral + ';}',
            '.mya-goal-pct{font-size:20px;font-weight:700;color:' + COLORS.coral + ';font-feature-settings:"tnum";}',
            '.mya-progress-track{width:100%;height:8px;background:' + COLORS.stone + ';border-radius:9999px;overflow:hidden;margin:10px 0;}',
            '.mya-progress-bar{height:100%;background:linear-gradient(90deg,' + COLORS.coral + ',' + COLORS.coralDark + ');border-radius:9999px;transition:width 0.6s cubic-bezier(0.4,0,0.2,1);}',
            '.mya-goal-meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:8px 10px;background:' + COLORS.stone + ';border-radius:10px;font-size:11.5px;color:' + COLORS.blueberry + ';margin-top:8px;}',
            '.mya-card-actions{display:flex;gap:8px;margin-top:12px;padding-top:10px;border-top:1px solid ' + COLORS.border + ';flex-wrap:wrap;}',
            '.mya-action-btn{background:' + COLORS.stone + ';border:1px solid ' + COLORS.border + ';border-radius:10px;padding:6px 13px;',
            'font-size:11.5px;font-weight:600;cursor:pointer;color:' + COLORS.onyx + ';transition:all 0.15s ease;display:inline-flex;align-items:center;gap:5px;}',
            '.mya-action-btn:hover{background:' + COLORS.sand + ';border-color:' + COLORS.borderHover + ';transform:translateY(-1px);}',
            '.mya-action-btn.primary{background:' + COLORS.onyx + ';color:#ffffff;border-color:' + COLORS.onyx + ';}',
            '.mya-action-btn.primary:hover{background:' + COLORS.coralDark + ';border-color:' + COLORS.coralDark + ';}',

            // Checklist
            '.mya-checklist-item{display:flex;align-items:center;justify-content:space-between;padding:9px 12px;background:' + COLORS.stone + ';',
            'border-radius:12px;margin-bottom:6px;font-size:12.5px;cursor:pointer;transition:all 0.16s ease;user-select:none;border:1px solid transparent;}',
            '.mya-checklist-item:hover{background:' + COLORS.stoneAlt + ';border-color:' + COLORS.border + ';}',
            '.mya-checklist-item.is-done{background:' + COLORS.emeraldBg + ';color:' + COLORS.emerald + ';border-color:rgba(46,125,50,0.15);}',
            '.mya-checklist-item.is-done .mya-check-text{text-decoration:line-through;opacity:0.8;}',
            '.mya-check-box{width:18px;height:18px;border-radius:50%;border:1.5px solid ' + COLORS.muted + ';display:flex;align-items:center;justify-content:center;margin-right:10px;font-size:11px;font-weight:700;transition:all 0.18s ease;flex-shrink:0;}',
            '.mya-checklist-item.is-done .mya-check-box{background:' + COLORS.emerald + ';color:#ffffff;border-color:' + COLORS.emerald + ';}',
            '.mya-synced-badge{display:inline-flex;align-items:center;gap:4px;font-size:10.5px;font-weight:600;color:' + COLORS.emerald + ';margin-top:8px;}',

            // Consultation Card
            '.mya-consult-card{background:linear-gradient(135deg,' + COLORS.onyx + ' 0%,' + COLORS.blueberry + ' 100%);color:#ffffff;border-radius:18px;padding:18px;margin:10px 0;max-width:94%;box-shadow:0 8px 24px rgba(34,35,35,0.16);}',
            '.mya-consult-card h4{margin:8px 0 6px;font-size:15px;color:#ffffff;font-weight:700;}',
            '.mya-consult-card p{margin:0 0 14px;font-size:12.5px;color:rgba(255,255,255,0.82);line-height:1.5;}',
            '.mya-consult-btn{background:' + COLORS.coral + ';color:' + COLORS.onyx + ';border:none;border-radius:12px;padding:8px 16px;',
            'font-size:12px;font-weight:700;cursor:pointer;transition:all 0.16s ease;display:inline-flex;align-items:center;gap:6px;}',

            // Google AI Studio Command Center Composer Box
            '.mya-composer-box{background:#ffffff;border-top:1px solid ' + COLORS.border + ';padding:10px 16px 14px;position:relative;}',
            '.mya-input-wrapper{background:' + COLORS.stone + ';border:1px solid ' + COLORS.border + ';border-radius:18px;padding:10px 12px 8px;',
            'transition:all 0.2s ease;display:flex;flex-direction:column;gap:8px;}',
            '.mya-input-wrapper:focus-within{background:#ffffff;border-color:' + COLORS.coral + ';box-shadow:0 0 0 3px rgba(231,166,144,0.18);}',
            '.mya-textarea{width:100%;min-height:42px;max-height:130px;background:transparent;border:none;outline:none;',
            'font-family:Archivo,-apple-system,sans-serif;font-size:13.5px;line-height:1.45;color:' + COLORS.onyx + ';resize:none;}',
            '.mya-textarea::placeholder{color:' + COLORS.muted + ';}',

            // Composer Action Bar
            '.mya-action-bar{display:flex;align-items:center;justify-content:space-between;}',
            '.mya-action-group-left{display:flex;align-items:center;gap:4px;}',
            '.mya-action-group-right{display:flex;align-items:center;gap:6px;}',
            '.mya-tool-btn{background:transparent;border:none;color:' + COLORS.muted + ';width:34px;height:34px;border-radius:50%;',
            'display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.15s ease;}',
            '.mya-tool-btn:hover{background:rgba(34,35,35,0.06);color:' + COLORS.onyx + ';}',
            '.mya-tool-btn.active{color:' + COLORS.coralDark + ';background:' + COLORS.lightCoral + ';}',
            '.mya-send-btn{width:34px;height:34px;border-radius:50%;background:' + COLORS.onyx + ';color:#ffffff;border:none;',
            'display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.18s ease;}',
            '.mya-send-btn:hover{background:' + COLORS.coralDark + ';transform:scale(1.05);}',
            '.mya-send-btn:disabled{background:' + COLORS.stoneAlt + ';color:' + COLORS.muted + ';cursor:not-allowed;transform:none;}',

            // Attachment Drawer Menu
            '.mya-drawer{position:absolute;bottom:78px;left:16px;background:#ffffff;border:1px solid ' + COLORS.border + ';',
            'border-radius:16px;box-shadow:0 12px 32px rgba(0,0,0,0.14);padding:8px 0;width:240px;display:none;z-index:20;animation:myaFadeIn 0.18s ease;}',
            '.mya-drawer-item{display:flex;align-items:center;gap:10px;padding:10px 16px;font-size:12.5px;font-weight:500;',
            'color:' + COLORS.onyx + ';cursor:pointer;transition:background 0.14s ease;user-select:none;}',
            '.mya-drawer-item:hover{background:' + COLORS.stone + ';}',

            // Gemini Live Voice Chat Overlay
            '.mya-live-overlay{position:absolute;inset:0;z-index:50;background:radial-gradient(circle at 50% 25%, #25262c 0%, #17181b 70%, #101012 100%);',
            'color:#ffffff;display:none;flex-direction:column;justify-content:space-between;padding:18px 20px 24px;overflow:hidden;font-family:Archivo,-apple-system,sans-serif;}',
            '.mya-live-top-bar{display:flex;align-items:center;justify-content:space-between;}',
            '.mya-live-status-pill{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,0.08);padding:4px 12px;border-radius:9999px;border:1px solid rgba(255,255,255,0.12);font-size:11.5px;font-weight:600;}',
            '.mya-live-dot{width:7px;height:7px;border-radius:50%;background:#4caf50;box-shadow:0 0 8px #4caf50;animation:myaPulse 2s infinite;}',
            '.mya-live-dot.thinking{background:' + COLORS.coral + ';box-shadow:0 0 8px ' + COLORS.coral + ';}',
            '.mya-live-dot.speaking{background:' + COLORS.coral + ';box-shadow:0 0 10px ' + COLORS.coral + ';}',
            '.mya-live-canvas-wrap{position:relative;width:240px;height:240px;display:flex;align-items:center;justify-content:center;cursor:pointer;margin:0 auto;}',
            '.mya-live-canvas{width:240px;height:240px;border-radius:50%;}',
            '.mya-live-state-banner{display:inline-flex;align-items:center;gap:7px;background:rgba(255,255,255,0.08);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.12);border-radius:9999px;padding:6px 14px;font-size:12px;font-weight:600;margin-top:14px;color:rgba(255,255,255,0.9);}',
            '.mya-live-ticker-card{background:rgba(255,255,255,0.06);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.1);border-radius:18px;padding:12px 16px;min-height:56px;max-height:85px;overflow-y:auto;font-size:13px;line-height:1.45;color:#ffffff;margin-bottom:14px;}',
            '.mya-live-controls{display:flex;align-items:center;justify-content:center;gap:14px;}',
            '.mya-live-btn{background:rgba(255,255,255,0.12);color:#ffffff;border:1px solid rgba(255,255,255,0.16);border-radius:9999px;height:44px;padding:0 18px;font-size:12.5px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:8px;}',
            '.mya-live-btn-end{background:linear-gradient(135deg,#d32f2f 0%,#b71c1c 100%);color:#ffffff;border:none;height:44px;padding:0 20px;border-radius:9999px;font-size:12.5px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:8px;}',

            // Audio Listening Wave State
            '.mya-audio-wave{display:none;align-items:center;gap:3px;height:20px;margin-left:6px;}',
            '.mya-audio-bar{width:3px;background:' + COLORS.coralDark + ';border-radius:3px;animation:myaWave 0.8s infinite ease-in-out;}',
            '.mya-audio-bar:nth-child(2){animation-delay:0.15s;}',
            '.mya-audio-bar:nth-child(3){animation-delay:0.3s;}',

            // Mobile-First Responsive Breakpoint (< 640px)
            '@media (max-width: 640px) {',
            '  .mya-panel{position:fixed;inset:0;width:100vw;max-width:100vw;height:100vh;max-height:100vh;border-radius:0;border:none;left:0!important;right:0!important;bottom:0!important;}',
            '  .mya-btn-icon.mobile-back{display:flex;}',
            '  .mya-btn-icon.expand-btn{display:none;}',
            '  .mya-composer-box{padding-bottom:max(14px, env(safe-area-inset-bottom, 14px));}',
            '  .mya-launcher{bottom:16px;left:16px;}',
            '  .mya-profile-sheet-content{border-radius:24px 24px 0 0;}',
            '}'
        ].join('\\n');
        document.head.appendChild(style);
    }

    // ---- DOM Builder ----

    function buildWidget() {
        var side = state.position === 'bottom-right' ? 'is-right' : '';

        // Launcher Button
        var launcher = document.createElement('button');
        launcher.className = 'mya-launcher ' + side;
        launcher.setAttribute('aria-label', 'Open Mya Hair AI Companion');
        launcher.innerHTML = [
            getMyaLogoHtml(30, 'glow'),
            '<span>Mya</span>',
            '<span class="mya-launcher-badge">AI</span>'
        ].join('');
        launcher.addEventListener('click', togglePanel);

        // Main Panel
        var panel = document.createElement('div');
        panel.className = 'mya-panel ' + side;
        panel.style.display = 'none';

        // Header
        var header = document.createElement('div');
        header.className = 'mya-header';

        var headerLeft = document.createElement('div');
        headerLeft.className = 'mya-header-left';

        var backBtn = document.createElement('button');
        backBtn.className = 'mya-btn-icon mobile-back';
        backBtn.innerHTML = ICONS.arrowLeft;
        backBtn.setAttribute('aria-label', 'Back');
        backBtn.addEventListener('click', togglePanel);

        var titleBox = document.createElement('div');
        titleBox.className = 'mya-header-title';
        titleBox.innerHTML = getMyaLogoHtml(26) + '<span>Mya</span>';

        var contextPill = document.createElement('div');
        contextPill.className = 'mya-context-pill';
        contextPill.innerHTML = '<span class="mya-context-dot"></span><span class="mya-context-text">Hair Journey</span>';

        headerLeft.appendChild(backBtn);
        headerLeft.appendChild(titleBox);
        headerLeft.appendChild(contextPill);

        var headerActions = document.createElement('div');
        headerActions.className = 'mya-header-actions';

        var liveVoiceBtn = document.createElement('button');
        liveVoiceBtn.className = 'mya-btn-live-voice';
        liveVoiceBtn.innerHTML = ICONS.mic + '<span>Live Voice</span>';
        liveVoiceBtn.setAttribute('title', 'Start Gemini Live Voice Session');
        liveVoiceBtn.addEventListener('click', startLiveVoice);

        var expandBtn = document.createElement('button');
        expandBtn.className = 'mya-btn-icon expand-btn';
        expandBtn.innerHTML = ICONS.expand;
        expandBtn.setAttribute('title', 'Expand workspace');
        expandBtn.addEventListener('click', toggleExpand);

        var closeBtn = document.createElement('button');
        closeBtn.className = 'mya-btn-icon';
        closeBtn.innerHTML = ICONS.close;
        closeBtn.setAttribute('aria-label', 'Close');
        closeBtn.addEventListener('click', togglePanel);

        headerActions.appendChild(liveVoiceBtn);
        headerActions.appendChild(expandBtn);
        headerActions.appendChild(closeBtn);

        header.appendChild(headerLeft);
        header.appendChild(headerActions);

        // Multi-View Navigation Strip
        var navStrip = document.createElement('nav');
        navStrip.className = 'mya-nav-strip';
        navStrip.innerHTML = [
            '<button class="mya-nav-item active" data-view="chat">' + ICONS.chat + '<span>Chat</span></button>',
            '<button class="mya-nav-item" data-view="stories">' + ICONS.stories + '<span>Stories</span><span class="mya-nav-dot"></span></button>',
            '<button class="mya-nav-item" data-view="history">' + ICONS.history + '<span>History</span></button>',
            '<button class="mya-nav-item" data-view="profile">' + ICONS.profile + '<span>Profile</span></button>'
        ].join('');

        navStrip.addEventListener('click', function (e) {
            var btn = e.target.closest('.mya-nav-item');
            if (!btn) return;
            var view = btn.getAttribute('data-view');
            switchView(view);
        });

        // Views Container
        var viewsContainer = document.createElement('div');
        viewsContainer.className = 'mya-view-container';

        // 1. Chat View
        var chatView = document.createElement('div');
        chatView.className = 'mya-view active';
        chatView.setAttribute('data-view-pane', 'chat');

        var stream = document.createElement('div');
        stream.className = 'mya-stream';
        stream.addEventListener('scroll', function () {
            state.els.atBottom = isNearBottom(stream);
            state.els.jumpBtn.style.display = state.els.atBottom ? 'none' : 'block';
        });

        var jumpBtn = document.createElement('button');
        jumpBtn.className = 'mya-jump-btn';
        jumpBtn.innerHTML = ICONS.send + '<span>New updates</span>';
        jumpBtn.addEventListener('click', function () {
            scrollToBottom(stream);
            jumpBtn.style.display = 'none';
        });

        chatView.appendChild(stream);
        chatView.appendChild(jumpBtn);

        // 2. Journey Stories View
        var storiesView = document.createElement('div');
        storiesView.className = 'mya-view mya-stories-view';
        storiesView.setAttribute('data-view-pane', 'stories');

        // 3. Conversation History View
        var historyView = document.createElement('div');
        historyView.className = 'mya-view mya-history-view';
        historyView.setAttribute('data-view-pane', 'history');

        viewsContainer.appendChild(chatView);
        viewsContainer.appendChild(storiesView);
        viewsContainer.appendChild(historyView);

        // Composer Box (Active in Chat View)
        var composerBox = document.createElement('div');
        composerBox.className = 'mya-composer-box';

        var photoStage = document.createElement('div');
        photoStage.className = 'mya-photo-stage';
        photoStage.style.display = 'none';

        var cameraInput = document.createElement('input');
        cameraInput.type = 'file';
        cameraInput.accept = 'image/*';
        cameraInput.capture = 'environment';
        cameraInput.style.display = 'none';
        cameraInput.addEventListener('change', handleFileInput);

        var fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        fileInput.addEventListener('change', handleFileInput);

        var drawer = document.createElement('div');
        drawer.className = 'mya-drawer';
        drawer.innerHTML = [
            '<div class="mya-drawer-item" data-action="camera">' + ICONS.camera + '<span>Take journey photo</span></div>',
            '<div class="mya-drawer-item" data-action="upload">' + ICONS.image + '<span>Upload from device</span></div>',
            '<div class="mya-drawer-item" data-action="journal">' + ICONS.journal + '<span>Add journal check-in</span></div>',
            '<div class="mya-drawer-item" data-action="goal">' + ICONS.goal + '<span>Review active goals</span></div>',
            '<div class="mya-drawer-item" data-action="routine">' + ICONS.routine + '<span>Show today\\'s routine</span></div>'
        ].join('');

        drawer.addEventListener('click', function (e) {
            var item = e.target.closest('.mya-drawer-item');
            if (!item) return;
            var action = item.getAttribute('data-action');
            toggleDrawer(false);
            if (action === 'camera') cameraInput.click();
            else if (action === 'upload') fileInput.click();
            else if (action === 'journal') sendMessage('I would like to record a hair journey journal entry');
            else if (action === 'goal') sendMessage('What are my current hair goals?');
            else if (action === 'routine') sendMessage('Show today\\'s routine checklist');
        });

        var inputWrapper = document.createElement('div');
        inputWrapper.className = 'mya-input-wrapper';

        var textarea = document.createElement('textarea');
        textarea.className = 'mya-textarea';
        textarea.rows = 1;
        textarea.placeholder = 'Ask Mya about your hair journey...';

        textarea.addEventListener('input', function () {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 130) + 'px';
            sendBtn.disabled = this.value.trim().length === 0 && !state.stagedPhoto;
        });

        textarea.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submitComposer();
            }
        });

        var actionBar = document.createElement('div');
        actionBar.className = 'mya-action-bar';

        var leftGroup = document.createElement('div');
        leftGroup.className = 'mya-action-group-left';

        var plusBtn = document.createElement('button');
        plusBtn.className = 'mya-tool-btn';
        plusBtn.innerHTML = ICONS.plus;
        plusBtn.setAttribute('title', 'Add to conversation');
        plusBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            toggleDrawer();
        });

        var quickCameraBtn = document.createElement('button');
        quickCameraBtn.className = 'mya-tool-btn';
        quickCameraBtn.innerHTML = ICONS.camera;
        quickCameraBtn.setAttribute('title', 'Document journey photo');
        quickCameraBtn.addEventListener('click', function () {
            cameraInput.click();
        });

        var quickClipBtn = document.createElement('button');
        quickClipBtn.className = 'mya-tool-btn';
        quickClipBtn.innerHTML = ICONS.paperclip;
        quickClipBtn.setAttribute('title', 'Upload image');
        quickClipBtn.addEventListener('click', function () {
            fileInput.click();
        });

        leftGroup.appendChild(plusBtn);
        leftGroup.appendChild(quickCameraBtn);
        leftGroup.appendChild(quickClipBtn);

        var rightGroup = document.createElement('div');
        rightGroup.className = 'mya-action-group-right';

        var audioWave = document.createElement('div');
        audioWave.className = 'mya-audio-wave';
        audioWave.innerHTML = '<div class="mya-audio-bar"></div><div class="mya-audio-bar"></div><div class="mya-audio-bar"></div>';

        var micBtn = document.createElement('button');
        micBtn.className = 'mya-tool-btn';
        micBtn.innerHTML = ICONS.mic;
        micBtn.setAttribute('title', 'Voice dictation');
        micBtn.addEventListener('click', toggleVoiceInput);

        var sendBtn = document.createElement('button');
        sendBtn.className = 'mya-send-btn';
        sendBtn.innerHTML = ICONS.send;
        sendBtn.disabled = true;
        sendBtn.setAttribute('aria-label', 'Send message');
        sendBtn.addEventListener('click', submitComposer);

        rightGroup.appendChild(audioWave);
        rightGroup.appendChild(micBtn);
        rightGroup.appendChild(sendBtn);

        actionBar.appendChild(leftGroup);
        actionBar.appendChild(rightGroup);

        inputWrapper.appendChild(textarea);
        inputWrapper.appendChild(actionBar);

        composerBox.appendChild(photoStage);
        composerBox.appendChild(drawer);
        composerBox.appendChild(inputWrapper);
        composerBox.appendChild(cameraInput);
        composerBox.appendChild(fileInput);

        // Profile Bottom Sheet / Modal
        var profileSheet = buildProfileSheet();

        // Gemini Live Voice Overlay
        var liveOverlay = buildLiveOverlay();

        panel.appendChild(header);
        panel.appendChild(navStrip);
        panel.appendChild(viewsContainer);
        panel.appendChild(composerBox);
        panel.appendChild(profileSheet);
        panel.appendChild(liveOverlay);

        document.body.appendChild(launcher);
        document.body.appendChild(panel);

        state.els = {
            launcher: launcher,
            panel: panel,
            header: header,
            navStrip: navStrip,
            contextText: contextPill.querySelector('.mya-context-text'),
            expandBtn: expandBtn,
            viewsContainer: viewsContainer,
            stream: stream,
            storiesView: storiesView,
            historyView: historyView,
            profileSheet: profileSheet,
            jumpBtn: jumpBtn,
            composerBox: composerBox,
            textarea: textarea,
            sendBtn: sendBtn,
            drawer: drawer,
            photoStage: photoStage,
            micBtn: micBtn,
            audioWave: audioWave,
            liveOverlay: liveOverlay,
            liveTimer: liveOverlay.querySelector('.mya-live-timer'),
            liveDot: liveOverlay.querySelector('.mya-live-dot'),
            liveCanvas: liveOverlay.querySelector('.mya-live-canvas'),
            liveStateBanner: liveOverlay.querySelector('.mya-live-state-banner'),
            liveTickerRole: liveOverlay.querySelector('.mya-live-ticker-role'),
            liveTickerText: liveOverlay.querySelector('.mya-live-ticker-text'),
            liveMuteBtn: liveOverlay.querySelector('.mya-live-btn-icon-only'),
            atBottom: true
        };

        // Render initial views
        renderStoriesView();
        loadConversationHistory();
        loadUserProfileData();
        updateContextUI();
    }

    // ---- Multi-View Switcher ----

    function switchView(viewName) {
        state.activeView = viewName;

        // Update nav strip active state
        var navItems = state.els.navStrip.querySelectorAll('.mya-nav-item');
        navItems.forEach(function (item) {
            item.classList.toggle('active', item.getAttribute('data-view') === viewName);
        });

        // If user tapped Profile, open profile sheet modal directly
        if (viewName === 'profile') {
            openProfileSheet();
            return;
        }

        // Toggle views
        var panes = state.els.viewsContainer.querySelectorAll('.mya-view');
        panes.forEach(function (pane) {
            pane.classList.toggle('active', pane.getAttribute('data-view-pane') === viewName);
        });

        // Composer is only visible in Chat view
        state.els.composerBox.style.display = viewName === 'chat' ? 'block' : 'none';

        if (viewName === 'chat') {
            if (state.els.stream.children.length === 0) {
                renderEmptyState();
            }
            scrollToBottom(state.els.stream);
        } else if (viewName === 'stories') {
            renderStoriesView();
        } else if (viewName === 'history') {
            loadConversationHistory();
        }
    }

    // ---- View 2: Hair Journey Stories ----

    function renderStoriesView() {
        var container = state.els.storiesView;
        container.innerHTML = '';

        var sampleStories = [
            {
                id: 1,
                title: 'Wash Day & Steam Treatment',
                date: 'Sept 4, 2026',
                category: 'Wash Day',
                moisture: '5/5',
                notes: 'Clarifying wash followed by deep conditioning under steam cap. Coils are soft and hydrated.',
                imageUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=500&auto=format&fit=crop&q=80'
            },
            {
                id: 2,
                title: 'Length Retention Check',
                date: 'Aug 20, 2026',
                category: 'Length Check',
                moisture: '4/5',
                notes: 'Measured crown and nape. Retained approx 1.7 inches of growth since spring with zero breakage!',
                imageUrl: 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=500&auto=format&fit=crop&q=80'
            },
            {
                id: 3,
                title: 'Protective Twist Out',
                date: 'Aug 08, 2026',
                category: 'Milestone',
                moisture: '5/5',
                notes: 'Installed mini twists with shea butter seal. Kept in for 3 weeks with high retention.',
                imageUrl: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=500&auto=format&fit=crop&q=80'
            }
        ];

        // Horizontal Story Avatar Reel
        var reelHeader = document.createElement('div');
        reelHeader.innerHTML = '<div style="font-size:13px;font-weight:700;color:' + COLORS.onyx + ';margin-bottom:8px;display:flex;align-items:center;gap:6px;">' + ICONS.stories + '<span>Hair Journey Stories</span></div>';
        container.appendChild(reelHeader);

        var reel = document.createElement('div');
        reel.className = 'mya-stories-reel';

        // Add Story Button
        var addBtnWrap = document.createElement('div');
        addBtnWrap.className = 'mya-story-circle-wrap';
        addBtnWrap.innerHTML = '<div class="mya-story-add-card">' + ICONS.plus + '</div><span class="mya-story-label">+ Add Entry</span>';
        addBtnWrap.addEventListener('click', function () {
            switchView('chat');
            document.querySelector('.mya-composer-box input[type="file"]').click();
        });
        reel.appendChild(addBtnWrap);

        sampleStories.forEach(function (story) {
            var item = document.createElement('div');
            item.className = 'mya-story-circle-wrap';
            item.innerHTML = [
                '<div class="mya-story-ring">',
                '  <img src="' + story.imageUrl + '" class="mya-story-avatar" alt="' + story.title + '" />',
                '</div>',
                '<span class="mya-story-label">' + story.category + '</span>'
            ].join('');

            item.addEventListener('click', function () {
                openStoryViewer(story);
            });
            reel.appendChild(item);
        });

        container.appendChild(reel);

        // Timeline Feed
        var feedTitle = document.createElement('div');
        feedTitle.innerHTML = '<div style="font-size:12px;font-weight:700;color:' + COLORS.blueberry + ';text-transform:uppercase;letter-spacing:0.04em;margin:8px 0 10px;">Recent Journey Entries</div>';
        container.appendChild(feedTitle);

        sampleStories.forEach(function (story) {
            var card = document.createElement('div');
            card.className = 'mya-story-card';
            card.innerHTML = [
                '<img src="' + story.imageUrl + '" class="mya-story-card-img" alt="' + story.title + '" />',
                '<div class="mya-story-card-body">',
                '  <div class="mya-story-card-meta">',
                '    <span class="mya-pill">' + story.category + '</span>',
                '    <span style="font-size:11px;color:' + COLORS.blueberry + ';">' + story.date + '</span>',
                '  </div>',
                '  <h4 style="margin:4px 0 6px;font-size:14px;color:' + COLORS.onyx + ';">' + story.title + '</h4>',
                '  <p style="margin:0 0 10px;font-size:12px;color:#555;line-height:1.45;">' + story.notes + '</p>',
                '  <div style="font-size:11.5px;color:' + COLORS.blueberry + ';margin-bottom:10px;">Moisture Rating: <strong>' + story.moisture + '</strong></div>',
                '  <button class="mya-action-btn primary ask-mya-btn" style="width:100%;justify-content:center;">' + ICONS.chat + ' <span>Ask Mya about this entry</span></button>',
                '</div>'
            ].join('');

            card.querySelector('.ask-mya-btn').addEventListener('click', function () {
                switchView('chat');
                sendMessage('Tell me more about my hair journey progress on ' + story.date + ' (' + story.title + ')');
            });

            container.appendChild(card);
        });
    }

    function openStoryViewer(story) {
        renderMutationConfirmation({
            title: story.title + ' (' + story.date + ')',
            currentValue: 'Category: ' + story.category,
            proposedValue: 'Moisture: ' + story.moisture,
            callback: function () {
                switchView('chat');
                sendMessage('Review my hair progress for ' + story.title);
            }
        });
    }

    // ---- View 3: Conversation History ----

    function loadConversationHistory() {
        var container = state.els.historyView;
        container.innerHTML = '';

        var toolbar = document.createElement('div');
        toolbar.className = 'mya-history-toolbar';

        var newChatBtn = document.createElement('button');
        newChatBtn.className = 'mya-new-chat-btn';
        newChatBtn.innerHTML = ICONS.plusCircle + '<span>New Conversation</span>';
        newChatBtn.addEventListener('click', startNewConversation);
        toolbar.appendChild(newChatBtn);
        container.appendChild(toolbar);

        var searchWrap = document.createElement('div');
        searchWrap.style.position = 'relative';
        searchWrap.style.marginBottom = '12px';
        searchWrap.innerHTML = '<span style="position:absolute;left:12px;top:10px;color:' + COLORS.muted + ';">' + ICONS.search + '</span>' +
            '<input type="text" class="mya-history-search" placeholder="Filter conversations..." />';
        container.appendChild(searchWrap);

        var searchInput = searchWrap.querySelector('input');
        searchInput.addEventListener('input', function () {
            var q = this.value.toLowerCase();
            container.querySelectorAll('.mya-history-item').forEach(function (item) {
                var txt = item.textContent.toLowerCase();
                item.style.display = txt.indexOf(q) !== -1 ? 'flex' : 'none';
            });
        });

        fetch(state.apiBase + '/conversations?userId=' + encodeURIComponent(state.userId))
            .then(function (res) { return res.json(); })
            .then(function (data) {
                renderHistoryList(data.conversations || []);
            })
            .catch(function () {
                renderHistoryList([
                    { id: 'sample-1', summary: 'Length Retention & Moisture Regimen', messageCount: 6, updatedAt: 'Just now' },
                    { id: 'sample-2', summary: 'Crown Breakage & Wash Day Troubleshooting', messageCount: 8, updatedAt: 'Yesterday' },
                    { id: 'sample-3', summary: 'Type 4C Hydration Routine Review', messageCount: 4, updatedAt: 'Aug 30' }
                ]);
            });
    }

    function renderHistoryList(conversations) {
        var container = state.els.historyView;
        var existingList = container.querySelector('.mya-history-list-wrap');
        if (existingList) existingList.remove();

        var listWrap = document.createElement('div');
        listWrap.className = 'mya-history-list-wrap';

        if (conversations.length === 0) {
            listWrap.innerHTML = '<div style="text-align:center;padding:30px 10px;color:' + COLORS.muted + ';font-size:12.5px;">No previous conversations found. Start a new one!</div>';
            container.appendChild(listWrap);
            return;
        }

        var todayTitle = document.createElement('div');
        todayTitle.className = 'mya-history-group-title';
        todayTitle.textContent = 'Recent Conversations';
        listWrap.appendChild(todayTitle);

        conversations.forEach(function (conv) {
            var item = document.createElement('div');
            item.className = 'mya-history-item';
            item.innerHTML = [
                '<div style="flex:1;overflow:hidden;margin-right:8px;">',
                '  <div style="font-size:13px;font-weight:600;color:' + COLORS.onyx + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + (conv.summary || 'Hair Journey Advisory') + '</div>',
                '  <div style="font-size:11px;color:' + COLORS.muted + ';margin-top:2px;">' + (conv.messageCount || 2) + ' messages • ' + (conv.updatedAt || 'Recent') + '</div>',
                '</div>',
                '<span style="color:' + COLORS.muted + ';">' + ICONS.chevronRight + '</span>'
            ].join('');

            item.addEventListener('click', function () {
                resumeConversation(conv.id);
            });
            listWrap.appendChild(item);
        });

        container.appendChild(listWrap);
    }

    function startNewConversation() {
        fetch(state.apiBase + '/conversations/new', { method: 'POST' })
            .then(function (res) { return res.json(); })
            .then(function (data) {
                state.conversationId = data.conversationId;
                safeStorageSet(CONVERSATION_ID_KEY, data.conversationId);
                state.els.stream.innerHTML = '';
                switchView('chat');
                renderEmptyState();
            })
            .catch(function () {
                var newId = uuid();
                state.conversationId = newId;
                safeStorageSet(CONVERSATION_ID_KEY, newId);
                state.els.stream.innerHTML = '';
                switchView('chat');
                renderEmptyState();
            });
    }

    function resumeConversation(convId) {
        state.conversationId = convId;
        safeStorageSet(CONVERSATION_ID_KEY, convId);
        state.els.stream.innerHTML = '';
        switchView('chat');

        var statusEl = appendStatusIndicator('Loading conversation history…');

        fetch(state.apiBase + '/conversations/' + encodeURIComponent(convId) + '?userId=' + encodeURIComponent(state.userId))
            .then(function (res) { return res.json(); })
            .then(function (data) {
                statusEl.remove();
                var history = data.chatHistory || [];
                if (history.length === 0) {
                    renderEmptyState();
                    return;
                }
                history.forEach(function (msg) {
                    var role = msg.role === 'user' ? 'user' : 'assistant';
                    var content = msg.content || '';
                    if (role === 'user') {
                        content = content.replace(/^\\d{4}-\\d{2}-\\d{2}T[^ ]+ - User Said: /, '');
                        appendUserMessage(content);
                    } else {
                        var b = appendAssistantMessage('');
                        b.innerHTML = parseMarkdown(content);
                    }
                });
                scrollToBottom(state.els.stream);
            })
            .catch(function () {
                statusEl.remove();
                renderEmptyState();
            });
    }

    // ---- View 4: Mobile-First Profile Bottom Sheet / Modal ----

    function buildProfileSheet() {
        var sheet = document.createElement('div');
        sheet.className = 'mya-profile-sheet';

        var content = document.createElement('div');
        content.className = 'mya-profile-sheet-content';

        sheet.appendChild(content);

        sheet.addEventListener('click', function (e) {
            if (e.target === sheet) {
                closeProfileSheet();
            }
        });

        return sheet;
    }

    function openProfileSheet() {
        state.els.profileSheet.style.display = 'flex';
        renderProfileSheetContent();
    }

    function closeProfileSheet() {
        state.els.profileSheet.style.display = 'none';
        // Reset nav item active state back to current view
        var navItems = state.els.navStrip.querySelectorAll('.mya-nav-item');
        navItems.forEach(function (item) {
            item.classList.toggle('active', item.getAttribute('data-view') === state.activeView);
        });
    }

    function loadUserProfileData() {
        var restBase = (window.myavanaSettings && window.myavanaSettings.restBase) || '/wp-json/myavana/v1';
        fetch(restBase + '/profile')
            .then(function (res) { return res.json(); })
            .then(function (data) {
                state.userProfile = data;
            })
            .catch(function () {
                state.userProfile = {
                    name: 'Candace Harris',
                    hairType: 'Type 4C (Coily)',
                    porosity: 'Normal Porosity',
                    density: 'Medium Density',
                    elasticity: 'High Elasticity',
                    goal: 'Retain 4 Inches Length by Dec 2026',
                    moisture: '71% Consistency'
                };
            });
    }

    function renderProfileSheetContent() {
        var content = state.els.profileSheet.querySelector('.mya-profile-sheet-content');
        var p = state.userProfile || {
            name: 'Candace Harris',
            hairType: 'Type 4C (Coily)',
            porosity: 'Normal Porosity',
            density: 'Medium Density',
            elasticity: 'High Elasticity',
            goal: 'Retain 4 Inches Length by Dec 2026',
            moisture: '71% Consistency'
        };

        content.innerHTML = [
            '<div class="mya-sheet-handle"></div>',
            '<div class="mya-profile-user-card">',
            '  ' + getMyaLogoHtml(48, 'glow'),
            '  <div style="flex:1;">',
            '    <h3 style="margin:0 0 2px;font-size:16px;color:' + COLORS.onyx + ';">' + (p.name || 'Candace Harris') + '</h3>',
            '    <div style="font-size:11.5px;color:' + COLORS.blueberry + ';">MYAVANA Hair Journey Member</div>',
            '  </div>',
            '  <span class="mya-pill" style="background:#e5efe6;color:#2e7d32;">Official HHCP</span>',
            '</div>',

            '<div style="font-size:12px;font-weight:700;color:' + COLORS.onyx + ';margin-bottom:8px;display:flex;align-items:center;gap:6px;">' + ICONS.profile + '<span>Verified Strand DNA</span></div>',
            '<div class="mya-profile-stats-grid">',
            '  <div style="background:' + COLORS.stone + ';padding:10px;border-radius:12px;border:1px solid ' + COLORS.border + ';">',
            '    <div style="font-size:10px;color:' + COLORS.muted + ';text-transform:uppercase;">Hair Texture</div>',
            '    <div style="font-size:13px;font-weight:700;color:' + COLORS.onyx + ';margin-top:2px;">' + (p.hairType || 'Type 4C (Coily)') + '</div>',
            '  </div>',
            '  <div style="background:' + COLORS.stone + ';padding:10px;border-radius:12px;border:1px solid ' + COLORS.border + ';">',
            '    <div style="font-size:10px;color:' + COLORS.muted + ';text-transform:uppercase;">Porosity</div>',
            '    <div style="font-size:13px;font-weight:700;color:' + COLORS.onyx + ';margin-top:2px;">' + (p.porosity || 'Normal Porosity') + '</div>',
            '  </div>',
            '  <div style="background:' + COLORS.stone + ';padding:10px;border-radius:12px;border:1px solid ' + COLORS.border + ';">',
            '    <div style="font-size:10px;color:' + COLORS.muted + ';text-transform:uppercase;">Density</div>',
            '    <div style="font-size:13px;font-weight:700;color:' + COLORS.onyx + ';margin-top:2px;">' + (p.density || 'Medium Density') + '</div>',
            '  </div>',
            '  <div style="background:' + COLORS.stone + ';padding:10px;border-radius:12px;border:1px solid ' + COLORS.border + ';">',
            '    <div style="font-size:10px;color:' + COLORS.muted + ';text-transform:uppercase;">Active Goal</div>',
            '    <div style="font-size:13px;font-weight:700;color:' + COLORS.coralDark + ';margin-top:2px;">4\" Length Retention</div>',
            '  </div>',
            '</div>',

            '<div style="font-size:12px;font-weight:700;color:' + COLORS.onyx + ';margin:14px 0 8px;">Quick Actions</div>',
            '<button class="mya-profile-action-btn" data-act="log">' +
            '  <div style="display:flex;align-items:center;gap:8px;">' + ICONS.camera + '<span>Log Wash Day Progress Photo</span></div>' +
            '  ' + ICONS.chevronRight +
            '</button>',
            '<button class="mya-profile-action-btn" data-act="routine">' +
            '  <div style="display:flex;align-items:center;gap:8px;">' + ICONS.routine + '<span>Show Today\\'s Wash Day Checklist</span></div>' +
            '  ' + ICONS.chevronRight +
            '</button>',
            '<button class="mya-profile-action-btn" data-act="goal">' +
            '  <div style="display:flex;align-items:center;gap:8px;">' + ICONS.goal + '<span>Review & Adjust Length Goal</span></div>' +
            '  ' + ICONS.chevronRight +
            '</button>',
            '<button class="mya-profile-action-btn" data-act="consult">' +
            '  <div style="display:flex;align-items:center;gap:8px;">' + ICONS.sparkles + '<span>Book Licensed Stylist Consultation</span></div>' +
            '  ' + ICONS.chevronRight +
            '</button>',
            '<button class="mya-action-btn primary" style="width:100%;justify-content:center;margin-top:12px;padding:11px;" id="mya-sheet-close-btn">' + ICONS.close + ' <span>Done</span></button>'
        ].join('');

        content.querySelector('#mya-sheet-close-btn').addEventListener('click', closeProfileSheet);

        content.querySelectorAll('.mya-profile-action-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var act = this.getAttribute('data-act');
                closeProfileSheet();
                switchView('chat');
                if (act === 'log') document.querySelector('.mya-composer-box input[type="file"]').click();
                else if (act === 'routine') sendMessage('Show today\\'s routine checklist');
                else if (act === 'goal') sendMessage('What are my current hair goals?');
                else if (act === 'consult') sendMessage('I would like to book a 1-on-1 virtual stylist consultation');
            });
        });
    }

    // ---- Empty State & Context Starters ----

    function getContextualStarters() {
        var p = (state.experienceContext.page || '').toLowerCase();
        var v = (state.experienceContext.view || '').toLowerCase();

        if (p.indexOf('/goals') !== -1 || v.indexOf('goal') !== -1) {
            return [
                { text: 'Review my active hair goals', prompt: 'What are my current hair goals?' },
                { text: 'Help me adjust my length target', prompt: 'I want to review and adjust my length retention goal target' },
                { text: 'What should I focus on this week?', prompt: 'What should I focus on this week to reach my goal?' }
            ];
        }
        if (p.indexOf('/routine') !== -1 || v.indexOf('routine') !== -1) {
            return [
                { text: 'Show today\\'s wash day checklist', prompt: 'Show today\\'s routine checklist' },
                { text: 'Why is deep conditioning important for me?', prompt: 'Why is the deep conditioning step important for my hair type?' },
                { text: 'Mark deep conditioning complete', prompt: 'I completed deep conditioning for today' }
            ];
        }
        if (p.indexOf('/journal') !== -1 || v.indexOf('journal') !== -1) {
            return [
                { text: 'Quick check-in for today', prompt: 'I want to log a quick check-in for my hair today' },
                { text: 'Document journey photo', prompt: 'I want to upload a progress photo for my journal' },
                { text: 'Record a length check', prompt: 'Help me record a new length check' }
            ];
        }
        return [
            { text: 'Review my active hair goals', prompt: 'What are my current hair goals?' },
            { text: 'Show today\\'s routine checklist', prompt: 'Show today\\'s routine checklist' },
            { text: 'Help me log a journey entry', prompt: 'Help me log a hair journey journal entry' }
        ];
    }

    function renderEmptyState() {
        var container = state.els.stream;
        container.innerHTML = '';

        var wrap = document.createElement('div');
        wrap.className = 'mya-empty-state';
        wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;text-align:center;padding:28px 16px 20px;';

        wrap.innerHTML = [
            getMyaLogoHtml(56, 'glow'),
            '<h3 style="font-size:20px;font-weight:700;color:' + COLORS.onyx + ';margin:12px 0 6px;letter-spacing:-0.02em;">Meet Mya</h3>',
            '<p style="font-size:13px;color:' + COLORS.muted + ';line-height:1.55;max-width:320px;margin:0 0 20px;">Your personal companion for your Myavana Hair Journey. I can help you review your goals, stay on top of your routine, and document your progress.</p>',
            '<div style="font-size:11px;font-weight:700;color:' + COLORS.blueberry + ';text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;">What would you like to do?</div>'
        ].join('');

        var startersGrid = document.createElement('div');
        startersGrid.style.cssText = 'display:flex;flex-direction:column;gap:8px;width:100%;max-width:340px;';

        var starters = getContextualStarters();
        starters.forEach(function (s) {
            var btn = document.createElement('button');
            btn.className = 'mya-starter-btn';
            btn.style.cssText = 'background:#ffffff;border:1px solid ' + COLORS.border + ';color:' + COLORS.onyx + ';border-radius:12px;padding:10px 14px;font-size:12.5px;font-weight:500;text-align:left;cursor:pointer;display:flex;align-items:center;gap:8px;transition:all 0.16s ease;box-shadow:0 1px 4px rgba(0,0,0,0.03);';
            btn.innerHTML = ICONS.sparkles + '<span>' + s.text + '</span>';
            btn.addEventListener('click', function () {
                wrap.remove();
                sendMessage(s.prompt);
            });
            startersGrid.appendChild(btn);
        });

        wrap.appendChild(startersGrid);
        container.appendChild(wrap);
    }

    function updateContextUI() {
        if (!state.els.contextText) return;
        var p = (state.experienceContext.page || '').toLowerCase();
        var v = (state.experienceContext.view || '').toLowerCase();
        var label = 'Hair Journey';

        if (p.indexOf('/goals') !== -1 || v.indexOf('goal') !== -1) label = 'Goals';
        else if (p.indexOf('/routine') !== -1 || v.indexOf('routine') !== -1) label = 'Routine';
        else if (p.indexOf('/today') !== -1 || v.indexOf('today') !== -1) label = 'Today Hub';
        else if (p.indexOf('/journal') !== -1 || v.indexOf('journal') !== -1) label = 'Journal';

        state.els.contextText.textContent = label;
    }

    function toggleExpand() {
        state.expanded = !state.expanded;
        state.els.panel.classList.toggle('is-expanded', state.expanded);
        state.els.expandBtn.innerHTML = state.expanded ? ICONS.compress : ICONS.expand;
        state.els.expandBtn.setAttribute('title', state.expanded ? 'Compress workspace' : 'Expand workspace');
    }

    function togglePanel() {
        state.open = !state.open;
        state.els.panel.style.display = state.open ? 'flex' : 'none';
        if (state.open) {
            if (state.els.stream.children.length === 0) {
                renderEmptyState();
            }
            state.els.textarea.focus();
        }
    }

    function toggleDrawer(force) {
        state.drawerOpen = typeof force === 'boolean' ? force : !state.drawerOpen;
        state.els.drawer.style.display = state.drawerOpen ? 'block' : 'none';
    }

    // ---- Voice Input / Dictation via Gemini 3.5 Transcribe ----

    function toggleVoiceInput() {
        if (state.audioListening) {
            stopDictation();
        } else {
            startDictation();
        }
    }

    function startDictation() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            fallbackSpeechRecognition();
            return;
        }

        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(function (stream) {
                state.dictationStream = stream;
                state.dictationChunks = [];

                var mimeType = 'audio/webm';
                if (window.MediaRecorder && !MediaRecorder.isTypeSupported('audio/webm')) {
                    if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
                    else mimeType = '';
                }

                var options = mimeType ? { mimeType: mimeType } : {};
                var recorder = new MediaRecorder(stream, options);
                state.dictationRecorder = recorder;

                recorder.ondataavailable = function (e) {
                    if (e.data && e.data.size > 0) {
                        state.dictationChunks.push(e.data);
                    }
                };

                recorder.onstop = function () {
                    if (state.dictationStream) {
                        state.dictationStream.getTracks().forEach(function (t) { t.stop(); });
                        state.dictationStream = null;
                    }
                    processDictationAudio();
                };

                recorder.start(250);
                state.audioListening = true;
                state.els.micBtn.classList.add('active');
                state.els.audioWave.style.display = 'flex';
                state.els.textarea.placeholder = 'Listening to your voice... (tap mic to finish)';
            })
            .catch(function (err) {
                console.warn('[Mya Voice] Mic access failed, falling back:', err);
                fallbackSpeechRecognition();
            });
    }

    function stopDictation() {
        if (state.dictationRecorder && state.dictationRecorder.state !== 'inactive') {
            state.audioListening = false;
            state.els.micBtn.classList.remove('active');
            state.els.audioWave.style.display = 'none';
            state.els.textarea.placeholder = 'Transcribing with Gemini 3.5...';
            state.dictationRecorder.stop();
        } else {
            state.audioListening = false;
            state.els.micBtn.classList.remove('active');
            state.els.audioWave.style.display = 'none';
            state.els.textarea.placeholder = 'Ask Mya about your hair journey...';
        }
    }

    function processDictationAudio() {
        if (!state.dictationChunks || state.dictationChunks.length === 0) {
            state.els.textarea.placeholder = 'Ask Mya about your hair journey...';
            return;
        }

        var blobType = (state.dictationRecorder && state.dictationRecorder.mimeType) || 'audio/webm';
        var audioBlob = new Blob(state.dictationChunks, { type: blobType });
        state.dictationChunks = [];

        var reader = new FileReader();
        reader.onload = function () {
            var base64Data = (reader.result || '').split(',')[1];
            if (!base64Data) {
                state.els.textarea.placeholder = 'Ask Mya about your hair journey...';
                return;
            }

            fetch(state.apiBase + '/audio/transcribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    audioData: base64Data,
                    mimeType: blobType,
                    customVocabulary: ['HHCP', 'porosity', 'type 4A', 'type 4B', 'type 4C', 'pre-poo', 'clarifying cleanse', 'Candace', 'Mya', 'HairAI']
                })
            })
                .then(function (res) { return res.json(); })
                .then(function (data) {
                    state.els.textarea.placeholder = 'Ask Mya about your hair journey...';
                    if (data && data.success && data.text) {
                        var existing = state.els.textarea.value.trim();
                        state.els.textarea.value = existing ? (existing + ' ' + data.text) : data.text;
                        state.els.textarea.style.height = 'auto';
                        state.els.textarea.style.height = Math.min(state.els.textarea.scrollHeight, 130) + 'px';
                        state.els.sendBtn.disabled = false;
                    }
                })
                .catch(function (err) {
                    console.error('[Mya Voice] Transcription error:', err);
                    state.els.textarea.placeholder = 'Ask Mya about your hair journey...';
                });
        };
        reader.readAsDataURL(audioBlob);
    }

    function fallbackSpeechRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            var recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            state.audioListening = true;
            state.els.micBtn.classList.add('active');
            state.els.audioWave.style.display = 'flex';
            state.els.textarea.placeholder = 'Listening to your voice...';

            recognition.onresult = function (event) {
                var transcript = event.results[0][0].transcript;
                var existing = state.els.textarea.value.trim();
                state.els.textarea.value = existing ? (existing + ' ' + transcript) : transcript;
                state.els.textarea.style.height = 'auto';
                state.els.textarea.style.height = Math.min(state.els.textarea.scrollHeight, 130) + 'px';
                state.els.sendBtn.disabled = false;
                state.audioListening = false;
                state.els.micBtn.classList.remove('active');
                state.els.audioWave.style.display = 'none';
                state.els.textarea.placeholder = 'Ask Mya about your hair journey...';
            };
            recognition.onerror = function () {
                state.audioListening = false;
                state.els.micBtn.classList.remove('active');
                state.els.audioWave.style.display = 'none';
                state.els.textarea.placeholder = 'Ask Mya about your hair journey...';
            };
            recognition.start();
        } else {
            state.els.textarea.placeholder = 'Microphone not supported in this browser';
            setTimeout(function () {
                state.els.textarea.placeholder = 'Ask Mya about your hair journey...';
            }, 2000);
        }
    }

    // ---- Gemini Mobile App-Style Live Voice Chat Overlay ----

    function buildLiveOverlay() {
        var overlay = document.createElement('div');
        overlay.className = 'mya-live-overlay';

        var topBar = document.createElement('div');
        topBar.className = 'mya-live-top-bar';

        var statusPill = document.createElement('div');
        statusPill.className = 'mya-live-status-pill';
        statusPill.innerHTML = '<span class="mya-live-dot"></span><span class="mya-live-timer">00:00</span>';

        var title = document.createElement('div');
        title.style.cssText = 'font-size:14px;font-weight:700;display:flex;align-items:center;gap:6px;';
        title.innerHTML = getMyaLogoHtml(24) + '<span>Mya Live Voice</span>';

        var closeBtn = document.createElement('button');
        closeBtn.className = 'mya-btn-icon';
        closeBtn.style.color = '#ffffff';
        closeBtn.innerHTML = ICONS.close;
        closeBtn.setAttribute('title', 'End Live Voice Call');
        closeBtn.addEventListener('click', endLiveVoice);

        topBar.appendChild(statusPill);
        topBar.appendChild(title);
        topBar.appendChild(closeBtn);

        var center = document.createElement('div');
        center.style.cssText = 'flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;margin:12px 0;';

        var canvasWrap = document.createElement('div');
        canvasWrap.className = 'mya-live-canvas-wrap';
        canvasWrap.setAttribute('title', 'Tap to interrupt');
        canvasWrap.addEventListener('click', function () {
            if (state.liveVoiceState === 'speaking' || state.liveVoiceState === 'thinking') {
                interruptMya();
            }
        });

        var canvas = document.createElement('canvas');
        canvas.className = 'mya-live-canvas';
        canvas.width = 480;
        canvas.height = 480;
        canvasWrap.appendChild(canvas);

        var stateBanner = document.createElement('div');
        stateBanner.className = 'mya-live-state-banner';
        stateBanner.innerHTML = '<span>● Listening</span> <span style="opacity:0.7;font-weight:400;">• Speak naturally</span>';

        center.appendChild(canvasWrap);
        center.appendChild(stateBanner);

        var tickerCard = document.createElement('div');
        tickerCard.className = 'mya-live-ticker-card';
        tickerCard.innerHTML = '<div class="mya-live-ticker-role" style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:' + COLORS.coral + ';margin-bottom:3px;">Mya Live</div><div class="mya-live-ticker-text" style="color:rgba(255,255,255,0.95);">Say something to Mya to start live voice chat...</div>';

        var controls = document.createElement('div');
        controls.className = 'mya-live-controls';

        var muteBtn = document.createElement('button');
        muteBtn.className = 'mya-live-btn mya-live-btn-icon-only';
        muteBtn.innerHTML = ICONS.mic;
        muteBtn.setAttribute('title', 'Toggle mute');
        muteBtn.addEventListener('click', toggleLiveMute);

        var interruptBtn = document.createElement('button');
        interruptBtn.className = 'mya-live-btn';
        interruptBtn.innerHTML = ICONS.stop + '<span>Interrupt</span>';
        interruptBtn.setAttribute('title', 'Tap to interrupt Mya');
        interruptBtn.addEventListener('click', interruptMya);

        var endBtn = document.createElement('button');
        endBtn.className = 'mya-live-btn-end';
        endBtn.innerHTML = ICONS.close + '<span>End Call</span>';
        endBtn.addEventListener('click', endLiveVoice);

        controls.appendChild(muteBtn);
        controls.appendChild(interruptBtn);
        controls.appendChild(endBtn);

        overlay.appendChild(topBar);
        overlay.appendChild(center);
        overlay.appendChild(tickerCard);
        overlay.appendChild(controls);

        return overlay;
    }

    function setLiveVoiceState(newState) {
        state.liveVoiceState = newState;
        if (!state.els.liveDot || !state.els.liveStateBanner) return;

        state.els.liveDot.className = 'mya-live-dot' + (newState === 'thinking' ? ' thinking' : (newState === 'speaking' ? ' speaking' : ''));

        if (newState === 'listening') {
            state.els.liveStateBanner.innerHTML = '<span>● Listening</span> <span style="opacity:0.7;font-weight:400;">• Speak naturally</span>';
        } else if (newState === 'thinking') {
            state.els.liveStateBanner.innerHTML = '<span>● Thinking</span> <span style="opacity:0.7;font-weight:400;">• Checking your Hair Journey...</span>';
        } else if (newState === 'speaking') {
            state.els.liveStateBanner.innerHTML = '<span>● Speaking</span> <span style="opacity:0.7;font-weight:400;">• Tap anywhere to interrupt</span>';
        }
    }

    function drawLiveOrb() {
        if (state.liveVoiceState === 'idle') return;

        var canvas = state.els.liveCanvas;
        if (!canvas) return;
        var ctx = canvas.getContext('2d');
        if (!ctx) return;

        var width = canvas.width;
        var height = canvas.height;
        var cx = width / 2;
        var cy = height / 2;

        var avg = 0;
        if (state.liveVoiceAnalyser && !state.liveVoiceMuted) {
            var freqData = new Uint8Array(state.liveVoiceAnalyser.frequencyBinCount);
            state.liveVoiceAnalyser.getByteFrequencyData(freqData);
            var sum = 0;
            for (var i = 0; i < freqData.length; i++) sum += freqData[i];
            avg = sum / freqData.length;

            if (state.liveVoiceState === 'speaking' && avg > 36) {
                state.bargeInFrames = (state.bargeInFrames || 0) + 1;
                if (state.bargeInFrames >= 4) {
                    state.bargeInFrames = 0;
                    interruptMya();
                }
            } else {
                state.bargeInFrames = 0;
            }
        }

        ctx.clearRect(0, 0, width, height);
        var now = performance.now() * 0.002;

        if (state.liveVoiceState === 'thinking') {
            var coreGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 80);
            coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
            coreGrad.addColorStop(0.4, 'rgba(231, 166, 144, 0.7)');
            coreGrad.addColorStop(1, 'rgba(231, 166, 144, 0)');
            ctx.fillStyle = coreGrad;
            ctx.beginPath();
            ctx.arc(cx, cy, 80, 0, Math.PI * 2);
            ctx.fill();

            for (var r = 1; r <= 3; r++) {
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(now * (r % 2 === 0 ? 1 : -1) * (0.8 / r));
                ctx.strokeStyle = r === 1 ? 'rgba(231, 166, 144, 0.8)' : (r === 2 ? 'rgba(238, 236, 225, 0.6)' : 'rgba(255, 255, 255, 0.4)');
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.ellipse(0, 0, 70 + r * 18, (70 + r * 18) * 0.55, 0, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
        } else {
            var isSpeaking = state.liveVoiceState === 'speaking';
            var pulse = isSpeaking ? (Math.sin(now * 5) * 14 + 16) : (avg * 0.6);
            var baseR = 72 + pulse;

            var waves = [
                { color: 'rgba(231, 166, 144, 0.85)', width: 3.5, blur: 20, speed: 1.2, count: 6, amp: 8 + pulse * 0.3 },
                { color: 'rgba(238, 236, 225, 0.75)', width: 2.5, blur: 14, speed: -0.9, count: 5, amp: 6 + pulse * 0.2 },
                { color: 'rgba(255, 255, 255, 0.6)', width: 2.0, blur: 10, speed: 1.5, count: 7, amp: 4 + pulse * 0.15 }
            ];

            for (var w = 0; w < waves.length; w++) {
                var wave = waves[w];
                ctx.save();
                ctx.strokeStyle = wave.color;
                ctx.lineWidth = wave.width;
                ctx.beginPath();

                var steps = 100;
                for (var s = 0; s <= steps; s++) {
                    var theta = (s / steps) * Math.PI * 2;
                    var offset = Math.sin(theta * wave.count + now * wave.speed * 3) * wave.amp;
                    var rad = baseR + offset;
                    var x = cx + Math.cos(theta) * rad;
                    var y = cy + Math.sin(theta) * rad;
                    if (s === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.stroke();
                ctx.restore();
            }

            var coreGrad2 = ctx.createRadialGradient(cx, cy, 8, cx, cy, 45 + pulse * 0.2);
            coreGrad2.addColorStop(0, '#ffffff');
            coreGrad2.addColorStop(0.5, COLORS.lightCoral);
            coreGrad2.addColorStop(1, 'rgba(231, 166, 144, 0.1)');
            ctx.fillStyle = coreGrad2;
            ctx.beginPath();
            ctx.arc(cx, cy, 45 + pulse * 0.2, 0, Math.PI * 2);
            ctx.fill();
        }

        state.liveVoiceRaf = requestAnimationFrame(drawLiveOrb);
    }

    function initLiveSpeechRecognition() {
        if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) return null;
        var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        var recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = function (event) {
            if (state.liveVoiceState === 'speaking') interruptMya();
            var interim = '';
            var final = '';
            for (var i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) final += event.results[i][0].transcript;
                else interim += event.results[i][0].transcript;
            }
            var transcript = (final || interim).trim();
            if (transcript) {
                state.els.liveTickerRole.textContent = 'YOU';
                state.els.liveTickerText.textContent = transcript;
            }
            if (final && final.trim().length > 0) {
                handleLiveUserUtterance(final.trim());
            }
        };

        recognition.onerror = function () {};
        recognition.onend = function () {
            if (state.liveVoiceState !== 'idle' && !state.liveVoiceMuted) {
                try { recognition.start(); } catch (e) {}
            }
        };
        return recognition;
    }

    function handleLiveUserUtterance(text) {
        if (!text || state.liveVoiceState === 'thinking') return;
        state.liveTurns.push({ role: 'user', content: text, timestamp: new Date().toISOString() });
        setLiveVoiceState('thinking');

        var accumulated = '';
        fetch(state.apiBase + '/chat/stream', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/x-ndjson, text/plain;q=0.9'
            },
            body: JSON.stringify({
                message: text,
                from: state.userId,
                groupId: state.conversationId,
                experienceContext: getContextPayload()
            })
        })
            .then(function (res) {
                if (!res.ok || !res.body) throw new Error('Stream error');
                var reader = res.body.getReader();
                var decoder = new TextDecoder();
                var lineBuffer = '';

                function pump() {
                    return reader.read().then(function (result) {
                        if (result.done) {
                            speakLiveAssistantResponse(accumulated);
                            return;
                        }
                        var chunk = decoder.decode(result.value, { stream: true });
                        lineBuffer += chunk;
                        var newlineIdx;
                        while ((newlineIdx = lineBuffer.indexOf('\\n')) !== -1) {
                            var line = lineBuffer.slice(0, newlineIdx).trim();
                            lineBuffer = lineBuffer.slice(newlineIdx + 1);
                            if (line) {
                                try {
                                    var frame = JSON.parse(line);
                                    if (frame.t === 'delta' && frame.text) {
                                        accumulated += frame.text;
                                        state.els.liveTickerRole.textContent = 'MYA';
                                        state.els.liveTickerText.textContent = accumulated;
                                    } else if (frame.t === 'block' && frame.block) {
                                        state.liveBlocks.push(frame.block);
                                    }
                                } catch (e) {
                                    accumulated += line;
                                }
                            }
                        }
                        return pump();
                    });
                }
                return pump();
            })
            .catch(function () {
                speakLiveAssistantResponse("I'm here with you. What would you like to explore next in your Hair Journey?");
            });
    }

    function speakLiveAssistantResponse(text) {
        if (!text || state.liveVoiceState === 'idle') return;
        state.liveTurns.push({ role: 'assistant', content: text, timestamp: new Date().toISOString() });
        setLiveVoiceState('speaking');
        state.els.liveTickerRole.textContent = 'MYA';
        state.els.liveTickerText.textContent = text;

        var clean = text.replace(/[*#_\`]/g, '').replace(/https?:\\/\\/\\S+/g, '').trim();

        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            var utt = new SpeechSynthesisUtterance(clean);
            utt.rate = 1.05;
            utt.pitch = 1.0;
            utt.onend = function () {
                if (state.liveVoiceState === 'speaking') setLiveVoiceState('listening');
            };
            utt.onerror = function () {
                if (state.liveVoiceState === 'speaking') setLiveVoiceState('listening');
            };
            window.speechSynthesis.speak(utt);
        } else {
            setTimeout(function () {
                if (state.liveVoiceState === 'speaking') setLiveVoiceState('listening');
            }, 3000);
        }
    }

    function interruptMya() {
        if (state.liveVoiceState === 'speaking' || state.liveVoiceState === 'thinking') {
            if ('speechSynthesis' in window) window.speechSynthesis.cancel();
            setLiveVoiceState('listening');
            state.els.liveTickerRole.textContent = 'Mya Live';
            state.els.liveTickerText.textContent = '(Interrupted) Listening to you...';
        }
    }

    function toggleLiveMute() {
        state.liveVoiceMuted = !state.liveVoiceMuted;
        if (state.liveVoiceStream) {
            state.liveVoiceStream.getAudioTracks().forEach(function (track) {
                track.enabled = !state.liveVoiceMuted;
            });
        }
        state.els.liveMuteBtn.innerHTML = state.liveVoiceMuted ? ICONS.micMute : ICONS.mic;
    }

    function startLiveVoice() {
        if (!state.open) togglePanel();
        state.liveTurns = [];
        state.liveBlocks = [];
        state.liveVoiceDuration = 0;
        state.liveVoiceMuted = false;
        state.bargeInFrames = 0;

        state.els.liveOverlay.style.display = 'flex';
        state.els.liveTimer.textContent = '00:00';
        state.els.liveTickerRole.textContent = 'Mya Live';
        state.els.liveTickerText.textContent = 'Say something to Mya to start live voice chat...';
        setLiveVoiceState('listening');

        state.liveVoiceTimer = setInterval(function () {
            state.liveVoiceDuration += 1;
            var mins = Math.floor(state.liveVoiceDuration / 60);
            var secs = state.liveVoiceDuration % 60;
            state.els.liveTimer.textContent = (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
        }, 1000);

        try {
            var AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                state.liveVoiceAudioCtx = new AudioCtx();
                state.liveVoiceAnalyser = state.liveVoiceAudioCtx.createAnalyser();
                state.liveVoiceAnalyser.fftSize = 128;
            }
        } catch (e) {}

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(function (stream) {
                    state.liveVoiceStream = stream;
                    if (state.liveVoiceAudioCtx && state.liveVoiceAnalyser) {
                        var source = state.liveVoiceAudioCtx.createMediaStreamSource(stream);
                        source.connect(state.liveVoiceAnalyser);
                    }
                    state.liveVoiceRecognition = initLiveSpeechRecognition();
                    if (state.liveVoiceRecognition) {
                        try { state.liveVoiceRecognition.start(); } catch (e) {}
                    }
                    drawLiveOrb();
                })
                .catch(function () {
                    drawLiveOrb();
                });
        } else {
            drawLiveOrb();
        }
    }

    function endLiveVoice() {
        if (state.liveVoiceState === 'idle') return;
        if (state.liveVoiceTimer) clearInterval(state.liveVoiceTimer);
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        if (state.liveVoiceStream) {
            state.liveVoiceStream.getTracks().forEach(function (t) { t.stop(); });
            state.liveVoiceStream = null;
        }
        if (state.liveVoiceAudioCtx) {
            try { state.liveVoiceAudioCtx.close(); } catch (e) {}
            state.liveVoiceAudioCtx = null;
        }
        if (state.liveVoiceRecognition) {
            try { state.liveVoiceRecognition.stop(); } catch (e) {}
            state.liveVoiceRecognition = null;
        }
        if (state.liveVoiceRaf) cancelAnimationFrame(state.liveVoiceRaf);

        var turns = state.liveTurns.slice();
        var blocks = state.liveBlocks.slice();
        var dur = state.liveVoiceDuration || 0;

        state.liveVoiceState = 'idle';
        state.els.liveOverlay.style.display = 'none';

        if (turns.length > 0) {
            fetch(state.apiBase + '/chat/live/commit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: state.userId,
                    conversationId: state.conversationId,
                    turns: turns
                })
            }).catch(function () {});

            var empty = state.els.stream.querySelector('.mya-empty-state');
            if (empty) empty.remove();

            var summaryCard = document.createElement('div');
            summaryCard.className = 'mya-card';
            summaryCard.style.background = 'linear-gradient(135deg,' + COLORS.onyx + ' 0%,' + COLORS.onyxSoft + ' 100%)';
            summaryCard.style.color = '#ffffff';
            summaryCard.innerHTML = [
                '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">',
                '  <div style="font-weight:700;font-size:13.5px;display:flex;align-items:center;gap:6px;">' + getMyaLogoHtml(20) + '<span>Live Voice Call Completed</span></div>',
                '  <span class="mya-pill" style="background:rgba(231,166,144,0.25);color:' + COLORS.lightCoral + ';">Gemini Live</span>',
                '</div>',
                '<div style="font-size:12px;color:rgba(255,255,255,0.8);margin-bottom:8px;">All recommendations have been documented in your Hair Journey.</div>',
                '<div style="display:flex;gap:12px;font-size:11.5px;color:' + COLORS.lightCoral + ';">',
                '  <span>Duration: <strong>' + dur + 's</strong></span>',
                '  <span>Dialogue: <strong>' + turns.length + ' turns</strong></span>',
                '</div>'
            ].join('');
            state.els.stream.appendChild(summaryCard);

            turns.forEach(function (turn) {
                if (turn.role === 'user') appendUserMessage(turn.content);
                else {
                    var b = appendAssistantMessage('');
                    b.innerHTML = parseMarkdown(turn.content);
                }
            });

            blocks.forEach(function (block) {
                renderBlock(block);
            });

            scrollToBottom(state.els.stream);
        }
    }

    // ---- Photo Journey Staging ----

    function handleFileInput(e) {
        var file = e.target.files && e.target.files[0];
        if (!file) return;

        var reader = new FileReader();
        reader.onload = function (evt) {
            stagePhoto({
                file: file,
                previewUrl: evt.target.result,
                category: 'Journal entry',
                caption: 'Wash day — ' + new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            });
        };
        reader.readAsDataURL(file);
    }

    function stagePhoto(photoData) {
        state.stagedPhoto = photoData;
        var container = state.els.photoStage;
        container.innerHTML = '';
        container.style.display = 'block';

        var removeBtn = document.createElement('button');
        removeBtn.className = 'mya-btn-icon';
        removeBtn.style.cssText = 'position:absolute;top:6px;right:6px;width:22px;height:22px;background:rgba(0,0,0,0.4);color:#fff;';
        removeBtn.innerHTML = ICONS.close;
        removeBtn.addEventListener('click', function () {
            state.stagedPhoto = null;
            container.style.display = 'none';
            state.els.sendBtn.disabled = state.els.textarea.value.trim().length === 0;
        });

        var previewWrap = document.createElement('div');
        previewWrap.style.cssText = 'display:flex;gap:10px;align-items:center;';

        var img = document.createElement('img');
        img.src = photoData.previewUrl;
        img.style.cssText = 'width:56px;height:56px;border-radius:8px;object-fit:cover;border:1px solid ' + COLORS.border + ';';

        var info = document.createElement('div');
        info.innerHTML = '<div style="font-size:12px;font-weight:700;color:' + COLORS.onyx + ';">Document Your Journey</div>' +
            '<div style="font-size:10.5px;color:' + COLORS.muted + ';">Visual progress entry</div>';

        previewWrap.appendChild(img);
        previewWrap.appendChild(info);

        var captionInput = document.createElement('input');
        captionInput.style.cssText = 'width:100%;margin-top:8px;padding:6px 10px;border-radius:8px;border:1px solid ' + COLORS.border + ';font-size:12px;outline:none;';
        captionInput.value = photoData.caption;
        captionInput.addEventListener('input', function () {
            if (state.stagedPhoto) state.stagedPhoto.caption = this.value;
        });

        container.appendChild(removeBtn);
        container.appendChild(previewWrap);
        container.appendChild(captionInput);

        state.els.sendBtn.disabled = false;
        state.els.textarea.focus();
    }

    function submitComposer() {
        var text = state.els.textarea.value.trim();
        var photo = state.stagedPhoto;
        if (!text && !photo) return;

        state.els.textarea.value = '';
        state.els.textarea.style.height = 'auto';
        state.els.sendBtn.disabled = true;

        var empty = state.els.stream.querySelector('.mya-empty-state');
        if (empty) empty.remove();

        if (photo) {
            state.stagedPhoto = null;
            state.els.photoStage.style.display = 'none';
            appendUserPhotoMessage(photo, text);
            executePhotoUpload(photo, text);
        } else {
            sendMessage(text);
        }
    }

    function appendUserPhotoMessage(photo, caption) {
        var row = document.createElement('div');
        row.className = 'mya-msg-row';
        row.innerHTML = '<div class="mya-msg-header" style="justify-content:flex-end;">You</div>';

        var bubble = document.createElement('div');
        bubble.className = 'mya-msg user';
        bubble.innerHTML = [
            '<div style="font-size:11px;font-weight:700;color:' + COLORS.lightCoral + ';text-transform:uppercase;margin-bottom:4px;">' + photo.category + '</div>',
            '<img src="' + photo.previewUrl + '" style="width:100%;max-width:220px;border-radius:10px;object-fit:cover;margin:4px 0;" />',
            caption ? '<div style="margin-top:4px;">' + caption + '</div>' : ''
        ].join('');

        row.appendChild(bubble);
        state.els.stream.appendChild(row);
        scrollToBottom(state.els.stream);
    }

    function executePhotoUpload(photo, caption) {
        var statusEl = appendStatusIndicator('Recording visual progress to Hair Journey…');
        setTimeout(function () {
            statusEl.remove();
            appendAssistantMessage("I've saved this as a visual progress entry for " + (photo.caption || 'your wash day') + ". Would you like to add a note about how your hair felt today?");
        }, 1200);
    }

    // ---- Markdown & Message Rendering ----

    function parseMarkdown(text) {
        if (!text) return '';
        var safe = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>')
            .replace(/\\*(.*?)\\*/g, '<em>$1</em>')
            .replace(/\`([^\`]+)\`/g, '<code>$1</code>')
            .replace(/^>\\s*(.+)$/gm, '<blockquote>$1</blockquote>');
        var paragraphs = safe.split(/\\n\\n+/);
        return paragraphs.map(function (p) {
            if (p.startsWith('<blockquote>')) return p;
            return '<p>' + p.replace(/\\n/g, '<br/>') + '</p>';
        }).join('');
    }

    function appendUserMessage(text) {
        var row = document.createElement('div');
        row.className = 'mya-msg-row';
        row.innerHTML = '<div class="mya-msg-header" style="justify-content:flex-end;">You</div>';
        var bubble = document.createElement('div');
        bubble.className = 'mya-msg user';
        bubble.textContent = text;
        row.appendChild(bubble);
        state.els.stream.appendChild(row);
        scrollToBottom(state.els.stream);
    }

    function appendAssistantMessage(initialText) {
        var row = document.createElement('div');
        row.className = 'mya-msg-row';
        row.innerHTML = '<div class="mya-msg-header">' + getMyaLogoHtml(18) + '<span>Mya</span></div>';
        var bubble = document.createElement('div');
        bubble.className = 'mya-msg assistant';
        bubble.innerHTML = parseMarkdown(initialText || '');
        row.appendChild(bubble);
        state.els.stream.appendChild(row);
        scrollToBottom(state.els.stream);
        return bubble;
    }

    function appendStatusIndicator(message) {
        var indicator = document.createElement('div');
        indicator.className = 'mya-status-indicator';
        indicator.innerHTML = getMyaLogoHtml(16) + '<span class="mya-status-shimmer">' + message + '</span>';
        state.els.stream.appendChild(indicator);
        scrollToBottom(state.els.stream);
        return indicator;
    }

    // ---- Generative UI Cards ----

    function renderGoalCard(block) {
        var data = block.data || {};
        var card = document.createElement('div');
        card.className = 'mya-card mya-goal-card';
        var pct = data.progressPercent || 72;

        card.innerHTML = [
            '<div class="mya-card-header">',
            '  <div>',
            '    <span class="mya-pill">' + (data.category || 'Growth & Retention') + '</span>',
            '    <h4 class="mya-card-title">' + (data.title || 'Grow and retain length') + '</h4>',
            '  </div>',
            '  <span class="mya-goal-pct">' + pct + '%</span>',
            '</div>',
            '<div class="mya-progress-track"><div class="mya-progress-bar" style="width:' + pct + '%;"></div></div>',
            '<div class="mya-goal-meta">',
            '  <span>Target: <strong>' + (data.targetMetric || '4 inches') + '</strong></span>',
            '  <span>Target Date: <strong>' + (data.targetDate || 'December 15, 2026') + '</strong></span>',
            '</div>',
            '<div class="mya-card-actions">',
            '  <button class="mya-action-btn primary adjust-goal-btn">' + ICONS.goal + ' <span>Adjust goal</span></button>',
            '  <button class="mya-action-btn view-history-btn">' + ICONS.history + ' <span>Progress history</span></button>',
            '</div>'
        ].join('');

        card.querySelector('.adjust-goal-btn').addEventListener('click', function () {
            renderMutationConfirmation({
                title: 'Adjust Target Date for ' + (data.title || 'Growth Goal'),
                currentValue: data.targetDate || 'December 15, 2026',
                proposedValue: 'February 15, 2027',
                callback: function () {
                    sendMessage('Confirm updating target date for ' + (data.title || 'Growth Goal') + ' to February 15, 2027');
                }
            });
        });

        card.querySelector('.view-history-btn').addEventListener('click', function () {
            sendMessage('Show my progress history for ' + (data.title || 'my goal'));
        });

        state.els.stream.appendChild(card);
        scrollToBottom(state.els.stream);
    }

    function renderChecklist(block) {
        var data = block.data || {};
        var card = document.createElement('div');
        card.className = 'mya-card';

        card.innerHTML = [
            '<div class="mya-card-header">',
            '  <div>',
            '    <span class="mya-pill">' + (data.category || 'Daily Regimen') + '</span>',
            '    <h4 class="mya-card-title">' + (data.title || 'Today\\'s Routine Steps') + '</h4>',
            '  </div>',
            '</div>'
        ].join('');

        var steps = data.steps || [
            { id: 1, title: 'Cleanse with sulfate-free shampoo', duration: '15m', completed: true },
            { id: 2, title: 'Deep conditioning treatment', duration: '30m', completed: false },
            { id: 3, title: 'Moisturize & seal ends', duration: '10m', completed: false },
            { id: 4, title: 'Protective styling', duration: '20m', completed: false }
        ];

        var listContainer = document.createElement('div');
        var syncBadge = document.createElement('div');
        syncBadge.className = 'mya-synced-badge';
        syncBadge.style.display = 'none';
        syncBadge.innerHTML = ICONS.check + '<span>Synced with Hair Journey</span>';

        steps.forEach(function (step) {
            var item = document.createElement('div');
            item.className = 'mya-checklist-item' + (step.completed ? ' is-done' : '');

            item.innerHTML = [
                '<div style="display:flex;align-items:center;">',
                '  <span class="mya-check-box">' + (step.completed ? ICONS.check : '') + '</span>',
                '  <span class="mya-check-text">' + step.title + '</span>',
                '</div>',
                step.duration ? '<span style="font-size:10.5px;color:' + COLORS.muted + ';">' + step.duration + '</span>' : ''
            ].join('');

            item.addEventListener('click', function () {
                if (!item.classList.contains('is-done')) {
                    item.classList.add('is-done');
                    item.querySelector('.mya-check-box').innerHTML = ICONS.check;
                    syncBadge.style.display = 'inline-flex';
                    sendMessage('I completed ' + step.title);
                }
            });

            listContainer.appendChild(item);
        });

        card.appendChild(listContainer);
        card.appendChild(syncBadge);
        state.els.stream.appendChild(card);
        scrollToBottom(state.els.stream);
    }

    function renderHairProfile(block) {
        var data = block.data || {};
        var card = document.createElement('div');
        card.className = 'mya-card';

        card.innerHTML = [
            '<div class="mya-card-header">',
            '  <div>',
            '    <span class="mya-pill">Official HHCP</span>',
            '    <h4 class="mya-card-title">Verified Strand DNA</h4>',
            '  </div>',
            '</div>',
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px;">',
            '  <div style="background:' + COLORS.stone + ';padding:8px 12px;border-radius:10px;font-size:11.5px;">Hair Texture<strong>' + (data.hairType || 'Type 4C (Coily)') + '</strong></div>',
            '  <div style="background:' + COLORS.stone + ';padding:8px 12px;border-radius:10px;font-size:11.5px;">Porosity<strong>' + (data.porosity || 'Normal Porosity') + '</strong></div>',
            '  <div style="background:' + COLORS.stone + ';padding:8px 12px;border-radius:10px;font-size:11.5px;">Density<strong>' + (data.density || 'Medium Density') + '</strong></div>',
            '  <div style="background:' + COLORS.stone + ';padding:8px 12px;border-radius:10px;font-size:11.5px;">Elasticity<strong>' + (data.elasticity || 'High Elasticity') + '</strong></div>',
            '</div>'
        ].join('');

        state.els.stream.appendChild(card);
        scrollToBottom(state.els.stream);
    }

    function renderConsultationCard(block) {
        var data = block.data || {};
        var card = document.createElement('div');
        card.className = 'mya-consult-card';

        card.innerHTML = [
            '<span class="mya-pill" style="background:' + COLORS.coral + ';color:' + COLORS.onyx + ';">Licensed Stylist Guidance</span>',
            '<h4>' + (data.title || 'A little extra guidance may help') + '</h4>',
            '<p>' + (data.description || 'Since this breakage concern has persisted across multiple wash days, speaking directly with a licensed MYAVANA stylist will give you tailored clarity.') + '</p>',
            '<button class="mya-consult-btn">' + ICONS.sparkles + ' <span>Book 1-on-1 Consultation</span></button>'
        ].join('');

        card.querySelector('.mya-consult-btn').addEventListener('click', function () {
            window.open(data.bookingUrl || '/consultations', '_blank');
        });

        state.els.stream.appendChild(card);
        scrollToBottom(state.els.stream);
    }

    function renderMutationConfirmation(opts) {
        var card = document.createElement('div');
        card.className = 'mya-card';
        card.style.border = '1.5px solid ' + COLORS.coral;

        card.innerHTML = [
            '<div style="font-size:13.5px;font-weight:700;color:' + COLORS.onyx + ';margin-bottom:8px;display:flex;align-items:center;gap:6px;">' + getMyaLogoHtml(18) + '<span>' + opts.title + '</span></div>',
            '<div style="background:' + COLORS.stone + ';border-radius:10px;padding:10px;margin-bottom:10px;font-size:12px;display:flex;flex-direction:column;gap:4px;">',
            '  <div>' + opts.currentValue + '</div>',
            '  <div style="color:' + COLORS.coralDark + ';font-weight:600;">Proposed: ' + opts.proposedValue + '</div>',
            '</div>',
            '<div class="mya-card-actions">',
            '  <button class="mya-action-btn primary confirm-btn">' + ICONS.check + ' <span>Confirm Update</span></button>',
            '  <button class="mya-action-btn cancel-btn">' + ICONS.close + ' <span>Cancel</span></button>',
            '</div>'
        ].join('');

        card.querySelector('.confirm-btn').addEventListener('click', function () {
            card.innerHTML = '<div style="font-size:12.5px;font-weight:600;color:' + COLORS.emerald + ';display:flex;align-items:center;gap:5px;">' + ICONS.check + ' <span>Goal updated • Synced with Hair Journey</span></div>';
            if (typeof opts.callback === 'function') opts.callback();
        });

        card.querySelector('.cancel-btn').addEventListener('click', function () {
            card.remove();
        });

        state.els.stream.appendChild(card);
        scrollToBottom(state.els.stream);
    }

    function renderQuickReplies(actions) {
        if (!actions || actions.length === 0) return;
        var wrap = document.createElement('div');
        wrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin:10px 0;';

        actions.forEach(function (act) {
            var label = typeof act === 'string' ? act : (act.label || act.text || '');
            if (!label) return;
            var pill = document.createElement('button');
            pill.style.cssText = 'background:#ffffff;border:1px solid ' + COLORS.border + ';color:' + COLORS.onyx + ';border-radius:9999px;padding:6px 14px;font-size:12px;font-weight:500;cursor:pointer;transition:all 0.16s ease;box-shadow:0 1px 3px rgba(0,0,0,0.03);';
            pill.textContent = label;
            pill.addEventListener('click', function () {
                wrap.remove();
                sendMessage(label);
            });
            wrap.appendChild(pill);
        });

        state.els.stream.appendChild(wrap);
        scrollToBottom(state.els.stream);
    }

    function renderBlock(block) {
        if (!block || !block.type) return;
        switch (block.type) {
            case 'goal_card':
                renderGoalCard(block);
                break;
            case 'today_checklist':
            case 'routine_checklist':
                renderChecklist(block);
                break;
            case 'hair_profile_summary':
                renderHairProfile(block);
                break;
            case 'consultation_card':
                renderConsultationCard(block);
                break;
            case 'quick_replies':
                renderQuickReplies(block.data?.replies || block.actions || []);
                break;
            default:
                break;
        }
    }

    // ---- Transport & NDJSON Streaming ----

    function isNearBottom(container) {
        return container.scrollHeight - container.scrollTop - container.clientHeight < 60;
    }

    function scrollToBottom(container) {
        container.scrollTop = container.scrollHeight;
    }

    function getContextPayload() {
        return {
            surface: window.location.hostname || 'myhairjourney.ai',
            page: window.location.pathname || '/',
            title: document.title || 'Myavana Hair Journey',
            ...(state.experienceContext || {})
        };
    }

    function sendMessage(text) {
        if (!text || state.isStreaming) return;

        if (state.activeView !== 'chat') {
            switchView('chat');
        }

        var empty = state.els.stream.querySelector('.mya-empty-state');
        if (empty) empty.remove();

        appendUserMessage(text);
        var statusEl = appendStatusIndicator('Checking your Hair Journey…');
        var assistantBubble = null;
        var accumulatedRaw = '';

        state.isStreaming = true;

        fetch(state.apiBase + '/chat/stream', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/x-ndjson, text/plain;q=0.9'
            },
            body: JSON.stringify({
                message: text,
                from: state.userId,
                groupId: state.conversationId,
                experienceContext: getContextPayload()
            })
        })
            .then(function (res) {
                if (!res.ok || !res.body) throw new Error('Stream failed: ' + res.status);
                var reader = res.body.getReader();
                var decoder = new TextDecoder();
                var lineBuffer = '';

                function pump() {
                    return reader.read().then(function (result) {
                        if (result.done) {
                            state.isStreaming = false;
                            if (statusEl) statusEl.remove();
                            return;
                        }

                        var chunk = decoder.decode(result.value, { stream: true });
                        lineBuffer += chunk;

                        var newlineIdx;
                        while ((newlineIdx = lineBuffer.indexOf('\\n')) !== -1) {
                            var line = lineBuffer.slice(0, newlineIdx).trim();
                            lineBuffer = lineBuffer.slice(newlineIdx + 1);

                            if (line) {
                                try {
                                    var frame = JSON.parse(line);
                                    if (frame.t === 'delta' && frame.text) {
                                        if (statusEl) { statusEl.remove(); statusEl = null; }
                                        if (!assistantBubble) assistantBubble = appendAssistantMessage('');
                                        accumulatedRaw += frame.text;
                                        assistantBubble.innerHTML = parseMarkdown(accumulatedRaw);
                                        scrollToBottom(state.els.stream);
                                    } else if (frame.t === 'block' && frame.block) {
                                        renderBlock(frame.block);
                                    } else if (frame.t === 'action' && frame.actions) {
                                        renderQuickReplies(frame.actions);
                                    }
                                } catch (err) {
                                    if (statusEl) { statusEl.remove(); statusEl = null; }
                                    if (!assistantBubble) assistantBubble = appendAssistantMessage('');
                                    accumulatedRaw += line;
                                    assistantBubble.innerHTML = parseMarkdown(accumulatedRaw);
                                    scrollToBottom(state.els.stream);
                                }
                            }
                        }
                        return pump();
                    });
                }
                return pump();
            })
            .catch(function (err) {
                console.error('[Mya Widget] Stream error:', err);
                state.isStreaming = false;
                if (statusEl) statusEl.remove();
                if (!assistantBubble) {
                    appendAssistantMessage("I'm having a little trouble connecting to your Hair Journey right now. Please try again in a moment.");
                }
            });
    }

    function logEvent(eventType, metadata) {
        if (!state.apiBase || !state.userId) return;
        fetch(state.apiBase + '/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: state.userId,
                conversationId: state.conversationId,
                eventType: eventType,
                metadata: metadata || {}
            }),
            keepalive: true
        }).catch(function () {});
    }

    function setContext(context) {
        if (context && typeof context === 'object') {
            if (context.wpUserId) state.userId = String(context.wpUserId);
            state.experienceContext = Object.assign({}, state.experienceContext, context);
            updateContextUI();
            if (state.els.stream && state.els.stream.querySelector('.mya-empty-state')) {
                renderEmptyState();
            }
        }
    }

    function init(options) {
        options = options || {};
        if (!options.apiBase) throw new Error('MyavanaWidget.init requires { apiBase }');
        state.apiBase = options.apiBase.replace(/\\/$/, '');
        state.position = options.position === 'bottom-right' ? 'bottom-right' : 'bottom-left';
        if (options.context) setContext(options.context);

        ensureIdentity();
        injectStyles();
        buildWidget();
    }

    window.MyavanaWidget = {
        init: init,
        setContext: setContext,
        logEvent: logEvent,
        open: function () { if (!state.open) togglePanel(); },
        close: function () { if (state.open) togglePanel(); },
        toggleExpand: toggleExpand,
        switchView: switchView,
        openStories: function () { if (!state.open) togglePanel(); switchView('stories'); },
        openHistory: function () { if (!state.open) togglePanel(); switchView('history'); },
        sendMessage: sendMessage,
        startLiveVoice: startLiveVoice,
        endLiveVoice: endLiveVoice,
        openProfile: openProfileSheet
    };

})(window, document);
`;

const outputPath = path.join(__dirname, '../packages/widget/src/myavana-widget.js');
fs.writeFileSync(outputPath, widgetCode, 'utf8');
console.log('✅ Wrote ' + outputPath + ' (' + widgetCode.length + ' bytes)');

const wpPath = '/Users/winstonzulu/Local Sites/myavana-hair-journey/app/public/wp-content/plugins/myavana-hair-journey-next/assets/js/myavana-widget.js';
fs.writeFileSync(wpPath, widgetCode, 'utf8');
console.log('✅ Synchronized to WordPress: ' + wpPath);
