import { useEffect, useRef } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { TranscriptItem } from '@/hooks/useOperatorSession';

interface Props {
  items: TranscriptItem[];
}

export function TranscriptLog({ items }: Props) {
  const listRef = useRef<FlatList<TranscriptItem>>(null);

  useEffect(() => {
    if (items.length > 0) {
      listRef.current?.scrollToEnd({ animated: true });
    }
  }, [items.length]);

  if (items.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Transcript will appear here…</Text>
      </View>
    );
  }

  return (
    <FlatList
      ref={listRef}
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <Text style={[styles.line, !item.isFinal && styles.partial]}>{item.text}</Text>
      )}
      style={styles.list}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  content: {
    padding: 12,
    gap: 4,
  },
  line: {
    fontSize: 15,
    color: '#e0e0ff',
    lineHeight: 22,
  },
  partial: {
    color: '#8888bb',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#555577',
    fontStyle: 'italic',
  },
});
