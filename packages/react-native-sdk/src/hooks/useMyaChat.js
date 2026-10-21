/**
 * Headless React Hook: useMyaChat (JavaScript implementation)
 */

const { useState, useEffect, useRef, useCallback } = require('react');
const { MyaMobileClient } = require('../client/MyaMobileClient');
const { createId } = require('../types');

function useMyaChat(options = {}) {
  const clientRef = useRef(null);

  if (!clientRef.current) {
    if (options.client) {
      clientRef.current = options.client;
    } else {
      if (!options.apiBase && typeof process !== 'undefined' && process.env?.NODE_ENV !== 'test') {
        console.warn('[useMyaChat] options.apiBase is not set. Please provide apiBase explicitly.');
      }
      const apiBase =
        options.apiBase ||
        (typeof process !== 'undefined' && process.env?.MYA_API_BASE) ||
        'https://myavana-ai-bot-staging-201873778892.us-central1.run.app';
      clientRef.current = new MyaMobileClient({
        apiBase,
        userId: options.initialUserId,
        conversationId: options.initialConversationId,
        authToken: options.authToken,
        headers: options.headers,
        telemetry: options.telemetry,
        storage: options.storage
      });
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

      setError(null);
      setIsThinking(true);
      setIsStreaming(true);

      const userMessageId = createId('msg_usr');
      const assistantMessageId = createId('msg_ast');
      const now = new Date().toISOString();

      // Attachments belong on the message from the moment it is created.
      // Attaching them after `await sendMessage(...)` resolves is too late:
      // that promise settles only when the whole response has finished
      // streaming, so the user's own photo would render as a filename for the
      // entire reply - and not at all if the stream errored first.
      const userMessage = {
        id: userMessageId,
        role: 'user',
        content: trimmed,
        timestamp: now,
        ...(Array.isArray(sendOptions.attachments) && sendOptions.attachments.length
          ? { attachments: sendOptions.attachments }
          : {})
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

      try {
        await client.sendMessage({
          message: trimmed,
          conversationId,
          experienceContext: customContext,
          attachments: sendOptions.attachments,
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
                // Stamp where this block arrived relative to the prose.
                //
                // NDJSON delivers frames in order, so the length of the text
                // accumulated so far IS the block's position in the response.
                // That lets the renderer interleave text/card/text/card as the
                // model intended, instead of printing all prose then all cards.
                // No protocol change needed - the ordering was already on the
                // wire, we were just discarding it.
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
                  const completedMsg = {
                    ...msg,
                    isStreaming: false,
                    metadata: meta
                  };
                  options.onStreamComplete && options.onStreamComplete(completedMsg);
                  return completedMsg;
                }
                return msg;
              });
              persistHistory(updated);
              return updated;
            });
          },
          onError: (streamErr) => {
            setError(streamErr);
            setIsStreaming(false);
            setIsThinking(false);
            options.onError && options.onError(streamErr);

            setMessages((prev) => {
              const updated = prev.map((msg) =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      isStreaming: false,
                      error: true,
                      content:
                        msg.content ||
                        "I'm sorry, I encountered an issue connecting to MYAVANA Hair AI. Please try again."
                    }
                  : msg
              );
              persistHistory(updated);
              return updated;
            });
          }
        });
      } catch (err) {
        setError(err);
        setIsStreaming(false);
        setIsThinking(false);
        options.onError && options.onError(err);

        setMessages((prev) => {
          const updated = prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  isStreaming: false,
                  error: true,
                  content:
                    msg.content ||
                    "I'm having trouble reaching the network right now. Please check your connection."
                }
              : msg
          );
          persistHistory(updated);
          return updated;
        });
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
