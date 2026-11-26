import { useI18n } from '../i18n/I18nProvider';
import { useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Divider, Menu, Text, useTheme } from 'react-native-paper';
import { radius, spacing } from '../theme/tokens';
import { AnchoredMenu, type MenuAnchor } from './Overlay';
import { StateLayerPressable } from './StateLayerPressable';
import { SvgIcon, iconShapes } from './SvgIcon';

// Without `signedIn` there is no account (Standard mode, data on this device): the menu keeps only its pages. «Esci» is not in
// the menu any more (27 November, on request): it is in «Archiviazione e backup», Advanced mode.
// `avatar`: the picture chosen in Settings, drawn instead of the person glyph and the Google photo; with it the menu says
// nothing about the Google photo (loading, missing, «Riprova foto»). `ring`: the colour of a ring around the picture, the
// mark of the Advanced mode (22 November; never in the Standard mode; colour chosen in Settings, the main one by default).
type Props = { email: string | null; photoURL: string | null; avatar?: ReactNode; ring?: string; signedIn?: boolean; onOpenSettings: () => void; onOpenNotifications: () => void; onOpenCategories: () => void; onOpenTemplates: () => void; onOpenReceipts: () => void; onOpenBackup: () => void; onOpenMerchants: () => void; onOpenInfo: () => void };

