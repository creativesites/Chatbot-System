/**
 * Types for '@myavana/react-native-sdk/ui' (TASK-008 M2).
 */
import * as React from 'react';
import { MyaError } from './index';

export interface MyaChatMenuItem {
  key: string;
  icon?: string;
  iconColor?: string;
  title: string;
  subtitle?: string;
  onPress?: (api: { send: (text: string) => void }) => void;
}

export interface MyaChatProps {
  /** Mya API base URL. Required: there is no default. */
  apiBase: string;
  /** SDK storage adapter, e.g. new AsyncStorageAdapter(AsyncStorage). */
  storage: any;
  /** Host-owned member id. Always wins over any stored id. */
  userId?: string;
  userName?: string;
  getAuthToken?: () => Promise<string | null | undefined>;
  screen?: { name: string; title: string };
  starters?: Array<{ id: string; label: string; prompt: string }>;
  /** Builds the experienceContext sent with each turn. */
  getContext?: (extra: { screen: string; hasAttachedPhoto: boolean }) => Record<string, any>;
  onBack?: () => void;
  /** Return true if the host handled the action. */
  onBlockAction?: (action: { type: string; label?: string; payload?: any }, payload?: any) => boolean;
  launchCamera?: (options: any, callback: (result: any) => void) => void;
  launchImageLibrary?: (options: any, callback: (result: any) => void) => void;
  /** One flag: false removes photo attach from chat. Default true. */
  photosInChat?: boolean;
  menuItems?: MyaChatMenuItem[];
  initialPrompt?: string;
  initialAttachments?: any[];
  persistPrefix?: string;
  /** Host modals, rendered last. */
  children?: React.ReactNode | ((api: { send: (text: string) => void }) => React.ReactNode);
}

export const MyaChat: React.ComponentType<MyaChatProps>;
export const MyaComposer: React.ComponentType<any>;
export const MyaMessageRow: React.ComponentType<any>;
export const ErrorRow: React.ComponentType<{ onRetry?: () => void; message?: string }>;
export const MyaMarkdown: React.ComponentType<any>;
export const MyaWelcome: React.ComponentType<any>;
export const MyaThinkingDots: React.ComponentType<any>;
export const MyaSheet: React.ComponentType<any>;
export const MyaHistorySheet: React.ComponentType<any>;
export const MyaAvatar: React.ComponentType<{ size?: number; style?: any }>;
export const MyaRichBlock: React.ComponentType<{ block: any; message?: any; onAction?: (action: any) => void }>;
export function useMyaKeyboard(): { keyboardHeight: number; isKeyboardOpen: boolean };

export const MyaThemeProvider: React.ComponentType<{ theme?: any; children?: React.ReactNode }>;
export function useMyaTheme(): any;
export const MYAVANA_THEME: any;
export const MyaColors: Record<string, string>;
export const MyaFonts: Record<string, string>;
export const MyaType: Record<string, any>;
export const MyaRadii: Record<string, any>;
export const MyaMotion: Record<string, number>;
export const MyaShadow: Record<string, any>;
export const MYA_TOUCH: number;

export const UiBlockType: Record<string, string>;
export function registerComponent(type: string, component: React.ComponentType<any>): void;
export function registerComponents(map: Record<string, React.ComponentType<any>>): void;
export function resolveComponent(type: string): React.ComponentType<any> | null;
export function registeredTypes(): string[];
export function isSuppressedType(type: string): boolean;
export const SUPPRESSED_TYPES: string[];
