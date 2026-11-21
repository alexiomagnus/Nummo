import { useState } from 'react';
import type { Category } from '../../domain/category';
import { noFund } from '../../domain/funds';
import type { RankedMerchant } from '../../domain/merchant';
import { draftOfTemplate, newTemplateDraft, validateTemplateDraft, type TemplateData, type TemplateDraft, type TemplateErrors, type TemplateRecord } from '../../domain/template';
import { useSizeClass } from '../../theme/useSizeClass';
import { ExpenseFields } from '../expenses/ExpenseFields';
import { FundField, type FundChoice } from '../funds/FundField';

type Options = {
  categories: readonly Category[];
  // Funds a template may use (active ones); none = the fund field is not shown.
  fundChoices: readonly FundChoice[];
  // Saved merchants ranked by use: the suggestions of «Esercente».
  merchants: readonly RankedMerchant[];
  // Editing: the template to start from; absent = a new one, starting from today.
  initial?: TemplateRecord;
  // Called with the validated data; returns true when it was accepted (a new template then clears the form).
  onSubmit: (data: TemplateData) => boolean;
};

// State of a template form: the draft, its errors and the validated submit. The fields (below) and the buttons are drawn by
// the caller, so the page and the edit dialog (fields in its scroll area, buttons outside) can share it.
export function useTemplateForm({ categories, fundChoices, merchants, initial, onSubmit }: Options) {
  const funds = fundChoices.map((choice) => choice.fund);
  // «Nessun fondo» is an explicit choice, like in the expense form; an edited template without a fund already made it.
  const start = (): TemplateDraft => {
    if (!initial) return newTemplateDraft();
    const draft = draftOfTemplate(initial);
    return { ...draft, fundId: initial.fund_id === null ? noFund : draft.fundId };
  };
  const [draft, setDraft] = useState<TemplateDraft>(start);
  const [errors, setErrors] = useState<TemplateErrors>({});
  // Remounts the date field after a saved template, so «Altra data» closes with the cleared draft.
  const [formKey, setFormKey] = useState(0);
  const update = (patch: Partial<TemplateDraft>) => {
    setDraft((previous) => ({ ...previous, ...patch }));
    setErrors((previous) => { const next = { ...previous }; for (const key of Object.keys(patch) as (keyof TemplateDraft)[]) delete next[key]; return next; });
  };
  const submit = () => {
    const result = validateTemplateDraft({ ...draft, fundId: draft.fundId === noFund ? '' : draft.fundId }, categories, funds, { fundChosen: draft.fundId !== '' });
    if (!result.ok) { setErrors(result.errors); return; }
    if (onSubmit(result.data) && !initial) { setDraft(newTemplateDraft()); setErrors({}); setFormKey((key) => key + 1); }
  };
  return { draft, errors, update, submit, formKey, categories, fundChoices, merchants };
}
export type TemplateFormState = ReturnType<typeof useTemplateForm>;

// The fields of a template: the very same ones as «Nuova spesa» (amount and date on the first row, description, merchant,
// category with the fund beside it or below it on phones), minus the repeat: a recurring expense already repeats by
// itself. Only the merchant may stay empty (the amount is required since 21 November, on request).
export function TemplateFields({ form, disabled, dense }: { form: TemplateFormState; disabled?: boolean; dense?: boolean }) {
  const { draft, errors, update, formKey, categories, fundChoices, merchants } = form;
  const size = useSizeClass();
  return (
    <ExpenseFields dense={dense ?? size === 'expanded'} key={formKey} values={draft} errors={errors} categories={categories} disabled={disabled}
      fund={fundChoices.length > 0 ? <FundField choices={fundChoices} value={draft.fundId} error={errors.fundId} disabled={disabled}
        onChange={(fundId) => update({ fundId })} /> : undefined} fundBelow={size === 'compact'}
      merchant={{ value: draft.merchant, merchants, error: errors.merchant, onChange: (merchant) => update({ merchant }) }}
      onChange={(field, value) => update({ [field]: value })} onBlur={() => {}} />
  );
}
