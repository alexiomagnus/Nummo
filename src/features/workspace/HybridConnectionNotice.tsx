import { useI18n } from '../../i18n/I18nProvider';
import { useEffect, useState } from 'react';
import { Text, useTheme } from 'react-native-paper';
import { Card } from '../../components/Card';
import type { Endpoint } from '../../services/backendConfig';

// Presentation only: a long wait must never reject, cancel or resend an SDK write.
export function HybridConnectionNotice({ waiting, endpoint }: { waiting: boolean; endpoint: Endpoint }) {
  const { t } = useI18n();
  const theme = useTheme();
  const [delayed, setDelayed] = useState(false);
  useEffect(() => {
    setDelayed(false);
    if (!waiting) return;
    const timer = setTimeout(() => setDelayed(true), 10000);
    return () => clearTimeout(timer);
  }, [waiting]);
  if (!waiting || !delayed) return null;
  return <Card>
    <Text accessibilityRole="alert" style={{ color: theme.colors.onSurface }}>
      {t("La conferma del database locale tarda ad arrivare. Controlla che l’emulatore Firestore sia attivo su ")}{endpoint.host}:{endpoint.port}{t(". Le spese in attesa restano in coda: non inserirle di nuovo.")}</Text>
  </Card>;
}
