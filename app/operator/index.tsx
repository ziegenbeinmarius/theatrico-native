import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';

export default function OperatorScreen() {
  const insets = useSafeAreaInsets();

  return (
    <>
      <Stack.Screen options={{ title: 'Operator', headerShown: true }} />
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        <Text style={styles.placeholder}>Operator Dashboard</Text>
        <Text style={styles.sub}>Session management coming soon</Text>
      </View>
    </>
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
