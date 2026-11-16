import { ScrollView, StyleSheet, View } from 'react-native';
import { Portal, Text, useTheme } from 'react-native-paper';
import { AppDialog } from '../../components/AppDialog';
import { Button } from '../../components/Button';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import { useI18n } from '../../i18n/I18nProvider';
import { radius, spacing } from '../../theme/tokens';

// Read-only list of the products ticked when a shopping list was registered as this expense (`list_items`), opened from
// the expense details. Names are user data: shown as saved, never translated.
export function ProductsDialog({ description, products, onClose }: {
  description: string; products: readonly string[]; onClose: () => void;
}) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const count = products.length === 1 ? t("1 prodotto") : t("{p0} prodotti", { p0: products.length });
  return <Portal><AppDialog visible onDismiss={onClose}>
    <AppDialog.Title>{t("Prodotti acquistati")}</AppDialog.Title>
    <AppDialog.Content>
      <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>{`${description} · ${count}`}</Text>
    </AppDialog.Content>
    <AppDialog.ScrollArea style={styles.area}><ScrollView>
      <View role="list" accessibilityLabel={t("Prodotti acquistati")}>
        {products.map((name, index) => (
          <View key={index} role="listitem" style={[styles.item, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.outlineVariant }]}>
            <View style={[styles.mark, { backgroundColor: colors.secondaryContainer }]}>
              <SvgIcon shape={iconShapes.check} size={18} color={colors.onSecondaryContainer} />
            </View>
            <Text variant="bodyLarge" style={styles.name}>{name}</Text>
          </View>
        ))}
      </View>
    </ScrollView></AppDialog.ScrollArea>
    <AppDialog.Actions><Button onPress={onClose} style={styles.close} labelStyle={styles.closeLabel}>{t("Chiudi")}</Button></AppDialog.Actions>
  </AppDialog></Portal>;
}

const styles = StyleSheet.create({
  // Only the rows draw separators; Paper's ScrollArea borders would double the first and last line.
  area: { minHeight: 0, borderTopWidth: 0, borderBottomWidth: 0 },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 52, paddingVertical: spacing.sm },
  mark: { width: 32, height: 32, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  name: { flex: 1, minWidth: 0 },
  // The only action: a little larger than a standard text button (16/600 label, like «Salva»).
  close: { minWidth: 96 },
  closeLabel: { fontSize: 16, fontWeight: '600', letterSpacing: 0.1 },
});
