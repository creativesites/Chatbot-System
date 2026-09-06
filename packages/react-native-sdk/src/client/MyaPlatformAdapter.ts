/**
 * MyaPlatformAdapter
 *
 * Mobile host platform bridge contract and global registry.
 * Allows host apps (like MyAvana_FrontEnd_RN) to register native state getters,
 * React Navigation handlers, and device capabilities with Mya.
 */

import { MyaPlatformAdapter } from '../types';

let activePlatformAdapter: MyaPlatformAdapter | null = null;

export function registerPlatformAdapter(adapter: MyaPlatformAdapter): void {
  activePlatformAdapter = adapter;
}

export function getPlatformAdapter(): MyaPlatformAdapter | null {
  return activePlatformAdapter;
}

export function resetPlatformAdapter(): void {
  activePlatformAdapter = null;
}
