import { useMemo } from 'react';
import { StyleSheet, Text as Span, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { releaseNoteBlocks, type NoteSpan } from '../../domain/appUpdate';
import { spacing } from '../../theme/tokens';

// The notes of a release (GitHub Markdown, release body) in the app's type: headings in titleSmall, items with a small primary
// dot or their number, paragraphs; **bold** and `code` spans (plain RN Text inside: Paper's Text would impose its own colour). Links are text: nothing here opens anything.
export function ReleaseNotes({ notes }: { notes: string }) {
  const { colors } = useTheme();
  const blocks = useMemo(() => releaseNoteBlocks(notes), [notes]);
  return (
    <View style={styles.root}>
      {blocks.map((block, index) => {
        if (block.kind === 'heading') {
          return <Text key={index} variant="titleSmall" accessibilityRole="header" aria-level={3}
            style={[styles.heading, index === 0 && styles.first, { color: colors.primary }]}><Spans spans={block.spans} /></Text>;
        }
        if (block.kind === 'paragraph') {
          return <Text key={index} variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}><Spans spans={block.spans} /></Text>;
        }
        return (
          <View key={index} style={styles.item}>
            {block.kind === 'bullet'
              ? <View style={[styles.dot, { backgroundColor: colors.primary }]} />
              : <Text variant="labelLarge" style={[styles.number, { color: colors.primary }]}>{block.marker}</Text>}
            <Text variant="bodyMedium" style={styles.itemText}><Spans spans={block.spans} /></Text>
          </View>
        );
      })}
    </View>
  );
}

function Spans({ spans }: { spans: readonly NoteSpan[] }) {
  const { colors } = useTheme();
  return <>{spans.map((span, index) => span.code
    ? <Span key={index} style={[styles.code, { backgroundColor: colors.surfaceVariant, color: colors.onSurfaceVariant }]}>{span.text}</Span>
    : <Span key={index} style={span.bold ? styles.bold : undefined}>{span.text}</Span>)}</>;
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  heading: { marginTop: spacing.md, fontWeight: '700' },
  first: { marginTop: 0 },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 8, marginLeft: spacing.xs },
  number: { minWidth: 18 },
  itemText: { flex: 1, minWidth: 0 },
  bold: { fontWeight: '700' },
  code: { fontFamily: 'monospace', fontSize: 13, borderRadius: 4, paddingHorizontal: 4 },
});
