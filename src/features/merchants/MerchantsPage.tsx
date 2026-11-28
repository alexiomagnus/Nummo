import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { HelperText, IconButton, Portal, Text, TextInput, useTheme } from 'react-native-paper';
import { ListGroup } from '../../components/ActionList';
import { AppDialog as Dialog } from '../../components/AppDialog';
import { CancelButton, ConfirmButton, dialogActionsRow } from '../../components/Button';
import { DeleteAction } from '../../components/DeleteAction';
import { leadingIcon } from '../../components/FieldIcon';
import { ListRow, listRowStyles } from '../../components/ListRow';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import { searchKey } from '../../domain/history';
import { merchantPolicy, renamedMerchant, type RankedMerchant } from '../../domain/merchant';
import { clipToLength, searchPolicy } from '../../domain/policy';
import { useI18n } from '../../i18n/I18nProvider';
import type { DataStore } from '../../services/dataStore';
import { inputOutline, spacing } from '../../theme/tokens';
import { message } from '../expenses/useRemoteExpenses';

type Props = {
  // Every saved merchant with its use (`rankMerchants`): `uses` = expenses pointing at it.
  merchants: readonly RankedMerchant[];
  backend: DataStore;
  // Writes need the server (Advanced) or the open local archive: like the other transactions, never queued offline.
  canWrite: boolean;
  notify: (message: string) => void;
};

// «Esercenti» (account menu, under «Archiviazione e backup»; 22 November, on request): the merchants learned for the
// suggestions of the «Esercente» field, with how many expenses use each. The pencil renames one (into an existing name:
// the two become one, after saying so); the bin removes it, and the expenses that used it stay without a merchant.
export function MerchantsPage({ merchants, backend, canWrite, notify }: Props) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const [filter, setFilter] = useState('');
  const [editing, setEditing] = useState<RankedMerchant | null>(null);
  const sorted = useMemo(() => [...merchants].sort((a, b) => a.name.localeCompare(b.name, 'it', { sensitivity: 'base' }) || a.id.localeCompare(b.id)), [merchants]);
  const shown = filter ? sorted.filter((m) => searchKey(m.name).includes(searchKey(filter))) : sorted;
  const uses = (m: RankedMerchant) => m.uses === 0 ? t("Nessuna spesa") : m.uses === 1 ? t("1 spesa") : t("{p0} spese", { p0: m.uses });
  const remove = async (m: RankedMerchant) => {
    try {
      const moved = await backend.removeMerchant(m);
      notify(moved === 0 ? "Esercente eliminato." : "Esercente eliminato: le spese che lo usavano sono ora senza esercente.");
      return true;
    } catch (reason) { notify(message(reason)); return false; }
  };
  return (
    <View style={styles.root}>
      {merchants.length > 0 && (
        <TextInput outlineStyle={inputOutline} label={t("Cerca esercente")} accessibilityLabel={t("Cerca esercente")} mode="outlined" value={filter}
          onChangeText={(value) => setFilter(clipToLength(value, searchPolicy.maxQueryLength))} autoCorrect={false} left={leadingIcon(iconShapes.search)}
          right={filter ? <TextInput.Icon accessibilityLabel={t("Cancella ricerca")} onPress={() => setFilter('')}
            icon={({ size, color }) => <SvgIcon shape={iconShapes.close} size={size} color={color} />} /> : undefined} />
      )}
      {merchants.length === 0 && <Text variant="bodyLarge" style={{ color: colors.onSurfaceVariant }}>{t("Nessun esercente.")}</Text>}
      {Boolean(filter) && shown.length === 0 && <Text variant="bodyLarge" style={{ color: colors.onSurfaceVariant }}>{t("Nessun risultato.")}</Text>}
      {shown.length > 0 && <ListGroup icon={iconShapes.store} label={t("Esercenti")}><View role="list">
        {shown.map((m, index) => (
          <ListRow key={m.id} icon={null} iconless divider={index < shown.length - 1} title={m.name} subtitle={uses(m)}
            trailing={<>
              <IconButton icon={({ size, color }) => <SvgIcon shape={iconShapes.pencil} size={size} color={color} />} style={listRowStyles.iconButton}
                disabled={!canWrite} aria-haspopup="dialog" accessibilityLabel={t("Modifica {p0}", { p0: m.name })} onPress={() => setEditing(m)} />
              <DeleteAction name={m.name} disabled={!canWrite} title={t("Eliminare l’esercente {p0}?", { p0: m.name })}
                description={m.uses === 0 ? t("L’operazione non può essere annullata.")
                  : m.uses === 1 ? t("Lo usa 1 spesa, che resterà senza esercente. L’operazione non può essere annullata.")
                  : t("Lo usano {p0} spese, che resteranno senza esercente. L’operazione non può essere annullata.", { p0: m.uses })}
                onDelete={() => remove(m)} />
            </>} />
        ))}
      </View></ListGroup>}
      {editing && <RenameDialog merchant={editing} merchants={merchants} backend={backend} notify={notify} close={() => setEditing(null)} />}
    </View>
  );
}

