import Constants from 'expo-constants';

function resolveBackendUrl(): string {
  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  const envUrl = extra?.['BACKEND_URL'];
  if (typeof envUrl === 'string' && envUrl.length > 0) {
    return envUrl;
  }
  return 'http://localhost:8080';
}

export const config = {
  backendUrl: resolveBackendUrl(),
} as const;
