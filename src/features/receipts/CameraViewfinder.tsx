import { useEffect, useLayoutEffect, useRef, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Text } from 'react-native-paper';
import { useEscape } from '../../components/Overlay';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import { useI18n } from '../../i18n/I18nProvider';
import { overrideDocumentChrome } from '../../theme/bootTheme';
import { viewfinderColors as c } from '../../theme/palette';
import { radius } from '../../theme/tokens';

type Props = {
  // The live stream is attached by the scan dialog (ScanReceiptDialog), which owns it and stops its tracks.
  videoRef: RefObject<HTMLVideoElement | null>;
  ready: boolean;
  // Only when the camera reports a torch (`getCapabilities().torch`): otherwise no button.
  torch: { on: boolean; toggle: () => void } | null;
  galleryDisabled: boolean;
  onShoot: () => void;
  onGallery: () => void;
  onClose: () => void;
};

// Live camera of the receipt scan as an immersive layer (24 November, on request): a dark band at the top with the title
// (and the torch, where there is one), then the picture in a sheet anchored to the bottom edge, rounded at the top, filled
// edge to edge (`object-fit: cover`, no grey bands), with the controls floating over it: back, shutter, gallery. The
// preview is cropped only on screen: the shot keeps the whole native frame (`shoot` in ScanReceiptDialog draws
// `videoWidth × videoHeight`). Mounted in `#root`, which is the visible area (iOS keyboard and safe areas included) and
// which the lock screen makes inert; Escape and Back close it (overlay level), the status bar turns dark meanwhile.
export function CameraViewfinder({ videoRef, ready, torch, galleryDisabled, onShoot, onGallery, onClose }: Props) {
  const { t } = useI18n();
  const back = useRef<HTMLButtonElement>(null);
  useEscape(true, onClose);

  useLayoutEffect(() => (typeof document === 'undefined' ? undefined : overrideDocumentChrome(document, c.background, true)), []);
  // Focus inside the layer (the controls under it are covered), and back where it was when the layer closes.
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    back.current?.focus({ preventScroll: true });
    return () => { if (opener?.isConnected) opener.focus({ preventScroll: true }); };
  }, []);

  const host = typeof document === 'undefined' ? null : document.getElementById('root');
  if (!host) return null;
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={t("Scansiona scontrino")} style={styles.layer}>
      <div style={styles.band}>
        <Text variant="titleMedium" style={{ color: c.onMediaMuted }} numberOfLines={1}>{t("Scansiona scontrino")}</Text>
        {torch && <RoundButton label={torch.on ? t("Spegni la torcia") : t("Accendi la torcia")} pressed={torch.on} onPress={torch.toggle}
          style={torch.on ? styles.active : styles.control}>
          <SvgIcon shape={iconShapes.flash} size={22} color={torch.on ? c.onControlActive : c.onMedia} />
        </RoundButton>}
      </div>
      <div style={styles.sheet}>
        <video ref={videoRef} autoPlay playsInline muted aria-label={t("Anteprima della fotocamera")} style={styles.video} />
        <div aria-hidden="true" style={styles.handle} />
        <div style={styles.hintRow} aria-live="polite">
          <div style={styles.hint}>
            <Text variant="bodySmall" style={{ color: c.onMedia, textAlign: 'center' }}>
              {ready ? t("Inquadra tutto lo scontrino, ben illuminato e senza pieghe.") : t("Avvio della fotocamera…")}</Text>
          </div>
        </div>
        <div style={styles.controls}>
          <RoundButton ref={back} label={t("Torna indietro")} onPress={onClose} style={styles.control}>
            <SvgIcon shape={iconShapes.chevronLeft} size={26} color={c.onMedia} />
          </RoundButton>
          <RoundButton label={t("Scatta")} disabled={!ready} onPress={onShoot} style={styles.shutter}>
            <span aria-hidden="true" style={styles.shutterFill} />
          </RoundButton>
          <RoundButton label={t("Scegli un’immagine")} disabled={galleryDisabled} onPress={onGallery} style={styles.control}>
            <SvgIcon shape={iconShapes.image} size={22} color={c.onMedia} />
          </RoundButton>
        </div>
      </div>
    </div>,
    host,
  );
}

function RoundButton({ ref, label, pressed, disabled = false, onPress, style, children }: {
  ref?: RefObject<HTMLButtonElement | null>; label: string; pressed?: boolean; disabled?: boolean; onPress: () => void; style: CSSProperties; children: ReactNode;
}) {
  return <button ref={ref} type="button" aria-label={label} aria-pressed={pressed} disabled={disabled} onClick={onPress}
    style={{ ...styles.round, ...style, ...(disabled ? styles.disabled : null) }}>{children}</button>;
}

const blur = (px: number): CSSProperties => ({ backdropFilter: `blur(${px}px)`, WebkitBackdropFilter: `blur(${px}px)` });
const styles = {
  layer: { position: 'absolute', inset: 0, zIndex: 1100, display: 'flex', flexDirection: 'column', backgroundColor: c.background, overflow: 'hidden' },
  // About a quarter of the visible height, under the status bar.
  band: { flex: '0 0 24%', minHeight: 'calc(64px + env(safe-area-inset-top, 0px))', boxSizing: 'border-box', display: 'flex',
    alignItems: 'flex-start', justifyContent: 'space-between', gap: 16,
    padding: 'calc(16px + env(safe-area-inset-top, 0px)) calc(20px + env(safe-area-inset-right, 0px)) 16px calc(20px + env(safe-area-inset-left, 0px))' },
  sheet: { position: 'relative', flex: '1 1 auto', minHeight: 0, backgroundColor: c.sheet, overflow: 'hidden',
    borderTopLeftRadius: radius.dialog, borderTopRightRadius: radius.dialog },
  video: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  handle: { position: 'absolute', top: 8, left: '50%', width: 38, height: 4, marginLeft: -19, borderRadius: 2, backgroundColor: c.handle },
  // Centred in a full-width row (not `left: 50%`, which would leave the badge half the width and wrap it on three lines).
  hintRow: { position: 'absolute', top: 24, left: 16, right: 16, display: 'flex', justifyContent: 'center', pointerEvents: 'none' },
  hint: { maxWidth: 480, boxSizing: 'border-box', padding: '8px 14px', borderRadius: radius.pill, backgroundColor: c.badge, ...blur(10) },
  controls: { position: 'absolute', left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '48px calc(32px + env(safe-area-inset-right, 0px)) calc(24px + env(safe-area-inset-bottom, 0px)) calc(32px + env(safe-area-inset-left, 0px))',
    background: `linear-gradient(to top, ${c.shade}, transparent)` },
  round: { display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0, margin: 0, border: 'none',
    borderRadius: '50%', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' },
  control: { width: 48, height: 48, backgroundColor: c.control, ...blur(12) },
  active: { width: 48, height: 48, backgroundColor: c.controlActive },
  // White disc inside a translucent ring, like a camera's shutter.
  shutter: { width: 72, height: 72, backgroundColor: 'transparent', boxShadow: `inset 0 0 0 4px ${c.ring}` },
  shutterFill: { display: 'block', width: 56, height: 56, borderRadius: '50%', backgroundColor: c.onMedia },
  disabled: { opacity: 0.4, cursor: 'default' },
} satisfies Record<string, CSSProperties>;
