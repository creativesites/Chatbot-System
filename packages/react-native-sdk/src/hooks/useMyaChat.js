/**
 * Headless React Hook: useMyaChat (JavaScript implementation)
 */

const { useState, useEffect, useRef, useCallback } = require('react');
const { MyaMobileClient } = require('../client/MyaMobileClient');
const { createId } = require('../types');
const { classifyError, toMyaError, makeError, errorCopy } = require('../client/errors');
const { normalizeAttachments } = require('../client/attachments');

// One request in flight per client. Module-level (keyed by client) so two
// sendMessage calls in the same tick cannot both pass the check, whatever
// React has or hasn't re-rendered yet.
const inFlight = new WeakSet();

function isDev() {
  if (typeof __DEV__ !== 'undefined') return Boolean(__DEV__);
  return typeof process === 'undefined' || process.env?.NODE_ENV !== 'production';
}

/** A client that can't talk to anything: used when the host forgot apiBase in production. */
function createInertClient(configError) {
  return {
    inert: true,
    init: async () => {},
    abort: () => {},
    getUserId: () => '',
    getConversationId: () => '',
    setConversationId: async () => {},
    createNewConversation: async () => '',
    clearSession: async () => {},
    getStorage: () => ({ getItem: async () => null, setItem: async () => {}, removeItem: async () => {} }),
    fetchConversationHistory: async () => { throw configError; },
    fetchUserConversations: async () => [],
    sendMessage: async () => { throw configError; }
  };
}

