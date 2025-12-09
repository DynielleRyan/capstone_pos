/**
 * Browser Fingerprinting Utility
 * Generates a unique fingerprint for the current browser instance
 * Note: This is browser-based, not device-based. Different browsers on the same device
 * will be treated as different instances and require separate OTP verification.
 */

export interface DeviceFingerprint {
  userAgent: string;
  screenResolution: string;
  timezone: string;
  language: string;
  platform: string;
  cookieEnabled: boolean;
  doNotTrack: string | null;
  hardwareConcurrency: number | null;
  deviceMemory: number | null;
}

/**
 * Generate a browser fingerprint based on browser characteristics
 * This creates a unique identifier for the browser instance
 * Note: Different browsers on the same device will have different fingerprints
 */
export const generateDeviceFingerprint = (): DeviceFingerprint => {
  return {
    userAgent: navigator.userAgent,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    platform: navigator.platform,
    cookieEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack || null,
    hardwareConcurrency: navigator.hardwareConcurrency || null,
    deviceMemory: (navigator as any).deviceMemory || null,
  };
};

/**
 * Generate a hash from the device fingerprint
 * This creates a consistent identifier that can be stored and compared
 */
export const hashDeviceFingerprint = (fingerprint: DeviceFingerprint): string => {
  // Create a string representation of the fingerprint
  const fingerprintString = JSON.stringify({
    userAgent: fingerprint.userAgent,
    screenResolution: fingerprint.screenResolution,
    timezone: fingerprint.timezone,
    language: fingerprint.language,
    platform: fingerprint.platform,
    cookieEnabled: fingerprint.cookieEnabled,
    doNotTrack: fingerprint.doNotTrack,
    hardwareConcurrency: fingerprint.hardwareConcurrency,
    deviceMemory: fingerprint.deviceMemory,
  });

  // Simple hash function (for production, consider using a more robust hashing library)
  let hash = 0;
  for (let i = 0; i < fingerprintString.length; i++) {
    const char = fingerprintString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return Math.abs(hash).toString(36);
};

/**
 * Get or create a browser ID stored in localStorage
 * This provides a persistent identifier for the browser instance
 * Note: localStorage is browser-specific, so each browser has its own ID
 */
export const getDeviceId = (): string => {
  const storageKey = 'device_id';
  let deviceId = localStorage.getItem(storageKey);

  if (!deviceId) {
    // Generate a new device ID
    deviceId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem(storageKey, deviceId);
  }

  return deviceId;
};

/**
 * Get the complete browser identifier
 * Combines browser fingerprint hash with a persistent browser ID
 * Note: This identifies the browser instance, not the physical device
 */
export const getDeviceIdentifier = (): { fingerprint: DeviceFingerprint; fingerprintHash: string; deviceId: string } => {
  const fingerprint = generateDeviceFingerprint();
  const fingerprintHash = hashDeviceFingerprint(fingerprint);
  const deviceId = getDeviceId();

  return {
    fingerprint,
    fingerprintHash,
    deviceId,
  };
};
