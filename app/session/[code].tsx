import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';

export default function SessionScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const insets = useSafeAreaInsets();

  return (
    <>
      <Stack.Screen options={{ title: `Session ${code ?? ''}`, headerShown: true }} />
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        <Text style={styles.code}>{code}</Text>
        <Text style={styles.placeholder}>Prompter View</Text>
        <Text style={styles.sub}>Script content coming soon</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  code: {
    fontSize: 12,
    color: '#555577',
    letterSpacing: 3,
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  placeholder: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e0e0ff',
  },
  sub: {
    fontSize: 14,
    color: '#8888bb',
    marginTop: 8,
  },
});
