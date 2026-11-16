import { useEffect } from 'react';
import { View } from 'react-native';
import { ActivityIndicator, HelperText, Text, TextInput, useTheme } from 'react-native-paper';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ChoiceChips } from '../../components/ChoiceChips';
import { aiProviderLabels, aiProviders, aiSetupProblem, recommendedModel, type AiProvider } from '../../domain/receiptAi';
import { useI18n } from '../../i18n/I18nProvider';
import { inputOutline, spacing } from '../../theme/tokens';
import { useReceiptAi } from './aiSettings';
import { ModelField } from './ModelField';
import { useAiModels } from './useAiModels';

const modelExamples: Readonly<Record<AiProvider, string>> = { openai: 'gpt-5-mini', gemini: 'gemini-2.5-flash', claude: 'claude-haiku-4-5', compatible: 'llava' };

// Settings section of the optional AI scan. Off by default: the standard scan needs nothing from here. The key field
// writes to memory only (see aiSettings.ts); provider, model and address are remembered in this browser.
export function ReceiptAiCard() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const ai = useReceiptAi();
  const { provider, model, endpoint } = ai.settings;
  const problem = aiSetupProblem(ai.settings);
  const list = useAiModels(ai.settings, ai.apiKey);
  // With no model chosen yet, a fresh list proposes a small one that reads pictures; a name already written is kept.
  const { change } = ai;
  useEffect(() => {
    if (provider === 'none' || model !== '' || list.status !== 'ready') return;
    const recommended = recommendedModel(provider, list.models);
    if (recommended) change({ model: recommended });
  // Only when a list arrives: emptying the field afterwards must not fill it again.
  }, [list.models]);
  const options = [{ value: 'none' as const, label: t("Non attiva") },
    ...aiProviders.map((value) => ({ value, label: value === 'compatible' ? t(aiProviderLabels[value]) : aiProviderLabels[value] }))];
  return (
    <Card title={t("Analisi scontrini con AI")} style={{ width: '100%' }}>
      <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
        {t("Facoltativa. La scansione standard legge lo scontrino su questo dispositivo, gratis. Con l’AI la foto viene inviata al servizio che scegli, usando la tua chiave API: eventuali costi sono quelli del tuo account presso quel servizio.")}</Text>
      <ChoiceChips label={t("Servizio AI")} options={options} value={provider} onChange={(value) => { if (value && value !== provider) ai.change(value === 'none' || provider === 'none' ? { provider: value } : { provider: value, model: '' }); }} />
      {provider !== 'none' && <View style={{ gap: spacing.md }}>
        {provider === 'compatible' && <TextInput outlineStyle={inputOutline} mode="outlined" label={t("Indirizzo dell’API")} value={endpoint} placeholder="https://…/v1"
          onChangeText={(value) => ai.change({ endpoint: value })} autoCapitalize="none" autoCorrect={false} spellCheck={false} inputMode="url" />}
        <TextInput outlineStyle={inputOutline} mode="outlined" label={t("Chiave API")} value={ai.apiKey} onChangeText={ai.setApiKey}
          secureTextEntry autoComplete="off" autoCapitalize="none" autoCorrect={false} spellCheck={false} />
        <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
          {t("La chiave non viene salvata: resta in memoria finché Nummo è aperto e va reinserita dopo averlo chiuso o ricaricato. Puoi scriverla anche al momento della scansione.")}</Text>
        <ModelField value={model} models={list.models} placeholder={modelExamples[provider]} onChange={(value) => ai.change({ model: value })} />
        {list.status === 'loading' && <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }} accessibilityRole="progressbar" aria-live="polite">
          <ActivityIndicator size={16} />
          <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>{t("Carico i modelli disponibili…")}</Text>
        </View>}
        {list.status === 'ready' && <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }} aria-live="polite">
          {t("{p0} modelli disponibili: scegline uno dall’elenco o scrivine il nome.", { p0: list.models.length })}</Text>}
        {list.status === 'error' && <View style={{ gap: spacing.sm, alignItems: 'flex-start' }}>
          <HelperText type="error" accessibilityRole="alert" style={{ paddingHorizontal: 0 }}>
            {t(list.error)} {t("Puoi comunque scrivere a mano il nome del modello.")}</HelperText>
          <Button mode="outlined" onPress={list.retry}>{t("Riprova")}</Button>
        </View>}
        {list.status === 'idle' && <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
          {provider === 'compatible'
            ? t("Scrivi l’indirizzo dell’API per vedere i modelli disponibili, oppure scrivi il nome del modello, per esempio {p0}.", { p0: modelExamples[provider] })
            : t("Inserisci la chiave API per scegliere tra i modelli disponibili, oppure scrivi il nome del modello, per esempio {p0}.", { p0: modelExamples[provider] })}</Text>}
        <ChoiceChips label={t("Scansione predefinita")} value={ai.settings.scan} onChange={(value) => { if (value) ai.change({ scan: value }); }}
          options={[{ value: 'ocr' as const, label: t("Standard") }, { value: 'ai' as const, label: t("Avanzata con AI") }]} />
        <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
          {ai.settings.scan === 'ai' ? t("Scansiona scontrino parte dalla scansione con AI; quella standard resta a un tocco.")
            : t("Scansiona scontrino parte dalla lettura su questo dispositivo; quella con AI resta a un tocco.")}</Text>
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
