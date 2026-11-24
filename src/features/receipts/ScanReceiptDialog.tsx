import { useEffect, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { HelperText, Portal, ProgressBar, Text, useTheme } from 'react-native-paper';
import { AppDialog as Dialog } from '../../components/AppDialog';
import { Button, compactIconPadding, CancelButton, ConfirmButton, dialogActionPair, dialogActionsRow } from '../../components/Button';
import { SwitchRow } from '../../components/SwitchRow';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import { StateLayerPressable } from '../../components/StateLayerPressable';
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
import { radius, spacing } from '../../theme/tokens';
import { useSizeClass } from '../../theme/useSizeClass';
import { ExpenseFields } from '../expenses/ExpenseFields';
import { useReceiptAi } from './aiSettings';
import { CameraViewfinder } from './CameraViewfinder';
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

// Width of the column of the fields under which the three review buttons no longer fit one row (natural widths ≈ 466 + gaps).
const inlineRowMinimum = 500;
// Half of a phone narrower than this cannot hold «Usa questi dati» (measured: truncated from 384 px down, whole at 390).
const shortUseLabelBelow = 390;
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
  const { width: windowWidth } = useWindowDimensions();
  const ai = useReceiptAi();
  // The API key is written only in Settings (user's request, 21 November: no key field in this dialog); a missing key is
  // said here like a missing service or model, and the scan waits for it.
  const setupProblem = aiSetupProblem(ai.settings) ?? (ai.apiKey.trim() ? null : 'Inserisci la chiave API nelle Impostazioni.');
  const aiReady = setupProblem === null;
  const provider = ai.settings.provider === 'none' ? '' : aiProviderLabels[ai.settings.provider];

  const [stage, setStage] = useState<Stage>('pick');
  const [image, setImage] = useState<Blob | null>(null);
  const [preview, setPreview] = useState('');
  const [actionsWidth, setActionsWidth] = useState(0);
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
  // Torch of the back camera, where the browser reports one (Chrome on Android): null = no button.
  const [torch, setTorch] = useState<boolean | null>(null);
  const stopCamera = () => { stream.current?.getTracks().forEach((track) => track.stop()); stream.current = null; setCameraReady(false); setTorch(null); };
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
      const track = media.getVideoTracks()[0];
      const capabilities = track?.getCapabilities?.() as (MediaTrackCapabilities & { torch?: boolean }) | undefined;
      setTorch(capabilities?.torch === true ? false : null);
      setCameraReady(true);
    } catch (problem) {
      stopCamera();
      const name = problem instanceof DOMException ? problem.name : '';
      setError(name === 'NotAllowedError' || name === 'SecurityError' ? 'Fotocamera non autorizzata: consenti l’accesso nel browser oppure scegli un’immagine.'
        : name === 'NotFoundError' || name === 'OverconstrainedError' ? 'Nessuna fotocamera trovata: scegli un’immagine.' : 'Non è stato possibile usare la fotocamera: scegli un’immagine.');
      setStage(back === 'ready' && image ? 'ready' : 'pick');
    }
  };
  // The preview lives in the camera layer, mounted with the step: a stream that arrived before it is attached here.
  useEffect(() => {
    const element = video.current;
    if (stage !== 'camera' || !element || !stream.current || element.srcObject === stream.current) return;
    element.srcObject = stream.current;
    void element.play().catch(() => {});
  }, [stage, cameraReady]);
  const closeCamera = () => { stopCamera(); setStage(image ? 'ready' : 'pick'); };
  const toggleTorch = () => {
    const track = stream.current?.getVideoTracks()[0];
    if (!track || torch === null) return;
    const next = !torch;
    // `torch` is not in the DOM typings yet; a refusal leaves the state as it was.
    track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] }).then(() => setTorch(next), () => {});
  };
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
    // Review on a wide window: the photo takes the height of the form beside it (no fixed height, no empty space under the fields).
    <View style={[styles.picture, { backgroundColor: colors.surfaceVariant }, zoomed ? { height: 640 } : wide && stage === 'review' ? styles.pictureFill : { height: 240 }]}>
      <Image source={{ uri: preview }} resizeMode="contain" style={StyleSheet.absoluteFill} accessibilityLabel={t("Foto dello scontrino")} />
      {/* Enlarge/reduce as an icon on the photo's corner, before the scan and in the review, never a loose line of text
          between photo and buttons (user's requests, 22 November). */}
      {(stage === 'ready' || stage === 'review') && <StateLayerPressable layerColor={colors.onSurface} radius={radius.button} onPress={() => setZoomed((value) => !value)}
        accessibilityRole="button" accessibilityLabel={zoomed ? t("Riduci la foto") : t("Ingrandisci la foto")}
        style={[styles.zoomIcon, { backgroundColor: colors.surface }]}>
        <SvgIcon shape={zoomed ? iconShapes.shrink : iconShapes.expand} size={22} color={colors.onSurface} />
      </StateLayerPressable>}
    </View>
  ) : null;

  const inputs = <>
    <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(event) => { void choose(event.target.files?.[0]); event.target.value = ''; }} />
    {/* Also opened from the live camera: a picture chosen there closes the camera first. */}
    <input ref={gallery} type="file" accept="image/*" hidden onChange={(event) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (file && stream.current) closeCamera();
      void choose(file);
    }} />
  </>;
  // Always one row, the two buttons in equal halves (on phones compact, with short labels: the full ones did not fit half
  // of a 390 px screen; the full name for screen readers), 12 apart as «Annulla» and «Scansiona» under them, so the two
  // rows make two equal columns at every size.
  const sourceButtons = (mode: 'contained-tonal' | 'outlined') => <View style={styles.sources}>
    <Button mode={mode} disabled={preparing} icon={({ size, color }) => <SvgIcon shape={iconShapes.camera} size={size} color={color} />}
      compact={!wide} style={styles.source} contentStyle={!wide && compactIconPadding.snug.content} labelStyle={!wide && compactIconPadding.snug.label}
      accessibilityLabel={t("Scatta una foto")} onPress={() => void openCamera()}>{wide ? t("Scatta una foto") : t("Scatta foto")}</Button>
    <Button mode={mode} disabled={preparing} loading={preparing} icon={({ size, color }) => <SvgIcon shape={iconShapes.image} size={size} color={color} />}
      compact={!wide} style={styles.source} contentStyle={!wide && compactIconPadding.snug.content} labelStyle={!wide && compactIconPadding.snug.label}
      accessibilityLabel={image ? t("Cambia immagine") : t("Scegli un’immagine")}
      onPress={() => gallery.current?.click()}>{wide ? (image ? t("Cambia immagine") : t("Scegli un’immagine")) : (image ? t("Cambia foto") : t("Carica foto"))}</Button>
  </View>;

  let body;
  let actions;
  // The live camera is a layer of its own over everything (CameraViewfinder); under it the dialog keeps the step it
  // came from, so closing the camera shows it unchanged.
  const shown: Stage = stage === 'camera' ? (image ? 'ready' : 'pick') : stage;
  if (shown === 'pick') {
    body = <>
      <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
        {t("Fotografa o carica lo scontrino: Nummo propone importo, data, descrizione, esercente e categoria.")}</Text>
      {setupProblem && <HelperText type="info" style={{ paddingHorizontal: 0 }}>{t(setupProblem)}</HelperText>}
      {sourceButtons('contained-tonal')}
      {error && <HelperText type="error" accessibilityRole="alert">{t(error)}</HelperText>}
    </>;
    actions = <CancelButton onPress={onClose}>{t("Annulla")}</CancelButton>;
  } else if (shown === 'ready') {
    // Photo (with its zoom icon), then the tonal photo buttons, then «Annulla»/«Scansiona»: every row in two equal halves,
    // so the buttons line up; tonal, not outlined, so they do not look like «Annulla» (user's request, 22 November).
    body = <>
      {picture}
      {/* Service, model or key still missing: said here, the scan waits for Settings. */}
      {setupProblem && <HelperText type="info" style={{ paddingHorizontal: 0 }}>{t(setupProblem)}</HelperText>}
      {error && <HelperText type="error" accessibilityRole="alert">{t(error)}</HelperText>}
      {sourceButtons('contained-tonal')}
    </>;
    actions = [
      <CancelButton key="cancel" onPress={onClose} style={styles.equal}>{t("Annulla")}</CancelButton>,
      <ConfirmButton key="scan" disabled={preparing || !aiReady} onPress={start} style={styles.equal}>{failed ? t("Riprova") : t("Scansiona")}</ConfirmButton>,
    ];
  } else if (shown === 'consent') {
    body = <>
      <Text variant="titleSmall">{t("Inviare la foto a {p0}?", { p0: provider })}</Text>
      <Text variant="bodyMedium">{t("Con la scansione avanzata la foto dello scontrino esce da questo dispositivo e viene inviata a {p0} ({p1}), che la tratta secondo le proprie condizioni. Nummo non la conserva.", { p0: provider, p1: ai.destination })}</Text>
      <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>{t("Uno scontrino può contenere dati personali, come le ultime cifre della carta o il codice fiscale.")}</Text>
    </>;
    actions = [
      <CancelButton key="cancel" onPress={() => setStage('ready')}>{t("Annulla")}</CancelButton>,
      <ConfirmButton key="consent" onPress={() => { ai.giveConsent(); void run(); }}>{t("Acconsento e invio")}</ConfirmButton>,
    ];
  } else if (shown === 'working') {
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
    // Wide window, photo not enlarged: the buttons move into the column of the fields (the dialog then has no action row).
    const inline = wide && !zoomed;
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
    // Phone: «Scansiona di nuovo» on its own full-width row, then «Annulla» and «Usa questi dati» sharing the next one, so all three
    // line up with the fields (user's request, 21 November).
    // Wide window with a narrow column of fields (the three do not fit one row, ≈500): stacked like on a phone, never two rows of
    // unequal buttons.
    const stacked = inline && actionsWidth > 0 && actionsWidth < inlineRowMinimum;
    const grow = stacked || !wide ? styles.equal : inline ? styles.inlineAction : undefined;
    const again = <CancelButton key="again" onPress={() => setStage('ready')} style={[grow, (stacked || !wide) && styles.fullRow]}>{t("Scansiona di nuovo")}</CancelButton>;
    const cancel = <CancelButton onPress={onClose} style={grow}>{t("Annulla")}</CancelButton>;
    // Narrow phones: short label, full name for screen readers (like «Scansiona scontrino» in the form).
    const use = <ConfirmButton disabled={Object.keys(patch).length === 0} onPress={apply} style={grow} accessibilityLabel={t("Usa questi dati")}>
      {!wide && windowWidth < shortUseLabelBelow ? t("Usa i dati") : t("Usa questi dati")}</ConfirmButton>;
    body = inline
      ? <>
        <View style={styles.columns}><View style={styles.side}>{picture}</View><View style={styles.main}>{review}</View></View>
        {/* The three buttons sit under the column of the fields, as wide as the inputs, well below the last one. They are a row of their own, so the
            photo (as tall as the fields) never ends on the same line as the buttons (user's request, 21 November). */}
        <View style={styles.actionsRow}><View style={styles.sideActions} /><View style={styles.main}><View style={styles.inlineActions} onLayout={(event) => setActionsWidth(event.nativeEvent.layout.width)}>{again}{cancel}{use}</View></View></View>
      </>
      : <>{picture}{review}</>;
    // «Scansiona di nuovo» outlined like «Annulla» (a way back, to the photo), never a bare text action among the buttons.
    // «Annulla» and «Usa questi dati» stay together: on a phone the row wraps with «Scansiona di nuovo» above the pair,
    // instead of leaving the confirmation alone on the second line. All right-aligned (no auto margin, unlike Elimina).
    actions = inline ? null : [
      again,
      <View key="pair" style={[dialogActionPair, styles.pairEnd, !wide && styles.fullRow]}>{cancel}{use}</View>,
    ];
  }

  return <Portal><Dialog visible dismissable={stage !== 'working' && stage !== 'camera'} onDismiss={onClose} style={wide && stage === 'review' ? styles.wideDialog : undefined}>
    <Dialog.Title>{stage === 'review' ? t("Controlla i dati") : t("Scansiona scontrino")}</Dialog.Title>
    <Dialog.ScrollArea style={styles.area}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      {inputs}
      {body}
    </ScrollView></Dialog.ScrollArea>
    {/* `actions` is a button or an array of keyed buttons (or a keyed View holding a pair), never a Fragment: Dialog.Actions clones each child to add
        `compact` and its margin, and a Fragment cannot take them («Invalid prop `compact` supplied to React.Fragment»). */}
    {actions && <Dialog.Actions style={dialogActionsRow}>{actions}</Dialog.Actions>}
    {stage === 'camera' && <CameraViewfinder videoRef={video} ready={cameraReady} galleryDisabled={preparing}
      torch={torch === null ? null : { on: torch, toggle: toggleTorch }}
      onShoot={() => void shoot()} onGallery={() => gallery.current?.click()} onClose={closeCamera} />}
  </Dialog></Portal>;
}

