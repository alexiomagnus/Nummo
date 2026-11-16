import { View } from 'react-native';
import { HelperText, Text, TextInput, useTheme } from 'react-native-paper';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ChoiceChips } from '../../components/ChoiceChips';
import { aiProviderLabels, aiProviders, aiSetupProblem, type AiProvider } from '../../domain/receiptAi';
import { useI18n } from '../../i18n/I18nProvider';
import { inputOutline, spacing } from '../../theme/tokens';
import { useReceiptAi } from './aiSettings';

const modelExamples: Readonly<Record<AiProvider, string>> = { openai: 'gpt-5-mini', gemini: 'gemini-2.5-flash', claude: 'claude-opus-5-5', compatible: 'llava' };

// Settings section of the optional AI scan. Off by default: the standard scan needs nothing from here. The key field
// writes to memory only (see aiSettings.ts); provider, model and address are remembered in this browser.
export function ReceiptAiCard() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const ai = useReceiptAi();
  const { provider, model, endpoint } = ai.settings;
  const problem = aiSetupProblem(ai.settings);
  const options = [{ value: 'none' as const, label: t("Non attiva") },
    ...aiProviders.map((value) => ({ value, label: value === 'compatible' ? t(aiProviderLabels[value]) : aiProviderLabels[value] }))];
  return (
    <Card title={t("Analisi scontrini con AI")} style={{ width: '100%' }}>
      <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
        {t("Facoltativa. La scansione standard legge lo scontrino su questo dispositivo, gratis. Con l’AI la foto viene inviata al servizio che scegli, usando la tua chiave API: eventuali costi sono quelli del tuo account presso quel servizio.")}</Text>
      <ChoiceChips label={t("Servizio AI")} options={options} value={provider} onChange={(value) => { if (value) ai.change({ provider: value }); }} />
      {provider !== 'none' && <View style={{ gap: spacing.md }}>
        {provider === 'compatible' && <TextInput outlineStyle={inputOutline} mode="outlined" label={t("Indirizzo dell’API")} value={endpoint} placeholder="https://…/v1"
          onChangeText={(value) => ai.change({ endpoint: value })} autoCapitalize="none" autoCorrect={false} spellCheck={false} inputMode="url" />}
        <TextInput outlineStyle={inputOutline} mode="outlined" label={t("Modello")} value={model} placeholder={modelExamples[provider]}
          onChangeText={(value) => ai.change({ model: value })} autoCapitalize="none" autoCorrect={false} spellCheck={false} />
        <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>{t("Serve un modello che legga le immagini, per esempio {p0}.", { p0: modelExamples[provider] })}</Text>
        <TextInput outlineStyle={inputOutline} mode="outlined" label={t("Chiave API")} value={ai.apiKey} onChangeText={ai.setApiKey}
          secureTextEntry autoComplete="off" autoCapitalize="none" autoCorrect={false} spellCheck={false} />
        <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
          {t("La chiave non viene salvata: resta in memoria finché Nummo è aperto e va reinserita dopo averlo chiuso o ricaricato. Puoi scriverla anche al momento della scansione.")}</Text>
        {problem && <HelperText type="info" style={{ paddingHorizontal: 0 }}>{t(problem)}</HelperText>}
        {!problem && <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
          {ai.consented ? t("Hai acconsentito all’invio delle foto a {p0}.", { p0: ai.destination }) : t("Alla prima scansione avanzata Nummo chiede il tuo consenso all’invio della foto a {p0}.", { p0: ai.destination })}</Text>}
        {(ai.apiKey !== '' || ai.consented) && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {ai.apiKey !== '' && <Button mode="outlined" onPress={() => ai.setApiKey('')}>{t("Dimentica la chiave")}</Button>}
          {ai.consented && <Button mode="outlined" onPress={() => ai.change({ consent: '' })}>{t("Revoca il consenso")}</Button>}
        </View>}
      </View>}
    </Card>
  );
}
