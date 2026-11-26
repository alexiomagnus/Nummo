import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ScrollView, StyleSheet, View } from 'react-native';
import { HelperText, Portal, Text, TextInput, useTheme } from 'react-native-paper';
import { AppDialog as Dialog } from '../../components/AppDialog';
import { useBackLayer } from '../../components/BackNavigation';
import { Button, CancelButton, ConfirmButton, dialogActionsRow } from '../../components/Button';
import { ListGroup, RowBody, RowDivider, ToggleRow } from '../../components/ActionList';
import { ChoiceChips } from '../../components/ChoiceChips';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import { createPin, lockDelays, lockOnReturn, pinInput, pinLength, pinMatches, isPin, type LockDelay } from '../../domain/appLock';
import { useI18n } from '../../i18n/I18nProvider';
import { createLockCredential, platformLockAvailable, verifyLockCredential, type LockOutcome } from '../../services/platformLock';
import { backLevels } from '../../theme/backStack';
import { inputOutline, layout, radius, spacing } from '../../theme/tokens';
import { useSizeClass } from '../../theme/useSizeClass';
import { appLockState, disableAppLock, lockApp, saveAppLock, setLockRecovery, unlockApp, useAppLock } from './appLockStore';

const unlockErrors: Record<Exclude<LockOutcome, 'ok'>, string> = {
  cancelled: 'Sblocco annullato o non riuscito. Riprova.',
  unavailable: 'Impronta, viso e PIN del dispositivo non sono disponibili in questo browser. Usa «Non riesco a sbloccare».',
  error: 'Sblocco non riuscito. Riprova.',
};

// The Advanced mode, signed in: «Esci» is the way out of the lock (see `setLockRecovery`).
export function useLockRecovery(recovery: (() => void) | null) {
  const latest = useRef(recovery);
  latest.current = recovery;
  const present = recovery !== null;
  useEffect(() => {
    if (!present) return;
    const run = () => latest.current?.();
    setLockRecovery(run);
    return () => { if (appLockState().recovery === run) setLockRecovery(null); };
  }, [present]);
}

// When the app locks: at every start (the store starts locked) and on return after the chosen delay, or as soon as it is
// hidden with «Subito» (so the app switcher's picture is the lock screen where the browser repaints in time).
function useLockTriggers() {
  useEffect(() => {
    let hiddenAt: number | null = null;
    const change = () => {
      const { settings } = appLockState();
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
        if (settings.delay === 0) lockApp();
      } else {
        if (lockOnReturn(hiddenAt, Date.now(), settings.delay)) lockApp();
        hiddenAt = null;
      }
    };
    // Back from the browser's page cache (bfcache): the page is not reloaded, so it is a return as well.
    const shown = (event: PageTransitionEvent) => { if (event.persisted) lockApp(); };
    document.addEventListener('visibilitychange', change);
    window.addEventListener('pageshow', shown);
    return () => { document.removeEventListener('visibilitychange', change); window.removeEventListener('pageshow', shown); };
  }, []);
}

// Full screen above everything, outside `#root`: the app under it stays mounted (drafts, open pages) but inert and hidden
// from assistive technology, dialogs and menus included (Paper's portals live in `#root`). Back does nothing while
// locked: the lock never closes like an overlay.
export function AppLockScreen() {
  const { locked } = useAppLock();
  useLockTriggers();
  useBackLayer(locked, backLevels.lock, () => false);
  const [container] = useState(() => {
    if (typeof document === 'undefined') return null;
    const element = document.createElement('div');
    element.setAttribute('data-app-lock', '');
    document.body.appendChild(element);
    return element;
  });
  useEffect(() => {
    const root = document.getElementById('root');
    if (!locked || !root) return;
    root.setAttribute('inert', '');
    root.setAttribute('aria-hidden', 'true');
    return () => { root.removeAttribute('inert'); root.removeAttribute('aria-hidden'); };
  }, [locked]);
  if (!locked || !container) return null;
  return createPortal(<LockView />, container);
}

