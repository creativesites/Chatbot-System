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
      clientRef.current = new MyaMobileClient({
        apiBase: options.apiBase || 'https://myavana-ai-bot-staging-201873778892.us-central1.run.app',
        userId: options.initialUserId,
        conversationId: options.initialConversationId,
        telemetry: options.telemetry,
        storage: options.storage
      });
    }
  }

  const client = clientRef.current;

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
  }, [client]);

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
    async (text, customContext) => {
      const trimmed = (text || '').trim();
      if (!trimmed) return;

      setError(null);
      setIsThinking(true);
      setIsStreaming(true);

      const userMessageId = createId('msg_usr');
      const assistantMessageId = createId('msg_ast');
      const now = new Date().toISOString();

      const userMessage = {
        id: userMessageId,
        role: 'user',
        content: trimmed,
        timestamp: now
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
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, blocks: [...(msg.blocks || []), block] }
                  : msg
              )
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

  return {
    messages,
    isStreaming,
    isThinking,
    error,
    activeBlocks,
    activeActions,
    conversationId,
    userId,
    sendMessage,
    abortStream,
    restartConversation,
    setMessages,
    clearCachedMessages
  };
}

module.exports = {
  useMyaChat
};
