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
      <View style={styles.card}>
        <Text style={styles.placeholder}>No position set</Text>
      </View>
    );
  }

  const lines = flattenLines(play);
  const idx = findLineIndex(lines, position.lineId);
  const current = lines[idx];
  const next = lines[idx + 1];

  if (!current) {
    return (
      <View style={styles.card}>
        <Text style={styles.placeholder}>Position not found in script</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.breadcrumb}>
          {current.actTitle}  ·  {current.sceneTitle}
        </Text>
      </View>

      <View style={styles.currentBlock}>
        {current.line.character ? (
          <Text style={styles.character}>{current.line.character}</Text>
        ) : null}
        <Text style={styles.currentLine}>{current.line.text}</Text>
      </View>

      {next ? (
        <View style={styles.nextBlock}>
          <Text style={styles.nextLabel}>NEXT</Text>
          {next.line.character ? (
            <Text style={styles.nextCharacter}>{next.line.character}</Text>
          ) : null}
          <Text style={styles.nextLine} numberOfLines={2}>{next.line.text}</Text>
        </View>
      ) : (
        <Text style={styles.endOfScript}>End of script</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  placeholder: {
    fontSize: 13,
    color: '#555577',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2a2a5a',
    paddingBottom: 8,
  },
  breadcrumb: {
    fontSize: 11,
    color: '#6666aa',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  currentBlock: {
    gap: 2,
  },
  character: {
    fontSize: 11,
    color: '#e94560',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  currentLine: {
    fontSize: 16,
    color: '#e0e0ff',
    lineHeight: 24,
    fontWeight: '500',
  },
  nextBlock: {
    backgroundColor: '#0a0a1a',
    borderRadius: 8,
    padding: 10,
    gap: 2,
  },
  nextLabel: {
    fontSize: 10,
    color: '#6666aa',
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 2,
  },
  nextCharacter: {
    fontSize: 10,
    color: '#8888bb',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nextLine: {
    fontSize: 13,
    color: '#8888bb',
    lineHeight: 19,
  },
  endOfScript: {
    fontSize: 12,
    color: '#555577',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
