/**
 * Maps the backend's canonical BlockType values to native components.
 *
 * Several types intentionally share a renderer — `routine_card`,
 * `routine_checklist` and `today_checklist` are the same object at different
 * levels of detail, and rendering them three different ways would be exactly
 * the "pile of cards" this registry exists to prevent.
 */

import { BlockType, registerComponents } from './registry';
import {
  MyaRoutineCard,
  MyaHairInsightCard,
  MyaGoalCard,
  MyaJourneyCard,
  MyaChoiceGroup,
  MyaQuickActionCard,
  MyaNavigationCard,
  MyaGenericCard,
  MyaCommunityPostCard,
  MyaMediaCard,
} from './cards';
import { Divider } from './primitives';
import ServiceOfferCard from '../offers/ServiceOfferCard';

registerComponents({
  // A visual break between ideas
  [BlockType.DIVIDER]: Divider,

  // Routines — one family, three granularities
  [BlockType.ROUTINE_CARD]: MyaRoutineCard,
  [BlockType.ROUTINE_CHECKLIST]: MyaRoutineCard,
  [BlockType.TODAY_CHECKLIST]: MyaRoutineCard,

  // Profile / insight
  [BlockType.HAIR_PROFILE_CARD]: MyaHairInsightCard,
  [BlockType.HAIR_PROFILE_SUMMARY]: MyaHairInsightCard,

  // Goals
  [BlockType.GOAL_CARD]: MyaGoalCard,
  [BlockType.GOAL_PROGRESS]: MyaGoalCard,
  [BlockType.GOAL_LIST]: MyaGoalCard,

  // Journey / diary
  [BlockType.JOURNAL_ENTRY]: MyaJourneyCard,
  [BlockType.JOURNEY_PROGRESS]: MyaJourneyCard,

  // Structured questions and decisions
  [BlockType.QUICK_REPLIES]: MyaChoiceGroup,
  [BlockType.CONFIRMATION]: MyaChoiceGroup,

  // Visual Media & Hairstyle Cards (Item D)
  [BlockType.MEDIA_CARD]: MyaMediaCard,
  [BlockType.HAIRSTYLE_CARD]: MyaMediaCard,

  // Navigation and services
  [BlockType.COMMUNITY_POST]: MyaCommunityPostCard,
  [BlockType.NAVIGATION]: MyaNavigationCard,
  [BlockType.CONSULTATION_CARD]: MyaGenericCard,
  [BlockType.SERVICE_CARD]: MyaGenericCard,

  // The server-chosen offer. Validated, owned/dismissed-aware, routed through the host.
  [BlockType.SERVICE_OFFER]: ServiceOfferCard,
});
