import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
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
        style={[
          styles.container,
          { paddingBottom: insets.bottom + 12 },
        ]}
      >
        {/* Disconnect banner */}
        {wsDisconnected ? (
          <View style={styles.disconnectBanner}>
            <Text style={styles.disconnectText}>⚠ Connection lost — reconnecting…</Text>
          </View>
        ) : null}

        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color="#e94560" size="large" />
            <Text style={styles.loadingText}>Loading session…</Text>
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>Failed to load session</Text>
            <Text style={styles.errorDetail}>{error.message}</Text>
          </View>
        ) : (
          <>
            {/* Session code */}
            <View style={styles.codeRow}>
              <Text style={styles.codeLabel}>SESSION CODE</Text>
              <Text style={styles.codeValue}>{sessionCode}</Text>
            </View>

            {/* Recognizer toggle */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>RECOGNIZER</Text>
              <RecognizerToggle
                value={recognizer.type}
                onChange={(type) => void switchRecognizer(type)}
                disabled={isRecording}
              />
            </View>

            {/* Script position */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>CURRENT POSITION</Text>
              <ScriptPositionCard play={play} position={currentPosition} />
            </View>

            {/* Cursor controls */}
            <View style={styles.cursorRow}>
              <Pressable style={styles.cursorButton} onPress={handleMovePrev}>
                <Text style={styles.cursorButtonText}>← Prev</Text>
              </Pressable>
              <Pressable
                style={[styles.pauseButton, isPaused && styles.pauseButtonActive]}
                onPress={handleTogglePause}
              >
                <Text style={[styles.pauseButtonText, isPaused && styles.pauseButtonTextActive]}>
                  {isPaused ? '▶ Resume' : '⏸ Pause'}
                </Text>
              </Pressable>
              <Pressable style={styles.cursorButton} onPress={handleMoveNext}>
                <Text style={styles.cursorButtonText}>Next →</Text>
              </Pressable>
            </View>

            {/* Transcript */}
            <View style={styles.transcriptSection}>
              <Text style={styles.sectionLabel}>TRANSCRIPT</Text>
              <View style={styles.transcriptContainer}>
                <TranscriptLog items={transcriptItems} />
              </View>
            </View>

            {/* Mic button */}
            <Pressable
              style={[styles.micButton, isRecording && styles.micButtonActive]}
              onPress={handleMicPress}
            >
              <Text style={styles.micIcon}>{isRecording ? '⏹' : '🎙'}</Text>
              <Text style={styles.micLabel}>{isRecording ? 'Stop Mic' : 'Start Mic'}</Text>
            </Pressable>
          </>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#8888bb',
    fontSize: 14,
  },
  errorText: {
    color: '#e94560',
    fontSize: 16,
    fontWeight: '700',
  },
  errorDetail: {
    color: '#8888bb',
    fontSize: 13,
  },
  disconnectBanner: {
    backgroundColor: '#3a1a00',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#e94560',
  },
  disconnectText: {
    color: '#ffaa55',
    fontSize: 13,
    fontWeight: '600',
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#16213e',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  codeLabel: {
    fontSize: 10,
    color: '#6666aa',
    fontWeight: '700',
    letterSpacing: 1,
  },
  codeValue: {
    fontSize: 20,
    color: '#e0e0ff',
    fontWeight: '800',
    letterSpacing: 4,
  },
  section: {
    gap: 6,
  },
  sectionLabel: {
    fontSize: 10,
    color: '#6666aa',
    fontWeight: '700',
    letterSpacing: 1,
    paddingLeft: 2,
  },
  cursorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  cursorButton: {
    flex: 1,
    backgroundColor: '#16213e',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cursorButtonText: {
    color: '#aaaacc',
    fontSize: 14,
    fontWeight: '600',
  },
  pauseButton: {
    flex: 1.4,
    backgroundColor: '#16213e',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  pauseButtonActive: {
    borderColor: '#e94560',
    backgroundColor: '#1a0a20',
  },
  pauseButtonText: {
    color: '#aaaacc',
    fontSize: 14,
    fontWeight: '700',
  },
  pauseButtonTextActive: {
    color: '#e94560',
  },
  transcriptSection: {
    flex: 1,
    gap: 6,
    minHeight: 80,
  },
  transcriptContainer: {
    flex: 1,
    backgroundColor: '#16213e',
    borderRadius: 12,
    overflow: 'hidden',
  },
  micButton: {
    flexDirection: 'row',
    backgroundColor: '#16213e',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: '#2a2a5a',
  },
  micButtonActive: {
    backgroundColor: '#1a0a20',
    borderColor: '#e94560',
  },
  micIcon: {
    fontSize: 20,
  },
  micLabel: {
    color: '#e0e0ff',
    fontSize: 16,
    fontWeight: '700',
  },
});
