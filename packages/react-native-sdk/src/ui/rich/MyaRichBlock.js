/**
 * MyaRichBlock — the single entry point for rendering a typed block.
 *
 * Two jobs, deliberately no more:
 *   1. Look the block's type up in the registry.
 *   2. Make sure a bad block can never take the conversation down with it.
 *
 * (2) is not hypothetical caution. The empty-white-bubble bug earlier this week
 * was so damaging precisely because one rendering fault silently destroyed every
 * message. A card built from server-supplied data is exactly where the next one
 * would come from, so it gets a real boundary.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MyaColors, MyaType } from '../myaTheme';
import { resolveComponent, isInlineTextBlock, isSuppressedType } from './registry';
import { MyaGenericCard } from './cards';
import './register';

class BlockBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    // Loud in dev, silent for the user — they should never see a stack trace,
    // and one broken card should never look like Mya failed to answer.
    if (__DEV__) {
      console.warn(`[MyaRichBlock] "${this.props.blockType}" failed to render:`, error?.message);
    }
  }

  render() {
    if (this.state.failed) return this.props.fallback ?? null;
    return this.props.children;
  }
}

export default function MyaRichBlock({ block, message, onAction }) {
  if (!block || typeof block !== 'object') return null;

  const type = block.type;

  // Text and markdown belong in the bubble, not in a card.
  if (isInlineTextBlock(type)) return null;

  // MYAVANA sells services, not products: see SUPPRESSED_TYPES in the registry.
  if (isSuppressedType(type)) return null;

  const data = block.data || block;
  const actions = Array.isArray(block.actions) ? block.actions : [];

  // The SDK never navigates. It reports the verb and lets the host decide.
  const handleAction = (action) => {
    if (!action || !onAction) return;
    onAction({
      type: action.type,
      label: action.label,
      payload: action.payload ?? data,
      block,
      message,
    });
  };

  const Component = resolveComponent(type) || MyaGenericCard;

  return (
    <BlockBoundary blockType={type} fallback={<UnavailableCard />}>
      <Component data={data} actions={actions} onAction={handleAction} block={block} />
    </BlockBoundary>
  );
}

/**
 * Shown only when a card genuinely threw. Says something true and small rather
 * than pretending nothing happened — the prose around it is still valid.
 */
function UnavailableCard() {
  return (
    <View style={styles.fallback}>
      <Text style={styles.fallbackText}>This card couldn't be displayed.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: MyaColors.ink07,
    backgroundColor: MyaColors.ivory,
    maxWidth: '86%',
  },
  fallbackText: {
    ...MyaType.quickReply,
    color: MyaColors.ink45,
  },
});
