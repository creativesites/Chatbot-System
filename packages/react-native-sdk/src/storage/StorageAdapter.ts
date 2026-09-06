/**
 * Storage Adapters for Mobile Environments
 *
 * Enforces zero DOM assumptions. Never references window.localStorage.
 */

export interface StorageAdapter {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
  removeItem(key: string): Promise<void> | void;
}

/**
 * Clean in-memory storage adapter for testing and zero-dependency mobile environments.
 */
export class MemoryStorageAdapter implements StorageAdapter {
  private store: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

/**
 * Adapter for @react-native-async-storage/async-storage.
 */
export class AsyncStorageAdapter implements StorageAdapter {
  private asyncStorage: any;

  constructor(asyncStorageInstance: any) {
    if (!asyncStorageInstance || typeof asyncStorageInstance.getItem !== 'function') {
      throw new Error('AsyncStorageAdapter requires a valid AsyncStorage instance with getItem/setItem');
    }
    this.asyncStorage = asyncStorageInstance;
  }

  async getItem(key: string): Promise<string | null> {
    return this.asyncStorage.getItem(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    return this.asyncStorage.setItem(key, value);
  }

  async removeItem(key: string): Promise<void> {
    return this.asyncStorage.removeItem(key);
  }
}

export function createDefaultStorage(customStorage?: any): StorageAdapter {
  if (customStorage && typeof customStorage.getItem === 'function') {
    return customStorage;
  }
  return new MemoryStorageAdapter();
}
