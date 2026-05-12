import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Theatrico',
  slug: 'theatrico-native',
  version: '1.0.0',
  orientation: 'default',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  newArchEnabled: true,
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#1a1a2e',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.theatrico.native',
    infoPlist: {
      NSMicrophoneUsageDescription:
        'Theatrico uses the microphone to transcribe live speech for the script prompter.',
      NSSpeechRecognitionUsageDescription:
        'Theatrico uses speech recognition to follow along with dialogue and advance the script automatically.',
      NSCameraUsageDescription:
        'Theatrico uses the camera to scan session QR codes so audiences can join quickly.',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#1a1a2e',
    },
    package: 'com.theatrico.native',
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-splash-screen',
    [
      'expo-camera',
      { cameraPermission: 'Allow Theatrico to access your camera to scan session QR codes.' },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  scheme: 'theatrico',
  extra: {
    BACKEND_URL: process.env.BACKEND_URL ?? '',
  },
});
