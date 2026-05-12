import { ActivityIndicator, Alert, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { useOperatorSession, type WsStatus } from '@/hooks/useOperatorSession';
import { RecognizerToggle } from '@/components/RecognizerToggle';
import { TranscriptLog } from '@/components/TranscriptLog';
import { ScriptPositionCard } from '@/components/ScriptPositionCard';
import { ModelDownloadSheet } from '@/components/ModelDownloadSheet';
import { useSpeechRecognizerContext } from '@/context/SpeechRecognizerContext';
import { useSettings, WHISPER_MODEL_URLS } from '@/context/SettingsContext';

const IPAD_BREAKPOINT = 768;

function ReconnectOverlay({ status }: { status: WsStatus }) {
  if (status !== 'reconnecting') return null;
  return (
    <View className="absolute inset-0 bg-black/50 items-center justify-center z-10 gap-3">
      <ActivityIndicator color="#e94560" size="large" />
      <Text className="text-app-text text-base font-semibold">Reconnecting…</Text>
    </View>
  );
}

function StatusBanner({
  wsStatus,
  apiError,
  onRetry,
}: {
  wsStatus: WsStatus;
  apiError: Error | null;
  onRetry: () => void;
}) {
  if (apiError) {
    return (
      <View className="bg-[#3a0000] rounded-lg py-2.5 px-3 flex-row items-center justify-between border-l-[3px] border-l-app-accent">
        <Text className="text-[#ff6666] text-[13px] font-semibold flex-1">
          Cannot reach backend — check your URL in Settings
        </Text>
        <Pressable onPress={onRetry} className="ml-2 bg-app-accent rounded-lg px-3 py-1">
          <Text className="text-white text-[12px] font-bold">Retry</Text>
        </Pressable>
      </View>
    );
  }
  if (wsStatus === 'disconnected') {
    return (
      <View className="bg-[#3a1a00] rounded-lg py-2 px-3 border-l-[3px] border-l-app-accent">
        <Text className="text-[#ffaa55] text-[13px] font-semibold">
          ⚠ Connection lost — check your network and backend
        </Text>
      </View>
    );
  }
  return null;
}

function useWhisperModelCheck(modelSize: string) {
  const [needsDownload, setNeedsDownload] = useState(false);

  useEffect(() => {
    const info = WHISPER_MODEL_URLS[modelSize as keyof typeof WHISPER_MODEL_URLS];
    if (!info) return;
    const fileName = info.url.split('/').pop() ?? 'whisper-model.bin';
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const FileSystem = require('expo-file-system') as {
      cacheDirectory: string;
      getInfoAsync: (p: string) => Promise<{ exists: boolean }>;
    };
    const dest = `${FileSystem.cacheDirectory}${fileName}`;
    FileSystem.getInfoAsync(dest)
      .then((i) => setNeedsDownload(!i.exists))
      .catch(() => setNeedsDownload(false));
  }, [modelSize]);

  return needsDownload;
}

export default function OperatorScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isIPad = width > IPAD_BREAKPOINT;

  const { code } = useLocalSearchParams<{ code: string }>();
  const sessionCode = code ?? '';

  const { recognizer, switchRecognizer } = useSpeechRecognizerContext();
  const { settings } = useSettings();

  const {
    session,
    play,
    isLoading,
    isRecording,
    transcriptItems,
    currentPosition,
    wsStatus,
    error,
    startRecording,
    stopRecording,
    togglePause,
    movePrev,
    moveNext,
  } = useOperatorSession(sessionCode);

  const isPaused = session?.status === 'paused';

  const [showDownloadSheet, setShowDownloadSheet] = useState(false);
  const whisperNeedsDownload = useWhisperModelCheck(settings.whisperModelSize);

  // Show download sheet when operator first opens with whisper preference and model not cached
  useEffect(() => {
    if (settings.recognizerPreference === 'whisper' && whisperNeedsDownload) {
      setShowDownloadSheet(true);
    }
  }, [settings.recognizerPreference, whisperNeedsDownload]);

  const handleMicPress = async () => {
    try {
      if (isRecording) {
        await stopRecording();
      } else {
        await startRecording();
      }
    } catch (e) {
      Alert.alert('Microphone Error', e instanceof Error ? e.message : 'Failed to access microphone');
    }
  };

  const handleTogglePause = async () => {
    try {
      await togglePause();
    } catch {
      Alert.alert('Error', 'Failed to update session status');
    }
  };

  const handleMovePrev = async () => {
    try {
      await movePrev();
    } catch {
      // Ignore position update errors silently
    }
  };

  const handleMoveNext = async () => {
    try {
      await moveNext();
    } catch {
      // Ignore position update errors silently
    }
  };

  // Controls panel (recognizer + position + cursor) used in both layouts
  const ControlsPanel = (
    <View className="gap-3">
      {/* Recognizer toggle */}
      <View className="gap-1.5">
        <Text className="text-[10px] text-app-tertiary font-bold tracking-[1px] pl-0.5">
          RECOGNIZER
        </Text>
        <RecognizerToggle
          value={recognizer.type}
          onChange={(type) => void switchRecognizer(type)}
          disabled={isRecording}
        />
      </View>

      {/* Script position */}
      <View className="gap-1.5">
        <Text className="text-[10px] text-app-tertiary font-bold tracking-[1px] pl-0.5">
          CURRENT POSITION
        </Text>
        <ScriptPositionCard play={play} position={currentPosition} />
      </View>

      {/* Cursor controls */}
      <View className="flex-row gap-2">
        <Pressable
          className="flex-1 bg-app-card rounded-[10px] py-3 items-center"
          onPress={handleMovePrev}
        >
          <Text className="text-app-label text-sm font-semibold">← Prev</Text>
        </Pressable>
        <Pressable
          className={`flex-[1.4] rounded-[10px] py-3 items-center border ${
            isPaused
              ? 'bg-[#1a0a20] border-app-accent'
              : 'bg-app-card border-transparent'
          }`}
          onPress={handleTogglePause}
        >
          <Text
            className={`text-sm font-bold ${isPaused ? 'text-app-accent' : 'text-app-label'}`}
          >
            {isPaused ? '▶ Resume' : '⏸ Pause'}
          </Text>
        </Pressable>
        <Pressable
          className="flex-1 bg-app-card rounded-[10px] py-3 items-center"
          onPress={handleMoveNext}
        >
          <Text className="text-app-label text-sm font-semibold">Next →</Text>
        </Pressable>
      </View>
    </View>
  );

  // Transcript panel
  const TranscriptPanel = (
    <View className="flex-1 gap-1.5 min-h-[80px]">
      <Text className="text-[10px] text-app-tertiary font-bold tracking-[1px] pl-0.5">
        TRANSCRIPT
      </Text>
      <View className="flex-1 bg-app-card rounded-xl overflow-hidden">
        <TranscriptLog items={transcriptItems} />
      </View>
    </View>
  );

  // Mic button
  const MicButton = (
    <Pressable
      className={`flex-row rounded-[14px] py-[14px] items-center justify-center gap-2 border-2 ${
        isRecording
          ? 'bg-[#1a0a20] border-app-accent'
          : 'bg-app-card border-[#2a2a5a]'
      }`}
      onPress={handleMicPress}
    >
      <Text className="text-xl">{isRecording ? '⏹' : '🎙'}</Text>
      <Text className="text-app-text text-base font-bold">
        {isRecording ? 'Stop Mic' : 'Start Mic'}
      </Text>
    </Pressable>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Operator',
          headerShown: true,
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/settings')}
              className="mr-1 px-2 py-1"
            >
              <Text className="text-white text-[22px]">⚙</Text>
            </Pressable>
          ),
        }}
      />

      <View
        className="flex-1 bg-app-dark px-4 pt-3 gap-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        {/* Reconnect overlay (blocks interaction while reconnecting) */}
        <ReconnectOverlay status={wsStatus} />

        {/* Status banners */}
        <StatusBanner
          wsStatus={wsStatus}
          apiError={error}
          onRetry={() => router.replace({ pathname: '/operator', params: { code: sessionCode } })}
        />

        {isLoading ? (
          <View className="flex-1 items-center justify-center gap-2">
            <ActivityIndicator color="#e94560" size="large" />
            <Text className="text-app-muted text-sm">Loading session…</Text>
          </View>
        ) : error && !session ? (
          <View className="flex-1 items-center justify-center gap-2">
            <Text className="text-app-accent text-base font-bold">Failed to load session</Text>
            <Text className="text-app-muted text-[13px]">{error.message}</Text>
          </View>
        ) : (
          <>
            {/* Session code */}
            <View className="flex-row items-center gap-2.5 bg-app-card rounded-[10px] px-[14px] py-2.5">
              <Text className="text-[10px] text-app-tertiary font-bold tracking-[1px]">
                SESSION CODE
              </Text>
              <Text className="text-xl text-app-text font-extrabold tracking-[4px]">
                {sessionCode}
              </Text>
            </View>

            {/* iPad two-column layout */}
            {isIPad ? (
              <View className="flex-1 flex-row gap-4">
                {/* Left: Transcript + Mic */}
                <View className="flex-1 gap-3">
                  {TranscriptPanel}
                  {MicButton}
                </View>
                {/* Right: Controls */}
                <View className="w-[340px] gap-3">
                  {ControlsPanel}
                </View>
              </View>
            ) : (
              <>
                {ControlsPanel}
                {TranscriptPanel}
                {MicButton}
              </>
            )}
          </>
        )}
      </View>

      {/* Whisper model download sheet */}
      <ModelDownloadSheet
        visible={showDownloadSheet}
        modelSize={settings.whisperModelSize}
        onDismiss={() => setShowDownloadSheet(false)}
        onDownloadComplete={() => setShowDownloadSheet(false)}
      />
    </>
  );
}
