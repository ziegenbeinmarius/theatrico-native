import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState('');

  const handleJoin = () => {
    if (code.trim()) {
      router.push(`/session/${code.trim().toUpperCase()}`);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Text style={styles.title}>Theatrico</Text>
      <Text style={styles.subtitle}>Script Prompter</Text>

      <View style={styles.joinCard}>
        <Text style={styles.label}>Enter Session Code</Text>
        <TextInput
          style={styles.input}
          value={code}
          onChangeText={setCode}
          placeholder="e.g. ABC123"
          placeholderTextColor="#888"
          autoCapitalize="characters"
          returnKeyType="join"
          onSubmitEditing={handleJoin}
        />
        <TouchableOpacity style={styles.joinButton} onPress={handleJoin}>
          <Text style={styles.joinButtonText}>Join Session</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.operatorLink} onPress={() => router.push('/operator')}>
        <Text style={styles.operatorLinkText}>Operator Login →</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#e0e0ff',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 16,
    color: '#8888bb',
    marginBottom: 48,
    letterSpacing: 1,
  },
  joinCard: {
    width: '100%',
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 24,
    gap: 12,
  },
  label: {
    fontSize: 14,
    color: '#aaaacc',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#0f3460',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    color: '#ffffff',
    letterSpacing: 3,
    textAlign: 'center',
  },
  joinButton: {
    backgroundColor: '#e94560',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
  },
  joinButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  operatorLink: {
    marginTop: 32,
  },
  operatorLinkText: {
    color: '#6666aa',
    fontSize: 14,
  },
});
