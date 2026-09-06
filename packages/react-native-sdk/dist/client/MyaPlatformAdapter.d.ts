/**
 * MyaPlatformAdapter
 *
 * Mobile host platform bridge contract and global registry.
 * Allows host apps (like MyAvana_FrontEnd_RN) to register native state getters,
 * React Navigation handlers, and device capabilities with Mya.
 */
import { MyaPlatformAdapter } from '../types';
export declare function registerPlatformAdapter(adapter: MyaPlatformAdapter): void;
export declare function getPlatformAdapter(): MyaPlatformAdapter | null;
export declare function resetPlatformAdapter(): void;
//# sourceMappingURL=MyaPlatformAdapter.d.ts.map