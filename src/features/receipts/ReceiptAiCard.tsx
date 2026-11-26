import { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { ActivityIndicator, HelperText, Text, TextInput, useTheme } from 'react-native-paper';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ChoiceChips } from '../../components/ChoiceChips';
import { SelectField } from '../../components/SelectField';
import { SwitchRow } from '../../components/SwitchRow';
import { aiProviderLabels, aiProviders, recommendedModel } from '../../domain/receiptAi';
import { useI18n } from '../../i18n/I18nProvider';
import { inputOutline, spacing } from '../../theme/tokens';
import { useSizeClass } from '../../theme/useSizeClass';
import { useSameWidth } from '../../components/SameWidth';
import { useReceiptAi } from './aiSettings';
import { useAiModels } from './useAiModels';

const phoneHalf = { flex: 1, minWidth: 0 };
// Label margins a little tighter than Paper's compact ones: «Dimentica la chiave» fits half of a 320 px screen.
const phoneLabel = { marginHorizontal: 6 };

// Section of the receipt scan in «Lista scontrini» (in Settings until 26 November, moved on request), AI only (local OCR and the OpenAI-compatible API removed on 21 November, on
// request). Off by default: until the switch is on, «Scansiona scontrino» is not in the new-expense form and the options
// below are greyed out and unreachable (`inert`), with no request to the provider. Switch, provider, model and key are
// remembered in this browser (see aiSettings.ts). The model is only chosen from the provider's list (user's choice of
// 17 November: nothing typed by hand); a model saved earlier stays among the options.
export function ReceiptAiCard() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const ai = useReceiptAi();
  const compact = useSizeClass() === 'compact';
  // From medium: as wide as each other (the `SameWidthGroup` of «Lista scontrini»), never the whole row.
  const sameWidth = useSameWidth();
  const { enabled, provider, model } = ai.settings;
  const list = useAiModels(ai.settings, enabled ? ai.apiKey : '');
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
  const options = aiProviders.map((value) => ({ value, label: aiProviderLabels[value] }));
  return (
    <Card title={t("Analisi scontrini con AI")} style={{ width: '100%' }}>
      <SwitchRow label={t("Scansione dello scontrino")} supporting={t("In Nuova spesa, il pulsante Scansiona scontrino.")}
        value={enabled} onChange={(value) => ai.change({ enabled: value })} />
      {/* Greyed out (M3 disabled opacity) and unreachable while the scan is off. */}
      <View style={{ gap: spacing.md, opacity: enabled ? 1 : 0.38 }} aria-disabled={!enabled} {...{ inert: enabled ? undefined : true }}>
        <ChoiceChips label={t("Servizio AI")} options={options} value={provider === 'none' ? '' : provider} disabled={!enabled}
          onChange={(value) => { if (value && value !== provider) ai.change({ provider: value, model: '' }); }} />
        {provider !== 'none' && <View style={{ gap: spacing.md }}>
          <TextInput outlineStyle={inputOutline} mode="outlined" label={t("Chiave API")} value={ai.apiKey} onChangeText={ai.setApiKey}
            secureTextEntry autoComplete="off" autoCapitalize="none" autoCorrect={false} spellCheck={false} />
          <SelectField panel label={t("Modello")} options={modelOptions} value={model} disabled={modelOptions.length === 0}
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
          {/* No hint under an empty Modello (user's request, 17 November): the empty field says it already.
              A little more room after the fields (user's request, 17 November): the actions do not read as part of Modello. */}
          {/* Phones: the two actions share the whole row in equal halves (one alone takes it all; user's request, 22 November). */}
          {(ai.apiKey !== '' || ai.consented) && <View style={{ flexDirection: 'row', flexWrap: compact ? 'nowrap' : 'wrap', gap: spacing.sm, marginTop: spacing.sm }}>
            {ai.apiKey !== '' && <Button mode="outlined" style={compact ? phoneHalf : sameWidth.style} onLayout={sameWidth.onLayout} labelStyle={compact && phoneLabel} compact={compact} onPress={() => ai.setApiKey('')}>{t("Dimentica la chiave")}</Button>}
            {ai.consented && <Button mode="outlined" style={compact ? phoneHalf : sameWidth.style} onLayout={sameWidth.onLayout} labelStyle={compact && phoneLabel} compact={compact} onPress={() => ai.change({ consent: '' })}>{t("Revoca il consenso")}</Button>}
          </View>}
        </View>}
      </View>
    </Card>
  );
}
