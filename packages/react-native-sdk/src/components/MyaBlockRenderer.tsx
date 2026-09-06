/**
 * MyaBlockRenderer
 *
 * Universal generative UI block dispatcher for mobile.
 * Inspects block type and delegates to the appropriate specialized card.
 */

import React from 'react';
import { MyaTheme } from './theme';
import { MyaStrandCard } from './MyaStrandCard';
import { MyaRoutineChecklist } from './MyaRoutineChecklist';
import { MyaGoalCard, HairGoalData } from './MyaGoalCard';
import { MyaJournalCard, HairJournalEntryData } from './MyaJournalCard';
import { MyaConsultationCard, SpecialistProfile } from './MyaConsultationCard';
import { MyaQuickReplies, QuickReplyItem } from './MyaQuickReplies';
import { View } from './nativePrimitives';
import { BlockFrame, HairStrandData, RoutineData } from '../types';

export interface MyaBlockRendererProps {
  block: BlockFrame | { type: string; block_type?: string; data: any };
  theme?: Partial<MyaTheme>;
  onPressAction?: (actionName: string, payload?: any) => void;
  onSelectQuickReply?: (reply: QuickReplyItem) => void;
  onToggleRoutineStep?: (stepId: string, completed: boolean) => void;
  onPressJournalEntry?: (entryId: string) => void;
  onBookConsultation?: (specialist: SpecialistProfile) => void;
}

export function MyaBlockRenderer({
  block,
  theme,
  onPressAction,
  onSelectQuickReply,
  onToggleRoutineStep,
  onPressJournalEntry,
  onBookConsultation
}: MyaBlockRendererProps) {
  if (!block) return null;

  // Resolve block type across different wire frame representations
  const blockType = (block as any).block_type || (block as any).type;
  const data = (block as any).data || {};

  switch (blockType) {
    case 'hair_profile_summary':
    case 'strand_dna':
    case 'hair_profile':
      return React.createElement(MyaStrandCard, {
        strandData: data as HairStrandData,
        theme
      });

    case 'routine_card':
    case 'routine':
    case 'hair_routine':
      return React.createElement(MyaRoutineChecklist, {
        routine: data as RoutineData,
        theme,
        onToggleStep: onToggleRoutineStep
      });

    case 'goal_card':
    case 'hair_goal':
      return React.createElement(MyaGoalCard, {
        goal: data as HairGoalData,
        theme,
        onPressUpdate: onPressAction ? () => onPressAction('update_goal', data) : undefined
      });

    case 'journal_entry':
    case 'hair_journal':
      return React.createElement(MyaJournalCard, {
        entry: data as HairJournalEntryData,
        theme,
        onPressEntry: onPressJournalEntry
      });

    case 'consultation_card':
    case 'specialist':
    case 'book_specialist':
      return React.createElement(MyaConsultationCard, {
        specialist: (data.specialist || data) as SpecialistProfile,
        bookingUrl: data.bookingUrl,
        theme,
        onBookConsultation: onBookConsultation || (onPressAction ? (s) => onPressAction('book_consultation', s) : undefined)
      });

    case 'quick_replies':
      return React.createElement(MyaQuickReplies, {
        replies: data.replies || data,
        theme,
        onSelectReply: onSelectQuickReply || ((r) => onPressAction && onPressAction('quick_reply', r))
      });

    default:
      // Unknown or unsupported block type
      return React.createElement(View, null);
  }
}