function useMyaChat(options = {}) {
  const clientRef = useRef(null);

  if (!clientRef.current) {
    if (options.client) {
      clientRef.current = options.client;
    } else {
      const apiBase =
        options.apiBase || (typeof process !== 'undefined' && process.env?.MYA_API_BASE) || '';
      if (!apiBase) {
        const configError = makeError('config', '[useMyaChat] options.apiBase is required. Pass the Mya API base URL explicitly.');
        if (isDev()) throw configError;
        console.error(configError.message);
        options.onError && options.onError(configError);
        clientRef.current = createInertClient(configError);
      } else {
        clientRef.current = new MyaMobileClient({
          apiBase,
          userId: options.initialUserId,
          conversationId: options.initialConversationId,
          telemetry: options.telemetry,
          storage: options.storage,
          authToken: options.authToken,
          headers: options.headers,
          timeoutMs: options.timeoutMs
        });
      }
    }
  }

  const client = clientRef.current;

  // Keep client credentials synchronized when options change dynamically
  useEffect(() => {
    if (client) {
      if (options.authToken !== undefined && typeof client.setAuthToken === 'function') {
        client.setAuthToken(options.authToken);
      }
      if (options.headers && typeof client.setCustomHeaders === 'function') {
        client.setCustomHeaders(options.headers);
      }
    }
  }, [client, options.authToken, options.headers]);

  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState(null);
  const [activeBlocks, setActiveBlocks] = useState([]);
  const [activeActions, setActiveActions] = useState([]);
  const [conversationId, setConversationId] = useState(client.getConversationId());
  const [userId, setUserId] = useState(client.getUserId());
  // The message (and photos) of a turn that failed before Mya said anything.
  // The UI puts it back in the composer so retrying is one tap, not a retype.
  const [unsentDraft, setUnsentDraft] = useState(null);

  // Initialize client storage and restore cached messages if persistMessages is enabled
  useEffect(() => {
    let mounted = true;
    client.init().then(async () => {
      if (mounted) {
        setUserId(client.getUserId());
        const currentConvId = client.getConversationId();
        setConversationId(currentConvId);

        if (options.persistMessages) {
          try {
            const key = options.persistKey || `mya_cached_messages_${currentConvId}`;
            const cached = await client.getStorage().getItem(key);
            if (cached && mounted) {
              const parsed = JSON.parse(cached);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setMessages(parsed);
              }
            }
          } catch (e) {
            // Silently ignore cache parse failures
          }
        }
      }
    });
    return () => {
      mounted = false;
      client.abort();
    };
  }, [client, options.persistMessages, options.persistKey]);

  const persistHistory = useCallback(
    async (msgs) => {
      if (!options.persistMessages) return;
      try {
        const key = options.persistKey || `mya_cached_messages_${conversationId}`;
        await client.getStorage().setItem(key, JSON.stringify(msgs));
      } catch (e) {
        // Silently catch persistence errors
      }
    },
    [client, conversationId, options.persistMessages, options.persistKey]
  );

  const clearCachedMessages = useCallback(async () => {
    try {
      const key = options.persistKey || `mya_cached_messages_${conversationId}`;
      await client.getStorage().removeItem(key);
    } catch (e) {
      // Silently catch storage errors
    }
  }, [client, conversationId, options.persistKey]);

  const abortStream = useCallback(() => {
    client.abort();
    setIsStreaming(false);
    setIsThinking(false);

    // Aborting resolves the stream silently — StreamAdapter swallows AbortError
    // and returns, so neither onDone nor onError fires. Without this, the
    // in-flight assistant message keeps `isStreaming: true` forever: its
    // thinking dots never stop, or its streaming cursor never clears.
    setMessages((prev) => {
      const updated = prev
        .map((msg) =>
          msg.isStreaming ? { ...msg, isStreaming: false, stopped: true } : msg
        )
        // Stopping before a single token arrived leaves an empty assistant
        // bubble with nothing to say. Drop it — the thread should look as
        // though the turn was never taken, not as though Mya replied blankly.
        .filter(
          (msg) => !(msg.stopped && msg.role === 'assistant' && !msg.content)
        );
      persistHistory(updated);
      return updated;
    });
  }, [client, persistHistory]);

  const clearSession = useCallback(async () => {
    abortStream();
    await clearCachedMessages();
    await client.clearSession();
    setConversationId(client.getConversationId());
    setUserId(client.getUserId());
    setMessages([]);
    setActiveBlocks([]);
    setActiveActions([]);
    setUnsentDraft(null);
    setError(null);
  }, [client, abortStream, clearCachedMessages]);

  const clearUnsentDraft = useCallback(() => setUnsentDraft(null), []);

  const restartConversation = useCallback(async () => {
    abortStream();
    if (options.persistMessages) {
      await clearCachedMessages();
    }
    const newConvId = await client.createNewConversation();
    setConversationId(newConvId);
    setMessages([]);
    setActiveBlocks([]);
    setActiveActions([]);
    setError(null);
    return newConvId;
  }, [client, abortStream, options.persistMessages, clearCachedMessages]);

  const sendMessage = useCallback(
    async (text, customContext, sendOptions = {}) => {
      const trimmed = (text || '').trim();
      if (!trimmed) return;
      if (inFlight.has(client)) return; // already sending: one request at a time
      inFlight.add(client);

      try {
        setError(null);
        setUnsentDraft(null);

        // Photos first: if any can't be read, nothing is sent and the draft
        // goes straight back. The UI must never say "photo attached" for a
        // photo the server won't receive.
        const rawAttachments = Array.isArray(sendOptions.attachments) ? sendOptions.attachments : [];
        let sendAttachments;
        if (rawAttachments.length) {
          const { ready, rejected } = normalizeAttachments(rawAttachments);
          if (rejected.length) {
            const attErr = makeError('attachment', undefined, { rejected });
            setError(attErr);
            setUnsentDraft({ text: trimmed, attachments: rawAttachments, reason: 'attachment' });
            options.onError && options.onError(attErr);
            return;
          }
          sendAttachments = ready;
        }

        setIsThinking(true);
        setIsStreaming(true);

        const userMessageId = createId('msg_usr');
        const assistantMessageId = createId('msg_ast');
        const now = new Date().toISOString();

        // Attachments belong on the message from the moment it is created, so
        // the user's own photo renders for the whole reply.
        const userMessage = {
          id: userMessageId,
          role: 'user',
          content: trimmed,
          timestamp: now,
          ...(sendAttachments && sendAttachments.length ? { attachments: sendAttachments } : {})
        };

        const initialAssistantMessage = {
          id: assistantMessageId,
          role: 'assistant',
          content: '',
          timestamp: now,
          isStreaming: true,
          blocks: [],
          actions: []
        };

        setMessages((prev) => [...prev, userMessage, initialAssistantMessage]);

        let failed = false;
        const handleFailure = (rawErr) => {
          if (failed) return; // onError and a thrown error can both fire for one failure
          failed = true;
          const myaErr = toMyaError(rawErr);
          const { kind } = classifyError(myaErr);
          setIsStreaming(false);
          setIsThinking(false);
          if (kind === 'aborted') return; // the user stopped it; abortStream owns the message state, and it is not an error
          setError(myaErr);
          options.onError && options.onError(myaErr);

          setMessages((prev) => {
            const target = prev.find((m) => m.id === assistantMessageId);
            let updated;
            if (target && target.content) {
              // Mya had already said something: keep it, mark it interrupted.
              updated = prev.map((m) =>
                m.id === assistantMessageId
                  ? { ...m, isStreaming: false, interrupted: true, error: true, errorKind: kind }
                  : m
              );
            } else {
              // Nothing reached the user: take the turn back out of the thread
              // and hand the unsent message back to the composer.
              updated = prev.filter((m) => m.id !== assistantMessageId && m.id !== userMessageId);
              setUnsentDraft({ text: trimmed, attachments: rawAttachments, reason: kind });
            }
            persistHistory(updated);
            return updated;
          });
        };

        try {
          await client.sendMessage({
            message: trimmed,
            conversationId,
            experienceContext: customContext,
            attachments: sendAttachments,
            onDelta: (delta, accumulated) => {
              setIsThinking(false);
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: accumulated, isStreaming: true }
                    : msg
                )
              );
            },
            onBlock: (block) => {
              setActiveBlocks((prev) => [...prev, block]);
              setMessages((prev) =>
                prev.map((msg) => {
                  if (msg.id !== assistantMessageId) return msg;
                  // Stamp where this block arrived relative to the prose so the
                  // renderer can interleave text and cards in model order.
                  const positioned =
                    block && block.position == null
                      ? { ...block, position: (msg.content || '').length }
                      : block;
                  return { ...msg, blocks: [...(msg.blocks || []), positioned] };
                })
              );
            },
            onAction: (action) => {
              setActiveActions((prev) => [...prev, action]);
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, actions: [...(msg.actions || []), action] }
                    : msg
                )
              );
            },
            onDone: (meta) => {
              setIsStreaming(false);
              setIsThinking(false);
              setMessages((prev) => {
                const updated = prev.map((msg) => {
                  if (msg.id === assistantMessageId) {
                    const completedMsg = { ...msg, isStreaming: false, metadata: meta };
                    options.onStreamComplete && options.onStreamComplete(completedMsg);
                    return completedMsg;
                  }
                  return msg;
                });
                persistHistory(updated);
                return updated;
              });
            },
            onError: handleFailure
          });
        } catch (err) {
          handleFailure(err);
        }
      } finally {
        inFlight.delete(client);
      }
    },
    [client, conversationId, options, persistHistory]
  );

  const loadConversation = useCallback(async (targetConvId) => {
    if (!targetConvId) return;
    try {
      setIsThinking(true);
      const history = await client.fetchConversationHistory(targetConvId);
      client.setConversationId(targetConvId);
      setConversationId(targetConvId);
      setMessages(history);
      persistHistory(history);
      return history;
    } catch (err) {
      console.warn('[useMyaChat] loadConversation error:', err);
      throw err;
    } finally {
      setIsThinking(false);
    }
  }, [client, persistHistory]);

  const fetchConversations = useCallback(async () => {
    return client.fetchUserConversations();
  }, [client]);

  const updateAuthToken = useCallback((token) => {
    if (client && typeof client.setAuthToken === 'function') {
      client.setAuthToken(token);
    }
  }, [client]);

  const updateUserId = useCallback(async (newUserId) => {
    if (client && typeof client.setUserId === 'function') {
      await client.setUserId(newUserId);
      setUserId(newUserId);
    }
  }, [client]);

  return {
    messages,
    isStreaming,
    isThinking,
    error,
    activeBlocks,
    activeActions,
    conversationId,
    userId,
    client,
    sendMessage,
    abortStream,
    restartConversation,
    clearSession,
    unsentDraft,
    clearUnsentDraft,
    loadConversation,
    fetchConversations,
    setMessages,
    clearCachedMessages,
    updateAuthToken,
    updateUserId
  };
}

module.exports = {
  useMyaChat
};
