import { Text, TextInput, TouchableOpacity, View } from 'react-native';
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
    <View
      className="flex-1 bg-app-dark items-center justify-center px-6"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <Text className="text-[42px] font-bold text-app-text tracking-[2px]">Theatrico</Text>
      <Text className="text-base text-app-muted mb-12 tracking-widest">Script Prompter</Text>

      <View className="w-full bg-app-card rounded-2xl p-6 gap-3">
        <Text className="text-sm text-app-label font-semibold tracking-wide">
          Enter Session Code
        </Text>
        <TextInput
          className="bg-app-input rounded-xl px-4 py-3.5 text-lg text-white tracking-[3px] text-center"
          value={code}
          onChangeText={setCode}
          placeholder="e.g. ABC123"
          placeholderTextColor="#888"
          autoCapitalize="characters"
          returnKeyType="join"
          onSubmitEditing={handleJoin}
        />
        <TouchableOpacity className="bg-app-accent rounded-xl py-4 items-center" onPress={handleJoin}>
          <Text className="text-white text-base font-bold tracking-wide">Join Session</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity className="mt-8" onPress={() => router.push('/operator')}>
        <Text className="text-app-tertiary text-sm">Operator Login →</Text>
      </TouchableOpacity>
    </View>
  );
}