// Account avatar → menu with the signed-in e-mail, settings, notifications, categories, import/export and the sign-out action.
// Shared anchored menu (right edge under the avatar): same motion, Escape and focus return as the selectors.
// `Menu.Item` is only Paper's row component here; Paper's Menu (scale from zero, slow fade) is no longer used.
export function AccountMenu({ email, photoURL, avatar, ring, signedIn = false, onOpenSettings, onOpenNotifications, onOpenCategories, onOpenTemplates, onOpenReceipts, onOpenBackup, onOpenMerchants, onOpenInfo }: Props) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [photoLoaded, setPhotoLoaded] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [photoAttempt, setPhotoAttempt] = useState(0);
  const [anchor, setAnchor] = useState<MenuAnchor>({ x: 0, y: 0, width: 0, height: 0 });
  const trigger = useRef<ComponentRef<typeof View>>(null);
  const openMenu = () => trigger.current?.measureInWindow((x, y, width, height) => { setAnchor({ x, y, width, height }); setOpen(true); });
  return (
    <>
      <View ref={trigger}>
        <StateLayerPressable layerColor={colors.onSurfaceVariant} radius={24} bleed={4} accessibilityRole="button"
          aria-haspopup="menu" aria-expanded={open} accessibilityLabel={signedIn ? `Account${email ? `: ${email}` : ''}` : t("Menu")}
          onPress={openMenu} style={styles.trigger}>
          <View style={[styles.ring, { borderColor: ring ?? 'transparent' }]}>
          {avatar ?? <View style={[styles.avatar, { backgroundColor: colors.primaryContainer }]}>
            <SvgIcon shape={iconShapes.user} size={22} color={colors.onPrimaryContainer} />
            {photoURL && !photoFailed && <img key={photoAttempt} src={photoURL} alt="" aria-hidden draggable={false}
              width={36} height={36} referrerPolicy="no-referrer"
              onLoad={() => setPhotoLoaded(true)} onError={() => setPhotoFailed(true)}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: photoLoaded ? 1 : 0, transition: 'opacity 200ms cubic-bezier(0.2, 0, 0, 1)' }} />}
          </View>}
          </View>
        </StateLayerPressable>
      </View>
      {/* No fixed cap (the selectors' 360 hid the last item under the scroll, 23 November): only the room in the window limits it. */}
      <AnchoredMenu visible={open} onDismiss={() => setOpen(false)} anchor={anchor} align="end" label="Account" contentStyle={styles.menu}
        maxHeight={Number.POSITIVE_INFINITY}>
      {signedIn ? <View style={styles.info}>
        <Text variant="labelMedium" style={{ color: colors.onSurfaceVariant }}>{t("Account Google")}</Text>
        <Text variant="bodyMedium" numberOfLines={1} selectable style={styles.email}>{email ?? t("Account senza e-mail")}</Text>
        {!avatar && (!photoURL || photoFailed || !photoLoaded) && <Text variant="bodySmall" accessibilityLiveRegion="polite" style={{ color: colors.onSurfaceVariant }}>
          {!photoURL ? t('Nessuna foto profilo disponibile per questo account.')
            : photoFailed ? t('La foto profilo non si è caricata.') : t('Caricamento foto profilo…')}
        </Text>}
      </View> : <View style={styles.info}>
        <Text variant="labelMedium" style={{ color: colors.onSurfaceVariant }}>{t("Modalità Standard")}</Text>
        <Text variant="bodyMedium">{t("Dati su questo dispositivo")}</Text>
      </View>}
      <Divider />
      {!avatar && photoURL && photoFailed && <Menu.Item title={t('Riprova foto')} style={styles.item}
        leadingIcon={({ size, color }) => <SvgIcon shape={iconShapes.sync} size={size} color={color} />}
        onPress={() => { setPhotoLoaded(false); setPhotoFailed(false); setPhotoAttempt((attempt) => attempt + 1); }} />}
      <Menu.Item title={t("Impostazioni")} style={styles.item}
        leadingIcon={({ size, color }) => <SvgIcon shape={iconShapes.settings} size={size} color={color} />}
        onPress={() => { setOpen(false); onOpenSettings(); }} />
      <Menu.Item title={t("Notifiche")} style={styles.item}
        leadingIcon={({ size, color }) => <SvgIcon shape={iconShapes.bell} size={size} color={color} />}
        onPress={() => { setOpen(false); onOpenNotifications(); }} />
      <Menu.Item title={t("Categorie")} style={styles.item}
        leadingIcon={({ size, color }) => <SvgIcon shape={iconShapes.tag} size={size} color={color} />}
        onPress={() => { setOpen(false); onOpenCategories(); }} />
      <Menu.Item title={t("Templates")} style={styles.item}
        leadingIcon={({ size, color }) => <SvgIcon shape={iconShapes.template} size={size} color={color} />}
        onPress={() => { setOpen(false); onOpenTemplates(); }} />
      {/* The receipts read by the scan and its settings (26 November, on request; the settings were in Impostazioni). */}
      <Menu.Item title={t("Lista scontrini")} style={styles.item}
        leadingIcon={({ size, color }) => <SvgIcon shape={iconShapes.receipt} size={size} color={color} />}
        onPress={() => { setOpen(false); onOpenReceipts(); }} />
      <Menu.Item title={t("Archiviazione e backup")} style={styles.item}
        leadingIcon={({ size, color }) => <SvgIcon shape={iconShapes.database} size={size} color={color} />}
        onPress={() => { setOpen(false); onOpenBackup(); }} />
      {/* The merchants learned for the «Esercente» suggestions (22 November, on request). */}
      <Menu.Item title={t("Esercenti")} style={styles.item}
        leadingIcon={({ size, color }) => <SvgIcon shape={iconShapes.store} size={size} color={color} />}
        onPress={() => { setOpen(false); onOpenMerchants(); }} />
      {/* Version, guide, creator and GitHub links: the last page of the menu (26 November, on request). */}
      <Menu.Item title={t("Info")} style={styles.item}
        leadingIcon={({ size, color }) => <SvgIcon shape={iconShapes.info} size={size} color={color} />}
        onPress={() => { setOpen(false); onOpenInfo(); }} />
      </AnchoredMenu>
    </>
  );
}

const styles = StyleSheet.create({
  menu: { minWidth: 264, borderRadius: radius.group, paddingVertical: 0, overflow: 'hidden' },
  // Size items against the account menu rather than Paper's independent width cap.
  // Edge-to-edge rows: the menu clips hover/ripple to its outer corners, including the final row.
  item: { maxWidth: '100%', borderRadius: 0, overflow: 'hidden' },
  trigger: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  // Always 2 of border and 2 of gap around the 36 dp picture, transparent without the ring: turning it on never moves the picture.
  ring: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, padding: 2 },
  avatar: { width: 36, height: 36, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  info: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: 2, maxWidth: 280 },
  email: { flexShrink: 1 },
});
