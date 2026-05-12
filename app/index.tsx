import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlays } from '@/hooks/usePlays';
import { theatricoClient } from '@/services/api/theatricoClient';
import type { Play } from '@/domain';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: plays, isLoading: playsLoading, error: playsError } = usePlays();

  const [selectedPlay, setSelectedPlay] = useState<Play | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [joinCode, setJoinCode] = useState('');

  const handleCreateSession = async () => {
    if (!selectedPlay) return;
    setCreating(true);
    setCreateError(null);
    try {
      const session = await theatricoClient.createSession(selectedPlay.id);
      router.push({ pathname: '/operator', params: { code: session.code } });
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Failed to create session');
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = () => {
    if (joinCode.trim()) {
      router.push(`/session/${joinCode.trim().toUpperCase()}`);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Theatrico</Text>
      <Text style={styles.subtitle}>Script Prompter</Text>

      {/* Operator section */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Operator</Text>
        <Text style={styles.sectionDesc}>Select a play and start a session</Text>

        {playsLoading ? (
          <ActivityIndicator color="#e94560" style={styles.loader} />
        ) : playsError ? (
          <Text style={styles.errorText}>Could not load plays. Check your connection.</Text>
        ) : !plays?.length ? (
          <Text style={styles.emptyText}>No plays available.</Text>
        ) : (
          <View style={styles.playList}>
            {plays.map((play) => {
              const isSelected = selectedPlay?.id === play.id;
              return (
                <Pressable
                  key={play.id}
                  onPress={() => setSelectedPlay(play)}
                  style={[styles.playItem, isSelected && styles.playItemSelected]}
                >
                  <Text style={[styles.playTitle, isSelected && styles.playTitleSelected]}>
                    {play.title}
                  </Text>
                  {play.description ? (
                    <Text style={styles.playDesc} numberOfLines={1}>
                      {play.description}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        )}

        {createError ? <Text style={styles.errorText}>{createError}</Text> : null}

        <Pressable
          style={[styles.button, (!selectedPlay || creating) && styles.buttonDisabled]}
          onPress={handleCreateSession}
          disabled={!selectedPlay || creating}
        >
          {creating ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>Create Session →</Text>
          )}
        </Pressable>
      </View>

      {/* Audience section */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Audience</Text>
        <Text style={styles.sectionDesc}>Enter the session code shown by the operator</Text>

        <TextInput
          style={styles.codeInput}
          value={joinCode}
          onChangeText={setJoinCode}
          placeholder="e.g. ABC123"
          placeholderTextColor="#555577"
          autoCapitalize="characters"
          returnKeyType="join"
          onSubmitEditing={handleJoin}
        />
        <Pressable
          style={[styles.button, styles.buttonSecondary, !joinCode.trim() && styles.buttonDisabled]}
          onPress={handleJoin}
          disabled={!joinCode.trim()}
        >
          <Text style={styles.buttonText}>Join Session</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 20,
    gap: 20,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#e0e0ff',
    textAlign: 'center',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#8888bb',
    textAlign: 'center',
    letterSpacing: 4,
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 18,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#aaaacc',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionDesc: {
    fontSize: 13,
    color: '#6666aa',
    marginTop: -6,
  },
  loader: {
    marginVertical: 12,
  },
  errorText: {
    fontSize: 13,
    color: '#e94560',
  },
  emptyText: {
    fontSize: 13,
    color: '#555577',
    fontStyle: 'italic',
  },
  playList: {
    gap: 6,
  },
  playItem: {
    backgroundColor: '#0f3460',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  playItemSelected: {
    borderColor: '#e94560',
    backgroundColor: '#1a0a20',
  },
  playTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#e0e0ff',
  },
  playTitleSelected: {
    color: '#e94560',
  },
  playDesc: {
    fontSize: 12,
    color: '#8888bb',
    marginTop: 2,
  },
  button: {
    backgroundColor: '#e94560',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: '#0f3460',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  codeInput: {
    backgroundColor: '#0f3460',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 18,
    color: '#ffffff',
    letterSpacing: 3,
    textAlign: 'center',
  },
});