function LockView() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { settings, recovery } = useAppLock();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const pending = useRef<AbortController | null>(null);
  // Standard mode with a PIN: the PIN turns the lock off (user's request, 22 November); without one (a lock turned on
  // before), the confirmation alone, as before.
  const savedPin = recovery ? null : settings.pin;
  const disableWithPin = async () => {
    if (!savedPin || checking) return;
    setChecking(true);
    const ok = await pinMatches(pin, savedPin);
    setChecking(false);
    if (ok) disableAppLock();
    else { setPin(''); setPinError(isPin(pin) ? 'PIN errato.' : 'Il PIN ha {p0} cifre.'); }
  };
  const stopLeaving = () => { setLeaving(false); setPin(''); setPinError(null); };
  const autoTried = useRef(false);
  const unlock = async (auto: boolean) => {
    if (!settings.credentialId) { unlockApp(); return; }
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    if (!auto) setError(null);
    const outcome = await verifyLockCredential(settings.credentialId, controller.signal);
    if (pending.current !== controller) return;
    pending.current = null;
    setBusy(false);
    if (outcome === 'ok') unlockApp();
    // A first, automatic request may be refused for want of a tap (Safari): the button is there, no message.
    else if (!auto) setError(unlockErrors[outcome]);
  };
  // Escape must not close the dialogs under the lock: `useEscape` ignores a key already handled (window capture runs first).
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') event.preventDefault(); };
    window.addEventListener('keydown', escape, true);
    return () => window.removeEventListener('keydown', escape, true);
  }, []);
  // Asks at once when the lock screen is in front, once per lock; then «Sblocca».
  useEffect(() => {
    const tryNow = () => {
      if (autoTried.current || document.visibilityState !== 'visible') return;
      autoTried.current = true;
      void unlock(true);
    };
    tryNow();
    document.addEventListener('visibilitychange', tryNow);
    return () => { document.removeEventListener('visibilitychange', tryNow); pending.current?.abort(); };
  }, []);
  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]} role="dialog" aria-modal aria-label={t("Nummo è bloccato")}>
      <View style={styles.content}>
        <View style={[styles.badge, { backgroundColor: colors.primaryContainer }]} aria-hidden>
          <SvgIcon shape={iconShapes.lock} size={36} color={colors.onPrimaryContainer} />
        </View>
        <Text variant="headlineSmall" accessibilityRole="header" aria-level={1} style={styles.center}>{t("Nummo è bloccato")}</Text>
        <Text variant="bodyMedium" style={[styles.center, { color: colors.onSurfaceVariant }]}>
          {t("Sblocca con impronta, viso o il PIN del dispositivo.")}</Text>
        <ConfirmButton onPress={() => void unlock(false)} loading={busy} disabled={busy} style={styles.unlock}
          icon={({ size, color }) => <SvgIcon shape={iconShapes.lock} size={size} color={color} />}>{t("Sblocca")}</ConfirmButton>
        {error && <HelperText type="error" accessibilityRole="alert" style={styles.center}>{t(error)}</HelperText>}
        {!leaving ? <Button mode="text" onPress={() => setLeaving(true)}>{t("Non riesco a sbloccare")}</Button> : (
          <View style={[styles.leave, { borderColor: colors.outlineVariant }]}>
            <Text variant="bodyMedium">{recovery
              ? t("Esci dall’account: per rivedere i dati dovrai accedere di nuovo con Google. Il blocco si disattiva.")
              : savedPin ? t("Inserisci il PIN di Nummo: il blocco si disattiva e Nummo si apre. Potrai riattivarlo dalle Impostazioni.")
              : t("Il blocco si disattiva e Nummo si apre. Potrai riattivarlo dalle Impostazioni.")}</Text>
            {savedPin && <View>
              <PinInput label={t("PIN")} value={pin} error={pinError !== null}
                onChange={(next) => { setPin(next); setPinError(null); }} onSubmit={() => void disableWithPin()} />
              {pinError && <HelperText type="error" accessibilityRole="alert" style={styles.helper}>{t(pinError, { p0: pinLength })}</HelperText>}
            </View>}
            <View style={[styles.actions, dialogActionsRow]}>
              <CancelButton onPress={stopLeaving}>{t("Annulla")}</CancelButton>
              {recovery
                ? <ConfirmButton onPress={recovery}>{t("Esci")}</ConfirmButton>
                : <ConfirmButton buttonColor={colors.error} textColor={colors.onError} loading={checking} disabled={checking || (savedPin !== null && pin.length === 0)}
                  onPress={() => { if (savedPin) void disableWithPin(); else disableAppLock(); }}>{t("Disattiva il blocco")}</ConfirmButton>}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

// Six digits, hidden, numeric keyboard on phones.
function PinInput({ label, value, error, onChange, onSubmit }: { label: string; value: string; error?: boolean; onChange: (value: string) => void; onSubmit?: () => void }) {
  return <TextInput outlineStyle={inputOutline} mode="outlined" label={label} value={value} error={error} secureTextEntry
    keyboardType="number-pad" inputMode="numeric" autoComplete="off" maxLength={pinLength}
    onChangeText={(next) => onChange(pinInput(next))} onSubmitEditing={onSubmit} />;
}

// Choose the PIN (twice). `onConfirm` returns an error to show, or null when done (the dialog then closes).
function PinDialog({ visible, onDismiss, onConfirm }: { visible: boolean; onDismiss: () => void; onConfirm: (pin: string) => Promise<string | null> }) {
  const { t } = useI18n();
  const compact = useSizeClass() === 'compact';
  const [first, setFirst] = useState('');
  const [second, setSecond] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const close = () => { if (busy) return; setFirst(''); setSecond(''); setError(null); onDismiss(); };
  const confirm = async () => {
    if (busy) return;
    if (!isPin(first)) { setError('Il PIN ha {p0} cifre.'); return; }
    if (first !== second) { setError('I due PIN non coincidono.'); return; }
    setBusy(true);
    const failure = await onConfirm(first).catch(() => 'Operazione non riuscita. Riprova.');
    setBusy(false);
    if (failure) { setError(failure); return; }
    setFirst(''); setSecond(''); setError(null);
  };
  const title = t("Scegli il PIN di Nummo");
  return (
    <Portal>
      <Dialog variant="alert" visible={visible} onDismiss={close} style={{ maxWidth: 400 }}>
        <View role="dialog" aria-label={title} style={styles.dialog}>
          <Dialog.ScrollArea style={styles.dialogArea}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.dialogBody}>
              <Text variant="titleLarge" accessibilityRole="header">{title}</Text>
              <Text variant="bodyMedium">{t("Se impronta, viso o il PIN del dispositivo non funzionano, con questo PIN disattivi il blocco dalla schermata di blocco.")}</Text>
              <PinInput label={t("PIN ({p0} cifre)", { p0: pinLength })} value={first} error={error !== null} onChange={(next) => { setFirst(next); setError(null); }} />
              <PinInput label={t("Ripeti il PIN")} value={second} error={error !== null} onChange={(next) => { setSecond(next); setError(null); }} onSubmit={() => void confirm()} />
              {error && <HelperText type="error" accessibilityRole="alert" style={styles.helper}>{t(error, { p0: pinLength })}</HelperText>}
            </ScrollView>
          </Dialog.ScrollArea>
          <View style={[styles.dialogActions, compact && styles.dialogActionsCompact, dialogActionsRow]}>
            <CancelButton disabled={busy} onPress={close}>{t("Annulla")}</CancelButton>
            <ConfirmButton disabled={busy} loading={busy} onPress={() => void confirm()}>{t("Imposta")}</ConfirmButton>
          </View>
        </View>
      </Dialog>
    </Portal>
  );
}

const delayLabels: Record<LockDelay, string> = { 0: 'Subito', 60: '1 minuto', 300: '5 minuti', 900: '15 minuti' };

// Settings card, both modes. Turning the lock on asks the device to verify the user (it creates, or reuses, the
// credential); turning it off asks again, so that only the owner of the device can.
// `requirePin`: the Standard mode, where the lock is turned on only together with a PIN (22 November, on request).
export function AppLockCard({ requirePin = false }: { requirePin?: boolean }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { settings } = useAppLock();
  // 'on': turning the lock on (PIN first, then the device); 'set': a PIN for a lock already on (or a new one).
  const [choosingPin, setChoosingPin] = useState<'on' | 'set' | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    void platformLockAvailable().then((value) => { if (live) setAvailable(value); });
    return () => { live = false; };
  }, []);
  const save = (next: typeof settings) => { if (!saveAppLock(next)) setError('Il browser non ha salvato la scelta: lo spazio per i dati del sito è pieno o bloccato.'); };
  // Returns the error to show (also in the PIN dialog), or null when the lock is on.
  const turnOn = async (pin: string | null): Promise<string | null> => {
    const saved = pin === null ? null : await createPin(pin);
    // The credential of an earlier lock, if the device still has it; otherwise a new one.
    if (settings.credentialId && await verifyLockCredential(settings.credentialId) === 'ok') { save({ ...settings, enabled: true, pin: saved }); return null; }
    const created = await createLockCredential('Nummo');
    if (created.outcome === 'ok') { save({ ...settings, enabled: true, credentialId: created.credentialId, pin: saved }); return null; }
    return created.outcome === 'cancelled' ? 'Attivazione annullata: il blocco resta spento.'
      : created.outcome === 'unavailable' ? 'Impronta, viso e PIN del dispositivo non sono disponibili in questo browser.' : 'Attivazione non riuscita. Riprova.';
  };
  // A new PIN for a lock already on: only after the device has verified the user, like turning it off.
  const setPin = async (pin: string): Promise<string | null> => {
    const outcome = settings.credentialId ? await verifyLockCredential(settings.credentialId) : 'ok';
    if (outcome !== 'ok') return outcome === 'cancelled' ? 'Verifica annullata: il PIN non è cambiato.' : 'Verifica non riuscita: il PIN non è cambiato.';
    save({ ...settings, pin: await createPin(pin) });
    return null;
  };
  const turnOff = async () => {
    const outcome = settings.credentialId ? await verifyLockCredential(settings.credentialId) : 'ok';
    if (outcome === 'ok') save({ ...settings, enabled: false, pin: null });
    else setError(outcome === 'cancelled' ? 'Verifica annullata: il blocco resta attivo.' : 'Verifica non riuscita: il blocco resta attivo.');
  };
  const toggle = async (on: boolean) => {
    if (busy) return;
    setError(null);
    if (on && requirePin) { setChoosingPin('on'); return; }
    setBusy(true);
    try { if (on) { const failure = await turnOn(null); if (failure) setError(failure); } else await turnOff(); } finally { setBusy(false); }
  };
  const confirmPin = async (pin: string) => {
    const failure = await (choosingPin === 'on' ? turnOn(pin) : setPin(pin));
    if (!failure) setChoosingPin(null);
    return failure;
  };
  const missing = available === false && !settings.enabled;
  return (
    <ListGroup icon={iconShapes.lock} label={t("Blocco dell’app")}>
      <ToggleRow icon={iconShapes.lock} title={t("Blocca con impronta o viso")} value={settings.enabled} disabled={busy || missing || available === null}
        subtitle={missing ? t("Questo browser non offre impronta, viso o PIN del dispositivo alle app web.")
          : t("All’apertura e quando torni nell’app chiede impronta, viso o il PIN del dispositivo.")}
        onChange={(on) => void toggle(on)} />
      {settings.enabled && <><RowDivider /><RowBody><View style={styles.delay}>
        <Text variant="labelLarge" style={{ color: colors.onSurfaceVariant }}>{t("Blocca di nuovo quando torni dopo")}</Text>
        <ChoiceChips label={t("Blocca di nuovo quando torni dopo")} value={String(settings.delay)}
          options={lockDelays.map((delay) => ({ value: String(delay), label: t(delayLabels[delay]) }))}
          onChange={(value) => { if (value) save({ ...settings, delay: Number(value) as LockDelay }); }} />
      </View></RowBody></>}
      {settings.enabled && requirePin && <><RowDivider /><RowBody><View style={styles.pin}>
        <Text variant="bodyMedium" style={{ color: settings.pin ? colors.onSurfaceVariant : colors.error }}>{settings.pin
          ? t("Con il PIN di Nummo disattivi il blocco se impronta, viso o il PIN del dispositivo non funzionano.")
          : t("Imposta un PIN: senza, chiunque può disattivare il blocco dalla schermata di blocco.")}</Text>
        <View style={styles.start}>
          <Button mode="outlined" disabled={busy} onPress={() => setChoosingPin('set')}>{settings.pin ? t("Cambia il PIN") : t("Imposta il PIN")}</Button>
        </View>
      </View></RowBody></>}
      {error && <RowBody><HelperText type="error" accessibilityRole="alert" style={styles.helper}>{t(error)}</HelperText></RowBody>}
      <PinDialog visible={choosingPin !== null} onDismiss={() => setChoosingPin(null)} onConfirm={confirmPin} />
    </ListGroup>
  );
}