// New name of a merchant. A name whose key is another merchant's joins the two: the dialog says so before «Unisci».
function RenameDialog({ merchant, merchants, backend, notify, close }: { merchant: RankedMerchant; merchants: readonly RankedMerchant[]; backend: DataStore;
  notify: (message: string) => void; close: () => void }) {
  const { t } = useI18n();
  const [name, setName] = useState(merchant.name);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const target = renamedMerchant(name);
  const other = typeof target === 'string' || target.id === merchant.id ? undefined : merchants.find((m) => m.id === target.id);
  const unchanged = typeof target !== 'string' && target.id === merchant.id && target.name === merchant.name;
  const save = async () => {
    if (busy) return;
    if (typeof target === 'string') { setError(target); return; }
    if (unchanged) { close(); return; }
    setBusy(true);
    try {
      await backend.renameMerchant(merchant, name);
      notify(other ? "Esercenti uniti." : "Esercente rinominato.");
      close();
    } catch (reason) { setError(message(reason)); }
    finally { setBusy(false); }
  };
  return <Portal>
    <Dialog detents opensHalf fitPeek="shrink" visible onDismiss={() => { if (!busy) close(); }}>
      <Dialog.Title>{t("Modifica esercente")}</Dialog.Title>
      <Dialog.ScrollArea style={styles.area}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <TextInput outlineStyle={inputOutline} mode="outlined" label={t("Nome")} value={name} autoCorrect={false}
            accessibilityLabel={t("Nuovo nome per {p0}", { p0: merchant.name })} readOnly={busy} aria-disabled={busy} error={Boolean(error)}
            onChangeText={(next) => { setName(clipToLength(next, merchantPolicy.maxTypedLength)); setError(null); }} onSubmitEditing={() => void save()} />
          {error && <HelperText type="error" accessibilityRole="alert">{t(error)}</HelperText>}
          {other && <Text variant="bodyMedium" accessibilityLiveRegion="polite">
            {t("Esiste già l’esercente {p0}: i due diventeranno uno solo, con il nome che hai scritto, e le loro spese useranno quello.", { p0: other.name })}
          </Text>}
        </ScrollView>
      </Dialog.ScrollArea>
      <Dialog.Actions style={dialogActionsRow}>
        <CancelButton disabled={busy} onPress={close}>{t("Annulla")}</CancelButton>
        <ConfirmButton disabled={busy} loading={busy} onPress={() => void save()}>{other ? t("Unisci") : t("Salva")}</ConfirmButton>
      </Dialog.Actions>
    </Dialog>
  </Portal>;
}

const styles = StyleSheet.create({
  root: { gap: spacing.lg },
  area: { minHeight: 0, paddingHorizontal: spacing.xl },
  content: { paddingVertical: spacing.sm, gap: spacing.md },
});
