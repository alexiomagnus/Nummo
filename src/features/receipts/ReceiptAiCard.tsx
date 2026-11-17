import { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { ActivityIndicator, HelperText, Text, TextInput, useTheme } from 'react-native-paper';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ChoiceChips } from '../../components/ChoiceChips';
import { SelectField } from '../../components/SelectField';
import { aiProviderLabels, aiProviders, aiSetupProblem, recommendedModel } from '../../domain/receiptAi';
import { useI18n } from '../../i18n/I18nProvider';
import { inputOutline, spacing } from '../../theme/tokens';
import { useReceiptAi } from './aiSettings';
import { useAiModels } from './useAiModels';

// Settings section of the optional AI scan. Off by default: the standard scan needs nothing from here. Provider, model,
// address and key are remembered in this browser (see aiSettings.ts). The model is only chosen from the provider's list
// (user's choice of 17 November: nothing typed by hand); a model saved earlier stays among the options.
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
  const recommended = provider === 'none' ? null : recommendedModel(provider, list.models);
  const modelOptions = useMemo(() => {
    const names = model !== '' && !list.models.includes(model) ? [model, ...list.models] : list.models;
    return names.map((name) => ({ value: name, label: name === recommended ? t("{p0} (consigliato)", { p0: name }) : name }));
  }, [model, list.models, recommended, t]);
  const options = [{ value: 'none' as const, label: t("Non attiva") },
    ...aiProviders.map((value) => ({ value, label: value === 'compatible' ? t(aiProviderLabels[value]) : aiProviderLabels[value] }))];
  return (
    <Card title={t("Analisi scontrini con AI")} style={{ width: '100%' }}>
      <ChoiceChips label={t("Servizio AI")} options={options} value={provider} onChange={(value) => { if (value && value !== provider) ai.change(value === 'none' || provider === 'none' ? { provider: value } : { provider: value, model: '' }); }} />
      {provider !== 'none' && <View style={{ gap: spacing.md }}>
        {provider === 'compatible' && <TextInput outlineStyle={inputOutline} mode="outlined" label={t("Indirizzo dell’API")} value={endpoint} placeholder="https://…/v1"
          onChangeText={(value) => ai.change({ endpoint: value })} autoCapitalize="none" autoCorrect={false} spellCheck={false} inputMode="url" />}
        <TextInput outlineStyle={inputOutline} mode="outlined" label={t("Chiave API")} value={ai.apiKey} onChangeText={ai.setApiKey}
          secureTextEntry autoComplete="off" autoCapitalize="none" autoCorrect={false} spellCheck={false} />
        <SelectField label={t("Modello")} options={modelOptions} value={model} disabled={modelOptions.length === 0}
          onChange={(value) => ai.change({ model: value })} />
        {list.status === 'loading' && <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }} accessibilityRole="progressbar" aria-live="polite">
          <ActivityIndicator size={16} />
          <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>{t("Carico i modelli disponibili…")}</Text>
        </View>}
        {list.status === 'error' && <View style={{ gap: spacing.sm, alignItems: 'flex-start' }}>
          <HelperText type="error" accessibilityRole="alert" style={{ paddingHorizontal: 0 }}>
            {t(list.error)}</HelperText>
          <Button mode="outlined" onPress={list.retry}>{t("Riprova")}</Button>
        </View>}
        {/* «Indica il modello da usare.» is not shown (user's request, 17 November): the empty Modello field says it already. */}
        {problem && problem !== 'Indica il modello da usare.' && <HelperText type="info" style={{ paddingHorizontal: 0 }}>{t(problem)}</HelperText>}
        {/* A little more room after the fields (user's request, 17 November): the actions do not read as part of Modello. */}
        {(ai.apiKey !== '' || ai.consented) && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm }}>
          {ai.apiKey !== '' && <Button mode="outlined" onPress={() => ai.setApiKey('')}>{t("Dimentica la chiave")}</Button>}
          {ai.consented && <Button mode="outlined" onPress={() => ai.change({ consent: '' })}>{t("Revoca il consenso")}</Button>}
        </View>}
        <Text variant="titleSmall" style={{ fontWeight: '700', marginTop: spacing.sm }} accessibilityRole="header" aria-level={3}>{t("Scansione predefinita")}</Text>
        <ChoiceChips label={t("Scansione predefinita")} value={ai.settings.scan} onChange={(value) => { if (value) ai.change({ scan: value }); }}
          options={[{ value: 'ocr' as const, label: t("Standard") }, { value: 'ai' as const, label: t("Avanzata con AI") }]} />
      </View>}
    </Card>
  );
}
