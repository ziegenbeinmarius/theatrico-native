import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';

export default function OperatorScreen() {
  const insets = useSafeAreaInsets();

  return (
    <>
      <Stack.Screen options={{ title: 'Operator', headerShown: true }} />
      <View
        className="flex-1 bg-app-dark items-center justify-center p-6"
        style={{ paddingBottom: insets.bottom }}
      >
        <Text className="text-2xl font-bold text-app-text">Operator Dashboard</Text>
        <Text className="text-sm text-app-muted mt-2">Session management coming soon</Text>
      </View>
    </>
  );
}
