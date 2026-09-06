/**
 * Storage Adapters for Mobile Environments
 *
 * Enforces zero DOM assumptions. Never references window.localStorage.
 */
/**
 * Clean in-memory storage adapter for testing and zero-dependency mobile environments.
 */
export class MemoryStorageAdapter {
    constructor() {
        this.store = new Map();
    }
    getItem(key) {
        return this.store.get(key) ?? null;
    }
    setItem(key, value) {
        this.store.set(key, String(value));
    }
    removeItem(key) {
        this.store.delete(key);
    }
    clear() {
        this.store.clear();
    }
}
/**
 * Adapter for @react-native-async-storage/async-storage.
 */
export class AsyncStorageAdapter {
    constructor(asyncStorageInstance) {
        if (!asyncStorageInstance || typeof asyncStorageInstance.getItem !== 'function') {
            throw new Error('AsyncStorageAdapter requires a valid AsyncStorage instance with getItem/setItem');
        }
        this.asyncStorage = asyncStorageInstance;
    }
    async getItem(key) {
        return this.asyncStorage.getItem(key);
    }
    async setItem(key, value) {
        return this.asyncStorage.setItem(key, value);
    }
    async removeItem(key) {
        return this.asyncStorage.removeItem(key);
    }
}
export function createDefaultStorage(customStorage) {
    if (customStorage && typeof customStorage.getItem === 'function') {
        return customStorage;
    }
    return new MemoryStorageAdapter();
}
//# sourceMappingURL=StorageAdapter.js.map