const styles = StyleSheet.create({
  wideDialog: { maxWidth: 920 },
  area: { minHeight: 0, paddingHorizontal: spacing.xl },
  content: { paddingVertical: spacing.sm, gap: spacing.lg },
  pairEnd: { marginLeft: 0 },
  block: { gap: spacing.md },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: -spacing.sm },
  // The two photo buttons in equal halves at every size, 12 apart like the dialog actions under them (22 November).
  sources: { flexDirection: 'row', flexWrap: 'nowrap', gap: spacing.md },
  source: { flex: 1, minWidth: 0 },
  picture: { width: '100%', borderRadius: radius.card, overflow: 'hidden' },
  zoomIcon: { position: 'absolute', top: spacing.sm, right: spacing.sm, width: 40, height: 40, alignItems: 'center', justifyContent: 'center', opacity: 0.92 },
  pictureFill: { flex: 1, minHeight: 240 },
  progress: { height: 6, borderRadius: radius.pill },
  columns: { flexDirection: 'row', alignItems: 'stretch', gap: spacing.xl },
  side: { flex: 2, minWidth: 0, gap: spacing.lg },
  main: { flex: 3, minWidth: 0 },
  actionsRow: { flexDirection: 'row', alignItems: 'stretch', gap: spacing.xl, marginTop: spacing.xxxl + spacing.xl - spacing.lg, marginBottom: spacing.lg },
  // Empty space under the photo, so the buttons line up with the column of the fields.
  sideActions: { flex: 2, minWidth: 0, justifyContent: 'flex-start', alignItems: 'flex-start' },
  inlineActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  inlineAction: { flexGrow: 1 },
  fullRow: { flexBasis: '100%', flexGrow: 1 },
  // Phone: «Annulla» and «Usa questi dati» exactly as wide as each other.
  equal: { flex: 1 },
  notice: { flexDirection: 'row', gap: spacing.md, padding: spacing.md, borderRadius: radius.card },
  noticeText: { flex: 1, minWidth: 0, gap: spacing.xs },
});
