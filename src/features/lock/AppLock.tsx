import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { StyleSheet, View } from 'react-native';
import { HelperText, Text, useTheme } from 'react-native-paper';
import { useBackLayer } from '../../components/BackNavigation';
import { Button, CancelButton, ConfirmButton, dialogActionsRow } from '../../components/Button';
import { Card } from '../../components/Card';
import { ChoiceChips } from '../../components/ChoiceChips';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import { SwitchRow } from '../../components/SwitchRow';
import { lockDelays, lockOnReturn, type LockDelay } from '../../domain/appLock';
import { useI18n } from '../../i18n/I18nProvider';
import { createLockCredential, platformLockAvailable, verifyLockCredential, type LockOutcome } from '../../services/platformLock';
import { backLevels } from '../../theme/backStack';
import { layout, radius, spacing } from '../../theme/tokens';
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
  const pending = useRef<AbortController | null>(null);
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
              : t("Il blocco si disattiva e Nummo si apre. Potrai riattivarlo dalle Impostazioni.")}</Text>
            <View style={[styles.actions, dialogActionsRow]}>
              <CancelButton onPress={() => setLeaving(false)}>{t("Annulla")}</CancelButton>
              {recovery
                ? <ConfirmButton onPress={recovery}>{t("Esci")}</ConfirmButton>
                : <ConfirmButton buttonColor={colors.error} textColor={colors.onError} onPress={disableAppLock}>{t("Disattiva il blocco")}</ConfirmButton>}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const delayLabels: Record<LockDelay, string> = { 0: 'Subito', 60: '1 minuto', 300: '5 minuti', 900: '15 minuti' };

// Settings card, both modes. Turning the lock on asks the device to verify the user (it creates, or reuses, the
// credential); turning it off asks again, so that only the owner of the device can.
export function AppLockCard() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { settings } = useAppLock();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    void platformLockAvailable().then((value) => { if (live) setAvailable(value); });
    return () => { live = false; };
  }, []);
  const save = (next: typeof settings) => { if (!saveAppLock(next)) setError('Il browser non ha salvato la scelta: lo spazio per i dati del sito è pieno o bloccato.'); };
  const turnOn = async () => {
    // The credential of an earlier lock, if the device still has it; otherwise a new one.
    if (settings.credentialId && await verifyLockCredential(settings.credentialId) === 'ok') { save({ ...settings, enabled: true }); return; }
    const created = await createLockCredential('Nummo');
    if (created.outcome === 'ok') save({ ...settings, enabled: true, credentialId: created.credentialId });
    else setError(created.outcome === 'cancelled' ? 'Attivazione annullata: il blocco resta spento.'
      : created.outcome === 'unavailable' ? 'Impronta, viso e PIN del dispositivo non sono disponibili in questo browser.' : 'Attivazione non riuscita. Riprova.');
  };
  const turnOff = async () => {
    const outcome = settings.credentialId ? await verifyLockCredential(settings.credentialId) : 'ok';
    if (outcome === 'ok') save({ ...settings, enabled: false });
    else setError(outcome === 'cancelled' ? 'Verifica annullata: il blocco resta attivo.' : 'Verifica non riuscita: il blocco resta attivo.');
  };
  const toggle = async (on: boolean) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try { await (on ? turnOn() : turnOff()); } finally { setBusy(false); }
  };
  const missing = available === false && !settings.enabled;
  return (
    <Card title={t("Blocco dell’app")} style={styles.card}>
      <SwitchRow label={t("Blocca con impronta o viso")} value={settings.enabled} disabled={busy || missing || available === null}
        supporting={missing ? t("Questo browser non offre impronta, viso o PIN del dispositivo alle app web.")
          : t("All’apertura e quando torni nell’app chiede impronta, viso o il PIN del dispositivo.")}
        onChange={(on) => void toggle(on)} />
      {settings.enabled && <View style={styles.delay}>
        <Text variant="labelLarge" style={{ color: colors.onSurfaceVariant }}>{t("Blocca di nuovo quando torni dopo")}</Text>
        <ChoiceChips label={t("Blocca di nuovo quando torni dopo")} value={String(settings.delay)}
          options={lockDelays.map((delay) => ({ value: String(delay), label: t(delayLabels[delay]) }))}
          onChange={(value) => { if (value) save({ ...settings, delay: Number(value) as LockDelay }); }} />
      </View>}
      {error && <HelperText type="error" accessibilityRole="alert" style={styles.helper}>{t(error)}</HelperText>}
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { position: 'fixed' as 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2147483000, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  content: { width: '100%', maxWidth: 400, alignItems: 'center', gap: spacing.lg },
  badge: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center' },
  unlock: { minWidth: 200, minHeight: layout.minTouch },
  leave: { width: '100%', gap: spacing.md, padding: spacing.lg, borderWidth: 1, borderRadius: radius.card },
  actions: { flexDirection: 'row', justifyContent: 'flex-end' },
  card: { width: '100%' },
  delay: { gap: spacing.sm },
  helper: { paddingHorizontal: 0 },
});