const styles = StyleSheet.create({
  // The visible part of the page, as #root (index.html): with the iOS keyboard open for the PIN, the centred content
  // stays above the keyboard instead of in the middle of the taller layout viewport.
  screen: { position: 'fixed' as 'absolute', top: 'var(--nummo-viewport-top, 0px)' as unknown as number, left: 0, right: 0,
    height: 'var(--nummo-viewport-height, 100%)' as unknown as number, zIndex: 2147483000, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  content: { width: '100%', maxWidth: 400, alignItems: 'center', gap: spacing.lg },
  badge: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center' },
  unlock: { minWidth: 200, minHeight: layout.minTouch },
  leave: { width: '100%', gap: spacing.md, padding: spacing.lg, borderWidth: 1, borderRadius: radius.card },
  actions: { flexDirection: 'row', justifyContent: 'flex-end' },
  delay: { gap: spacing.sm },
  helper: { paddingHorizontal: 0 },
  pin: { gap: spacing.sm },
  start: { alignSelf: 'flex-start' },
  dialog: { flexShrink: 1, minHeight: 0 },
  dialogArea: { minHeight: 0, paddingHorizontal: 0, marginBottom: 0 },
  dialogBody: { paddingHorizontal: spacing.xl, gap: spacing.md },
  dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: spacing.xl, paddingVertical: spacing.lg },
  dialogActionsCompact: { flexDirection: 'column', alignItems: 'stretch' },
});
