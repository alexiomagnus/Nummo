import { useEffect, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { HelperText, Portal, ProgressBar, Text, TextInput, useTheme } from 'react-native-paper';
import { AppDialog as Dialog } from '../../components/AppDialog';
import { Button, compactIconPadding, CancelButton, ConfirmButton, dialogActionPair, dialogActionsRow } from '../../components/Button';
import { SwitchRow } from '../../components/SwitchRow';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import type { Category } from '../../domain/category';
import type { RankedMerchant } from '../../domain/merchant';
import { todayInRome } from '../../domain/policy';
import {
  amountText, emptyProposal, parseAiReceipt, receiptFields, scanConflicts, scanPatch,
  type ReceiptField, type ReceiptProposal, type ReceiptValues,
} from '../../domain/receipt';
import { aiProviderLabels, aiSetupProblem, receiptPrompt } from '../../domain/receiptAi';
import { useI18n } from '../../i18n/I18nProvider';
import { analyzeReceipt, isAbort } from '../../services/receiptAi';
import { inputOutline, radius, spacing } from '../../theme/tokens';
import { useSizeClass } from '../../theme/useSizeClass';
import { ExpenseFields } from '../expenses/ExpenseFields';
import { useReceiptAi } from './aiSettings';
import { prepareImage, toBase64 } from './image';

type Props = {
  categories: readonly Category[];
  // Saved merchants ranked by use: the suggestions of «Esercente» in the review.
  merchants: readonly RankedMerchant[];
  // What the form holds now, as typed by the user (an untouched field is '').
  draft: ReceiptValues;
  // The reviewed values the user accepted. The form only fills its fields: saving stays on its own Save button.
  onApply: (patch: Partial<Record<ReceiptField, string>>) => void;
  onClose: () => void;
};

type Stage = 'pick' | 'camera' | 'ready' | 'consent' | 'working' | 'review';

const fieldLabels: Readonly<Record<ReceiptField, string>> = { amount: 'Importo', date: 'Data', description: 'Descrizione', merchant: 'Esercente', categoryId: 'Categoria' };
const unreadable = 'Non è stato possibile leggere lo scontrino: prova con una foto più nitida e completa.';

// Scan of a receipt for the new-expense form, in one dialog: choose or take a picture, preview it, read it with the
// user's AI provider (the only kind of scan since 21 November: the local OCR was removed on request), then review. The picture exists only in this component's
// memory and is released when the dialog closes. Nothing is ever saved from here.
export function ScanReceiptDialog({ categories, merchants, draft, onApply, onClose }: Props) {
  const { t, locale } = useI18n();
  const { colors } = useTheme();
  const wide = useSizeClass() !== 'compact';
  const ai = useReceiptAi();
  const setupProblem = aiSetupProblem(ai.settings);
  const aiReady = setupProblem === null;
  const provider = ai.settings.provider === 'none' ? '' : aiProviderLabels[ai.settings.provider];

  const [stage, setStage] = useState<Stage>('pick');
  const [image, setImage] = useState<Blob | null>(null);
  const [preview, setPreview] = useState('');
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [proposal, setProposal] = useState<ReceiptProposal | null>(null);
  const [values, setValues] = useState<ReceiptValues>({ amount: '', date: '', description: '', merchant: '', categoryId: '' });
  const [replace, setReplace] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const running = useRef<AbortController | null>(null);
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);

  // Closing in any way stops the work in progress and releases the picture.
  useEffect(() => () => running.current?.abort(), []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  // Live camera in the dialog on every device, phones included (17 November): the system camera behind the file picker
  // left the status bar of the installed app black until it was reopened (Chrome on Android, not fixable from the page).
  // The stream is stopped as soon as a picture is taken, the step is left or the dialog closes.
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const stopCamera = () => { stream.current?.getTracks().forEach((track) => track.stop()); stream.current = null; setCameraReady(false); };
  useEffect(() => stopCamera, []);
  const openCamera = async () => {
    // Only a browser without getUserMedia (or a page outside a secure context) falls back to the system camera.
    if (!navigator.mediaDevices?.getUserMedia) { camera.current?.click(); return; }
    setError(null); setFailed(false);
    const back = stage === 'camera' ? 'pick' : stage;
    setStage('camera');
    try {
      const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
      stream.current = media;
      if (video.current) { video.current.srcObject = media; await video.current.play().catch(() => {}); }
      setCameraReady(true);
    } catch (problem) {
      stopCamera();
      const name = problem instanceof DOMException ? problem.name : '';
      setError(name === 'NotAllowedError' || name === 'SecurityError' ? 'Fotocamera non autorizzata: consenti l’accesso nel browser oppure scegli un’immagine.'
        : name === 'NotFoundError' || name === 'OverconstrainedError' ? 'Nessuna fotocamera trovata: scegli un’immagine.' : 'Non è stato possibile usare la fotocamera: scegli un’immagine.');
      setStage(back === 'ready' && image ? 'ready' : 'pick');
    }
  };
  const closeCamera = () => { stopCamera(); setStage(image ? 'ready' : 'pick'); };
  const shoot = async () => {
    const source = video.current;
    if (!source || !source.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = source.videoWidth; canvas.height = source.videoHeight;
    canvas.getContext('2d')?.drawImage(source, 0, 0);
    const shot = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.95));
    canvas.width = 0; canvas.height = 0;
    stopCamera();
    if (!shot) { setError('Non è stato possibile usare la fotocamera: scegli un’immagine.'); setStage(image ? 'ready' : 'pick'); return; }
    setStage(image ? 'ready' : 'pick');
    await choose(shot);
  };

  const choose = async (file: Blob | undefined) => {
    if (!file) return;
    setPreparing(true); setError(null); setFailed(false);
    try {
      const prepared = await prepareImage(file);
      setImage(prepared); setPreview(URL.createObjectURL(prepared)); setProposal(null); setZoomed(false); setStage('ready');
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Formato non supportato: usa una foto JPEG, PNG o WebP.');
    } finally { setPreparing(false); }
  };

  const run = async () => {
    if (!image) return;
    const controller = new AbortController();
    running.current = controller;
    setStage('working'); setError(null); setFailed(false);
    const today = todayInRome();
    try {
      const base64 = await toBase64(image);
      const raw = await analyzeReceipt(ai.settings, ai.apiKey, { mime: image.type || 'image/jpeg', base64 },
        receiptPrompt(categories, today, locale === 'it-IT' ? 'Italian' : 'English'), controller.signal);
      const result: ReceiptProposal = parseAiReceipt(raw, categories, today);
      if (controller.signal.aborted) return;
      if (emptyProposal(result)) { setError(unreadable); setFailed(true); setStage('ready'); return; }
      setProposal(result);
      // The model already answers in the user's language.
      setValues({ amount: amountText(result.amountMinor, locale === 'it-IT' ? ',' : '.'), date: result.date,
        description: result.description, merchant: result.merchant, categoryId: result.categoryId });
      setReplace(false);
      setStage('review');
    } catch (problem) {
      if (controller.signal.aborted || isAbort(problem)) return;
      setError(problem instanceof Error ? problem.message : unreadable); setFailed(true); setStage('ready');
    } finally { if (running.current === controller) running.current = null; }
  };
  const start = () => {
    if (!ai.consented) { setStage('consent'); return; }
    void run();
  };
  const cancelWork = () => { running.current?.abort(); running.current = null; setStage('ready'); };

  const conflicts = stage === 'review' ? scanConflicts(draft, values) : [];
  const patch = scanPatch(draft, values, replace);
  const apply = () => { onApply(patch); onClose(); };
  const flagged = (status: 'uncertain' | 'missing') => (proposal ? receiptFields.filter((field) => proposal.status[field] === status).map((field) => t(fieldLabels[field])).join(', ') : '');
  const picture = preview ? (
    <View style={[styles.picture, { backgroundColor: colors.surfaceVariant, height: zoomed ? 640 : wide && stage === 'review' ? 420 : 240 }]}>
      <Image source={{ uri: preview }} resizeMode="contain" style={StyleSheet.absoluteFill} accessibilityLabel={t("Foto dello scontrino")} />
    </View>
  ) : null;
  const zoom = <Button compact onPress={() => setZoomed((value) => !value)}>{zoomed ? t("Riduci la foto") : t("Ingrandisci la foto")}</Button>;

  const inputs = <>
    <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(event) => { void choose(event.target.files?.[0]); event.target.value = ''; }} />
    <input ref={gallery} type="file" accept="image/*" hidden onChange={(event) => { void choose(event.target.files?.[0]); event.target.value = ''; }} />
  </>;
  // Always one row: on phones the two buttons share it in equal halves, compact, with short labels (the full ones
  // did not fit half of a 390 px screen) and the full name for screen readers.
  const sourceButtons = (mode: 'contained-tonal' | 'outlined') => <View style={[styles.sources, !wide && styles.sourcesPhone]}>
    <Button mode={mode} disabled={preparing} icon={({ size, color }) => <SvgIcon shape={iconShapes.camera} size={size} color={color} />}
      compact={!wide} style={!wide && styles.source} contentStyle={!wide && compactIconPadding.snug.content} labelStyle={!wide && compactIconPadding.snug.label}
      accessibilityLabel={t("Scatta una foto")} onPress={() => void openCamera()}>{wide ? t("Scatta una foto") : t("Scatta foto")}</Button>
    <Button mode={mode} disabled={preparing} loading={preparing} icon={({ size, color }) => <SvgIcon shape={iconShapes.image} size={size} color={color} />}
      compact={!wide} style={!wide && styles.source} contentStyle={!wide && compactIconPadding.snug.content} labelStyle={!wide && compactIconPadding.snug.label}
      accessibilityLabel={image ? t("Cambia immagine") : t("Scegli un’immagine")}
      onPress={() => gallery.current?.click()}>{wide ? (image ? t("Cambia immagine") : t("Scegli un’immagine")) : (image ? t("Cambia foto") : t("Carica foto"))}</Button>
  </View>;

  let body;
  let actions;
  if (stage === 'pick') {
    body = <>
      <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
        {t("Fotografa o carica lo scontrino: Nummo propone importo, data, descrizione, esercente e categoria. Controlli tutto prima di salvare.")}</Text>
      {setupProblem && <HelperText type="info" style={{ paddingHorizontal: 0 }}>{t(setupProblem)}</HelperText>}
      {sourceButtons('contained-tonal')}
      {error && <HelperText type="error" accessibilityRole="alert">{t(error)}</HelperText>}
    </>;
    actions = <CancelButton onPress={onClose}>{t("Annulla")}</CancelButton>;
  } else if (stage === 'camera') {
    body = <>
      <View style={[styles.picture, styles.camera, { backgroundColor: colors.surfaceVariant }]}>
        <video ref={video} autoPlay playsInline muted aria-label={t("Anteprima della fotocamera")} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </View>
      <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }} accessibilityLiveRegion="polite">
        {cameraReady ? t("Inquadra tutto lo scontrino, ben illuminato e senza pieghe.") : t("Avvio della fotocamera…")}</Text>
    </>;
    actions = [
      <CancelButton key="cancel" onPress={closeCamera}>{t("Annulla")}</CancelButton>,
      <ConfirmButton key="shoot" disabled={!cameraReady} onPress={() => void shoot()}>{t("Scatta")}</ConfirmButton>,
    ];
  } else if (stage === 'ready') {
    body = <>
      {picture}
      <View style={styles.row}>{zoom}</View>
      {/* Service or model still to choose: said here, the scan waits for Settings. The key can be written here too. */}
      {setupProblem && <HelperText type="info" style={{ paddingHorizontal: 0 }}>{t(setupProblem)}</HelperText>}
      {aiReady && <TextInput outlineStyle={inputOutline} mode="outlined" label={t("Chiave API")} value={ai.apiKey} onChangeText={ai.setApiKey}
        secureTextEntry autoComplete="off" autoCapitalize="none" autoCorrect={false} spellCheck={false} />}
      {error && <HelperText type="error" accessibilityRole="alert">{t(error)}</HelperText>}
      {sourceButtons('outlined')}
    </>;
    actions = [
      <CancelButton key="cancel" onPress={onClose}>{t("Annulla")}</CancelButton>,
      <ConfirmButton key="scan" disabled={preparing || !aiReady || !ai.apiKey.trim()} onPress={start}>{failed ? t("Riprova") : t("Scansiona")}</ConfirmButton>,
    ];
  } else if (stage === 'consent') {
    body = <>
      <Text variant="titleSmall">{t("Inviare la foto a {p0}?", { p0: provider })}</Text>
      <Text variant="bodyMedium">{t("Con la scansione avanzata la foto dello scontrino esce da questo dispositivo e viene inviata a {p0} ({p1}), che la tratta secondo le proprie condizioni. Nummo non la conserva.", { p0: provider, p1: ai.destination })}</Text>
      <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>{t("Uno scontrino può contenere dati personali, come le ultime cifre della carta o il codice fiscale.")}</Text>
    </>;
    actions = [
      <CancelButton key="cancel" onPress={() => setStage('ready')}>{t("Annulla")}</CancelButton>,
      <ConfirmButton key="consent" onPress={() => { ai.giveConsent(); void run(); }}>{t("Acconsento e invio")}</ConfirmButton>,
    ];
  } else if (stage === 'working') {
    body = <>
      {picture}
      <View style={styles.block} accessibilityLiveRegion="polite">
        <Text variant="bodyMedium">{t("Analisi con {p0} in corso…", { p0: provider })}</Text>
        <ProgressBar indeterminate style={styles.progress}
          accessibilityLabel={t("Scansione in corso")} />
      </View>
    </>;
    actions = <CancelButton onPress={cancelWork}>{t("Annulla")}</CancelButton>;
  } else {
    const uncertain = flagged('uncertain');
    const missing = flagged('missing');
    const review = <View style={styles.block}>
      {(uncertain || missing || proposal!.notes.length > 0) && (
        <View style={[styles.notice, { backgroundColor: colors.tertiaryContainer }]} accessibilityRole="alert">
          <SvgIcon shape={iconShapes.alert} size={20} color={colors.onTertiaryContainer} />
          <View style={styles.noticeText}>
            {uncertain !== '' && <Text variant="bodyMedium" style={{ color: colors.onTertiaryContainer }}>{t("Da controllare: {p0}", { p0: uncertain })}</Text>}
            {missing !== '' && <Text variant="bodyMedium" style={{ color: colors.onTertiaryContainer }}>{t("Non trovato: {p0}", { p0: missing })}</Text>}
            {proposal!.notes.map((note) => <Text key={note} variant="bodySmall" style={{ color: colors.onTertiaryContainer }}>{t(note)}</Text>)}
          </View>
        </View>
      )}
      <ExpenseFields dense values={values} errors={{}} categories={categories}
        merchant={{ value: values.merchant, merchants, onChange: (merchant) => setValues((current) => ({ ...current, merchant })) }}
        onChange={(field, value) => setValues((current) => ({ ...current, [field]: value }))} onBlur={() => {}} />
      {/* Products and discounts read are not shown (removed on request, 17 November): only the expense fields are reviewed. */}
      {conflicts.length > 0 && <SwitchRow label={t("Sostituisci i dati già inseriti")} value={replace} onChange={setReplace}
        supporting={t("Hai già compilato: {p0}. Senza questa scelta restano come sono.", { p0: conflicts.map((field) => t(fieldLabels[field])).join(', ') })} />}
    </View>;
    body = wide && !zoomed
      ? <View style={styles.columns}><View style={styles.side}>{picture}<View style={styles.row}>{zoom}</View></View><View style={styles.main}>{review}</View></View>
      : <>{picture}<View style={styles.row}>{zoom}</View>{review}</>;
    // «Scansiona di nuovo» outlined like «Annulla» (a way back, to the photo), never a bare text action among the buttons.
    // «Annulla» and «Usa questi dati» stay together: on a phone the row wraps with «Scansiona di nuovo» above the pair,
    // instead of leaving the confirmation alone on the second line. All right-aligned (no auto margin, unlike Elimina).
    actions = [
      <CancelButton key="again" onPress={() => setStage('ready')}>{t("Scansiona di nuovo")}</CancelButton>,
      <View key="pair" style={[dialogActionPair, styles.pairEnd]}>
        <CancelButton onPress={onClose}>{t("Annulla")}</CancelButton>
        <ConfirmButton disabled={Object.keys(patch).length === 0} onPress={apply}>{t("Usa questi dati")}</ConfirmButton>
      </View>,
    ];
  }

  return <Portal><Dialog visible dismissable={stage !== 'working' && stage !== 'camera'} onDismiss={onClose} style={wide && stage === 'review' ? styles.wideDialog : undefined}>
    <Dialog.Title>{stage === 'review' ? t("Controlla i dati letti") : t("Scansiona scontrino")}</Dialog.Title>
    <Dialog.ScrollArea style={styles.area}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      {inputs}
      {body}
    </ScrollView></Dialog.ScrollArea>
    {/* `actions` is a button or an array of keyed buttons (or a keyed View holding a pair), never a Fragment: Dialog.Actions clones each child to add
        `compact` and its margin, and a Fragment cannot take them («Invalid prop `compact` supplied to React.Fragment»). */}
    <Dialog.Actions style={dialogActionsRow}>{actions}</Dialog.Actions>
  </Dialog></Portal>;
}

const styles = StyleSheet.create({
  wideDialog: { maxWidth: 920 },
  area: { minHeight: 0, paddingHorizontal: spacing.xl },
  content: { paddingVertical: spacing.sm, gap: spacing.lg },
  pairEnd: { marginLeft: 0 },
  block: { gap: spacing.md },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: -spacing.sm },
  sources: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  sourcesPhone: { flexWrap: 'nowrap' },
  source: { flex: 1, minWidth: 0 },
  picture: { width: '100%', borderRadius: radius.card, overflow: 'hidden' },
  camera: { height: 360 },
  progress: { height: 6, borderRadius: radius.pill },
  columns: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xl },
  side: { flex: 2, minWidth: 0, gap: spacing.lg },
  main: { flex: 3, minWidth: 0 },
  notice: { flexDirection: 'row', gap: spacing.md, padding: spacing.md, borderRadius: radius.card },
  noticeText: { flex: 1, minWidth: 0, gap: spacing.xs },
});
