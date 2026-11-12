import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { HelperText, Portal, Text, TextInput, useTheme } from 'react-native-paper';
import { AppDialog as Dialog } from '../../components/AppDialog';
import { Button } from '../../components/Button';
import { DateField } from '../../components/DateField';
import { leadingIcon } from '../../components/FieldIcon';
import { SegmentedButtons } from '../../components/SegmentedButtons';
import { SelectField } from '../../components/SelectField';
import { iconShapes } from '../../components/SvgIcon';
import { normalizeDescription } from '../../domain/expense';
import { fundPolicy, parseMoneyMinor, type Fund, type MovementData, type MovementKind } from '../../domain/funds';
import { todayInRome } from '../../domain/policy';
import { useI18n } from '../../i18n/I18nProvider';
import { inputOutline, spacing } from '../../theme/tokens';
import { FundAvatar } from './FundAvatar';

type Props = {
  funds: readonly Fund[];
  balances: ReadonlyMap<string, number>;
  kind: MovementKind;
  to?: string;
  ready: boolean;
  error: string | null;
  onCreate: (id: string, data: MovementData) => Promise<boolean>;
  close: () => void;
};

// Money added by hand to a fund, or moved between two funds. One ID per opening of the dialog: pressing again after a
// failure repeats the same request, so the server never records the movement twice.
export function MovementDialog({ funds, balances, kind: initialKind, to: initialTo, ready, error, onCreate, close }: Props) {
  const { t, formatAmount } = useI18n();
  const { colors } = useTheme();
  const id = useRef(crypto.randomUUID()).current;
  const [kind, setKind] = useState<MovementKind>(initialKind);
  const [to, setTo] = useState(initialTo ?? (initialKind === 'income' ? funds[0]?.id ?? '' : funds[1]?.id ?? ''));
  const [from, setFrom] = useState(initialKind === 'transfer' ? funds.find((f) => f.id !== (initialTo ?? funds[1]?.id))?.id ?? '' : '');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Partial<Record<'amount' | 'to' | 'from' | 'note', string>>>({});
  const [busy, setBusy] = useState(false);
  const blocked = busy || !ready;
  const options = funds.map((fund) => ({ value: fund.id, label: `${fund.name} · ${formatAmount(balances.get(fund.id) ?? 0)}`, icon: <FundAvatar fund={fund} size={24} /> }));
  const save = async () => {
    if (blocked) return;
    const next: typeof errors = {};
    const value = parseMoneyMinor(amount);
    if (value === null) next.amount = amount.trim() ? 'Importo non valido (es. 12,50).' : 'Inserisci l’importo.';
    if (!funds.some((f) => f.id === to)) next.to = 'Scegli il fondo.';
    if (kind === 'transfer' && !funds.some((f) => f.id === from)) next.from = 'Scegli il fondo di origine.';
    if (kind === 'transfer' && from === to) next.to = 'Scegli due fondi diversi.';
    const text = normalizeDescription(note);
    if (Array.from(text).length > fundPolicy.maxNoteLength) next.note = `Usa al massimo ${fundPolicy.maxNoteLength} caratteri.`;
    if (Object.keys(next).length) { setErrors(next); return; }
    setBusy(true);
    try {
      if (await onCreate(id, { kind, amount_minor: value!, date: date || todayInRome(), to_fund_id: to, from_fund_id: kind === 'transfer' ? from : null, note: text })) close();
    } finally { setBusy(false); }
  };
  const fromBalance = balances.get(from) ?? 0;
  const value = parseMoneyMinor(amount);
  return <Portal>
    <Dialog visible onDismiss={() => { if (!busy) close(); }}>
      <Dialog.Title>{kind === 'income' ? t("Aggiungi denaro") : t("Trasferisci tra fondi")}</Dialog.Title>
      <Dialog.ScrollArea style={styles.area}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          {funds.length > 1 && <SegmentedButtons label={t("Tipo di movimento")} value={kind} disabled={blocked}
            onChange={(next) => { setKind(next); setErrors({}); if (next === 'transfer' && !from) setFrom(funds.find((f) => f.id !== to)?.id ?? ''); }}
            options={[{ value: 'income', label: t("Entrata") }, { value: 'transfer', label: t("Giroconto"), accessibilityLabel: t("Trasferimento") }]} />}
          <View>
            <TextInput outlineStyle={inputOutline} mode="outlined" label={t("Importo")} value={amount} inputMode="decimal" placeholder="0,00"
              readOnly={blocked} aria-disabled={blocked} error={Boolean(errors.amount)} left={leadingIcon(iconShapes.euro)}
              accessibilityLabel={t("Importo in euro, obbligatorio")} onChangeText={(next) => { setAmount(next); setErrors({ ...errors, amount: undefined }); }} />
            {errors.amount && <HelperText type="error" accessibilityRole="alert">{t(errors.amount)}</HelperText>}
          </View>
          {kind === 'transfer' && <View style={styles.field}>
            <SelectField label={t("Dal fondo")} value={from} options={options} disabled={blocked} error={errors.from}
              onChange={(next) => { setFrom(next); setErrors({ ...errors, from: undefined, to: undefined }); }} />
            {value !== null && from && value > fromBalance && <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
              {t("Il fondo di origine scenderà sotto zero ({p0}).", { p0: formatAmount(fromBalance - value) })}</Text>}
          </View>}
          <SelectField label={kind === 'transfer' ? t("Al fondo") : t("Fondo")} value={to} options={options} disabled={blocked} error={errors.to}
            onChange={(next) => { setTo(next); setErrors({ ...errors, to: undefined }); }} />
          <DateField value={date} disabled={blocked} name={t("Data del movimento")} onChange={setDate} />
          <View>
            <TextInput outlineStyle={inputOutline} mode="outlined" label={t("Nota (facoltativa)")} value={note} readOnly={blocked} aria-disabled={blocked}
              error={Boolean(errors.note)} onChangeText={(next) => { setNote(next); setErrors({ ...errors, note: undefined }); }} />
            {errors.note && <HelperText type="error" accessibilityRole="alert">{t(errors.note)}</HelperText>}
          </View>
          <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
            {kind === 'transfer' ? t("Un trasferimento sposta denaro tra i tuoi fondi: non è né un'entrata né una spesa nei totali.")
              : t("Un'entrata aggiunge denaro al fondo una sola volta. Per un accredito ogni mese usa la ricarica mensile del fondo.")}</Text>
          {error && <HelperText type="error" accessibilityRole="alert">{t(error)}</HelperText>}
        </ScrollView>
      </Dialog.ScrollArea>
      <Dialog.Actions>
        <Button style={styles.action} disabled={busy} onPress={close}>{t("Annulla")}</Button>
        <Button mode="contained" style={styles.action} disabled={blocked} loading={busy} onPress={() => void save()}>{kind === 'transfer' ? t("Trasferisci") : t("Aggiungi")}</Button>
      </Dialog.Actions>
    </Dialog>
  </Portal>;
}

const styles = StyleSheet.create({
  area: { minHeight: 0, paddingHorizontal: spacing.xl, borderTopWidth: 0, borderBottomWidth: 0 },
  content: { paddingVertical: spacing.sm, gap: spacing.lg },
  field: { gap: spacing.xs },
  action: { minWidth: 96, flexShrink: 1 },
});
