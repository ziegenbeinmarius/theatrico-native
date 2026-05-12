import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

interface Props {
  value: 'whisper' | 'native';
  onChange: (value: 'whisper' | 'native') => void;
  disabled?: boolean;
}

const OPTIONS: { label: string; value: 'whisper' | 'native' }[] = [
  { label: 'Whisper', value: 'whisper' },
  { label: 'Native', value: 'native' },
];

export function RecognizerToggle({ value, onChange, disabled = false }: Props) {
  return (
    <View style={styles.container}>
      {OPTIONS.map((opt) => {
        const isNativeDisabled = opt.value === 'native' && Platform.OS !== 'ios';
        const isActive = value === opt.value;
        const isDisabled = disabled || isNativeDisabled;

        return (
          <Pressable
            key={opt.value}
            onPress={() => !isDisabled && onChange(opt.value)}
            style={[
              styles.option,
              isActive && styles.optionActive,
              isDisabled && styles.optionDisabled,
            ]}
          >
            <Text
              style={[
                styles.label,
                isActive && styles.labelActive,
                isDisabled && styles.labelDisabled,
              ]}
            >
              {opt.label}
              {isNativeDisabled ? ' (iOS)' : ''}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#0f3460',
    borderRadius: 10,
    padding: 3,
    gap: 3,
  },
  option: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  optionActive: {
    backgroundColor: '#e94560',
  },
  optionDisabled: {
    opacity: 0.4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8888bb',
  },
  labelActive: {
    color: '#ffffff',
  },
  labelDisabled: {
    color: '#555577',
  },
});
