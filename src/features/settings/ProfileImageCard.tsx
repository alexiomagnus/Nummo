import { useRef, useState } from 'react';
import { Image, StyleSheet, View, type ViewStyle } from 'react-native';
import { HelperText, Text, useTheme } from 'react-native-paper';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { StateLayerPressable } from '../../components/StateLayerPressable';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import { useI18n } from '../../i18n/I18nProvider';
import { fillTransition } from '../../theme/motion';
import { motion, radius, spacing } from '../../theme/tokens';
import { prepareAvatar } from '../receipts/image';
import { profileAvatarLabels, profileAvatars, profileAvatarSvg } from './profileAvatars';
import { accentLabels } from '../../theme/palette';
import { accentSwatchColor } from '../../theme/theme';
import { maxPhotoLength, noProfileImage, profileRingColor, profileRings, type ProfileImage, type ProfileRing } from './profileImage';
import { saveProfileImage, saveProfileRing, useProfileImage, useProfileRing } from './useProfileImage';

// Size of the account button's picture, and of every choice in the card, so that a choice looks exactly like the button
// (user's report, 22 November); the preview is twice as large.
export const accountAvatarSize = 36;

// A discreet change of picture: the new one fades in from 92 %. Only after a change, never at the first paint (the
// header would blink at every start); `prefers-reduced-motion` reduces it to ~0 (GlobalStyle).
const changeAnimation = {
  animationKeyframes: { from: { opacity: 0, transform: 'scale(0.92)' }, to: { opacity: 1, transform: 'scale(1)' } },
  animationDuration: `${motion.medium}ms`,
  animationTimingFunction: `cubic-bezier(${motion.enter.join(', ')})`,
  animationFillMode: 'both',
} as ViewStyle;
const imageKey = (image: ProfileImage) =>
  image.kind === 'avatar' ? `avatar:${image.avatar}` : image.kind === 'photo' ? `photo:${image.photo.length}:${image.photo.slice(-24)}` : 'none';

// The round picture of the account button: the person glyph, one of the five avatars (light or dark drawing) or the
// photo. `googlePhoto` (Advanced mode): shown instead of the person glyph when nothing is chosen; if it does not load,
// the person glyph again. Decorative: the button and the choices carry their own labels.
export function ProfileAvatar({ image, size, googlePhoto = null }: { image: ProfileImage; size: number; googlePhoto?: string | null }) {
  const { colors, dark } = useTheme();
  const [failed, setFailed] = useState<string | null>(null);
  const google = image.kind === 'none' && googlePhoto && failed !== googlePhoto ? googlePhoto : null;
  const key = google ? `google:${google}` : imageKey(image);
  const first = useRef(key);
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primaryContainer }]} aria-hidden>
      <View key={key} style={[styles.fill, key !== first.current && changeAnimation]}>
        {image.kind === 'avatar' ? <Image accessible={false} style={styles.picture}
          source={{ uri: `data:image/svg+xml,${encodeURIComponent(profileAvatarSvg(image.avatar, dark))}` }} />
          : image.kind === 'photo' ? <img src={image.photo} alt="" draggable={false} width={size} height={size}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            : google ? <img src={google} alt="" draggable={false} width={size} height={size} referrerPolicy="no-referrer"
              onError={() => setFailed(google)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            : <SvgIcon shape={iconShapes.user} size={Math.round(size * 0.61)} color={colors.onPrimaryContainer} />}
      </View>
    </View>
  );
}

// Where the picture is kept (`local` or the UID) and, in the Advanced mode, the account's Google photo.
export type ProfileScope = Readonly<{ scope: string; googlePhoto: string | null }>;

// Scope of the Standard mode's picture; any other scope is an Advanced mode account. The ring in the main colour around the
// account picture marks the Advanced mode by itself, never the Standard one (user's choice, 22 November: before, a switch).
export const localProfileScope = 'local';

// The picture of the Standard mode's account button.
export function StandardAvatar() {
  return <ProfileAvatar image={useProfileImage(localProfileScope)} size={accountAvatarSize} />;
}

