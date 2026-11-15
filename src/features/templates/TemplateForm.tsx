import { useState } from 'react';
import type { Category } from '../../domain/category';
import { draftOfTemplate, newTemplateDraft, validateTemplateDraft, type TemplateData, type TemplateDraft, type TemplateErrors, type TemplateRecord } from '../../domain/template';
import { noFund } from '../../domain/funds';
import { useSizeClass } from '../../theme/useSizeClass';
import { ExpenseFields } from '../expenses/ExpenseFields';
import { FundField, type FundChoice } from '../funds/FundField';

type Options = {
  categories: readonly Category[];
  // Funds a template may use (active ones); none = the fund field is not shown.
  fundChoices: readonly FundChoice[];
  // Editing: the template to start from; absent = a new one, starting from today.
  initial?: TemplateRecord;
  // Called with the validated data; returns true when it was accepted (a new template then clears the form).
  onSubmit: (data: TemplateData) => boolean;
};

// State of a template form: the draft, its errors and the validated submit. The fields (below) and the buttons are drawn by
// the caller, so the page and the edit dialog (fields in its scroll area, buttons outside) can share it.
export function useTemplateForm({ categories, fundChoices, initial, onSubmit }: Options) {
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
  return { draft, errors, update, submit, formKey, categories, fundChoices };
}
export type TemplateFormState = ReturnType<typeof useTemplateForm>;

// The fields of a template: the very same ones as «Nuova spesa» (amount and date on the first row, description, category,
// fund), minus the repeat: a recurring expense already repeats by itself. Only the amount may stay empty.
export function TemplateFields({ form, disabled }: { form: TemplateFormState; disabled?: boolean }) {
  const { draft, errors, update, formKey, categories, fundChoices } = form;
  const desktop = useSizeClass() === 'expanded';
  return (
    <ExpenseFields dense={desktop} key={formKey} values={draft} errors={errors} categories={categories} disabled={disabled} amountOptional
      extra={fundChoices.length > 0 ? <FundField choices={fundChoices} value={draft.fundId} error={errors.fundId} disabled={disabled}
        onChange={(fundId) => update({ fundId })} /> : undefined}
      onChange={(field, value) => update({ [field]: value })} onBlur={() => {}} />
  );
}
