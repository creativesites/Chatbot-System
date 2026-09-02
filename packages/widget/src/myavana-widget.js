/**
 * Myavana Chat Widget — self-hosted replacement for the Kommunicate embed.
 * No build step: this file is the deliverable, loaded directly via <script>.
 *
 * Usage:
 *   <script src="https://.../myavana-widget.js"></script>
 *   <script>MyavanaWidget.init({ apiBase: 'https://chat.myavana.com', position: 'bottom-left' });</script>
 *   // position defaults to 'bottom-left' so this can run alongside Kommunicate's
 *   // bottom-right widget during A/B testing; pass 'bottom-right' once Kommunicate is retired.
 *
 * Public API:
 *   MyavanaWidget.init(options)
 *   MyavanaWidget.logEvent(eventType, metadata)  — funnel-event hook for host-page code
 *     to call at intake/paywall moments it observes (the widget can't infer these on its own).
 */
(function (window, document) {
    'use strict';

    var USER_ID_KEY = 'myavana_widget_user_id';
    var CONVERSATION_ID_KEY = 'myavana_widget_conversation_id';

    var COLORS = {
        onyx: '#222323',
        stone: '#f5f5f7',
        sand: '#eeece1',
        coral: '#e7a690',
        lightCoral: '#fce5d7',
        blueberry: '#4a4d68',
    };

    var state = {
        apiBase: '',
        position: 'bottom-left',
        userId: null,
        conversationId: null,
        open: false,
        els: {},
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
            userId = uuid();
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

    // ---- UI ----

    function injectStyles() {
        // Bottom-left by default so it can run side-by-side with Kommunicate's
        // bottom-right placement during A/B testing — set position: 'bottom-right'
        // in init() to flip it once Kommunicate is fully retired.
        var side = state.position === 'bottom-right' ? 'right' : 'left';
        var style = document.createElement('style');
        style.textContent = [
            '.myavana-widget-launcher{position:fixed;bottom:20px;' + side + ':20px;width:56px;height:56px;border-radius:50%;',
            'background:' + COLORS.onyx + ';color:#fff;border:none;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.2);',
            'font-family:Archivo,sans-serif;font-size:24px;z-index:999998;}',
            '.myavana-widget-panel{position:fixed;bottom:88px;' + side + ':20px;width:360px;max-width:92vw;height:520px;max-height:80vh;',
            'background:#fff;border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,.25);display:flex;flex-direction:column;',
            'overflow:hidden;font-family:Archivo,sans-serif;z-index:999999;}',
            '.myavana-widget-header{background:' + COLORS.onyx + ';color:#fff;padding:14px 16px;font-weight:600;}',
            '.myavana-widget-messages{flex:1;overflow-y:auto;padding:12px;background:' + COLORS.stone + ';position:relative;}',
            '.myavana-widget-msg{max-width:80%;padding:10px 14px;border-radius:12px;margin-bottom:8px;font-size:14px;line-height:1.45;white-space:pre-wrap;}',
            '.myavana-widget-msg.user{background:' + COLORS.onyx + ';color:#fff;margin-left:auto;}',
            '.myavana-widget-msg.assistant{background:' + COLORS.lightCoral + ';color:' + COLORS.onyx + ';margin-right:auto;}',
            '.myavana-widget-jump{position:sticky;bottom:8px;margin:0 auto;display:block;background:' + COLORS.coral + ';',
            'color:#fff;border:none;border-radius:20px;padding:6px 14px;font-size:12px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.15);}',
            '.myavana-widget-inputrow{display:flex;border-top:1px solid ' + COLORS.sand + ';padding:8px;background:#fff;}',
            '.myavana-widget-input{flex:1;border:1px solid ' + COLORS.sand + ';border-radius:20px;padding:8px 14px;font-size:14px;outline:none;}',
            '.myavana-widget-send{background:' + COLORS.onyx + ';color:#fff;border:none;border-radius:20px;padding:8px 16px;margin-left:8px;cursor:pointer;font-size:14px;}',
        ].join('');
        document.head.appendChild(style);
    }

    function buildPanel() {
        var launcher = document.createElement('button');
        launcher.className = 'myavana-widget-launcher';
        launcher.setAttribute('aria-label', 'Open chat with Mya');
        launcher.textContent = '💬';
        launcher.addEventListener('click', togglePanel);

        var panel = document.createElement('div');
        panel.className = 'myavana-widget-panel';
        panel.style.display = 'none';

        var header = document.createElement('div');
        header.className = 'myavana-widget-header';
        header.textContent = 'Mya — MYAVANA Hair AI';

        var messages = document.createElement('div');
        messages.className = 'myavana-widget-messages';
        messages.addEventListener('scroll', function () {
            state.els.atBottom = isNearBottom(messages);
            state.els.jump.style.display = state.els.atBottom ? 'none' : 'block';
        });

        var jump = document.createElement('button');
        jump.className = 'myavana-widget-jump';
        jump.textContent = 'New messages ↓';
        jump.style.display = 'none';
        jump.addEventListener('click', function () {
            scrollToBottom(messages);
            jump.style.display = 'none';
        });

        var inputRow = document.createElement('div');
        inputRow.className = 'myavana-widget-inputrow';
        var input = document.createElement('input');
        input.className = 'myavana-widget-input';
        input.type = 'text';
        input.placeholder = 'Ask about your hair...';
        var send = document.createElement('button');
        send.className = 'myavana-widget-send';
        send.textContent = 'Send';

        function submit() {
            var text = input.value.trim();
            if (!text) return;
            input.value = '';
            sendMessage(text);
        }
        send.addEventListener('click', submit);
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') submit();
        });

        inputRow.appendChild(input);
        inputRow.appendChild(send);

        panel.appendChild(header);
        panel.appendChild(messages);
        panel.appendChild(jump);
        panel.appendChild(inputRow);

        document.body.appendChild(launcher);
        document.body.appendChild(panel);

        state.els = { launcher: launcher, panel: panel, messages: messages, input: input, jump: jump, atBottom: true };
    }

    function togglePanel() {
        state.open = !state.open;
        state.els.panel.style.display = state.open ? 'flex' : 'none';
        if (state.open && state.els.messages.children.length === 0) {
            sendWelcome();
        }
    }

    function isNearBottom(container) {
        return container.scrollHeight - container.scrollTop - container.clientHeight < 40;
    }

    function scrollToBottom(container) {
        container.scrollTop = container.scrollHeight;
    }

    // Append-only, anchored to bottom unless the user has scrolled up — this is the
    // whole point of owning the widget: new messages never force a scroll-to-top.
    function appendMessage(role, text) {
        var container = state.els.messages;
        var wasAtBottom = isNearBottom(container);
        var bubble = document.createElement('div');
        bubble.className = 'myavana-widget-msg ' + role;
        bubble.textContent = text;
        container.appendChild(bubble);
        if (wasAtBottom) {
            scrollToBottom(container);
            state.els.jump.style.display = 'none';
        } else {
            state.els.jump.style.display = 'block';
        }
        return bubble;
    }

    function appendChunkToBubble(bubble, chunkText) {
        var container = state.els.messages;
        var wasAtBottom = isNearBottom(container);
        bubble.textContent += chunkText;
        if (wasAtBottom) scrollToBottom(container);
    }

    // ---- Transport ----

    function sendWelcome() {
        fetch(state.apiBase + '/chat/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: state.userId, groupId: state.conversationId, eventName: 'WELCOME' }),
        })
            .then(function (res) { return res.text(); })
            .then(function (text) { appendMessage('assistant', text); })
            .catch(function () { appendMessage('assistant', "Hey there! I'm Mya, your MYAVANA Hair AI guide. What can I help you with today?"); });
    }

    function sendMessage(text) {
        appendMessage('user', text);
        var bubble = appendMessage('assistant', '');

        fetch(state.apiBase + '/chat/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text, from: state.userId, groupId: state.conversationId }),
        })
            .then(function (res) {
                if (!res.ok || !res.body) throw new Error('Stream request failed: ' + res.status);
                var reader = res.body.getReader();
                var decoder = new TextDecoder();

                function pump() {
                    return reader.read().then(function (result) {
                        if (result.done) return;
                        var chunkText = decoder.decode(result.value, { stream: true });
                        appendChunkToBubble(bubble, chunkText);
                        return pump();
                    });
                }
                return pump();
            })
            .catch(function () {
                appendChunkToBubble(bubble, "Sorry, something went wrong on my end. Please try again in a moment.");
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
                metadata: metadata || {},
            }),
            keepalive: true,
        }).catch(function () { /* best-effort */ });
    }

    // ---- Public API ----

    function init(options) {
        options = options || {};
        if (!options.apiBase) {
            throw new Error('MyavanaWidget.init requires { apiBase }');
        }
        state.apiBase = options.apiBase.replace(/\/$/, '');
        state.position = options.position === 'bottom-right' ? 'bottom-right' : 'bottom-left';
        ensureIdentity();
        injectStyles();
        buildPanel();
    }

    window.MyavanaWidget = {
        init: init,
        logEvent: logEvent,
    };
})(window, document);
