import { StyleSheet, Text, View } from 'react-native';
import type { Play, Position } from '@/domain';
import { findLineIndex, flattenLines } from '@/lib/scriptUtils';

interface Props {
  play: Play | null;
  position: Position | null;
}

export function ScriptPositionCard({ play, position }: Props) {
  if (!play || !position) {
    return (
      <View className="bg-app-card rounded-xl p-[14px]">
        <Text className="text-[13px] text-app-subtle text-center italic">No position set</Text>
      </View>
    );
  }

  const lines = flattenLines(play);
  const idx = findLineIndex(lines, position.lineId);
  const current = lines[idx];
  const next = lines[idx + 1];

  if (!current) {
    return (
      <View className="bg-app-card rounded-xl p-[14px]">
        <Text className="text-[13px] text-app-subtle text-center italic">
          Position not found in script
        </Text>
      </View>
    );
  }

  return (
    <View className="bg-app-card rounded-xl p-[14px] gap-2.5">
      {/* Act / Scene breadcrumb */}
      <View style={styles.divider}>
        <Text className="text-[11px] text-app-tertiary uppercase tracking-[1px]">
          {current.actTitle}  ·  {current.sceneTitle}
        </Text>
      </View>

      {/* Current line */}
      <View className="gap-0.5">
        {current.line.character ? (
          <Text className="text-[11px] text-app-accent font-bold uppercase tracking-[1px]">
            {current.line.character}
          </Text>
        ) : null}
        <Text className="text-base text-app-text leading-6 font-medium">{current.line.text}</Text>
      </View>

      {/* Next line preview */}
      {next ? (
        <View className="bg-app-darker rounded-lg p-2.5 gap-0.5">
          <Text className="text-[10px] text-app-tertiary font-bold tracking-[1px] mb-0.5">
            NEXT
          </Text>
          {next.line.character ? (
            <Text className="text-[10px] text-app-muted font-bold uppercase tracking-[0.5px]">
              {next.line.character}
            </Text>
          ) : null}
          <Text className="text-[13px] text-app-muted leading-[19px]" numberOfLines={2}>
            {next.line.text}
          </Text>
        </View>
      ) : (
        <Text className="text-xs text-app-subtle italic text-center">End of script</Text>
      )}
    </View>
  );
}

// Only StyleSheet value that can't be expressed as a static NativeWind class
const styles = StyleSheet.create({
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2a2a5a',
    paddingBottom: 8,
  },
});
