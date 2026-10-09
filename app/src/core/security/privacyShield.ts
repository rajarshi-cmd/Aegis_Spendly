import { useEffect, useState } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';

/**
 * Enables hardware-level screen protection (FLAG_SECURE on Android)
 * to prevent screen captures and multitasking previews.
 */
export async function enableScreenCaptureProtection(): Promise<void> {
  try {
    // In development mode, allow screen captures for emulator inspection
    if (__DEV__) {
      return;
    }
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      await ScreenCapture.preventScreenCaptureAsync();
    }
  } catch (error) {
    console.warn('[PrivacyShield] Unable to enable hardware screen protection:', error);
  }
}

/**
 * Disables hardware-level screen protection if needed.
 */
export async function disableScreenCaptureProtection(): Promise<void> {
  try {
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      await ScreenCapture.allowScreenCaptureAsync();
    }
  } catch (error) {
    console.warn('[PrivacyShield] Unable to release screen protection:', error);
  }
}

/**
 * React hook that monitors AppState to render a privacy curtain whenever
 * the application transitions into the multitasking switcher or background.
 */
export function usePrivacyShield() {
  const [isShieldActive, setIsShieldActive] = useState<boolean>(false);

  useEffect(() => {
    // Activate hardware protection on mount (release in DEV mode)
    if (__DEV__) {
      disableScreenCaptureProtection();
    } else {
      enableScreenCaptureProtection();
    }

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      // Inactive (iOS app switcher) or Background (Android/iOS backgrounded)
      if (nextAppState === 'inactive' || nextAppState === 'background') {
        setIsShieldActive(true);
      } else if (nextAppState === 'active') {
        setIsShieldActive(false);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

  return { isShieldActive };
}
