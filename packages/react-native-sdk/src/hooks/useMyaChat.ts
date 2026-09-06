/**
 * Headless React Hook: useMyaChat
 *
 * Provides reactive mobile state management for conversational history,
 * streaming NDJSON deltas, generative UI blocks, loading indicators, connectivity,
 * and offline caching via StorageAdapter.
 * Zero DOM assumptions.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { MyaMobileClient } from '../client/MyaMobileClient';
import {
  ChatAction,
  ChatBlock,
  ChatMessage,
  UseMyaChatOptions,
  UseMyaChatReturn
} from '../types';
import { createId } from '../types';

export function useMyaChat(options: UseMyaChatOptions = {}): UseMyaChatReturn {
  const clientRef = useRef<MyaMobileClient>(
    options.client ||
      new MyaMobileClient({
        apiBase: options.apiBase || 'https://myavana-ai-bot-staging-201873778892.us-central1.run.app',
        userId: options.initialUserId,
        conversationId: options.initialConversationId,
        telemetry: options.telemetry,
        storage: options.storage
      })
  );

  const client = clientRef.current;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [activeBlocks, setActiveBlocks] = useState<ChatBlock[]>([]);
  const [activeActions, setActiveActions] = useState<ChatAction[]>([]);
  const [conversationId, setConversationId] = useState<string>(client.getConversationId());
  const [userId, setUserId] = useState<string>(client.getUserId());

  const cacheKey = options.persistKey || `mya_cached_messages_${conversationId}`;

  // Initialize client storage and restore offline messages on mount
  useEffect(() => {
    let mounted = true;
    client.init().then(async () => {
      if (mounted) {
        setUserId(client.getUserId());
        const currentConvId = client.getConversationId();
        setConversationId(currentConvId);

        // Offline cache hydration if enabled
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
    async (msgs: ChatMessage[]) => {
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
    async (text: string, customContext?: Record<string, any>) => {
      const trimmed = (text || '').trim();
      if (!trimmed) return;

      setError(null);
      setIsThinking(true);
      setIsStreaming(true);

      const userMessageId = createId('msg_usr');
      const assistantMessageId = createId('msg_ast');
      const now = new Date().toISOString();

      const userMessage: ChatMessage = {
        id: userMessageId,
        role: 'user',
        content: trimmed,
        timestamp: now
      };

      const initialAssistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: now,
        isStreaming: true,
        blocks: [],
        actions: []
      };

      // Optimistically append messages
      setMessages((prev: ChatMessage[]) => [...prev, userMessage, initialAssistantMessage]);

      try {
        let accumulatedContent = '';
        const accumulatedBlocks: ChatBlock[] = [];
        const accumulatedActions: ChatAction[] = [];

        await client.sendMessage({
          message: trimmed,
          conversationId,
          experienceContext: customContext,
          onDelta: (delta: string, accumulated: string) => {
            setIsThinking(false);
            accumulatedContent = accumulated;

            setMessages((prev: ChatMessage[]) =>
              prev.map((msg: ChatMessage) =>
                msg.id === assistantMessageId
                  ? { ...msg, content: accumulated, isStreaming: true }
                  : msg
              )
            );
          },
          onBlock: (block: ChatBlock) => {
            accumulatedBlocks.push(block);
            setActiveBlocks((prev: ChatBlock[]) => [...prev, block]);

            setMessages((prev: ChatMessage[]) =>
              prev.map((msg: ChatMessage) =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      blocks: [...(msg.blocks || []), block]
                    }
                  : msg
              )
            );
          },
          onAction: (action: ChatAction) => {
            accumulatedActions.push(action);
            setActiveActions((prev: ChatAction[]) => [...prev, action]);

            setMessages((prev: ChatMessage[]) =>
              prev.map((msg: ChatMessage) =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      actions: [...(msg.actions || []), action]
                    }
                  : msg
              )
            );
          },
          onDone: (meta: Record<string, any>) => {
            setIsStreaming(false);
            setIsThinking(false);

            setMessages((prev: ChatMessage[]) => {
              const updated = prev.map((msg: ChatMessage) => {
                if (msg.id === assistantMessageId) {
                  const completedMsg: ChatMessage = {
                    ...msg,
                    isStreaming: false,
                    metadata: meta
                  };
                  options.onStreamComplete?.(completedMsg);
                  return completedMsg;
                }
                return msg;
              });
              persistHistory(updated);
              return updated;
            });
          },
          onError: (streamErr: Error) => {
            setError(streamErr);
            setIsStreaming(false);
            setIsThinking(false);
            options.onError?.(streamErr);

            setMessages((prev: ChatMessage[]) => {
              const updated = prev.map((msg: ChatMessage) =>
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
      } catch (err: any) {
        setError(err);
        setIsStreaming(false);
        setIsThinking(false);
        options.onError?.(err);

        setMessages((prev: ChatMessage[]) => {
          const updated = prev.map((msg: ChatMessage) =>
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
