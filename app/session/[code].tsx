import { Text, View } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SessionScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const insets = useSafeAreaInsets();

  return (
    <>
      <Stack.Screen options={{ title: `Session ${code ?? ''}`, headerShown: true }} />
      <View
        className="flex-1 bg-app-darker items-center justify-center p-6"
        style={{ paddingBottom: insets.bottom }}
      >
        <Text className="text-xs text-app-subtle tracking-[3px] mb-4 uppercase">{code}</Text>
        <Text className="text-2xl font-bold text-app-text">Prompter View</Text>
        <Text className="text-sm text-app-muted mt-2">Script content coming soon</Text>
      </View>
    </>
  );
}
