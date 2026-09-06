/**
 * Device Telemetry & Platform Attribution
 *
 * Captures mobile platform metadata for session handshakes
 * and operator console reporting ({ platform: 'react-native-ios' | 'react-native-android' }).
 */
export const SDK_VERSION = '1.0.0';
/**
 * Safely resolves the active mobile platform without assuming DOM or hard React Native presence.
 */
export function resolveMobilePlatform(customPlatform) {
    if (customPlatform === 'react-native-ios' || customPlatform === 'ios') {
        return 'react-native-ios';
    }
    if (customPlatform === 'react-native-android' || customPlatform === 'android') {
        return 'react-native-android';
    }
    // Attempt to check global React Native Platform if present
    try {
        const RN = require('react-native');
        if (RN && RN.Platform && RN.Platform.OS) {
            if (RN.Platform.OS === 'ios')
                return 'react-native-ios';
            if (RN.Platform.OS === 'android')
                return 'react-native-android';
        }
    }
    catch {
        // React Native not directly imported or in Node testing environment
    }
    return 'react-native-ios'; // Default mobile platform assumption
}
/**
 * Builds the full device telemetry payload for session initialization.
 */
export function getDeviceTelemetry(overrides) {
    const platform = resolveMobilePlatform(overrides?.platform);
    return {
        platform,
        sdkVersion: SDK_VERSION,
        appVersion: overrides?.appVersion || '1.0.0',
        deviceModel: overrides?.deviceModel,
        osVersion: overrides?.osVersion,
        locale: overrides?.locale || 'en_US',
        networkType: overrides?.networkType || 'unknown',
        ...overrides
    };
}
/**
 * Enriches the experienceContext payload sent to /chat/stream with verified mobile telemetry.
 */
export function enrichExperienceContext(baseContext, telemetry) {
    const resolvedTelemetry = getDeviceTelemetry(telemetry);
    return {
        ...(baseContext || {}),
        platform: resolvedTelemetry.platform,
        channel: 'mobile-sdk',
        appVersion: resolvedTelemetry.appVersion,
        sdkVersion: resolvedTelemetry.sdkVersion,
        deviceModel: resolvedTelemetry.deviceModel,
        osVersion: resolvedTelemetry.osVersion,
        locale: resolvedTelemetry.locale,
        telemetryTimestamp: new Date().toISOString()
    };
}
//# sourceMappingURL=deviceTelemetry.js.map