import { useI18n } from '../i18n/I18nProvider';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Divider, Menu, Text, useTheme } from 'react-native-paper';
import { radius, spacing } from '../theme/tokens';
import { StateLayerPressable } from './StateLayerPressable';
import { SvgIcon, iconShapes } from './SvgIcon';

type Props = { email: string | null; photoURL: string | null; busy: boolean; onSignOut: () => void; onOpenSettings: () => void };

// Account avatar → menu with the signed-in e-mail, settings and the sign-out action.
export function AccountMenu({ email, photoURL, busy, onSignOut, onOpenSettings }: Props) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [photoLoaded, setPhotoLoaded] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [photoAttempt, setPhotoAttempt] = useState(0);
  return (
    <Menu visible={open} onDismiss={() => setOpen(false)} anchorPosition="bottom" contentStyle={[styles.menu, { backgroundColor: colors.elevation.level2 }]}
      anchor={
        <StateLayerPressable layerColor={colors.onSurfaceVariant} radius={24} bleed={4} accessibilityRole="button"
          aria-haspopup="menu" aria-expanded={open} accessibilityLabel={`Account${email ? `: ${email}` : ''}`}
          onPress={() => setOpen(true)} style={styles.trigger}>
          <View style={[styles.avatar, { backgroundColor: colors.primaryContainer }]}>
            <Text variant="titleSmall" style={{ color: colors.onPrimaryContainer }}>{(email ?? 'N').charAt(0).toUpperCase()}</Text>
            {photoURL && !photoFailed && <img key={photoAttempt} src={photoURL} alt="" aria-hidden draggable={false}
              width={36} height={36} referrerPolicy="no-referrer"
              onLoad={() => setPhotoLoaded(true)} onError={() => setPhotoFailed(true)}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: photoLoaded ? 1 : 0, transition: 'opacity 200ms cubic-bezier(0.2, 0, 0, 1)' }} />}
          </View>
        </StateLayerPressable>
      }>
      <View style={styles.info}>
        <Text variant="labelMedium" style={{ color: colors.onSurfaceVariant }}>{t("Account Google")}</Text>
        <Text variant="bodyMedium" numberOfLines={1} selectable style={styles.email}>{email ?? t("Account senza e-mail")}</Text>
        {(!photoURL || photoFailed || !photoLoaded) && <Text variant="bodySmall" accessibilityLiveRegion="polite" style={{ color: colors.onSurfaceVariant }}>
          {!photoURL ? t('Nessuna foto profilo disponibile per questo account.')
            : photoFailed ? t('La foto profilo non si è caricata.') : t('Caricamento foto profilo…')}
        </Text>}
      </View>
      <Divider />
      {photoURL && photoFailed && <Menu.Item title={t('Riprova foto')} style={styles.item}
        leadingIcon={({ size, color }) => <SvgIcon shape={iconShapes.sync} size={size} color={color} />}
        onPress={() => { setPhotoLoaded(false); setPhotoFailed(false); setPhotoAttempt((attempt) => attempt + 1); }} />}
      <Menu.Item title={t("Impostazioni")} style={styles.item}
        leadingIcon={({ size, color }) => <SvgIcon shape={iconShapes.settings} size={size} color={color} />}
        onPress={() => { setOpen(false); onOpenSettings(); }} />
      <Menu.Item title={busy ? t("Uscita in corso…") : t("Esci")} disabled={busy} style={styles.item}
        leadingIcon={({ size, color }) => <SvgIcon shape={iconShapes.logout} size={size} color={color} />}
        onPress={() => { setOpen(false); onSignOut(); }} />
    </Menu>
  );
}

const styles = StyleSheet.create({
  menu: { borderRadius: radius.control, overflow: 'hidden' },
  // Size items against the account menu rather than Paper's independent width cap.
  // Fill its actual width; inset rounded rows keep hover/ripple/focus inside the surface.
  item: { maxWidth: '100%', marginHorizontal: spacing.xs, borderRadius: radius.tile, overflow: 'hidden' },
  trigger: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  info: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: 2, maxWidth: 280 },
  email: { flexShrink: 1 },
});