// Settings card, both modes (the Advanced one since 22 November, on request): there «nothing chosen» is the Google photo.
// Every choice applies at once. The preview has the ring of the account button in the Advanced mode (any scope but `local`).
export function ProfileImageCard({ scope, googlePhoto }: ProfileScope) {
  const ring = scope !== localProfileScope;
  const { t } = useI18n();
  const { colors, dark } = useTheme();
  const image = useProfileImage(scope);
  const ringChoice = useProfileRing(scope);
  const ringColor = profileRingColor(ringChoice, accentSwatchColor(colors), dark);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chooseRing = (next: ProfileRing) => {
    setError(saveProfileRing(next, scope) ? null : 'Il browser non ha salvato l’immagine: lo spazio per i dati del sito è pieno o bloccato.');
  };
  const choose = (next: ProfileImage) => {
    setError(saveProfileImage(next, scope) ? null : 'Il browser non ha salvato l’immagine: lo spazio per i dati del sito è pieno o bloccato.');
  };
  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try { choose({ kind: 'photo', photo: await prepareAvatar(file, 192, maxPhotoLength) }); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Formato non supportato: usa una foto JPEG, PNG o WebP.'); }
    finally { setBusy(false); }
  };
  const option = (key: string, label: string, selected: boolean, shown: ProfileImage, onPress: () => void, photo: string | null = null) => (
    <StateLayerPressable key={key} layerColor={colors.onSurface} radius={radius.pill} accessibilityRole="radio" aria-checked={selected}
      accessibilityLabel={`${label}${selected ? t(", selezionata") : ''}`} {...({ title: label } as object)} onPress={onPress}
      style={[styles.option, styles.avatarOption, fillTransition, { borderColor: selected ? colors.onSurface : 'transparent' }]}>
      <ProfileAvatar image={shown} size={accountAvatarSize} googlePhoto={photo} />
    </StateLayerPressable>
  );
  return (
    <Card title={t("Immagine del profilo")} style={styles.card}>
      <View style={styles.current}>
        <View style={[styles.ring, fillTransition, { borderColor: ring ? ringColor : 'transparent' }]}>
          <ProfileAvatar image={image} size={accountAvatarSize * 2} googlePhoto={googlePhoto} />
        </View>
      </View>
      <View style={styles.options} role="radiogroup" aria-label={t("Immagine del profilo")}>
        {option('none', googlePhoto ? t("Foto di Google") : t("Nessuna immagine"), image.kind === 'none', noProfileImage, () => choose(noProfileImage), googlePhoto)}
        {image.kind === 'photo' && option('photo', t("La tua foto"), true, image, () => {})}
        {profileAvatars.map((avatar) => option(avatar, t("Avatar {p0}", { p0: t(profileAvatarLabels[avatar]) }),
          image.kind === 'avatar' && image.avatar === avatar, { kind: 'avatar', avatar }, () => choose({ kind: 'avatar', avatar })))}
      </View>
      {/* Advanced mode only: the colour of the ring (user's request, 22 November). The app's colour first (default), then the
          six accents of «Colore»; each swatch shows the colour the ring takes in the current scheme. */}
      {ring && <View style={styles.ringChoice}>
        <Text variant="titleSmall" nativeID="profile-ring-label">{t("Colore dell'anello")}</Text>
        <View style={styles.options} role="radiogroup" aria-labelledby="profile-ring-label">
          {profileRings.map((choice) => {
            const selected = choice === ringChoice;
            const label = choice === 'app' ? t("Colore dell'app") : t(accentLabels[choice]);
            return <StateLayerPressable key={choice} layerColor={colors.onSurface} radius={radius.pill} accessibilityRole="radio" aria-checked={selected}
              accessibilityLabel={`${label}${selected ? t(", selezionato") : ''}`} {...({ title: label } as object)} onPress={() => chooseRing(choice)}
              style={[styles.option, fillTransition, { borderColor: selected ? colors.onSurface : 'transparent' }]}>
              <View style={[styles.swatch, { backgroundColor: profileRingColor(choice, accentSwatchColor(colors), dark) }]} />
            </StateLayerPressable>;
          })}
        </View>
      </View>}
      <View style={styles.actions}>
        <Button mode="outlined" loading={busy} disabled={busy} onPress={() => input.current?.click()}
          icon={({ size, color }) => <SvgIcon shape={iconShapes.image} size={size} color={color} />}>
          {image.kind === 'photo' ? t("Cambia foto") : t("Carica una foto")}
        </Button>
      </View>
      {error && <HelperText type="error" accessibilityRole="alert" style={styles.helper}>{t(error)}</HelperText>}
      <input ref={input} type="file" accept="image/*" hidden
        onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = ''; }} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%' },
  avatar: { overflow: 'hidden' },
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  picture: { width: '100%', height: '100%' },
  current: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  // The ring of the account button, doubled with the preview (3 + 3 around 72); transparent when off, so nothing moves.
  ring: { borderRadius: radius.pill, borderWidth: 3, padding: 3, alignSelf: 'flex-start' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderRadius: radius.pill },
  // The selection of an avatar looks like that of «Colore dell'anello» (user's request, 22 November): the same onSurface ring
  // (white on dark, dark on light) with the same 6 between ring and picture: 36 + 2 × 6 + 2 × 2 = 52.
  avatarOption: { width: accountAvatarSize + 2 * 6 + 2 * 2, height: accountAvatarSize + 2 * 6 + 2 * 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  ringChoice: { gap: spacing.sm },
  swatch: { width: 32, height: 32, borderRadius: radius.pill },
  helper: { paddingHorizontal: 0 },
});
