import { useRef, useState } from 'react';
import { Image, StyleSheet, View, type ViewStyle } from 'react-native';
import { HelperText, useTheme } from 'react-native-paper';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { StateLayerPressable } from '../../components/StateLayerPressable';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import { useI18n } from '../../i18n/I18nProvider';
import { fillTransition } from '../../theme/motion';
import { motion, radius, spacing } from '../../theme/tokens';
import { prepareAvatar } from '../receipts/image';
import { profileAvatarLabels, profileAvatars, profileAvatarSvg } from './profileAvatars';
import { maxPhotoLength, noProfileImage, type ProfileImage } from './profileImage';
import { saveProfileImage, useProfileImage } from './useProfileImage';

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

// The picture of the Standard mode's account button.
export function StandardAvatar() {
  return <ProfileAvatar image={useProfileImage('local')} size={accountAvatarSize} />;
}

// Settings card, both modes (the Advanced one since 22 November, on request): there «nothing chosen» is the Google photo.
// Every choice applies at once.
export function ProfileImageCard({ scope, googlePhoto }: ProfileScope) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const image = useProfileImage(scope);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      style={[styles.option, fillTransition, { borderColor: selected ? colors.primary : 'transparent' }]}>
      <ProfileAvatar image={shown} size={accountAvatarSize} googlePhoto={photo} />
    </StateLayerPressable>
  );
  return (
    <Card title={t("Immagine del profilo")} style={styles.card}>
      <View style={styles.current}>
        <ProfileAvatar image={image} size={accountAvatarSize * 2} googlePhoto={googlePhoto} />
      </View>
      <View style={styles.options} role="radiogroup" aria-label={t("Immagine del profilo")}>
        {option('none', googlePhoto ? t("Foto di Google") : t("Nessuna immagine"), image.kind === 'none', noProfileImage, () => choose(noProfileImage), googlePhoto)}
        {image.kind === 'photo' && option('photo', t("La tua foto"), true, image, () => {})}
        {profileAvatars.map((avatar) => option(avatar, t("Avatar {p0}", { p0: t(profileAvatarLabels[avatar]) }),
          image.kind === 'avatar' && image.avatar === avatar, { kind: 'avatar', avatar }, () => choose({ kind: 'avatar', avatar })))}
      </View>
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
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderRadius: radius.pill },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  helper: { paddingHorizontal: 0 },
});
