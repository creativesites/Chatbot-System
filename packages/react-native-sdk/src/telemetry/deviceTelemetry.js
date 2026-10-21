/**
 * Device Telemetry & Platform Attribution (JavaScript implementation)
 */

const SDK_VERSION = '1.3.0';

function resolveMobilePlatform(customPlatform) {
  if (customPlatform === 'react-native-ios' || customPlatform === 'ios') {
    return 'react-native-ios';
  }
  if (customPlatform === 'react-native-android' || customPlatform === 'android') {
    return 'react-native-android';
  }

  try {
    const RN = require('react-native');
    if (RN && RN.Platform && RN.Platform.OS) {
      if (RN.Platform.OS === 'ios') return 'react-native-ios';
      if (RN.Platform.OS === 'android') return 'react-native-android';
    }
  } catch {
    // In Node or mocked testing environment
  }

  return 'react-native-ios';
}

function getDeviceTelemetry(overrides = {}) {
  const platform = resolveMobilePlatform(overrides.platform);

  return {
    platform,
    sdkVersion: SDK_VERSION,
    appVersion: overrides.appVersion || '1.0.0',
    deviceModel: overrides.deviceModel,
    osVersion: overrides.osVersion,
    locale: overrides.locale || 'en_US',
    networkType: overrides.networkType || 'unknown',
    ...overrides
  };
}

function enrichExperienceContext(baseContext = {}, telemetry = {}) {
  const resolvedTelemetry = getDeviceTelemetry(telemetry);

  return {
    ...baseContext,
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

module.exports = {
  SDK_VERSION,
  resolveMobilePlatform,
  getDeviceTelemetry,
  enrichExperienceContext
};
