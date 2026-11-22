import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { HelperText, Text, useTheme } from 'react-native-paper';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { CategoryGlyph } from '../../components/CategoryGlyph';
import { StateLayerPressable } from '../../components/StateLayerPressable';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import { allCategoryIconLabels } from '../../domain/category';
import { useI18n } from '../../i18n/I18nProvider';
import { radius, spacing } from '../../theme/tokens';
import { prepareAvatar } from '../receipts/image';
import { avatarIcons, maxPhotoLength, noProfileImage, type ProfileImage } from './profileImage';
import { saveProfileImage, useProfileImage } from './useProfileImage';

// The round picture of the account button: the person glyph, a preset icon (in the chosen icon style) or the photo.
// Decorative: the button and the choices carry their own labels.
export function ProfileAvatar({ image, size }: { image: ProfileImage; size: number }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primaryContainer }]} aria-hidden>
      {image.kind === 'icon' ? <CategoryGlyph icon={image.icon} size={Math.round(size * 0.62)} color={colors.onPrimaryContainer} />
        : image.kind === 'photo' ? <img src={image.photo} alt="" draggable={false} width={size} height={size}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : <SvgIcon shape={iconShapes.user} size={Math.round(size * 0.61)} color={colors.onPrimaryContainer} />}
    </View>
  );
}

// The account button of the Standard mode, with the picture chosen here.
export function StandardAvatar({ size }: { size: number }) {
  return <ProfileAvatar image={useProfileImage()} size={size} />;
}

// Settings card, Standard mode only (the Advanced mode shows the Google photo). Every choice applies at once.
export function ProfileImageCard() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const image = useProfileImage();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const choose = (next: ProfileImage) => {
    setError(saveProfileImage(next) ? null : 'Il browser non ha salvato l’immagine: lo spazio per i dati del sito è pieno o bloccato.');
  };
  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try { choose({ kind: 'photo', photo: await prepareAvatar(file, 192, maxPhotoLength) }); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Formato non supportato: usa una foto JPEG, PNG o WebP.'); }
    finally { setBusy(false); }
  };
  const option = (key: string, label: string, selected: boolean, shown: ProfileImage, onPress: () => void) => (
    <StateLayerPressable key={key} layerColor={colors.onSurface} radius={radius.pill} accessibilityRole="radio" aria-checked={selected}
      accessibilityLabel={`${label}${selected ? t(", selezionata") : ''}`} {...({ title: label } as object)} onPress={onPress}
      style={[styles.option, { borderColor: selected ? colors.primary : 'transparent' }]}>
      <ProfileAvatar image={shown} size={44} />
    </StateLayerPressable>
  );
  return (
    <Card title={t("Immagine del profilo")} style={styles.card}>
      <View style={styles.current}>
        <ProfileAvatar image={image} size={64} />
        <Text variant="bodyMedium" style={[styles.note, { color: colors.onSurfaceVariant }]}>
          {t("Compare sul pulsante del menu, in alto a destra. Resta solo su questo dispositivo e non entra nel backup.")}</Text>
      </View>
      <View style={styles.options} role="radiogroup" aria-label={t("Immagine del profilo")}>
        {option('none', t("Nessuna immagine"), image.kind === 'none', noProfileImage, () => choose(noProfileImage))}
        {image.kind === 'photo' && option('photo', t("La tua foto"), true, image, () => {})}
        {avatarIcons.map((icon) => option(icon, t("Icona {p0}{p1}", { p0: t(allCategoryIconLabels[icon]), p1: '' }),
          image.kind === 'icon' && image.icon === icon, { kind: 'icon', icon }, () => choose({ kind: 'icon', icon })))}
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
  avatar: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  current: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  note: { flex: 1, minWidth: 0 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderRadius: radius.pill },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  helper: { paddingHorizontal: 0 },
});
