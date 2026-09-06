/**
 * MyaPlatformAdapter
 *
 * Mobile host platform bridge contract and global registry.
 * Allows host apps (like MyAvana_FrontEnd_RN) to register native state getters,
 * React Navigation handlers, and device capabilities with Mya.
 */
let activePlatformAdapter = null;
export function registerPlatformAdapter(adapter) {
    activePlatformAdapter = adapter;
}
export function getPlatformAdapter() {
    return activePlatformAdapter;
}
export function resetPlatformAdapter() {
    activePlatformAdapter = null;
}
//# sourceMappingURL=MyaPlatformAdapter.js.map