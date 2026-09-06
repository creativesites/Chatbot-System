/**
 * Device Telemetry & Platform Attribution
 *
 * Captures mobile platform metadata for session handshakes
 * and operator console reporting ({ platform: 'react-native-ios' | 'react-native-android' }).
 */
import { DeviceTelemetryPayload, MobilePlatform } from '../types';
export declare const SDK_VERSION = "1.0.0";
/**
 * Safely resolves the active mobile platform without assuming DOM or hard React Native presence.
 */
export declare function resolveMobilePlatform(customPlatform?: string): MobilePlatform;
/**
 * Builds the full device telemetry payload for session initialization.
 */
export declare function getDeviceTelemetry(overrides?: Partial<DeviceTelemetryPayload>): DeviceTelemetryPayload;
/**
 * Enriches the experienceContext payload sent to /chat/stream with verified mobile telemetry.
 */
export declare function enrichExperienceContext(baseContext?: Record<string, any>, telemetry?: Partial<DeviceTelemetryPayload>): Record<string, any>;
//# sourceMappingURL=deviceTelemetry.d.ts.map