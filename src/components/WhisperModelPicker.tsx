import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { WHISPER_MODELS, WHISPER_MODEL_SIZES, type WhisperModelSize } from '@/lib/whisperModels';
import { useWhisperModels } from '@/hooks/useWhisperModels';
import { useSpeechRecognizerContext } from '@/context/SpeechRecognizerContext';

interface Props {
  disabled?: boolean;
}

export function WhisperModelPicker({ disabled = false }: Props) {
  const { whisperModelSize, switchWhisperModel } = useSpeechRecognizerContext();
  const { downloadedModels, downloadProgress, downloadModel } = useWhisperModels();

  return (
    <View className="gap-2">
      {WHISPER_MODEL_SIZES.map((size: WhisperModelSize) => {
        const model = WHISPER_MODELS[size];
        const isSelected = whisperModelSize === size;
        const isDownloaded = downloadedModels.has(size);
        const progress = downloadProgress[size];
        const isDownloading = progress !== undefined;

        return (
          <Pressable
            key={size}
            onPress={() => !disabled && void switchWhisperModel(size)}
            className={`flex-row items-center gap-3 rounded-[10px] px-[14px] py-3 border ${
              isSelected ? 'bg-app-card border-app-accent' : 'bg-app-card border-transparent'
            } ${disabled ? 'opacity-50' : ''}`}
          >
            {/* Radio dot */}
            <View
              className={`w-[18px] h-[18px] rounded-full border-2 items-center justify-center ${
                isSelected ? 'border-app-accent' : 'border-app-subtle'
              }`}
            >
              {isSelected && <View className="w-[8px] h-[8px] rounded-full bg-app-accent" />}
            </View>

            {/* Model info */}
            <View className="flex-1 gap-0.5">
              <View className="flex-row items-center gap-2">
                <Text className="text-app-text text-[14px] font-semibold">{model.label}</Text>
                <Text className="text-app-tertiary text-[11px]">{model.fileSizeMB} MB</Text>
                {isDownloaded && !isDownloading && (
                  <Text className="text-green-400 text-[10px] font-bold tracking-wide">
                    ✓ READY
                  </Text>
                )}
              </View>
              <Text className="text-app-muted text-[12px]">{model.description}</Text>

              {isDownloading && (
                <View className="mt-1.5 flex-row items-center gap-2">
                  <View className="flex-1 h-1 bg-app-input rounded-full overflow-hidden">
                    <View
                      className="h-full bg-app-accent rounded-full"
                      style={{ width: `${Math.round((progress ?? 0) * 100)}%` }}
                    />
                  </View>
                  <Text className="text-app-tertiary text-[10px]">
                    {Math.round((progress ?? 0) * 100)}%
                  </Text>
                </View>
              )}
            </View>

            {/* Download button or spinner */}
            {!isDownloaded && !isDownloading && (
              <Pressable
                onPress={() => !disabled && void downloadModel(size)}
                className="bg-app-input rounded-lg px-3 py-1.5"
              >
                <Text className="text-app-label text-[12px] font-semibold">Download</Text>
              </Pressable>
            )}
            {isDownloading && <ActivityIndicator size="small" color="#e94560" />}
          </Pressable>
        );
      })}
    </View>
  );
}
