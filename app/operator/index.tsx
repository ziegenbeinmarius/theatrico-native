import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOperatorSession } from '@/hooks/useOperatorSession';
import { RecognizerToggle } from '@/components/RecognizerToggle';
import { TranscriptLog } from '@/components/TranscriptLog';
import { ScriptPositionCard } from '@/components/ScriptPositionCard';
import { useSpeechRecognizerContext } from '@/context/SpeechRecognizerContext';

export default function OperatorScreen() {
  const insets = useSafeAreaInsets();
  const { code } = useLocalSearchParams<{ code: string }>();
  const sessionCode = code ?? '';

  const { recognizer, switchRecognizer } = useSpeechRecognizerContext();

  const {
    session,
    play,
    isLoading,
    isRecording,
    transcriptItems,
    currentPosition,
    wsDisconnected,
    error,
    startRecording,
    stopRecording,
    togglePause,
    movePrev,
    moveNext,
  } = useOperatorSession(sessionCode);

  const isPaused = session?.status === 'paused';

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

  return (
    <>
      <Stack.Screen options={{ title: 'Operator', headerShown: true }} />

      <View
        className="flex-1 bg-app-dark px-4 pt-3 gap-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        {/* Disconnect banner */}
        {wsDisconnected ? (
          <View className="bg-[#3a1a00] rounded-lg py-2 px-3 border-l-[3px] border-l-app-accent">
            <Text className="text-[#ffaa55] text-[13px] font-semibold">
              ⚠ Connection lost — reconnecting…
            </Text>
          </View>
        ) : null}

        {isLoading ? (
          <View className="flex-1 items-center justify-center gap-2">
            <ActivityIndicator color="#e94560" size="large" />
            <Text className="text-app-muted text-sm">Loading session…</Text>
          </View>
        ) : error ? (
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

            {/* Transcript */}
            <View className="flex-1 gap-1.5 min-h-[80px]">
              <Text className="text-[10px] text-app-tertiary font-bold tracking-[1px] pl-0.5">
                TRANSCRIPT
              </Text>
              <View className="flex-1 bg-app-card rounded-xl overflow-hidden">
                <TranscriptLog items={transcriptItems} />
              </View>
            </View>

            {/* Mic button */}
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
          </>
        )}
      </View>
    </>
  );
}
