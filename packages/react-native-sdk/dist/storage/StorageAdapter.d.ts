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
export declare class MemoryStorageAdapter implements StorageAdapter {
    private store;
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
    clear(): void;
}
/**
 * Adapter for @react-native-async-storage/async-storage.
 */
export declare class AsyncStorageAdapter implements StorageAdapter {
    private asyncStorage;
    constructor(asyncStorageInstance: any);
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
}
export declare function createDefaultStorage(customStorage?: any): StorageAdapter;
//# sourceMappingURL=StorageAdapter.d.ts.map