import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Category } from '../src/domain/category.ts';
import { newDraft, validateDraft } from '../src/domain/expense.ts';
import {
  aiResponseError, amountText, emptyProposal, parseAiReceipt, receiptNotes, scanConflicts, scanPatch,
} from '../src/domain/receipt.ts';
import {
  aiDestination, aiErrors, aiModelsEmpty, aiProviders, aiSetupProblem, buildAiRequest, buildModelsRequest, curateGeminiModels, parseAiKeys, readAiModels, recommendedModel, withAiKey, defaultAiSettings, parseAiSettings, readAiAnswer, receiptPrompt, type AiSettings,
} from '../src/domain/receiptAi.ts';
import { analyzeReceipt, listAiModels } from '../src/services/receiptAi.ts';
import { english } from '../src/i18n/en.ts';

// Synthetic data only: no real shop receipt, key or person.
const categories: Category[] = [
  { id: 'c-food', label: 'Alimentari', icon: 'cart' },
  { id: 'c-fun', label: 'Intrattenimento', icon: 'popcorn' },
  { id: 'c-shop', label: 'Shopping', icon: 'shirt' },
  { id: 'c-tech', label: 'Tecnologia', icon: 'laptop' },
  { id: 'c-move', label: 'Trasporti', icon: 'train' },
];
const today = '2026-11-16';

const answer = (value: unknown) => JSON.stringify(value);

test('AI: risposta valida, anche dentro un blocco Markdown, con campi incerti', () => {
  const scan = parseAiReceipt('```json\n' + answer({
    merchant: '  Supermercato   Prova ', description: ' Spesa ', date: '2026-11-12', total: '24.75', currency: 'EUR', items: ['Latte', { name: 'Pasta', price: '0.89' }, 7, ''],
    discount_total: '1,00', category: 'alimentari', uncertain: ['date', 'boh'],
  }) + '\n```', categories, today);
  assert.equal(scan.merchant, 'Supermercato Prova');
  assert.equal(scan.description, 'Spesa');
  assert.equal(scan.amountMinor, 2475);
  assert.equal(scan.date, '2026-11-12');
  assert.equal(scan.categoryId, 'c-food');
  assert.deepEqual(scan.items, ['Latte', 'Pasta']);
  assert.equal(scan.discountMinor, 100);
  assert.deepEqual(scan.status, { description: 'uncertain', merchant: 'found', amount: 'found', date: 'uncertain', categoryId: 'uncertain' });
  assert.equal(parseAiReceipt(answer({ total: 24.75 }), categories, today).amountMinor, 2475);
});

test('AI: risposte non valide rifiutate; campi sbagliati o impossibili restano mancanti', () => {
  for (const raw of ['', 'non lo so', '[1,2]', '{"total": ', '"24.75"', '{"foo": 1}']) {
    assert.throws(() => parseAiReceipt(raw, categories, today), { message: aiResponseError });
  }
  const odd = parseAiReceipt(answer({ merchant: 42, date: '12/11/2026', total: 'ventiquattro', currency: null, items: 'latte', category: 'Viaggi spaziali', uncertain: 'total' }), categories, today);
  assert.deepEqual([odd.description, odd.merchant], ['', '']);
  assert.equal(odd.amountMinor, null);
  assert.equal(odd.date, '');
  // A category that does not exist is never proposed as if it did.
  assert.equal(odd.categoryId, '');
  assert.ok(odd.notes.includes(receiptNotes.unknownCategory));
  assert.ok(odd.notes.includes(receiptNotes.dateRange));
  assert.deepEqual(odd.items, []);
  assert.equal(emptyProposal(odd), true);
  // A description is the model's guess, not a reading: alone it leaves nothing to review.
  assert.equal(emptyProposal(parseAiReceipt(answer({ description: 'Spesa' }), categories, today)), true);
  assert.equal(emptyProposal(parseAiReceipt(answer({ merchant: 'Negozio' }), categories, today)), false);
  const future = parseAiReceipt(answer({ date: '2027-01-01', total: '-5.00' }), categories, today);
  assert.deepEqual([future.date, future.amountMinor], ['', null]);
  const huge = parseAiReceipt(answer({ total: '999999.99' }), categories, today);
  assert.equal(huge.amountMinor, null);
  assert.ok(huge.notes.includes(receiptNotes.amountRange));
  const dollars = parseAiReceipt(answer({ total: '10.00', currency: 'usd' }), categories, today);
  assert.deepEqual([dollars.amountMinor, dollars.status.amount], [1000, 'uncertain']);
  assert.ok(dollars.notes.includes(receiptNotes.notEuro));
  assert.equal(parseAiReceipt(answer({ merchant: 'SPAZIO CONAD' }), categories, today).merchant, 'Spazio Conad');
  const long = parseAiReceipt(answer({ merchant: 'x'.repeat(300), description: 'y'.repeat(300) }), categories, today);
  assert.deepEqual([long.merchant.length, long.description.length], [60, 100]);
});

test('scansione: i dati accettati compilano solo i campi vuoti, salvo sostituzione esplicita', () => {
  const values = { amount: amountText(2475), date: '2026-11-12', description: 'Spesa', merchant: 'Supermercato Prova', categoryId: 'c-food' };
  assert.equal(values.amount, '24,75');
  assert.equal(amountText(5, '.'), '0.05');
  assert.equal(amountText(null), '');
  const empty = newDraft();
  assert.deepEqual(scanConflicts(empty, values), []);
  assert.deepEqual(scanPatch(empty, values, false), values);
  const typed = { ...newDraft(), amount: '20', description: 'Spesa grande', date: '2026-11-12' };
  assert.deepEqual(scanConflicts(typed, values), ['amount', 'description']);
  assert.deepEqual(scanPatch(typed, values, false), { merchant: 'Supermercato Prova', categoryId: 'c-food' });
  assert.deepEqual(scanPatch(typed, values, true), { amount: '24,75', description: 'Spesa', merchant: 'Supermercato Prova', categoryId: 'c-food' });
  // A merchant already typed is kept like any other field; a draft without the field counts as empty.
  assert.deepEqual(scanConflicts({ ...newDraft(), merchant: 'Conad' }, values), ['merchant']);
  const { merchant: _none, ...older } = newDraft();
  assert.equal(scanPatch(older, values, false).merchant, 'Supermercato Prova');
  // A value the scan did not find never clears what the user typed.
  assert.deepEqual(scanPatch(typed, { amount: '', date: '', description: '', merchant: '', categoryId: '' }, true), {});
});

test('scansione: nessuna registrazione automatica, il modulo compilato passa dalla validazione di sempre', () => {
  const scan = parseAiReceipt(answer({ merchant: 'SUPERMERCATO PROVA SRL', description: 'Spesa', date: '2026-11-12', total: '24.75', category: 'Alimentari' }), categories, today);
  const values = { amount: amountText(scan.amountMinor), date: scan.date, description: scan.description, merchant: scan.merchant, categoryId: scan.categoryId };
  const patch = scanPatch(newDraft(), values, false);
  // Only the base fields: recurrence, trial, promo and fund are never set by a scan.
  assert.deepEqual(Object.keys(patch).sort(), ['amount', 'categoryId', 'date', 'description', 'merchant']);
  const draft = { ...newDraft(), ...patch };
  assert.equal(draft.repeat, false);
  assert.equal(draft.fundId, '');
  const result = validateDraft(draft, categories, new Date('2026-11-16T12:00:00Z'));
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual([result.data.amount_minor, result.data.expense_date, result.data.category_id, result.data.recurrence], [2475, '2026-11-12', 'c-food', null]);
    // The merchant read is new: it is created only together with the expense, by the form's own save.
    assert.deepEqual([result.data.merchant_id, result.merchant?.name], [result.merchant?.id, 'Supermercato Prova Srl']);
    assert.deepEqual([result.data.list_id, result.data.list_items, result.data.schema_version], [null, [], 1]);
  }
  // A wrong value edited in the review is still stopped by the form.
  assert.equal(validateDraft({ ...draft, amount: '24,7x' }, categories).ok, false);
});

const openai: AiSettings = { enabled: true, provider: 'openai', model: 'modello-prova', consent: '' };
const image = { mime: 'image/jpeg', base64: 'QUJD' };

test('AI: impostazioni dal browser validate, la chiave non ne fa mai parte', () => {
  assert.deepEqual(parseAiSettings(null), defaultAiSettings);
  assert.deepEqual(parseAiSettings('{oops'), defaultAiSettings);
  assert.deepEqual(parseAiSettings(JSON.stringify({ provider: 'altro', model: 5, apiKey: 'sk-finta', key: 'sk-finta' })), defaultAiSettings);
  const saved = parseAiSettings(JSON.stringify({ provider: 'gemini', model: ' m ', endpoint: '', consent: 'generativelanguage.googleapis.com', apiKey: 'finta' }));
  // Saved before the switch existed (21 November): off even with a service chosen; `endpoint` and `scan` ignored.
  assert.deepEqual(saved, { enabled: false, provider: 'gemini', model: 'm', consent: 'generativelanguage.googleapis.com' });
  assert.equal('apiKey' in saved, false);
  // Off by default, and an explicit choice always wins.
  assert.equal(defaultAiSettings.enabled, false);
  assert.equal(parseAiSettings(JSON.stringify({ enabled: false, provider: 'claude', model: 'm' })).enabled, false);
  assert.deepEqual(parseAiSettings(JSON.stringify({ enabled: true })), { ...defaultAiSettings, enabled: true });
  // The removed OpenAI-compatible API reads as no service chosen (and off, for old settings).
  assert.deepEqual(parseAiSettings(JSON.stringify({ provider: 'compatible', model: 'llava', endpoint: 'http://localhost/v1', scan: 'ai' })), defaultAiSettings);
  assert.deepEqual(aiProviders, ['claude', 'openai', 'gemini']);
  assert.equal(aiSetupProblem(defaultAiSettings), 'Scegli il servizio AI nelle Impostazioni.');
  assert.equal(aiSetupProblem({ ...openai, model: '' }), 'Indica il modello da usare.');
  assert.equal(aiSetupProblem(openai), null);
});

test('AI: destinazione del consenso per servizio', () => {
  assert.equal(aiDestination(openai), 'api.openai.com');
  assert.equal(aiDestination({ ...openai, provider: 'gemini' }), 'generativelanguage.googleapis.com');
  assert.equal(aiDestination(defaultAiSettings), '');
});

test('AI: richiesta per provider, chiave solo nelle intestazioni, categorie esistenti nel prompt', () => {
  const prompt = receiptPrompt(categories, today);
  assert.match(prompt, /"Alimentari", "Intrattenimento"/);
  assert.match(prompt, /2026-11-16/);
  assert.doesNotMatch(prompt, /OCR/);
  assert.match(receiptPrompt(categories, today, 'English'), /"Groceries"/);
  assert.match(receiptPrompt([], today), /category: null/);
  const request = buildAiRequest(openai, ' chiave-finta ', image, prompt);
  assert.equal(request.url, 'https://api.openai.com/v1/chat/completions');
  assert.equal(request.init.headers.Authorization, 'Bearer chiave-finta');
  assert.equal(request.init.body.includes('chiave-finta'), false);
  const body = JSON.parse(request.init.body);
  assert.equal(body.model, 'modello-prova');
  assert.equal(body.messages[0].content[1].image_url.url, 'data:image/jpeg;base64,QUJD');
  assert.deepEqual(body.response_format, { type: 'json_object' });
  const gemini = buildAiRequest({ ...openai, provider: 'gemini', model: 'modello/prova' }, 'chiave-finta', image, prompt);
  assert.equal(gemini.url, 'https://generativelanguage.googleapis.com/v1beta/models/modello%2Fprova:generateContent');
  assert.equal(gemini.url.includes('chiave-finta'), false);
  assert.equal(gemini.init.headers['x-goog-api-key'], 'chiave-finta');
  assert.equal(JSON.parse(gemini.init.body).contents[0].parts[1].inline_data.data, 'QUJD');
  const claude = buildAiRequest({ ...openai, provider: 'claude', model: 'claude-opus-5-5' }, 'chiave-finta', image, prompt);
  assert.equal(claude.url, 'https://api.anthropic.com/v1/messages');
  assert.deepEqual([claude.init.headers['x-api-key'], claude.init.headers['anthropic-version'], claude.init.headers['anthropic-dangerous-direct-browser-access']], ['chiave-finta', '2023-06-01', 'true']);
  assert.equal(claude.init.body.includes('chiave-finta'), false);
  const claudeBody = JSON.parse(claude.init.body);
  assert.deepEqual(claudeBody.messages[0].content[0], { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: 'QUJD' } });
  assert.deepEqual([claudeBody.model, claudeBody.max_tokens, 'thinking' in claudeBody, 'temperature' in claudeBody], ['claude-opus-5-5', 16000, false, false]);
  assert.equal(aiDestination({ ...openai, provider: 'claude' }), 'api.anthropic.com');
  assert.throws(() => buildAiRequest(openai, '  ', image, prompt), { message: 'Inserisci la chiave API.' });
  assert.throws(() => buildAiRequest(defaultAiSettings, 'k', image, prompt), { message: 'Scegli il servizio AI nelle Impostazioni.' });
});

test('AI: risposte ed errori del provider (chiave, limite, modello, server, risposta vuota)', () => {
  assert.equal(readAiAnswer('openai', 200, { choices: [{ message: { content: '{"total":"1.00"}' } }] }), '{"total":"1.00"}');
  assert.equal(readAiAnswer('openai', 200, { choices: [{ message: { content: [{ type: 'text', text: '{"a":' }, { type: 'text', text: '1}' }] } }] }), '{"a":1}');
  assert.equal(readAiAnswer('gemini', 200, { candidates: [{ content: { parts: [{ text: '{"total":' }, { text: '"1.00"}' }] } }] }), '{"total":"1.00"}');
  assert.equal(readAiAnswer('claude', 200, { stop_reason: 'end_turn', content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: '{"total":"1.00"}' }] }), '{"total":"1.00"}');
  assert.throws(() => readAiAnswer('claude', 200, { stop_reason: 'refusal', content: [{ type: 'text', text: 'no' }] }), { message: aiErrors.empty });
  assert.throws(() => readAiAnswer('claude', 401, { type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } }), { message: aiErrors.key });
  assert.throws(() => readAiAnswer('claude', 529, { type: 'error', error: { type: 'overloaded_error' } }), { message: aiErrors.server });
  assert.throws(() => readAiAnswer('openai', 401, { error: { message: 'Incorrect API key provided: sk-finta' } }), { message: aiErrors.key });
  assert.throws(() => readAiAnswer('gemini', 400, { error: { message: 'API key not valid.' } }), { message: aiErrors.key });
  assert.throws(() => readAiAnswer('gemini', 403, null), { message: aiErrors.key });
  assert.throws(() => readAiAnswer('openai', 429, {}), { message: aiErrors.limit });
  assert.throws(() => readAiAnswer('openai', 404, {}), { message: aiErrors.model });
  assert.throws(() => readAiAnswer('openai', 400, { error: { message: 'image input not supported' } }), { message: aiErrors.request });
  assert.throws(() => readAiAnswer('openai', 503, 'x'), { message: aiErrors.server });
  for (const body of [null, {}, { choices: [] }, { choices: [{ message: { content: '  ' } }] }, { choices: 'x' }]) {
    assert.throws(() => readAiAnswer('openai', 200, body), { message: aiErrors.empty });
  }
  assert.throws(() => readAiAnswer('gemini', 200, { candidates: [{ finishReason: 'SAFETY' }] }), { message: aiErrors.empty });
});

test('AI: invio con rete assente, timeout, annullamento e risposta malformata', async () => {
  const signal = () => new AbortController().signal;
  const ok = await analyzeReceipt(openai, 'k', image, 'p', signal(), async (url, init) => {
    assert.equal(url, 'https://api.openai.com/v1/chat/completions');
    assert.equal(init.credentials, 'omit');
    return { status: 200, json: async () => ({ choices: [{ message: { content: '{"total":"3.20"}' } }] }) };
  });
  assert.equal(parseAiReceipt(ok, categories, today).amountMinor, 320);
  await assert.rejects(analyzeReceipt(openai, 'k', image, 'p', signal(), async () => { throw new TypeError('Failed to fetch'); }), { message: aiErrors.network });
  await assert.rejects(analyzeReceipt(openai, 'k', image, 'p', signal(), async () => ({ status: 200, json: async () => { throw new SyntaxError('html'); } })), { message: aiErrors.empty });
  await assert.rejects(analyzeReceipt(openai, 'k', image, 'p', signal(), async () => ({ status: 429, json: async () => ({}) })), { message: aiErrors.limit });
  const hanging = (_: string, init: RequestInit) => new Promise<never>((_resolve, reject) => init.signal!.addEventListener('abort', () => reject(new Error('aborted'))));
  await assert.rejects(analyzeReceipt(openai, 'k', image, 'p', signal(), hanging, 5), { message: aiErrors.timeout });
  const controller = new AbortController();
  const pending = analyzeReceipt(openai, 'k', image, 'p', controller.signal, hanging);
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  // An invalid model answer is refused by the validation, not passed on.
  const junk = await analyzeReceipt(openai, 'k', image, 'p', signal(), async () => ({ status: 200, json: async () => ({ choices: [{ message: { content: 'Ecco lo scontrino!' } }] }) }));
  assert.throws(() => parseAiReceipt(junk, categories, today), { message: aiResponseError });
});

test('scansione: ogni messaggio di dominio ha la traduzione inglese', () => {
  for (const message of [...Object.values(receiptNotes), ...Object.values(aiErrors), aiResponseError, 'Indica il modello da usare.', 'Inserisci la chiave API.', 'Scegli il servizio AI nelle Impostazioni.']) {
    assert.ok(Object.hasOwn(english, message), message);
  }
});

test('AI: richiesta dell’elenco dei modelli per servizio, chiave mai nell’indirizzo', () => {
  const base: AiSettings = { ...defaultAiSettings, provider: 'openai' };
  assert.equal(buildModelsRequest(defaultAiSettings, 'k'), null);
  assert.equal(buildModelsRequest(base, '  '), null);
  const openAi = buildModelsRequest(base, ' chiave-finta ')!;
  assert.equal(openAi.url, 'https://api.openai.com/v1/models');
  assert.deepEqual(openAi.init, { method: 'GET', headers: { Authorization: 'Bearer chiave-finta' } });
  const gemini = buildModelsRequest({ ...base, provider: 'gemini' }, 'chiave-finta')!;
  assert.equal(gemini.url, 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000');
  assert.equal(gemini.init.headers['x-goog-api-key'], 'chiave-finta');
  const claude = buildModelsRequest({ ...base, provider: 'claude' }, 'chiave-finta')!;
  assert.equal(claude.url, 'https://api.anthropic.com/v1/models?limit=1000');
  assert.deepEqual(claude.init.headers, { 'x-api-key': 'chiave-finta', 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' });
  for (const request of [openAi, gemini, claude]) assert.ok(!request.url.includes('chiave-finta'));
  // Without a key nothing is asked, whatever the service (also while the scan is off: the card passes no key).
  for (const provider of aiProviders) assert.equal(buildModelsRequest({ ...base, provider }, ''), null);
});

test('AI: lettura dell’elenco dei modelli, filtri ed errori', () => {
  const openAi = { data: [{ id: 'gpt-5-mini' }, { id: 'text-embedding-3-small' }, { id: 'whisper-1' }, { id: 'tts-1' }, { id: 'dall-e-3' }, { id: 'omni-moderation-latest' },
    { id: 'gpt-4o-mini' }, { id: 'gpt-4o-mini-tts' }, { id: 'gpt-4o-audio-preview' }, { id: 'gpt-4o-realtime-preview' }, { id: 'gpt-image-1' }, { id: 'o3' }, { id: 'o4-mini' },
    { id: 'gpt-3.5-turbo' }, { id: 'gpt-5-mini' }, { id: 7 }, null] };
  assert.deepEqual(readAiModels('openai', 200, openAi), ['gpt-4o-mini', 'gpt-5-mini', 'o3', 'o4-mini']);
  const gemini = { models: [
    { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent', 'countTokens'] },
    { name: 'models/gemini-embedding-001', supportedGenerationMethods: ['embedContent'] },
    { name: 'models/gemini-2.5-pro', supportedGenerationMethods: ['generateContent'] }, { name: 'models/senza-metodi' }] };
  assert.deepEqual(readAiModels('gemini', 200, gemini), ['gemini-2.5-flash', 'gemini-2.5-pro']);
  // Elenco del piano gratuito (screenshot del 17 novembre): solo flash-lite, flash e pro stabili, le versioni più recenti più i consigliati.
  const free = ['gemini-4-carbon', 'gemini-4-hydrogen', 'gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-nano-banana-2.1', 'gemini-omni-1.1-flash',
    'gemini-omni-1.2-flash', 'gemini-omni-flash-preview', 'gemini-pro-latest', 'gemini-robotics-er-2-preview', 'gemma-4-26b-a4b-it', 'gemma-4-31b-it',
    'lyria-3-clip-preview', 'lyria-3-pro-preview', 'lyria-3.5', 'nano-banana-pro-preview', 'gemini-3-pro-image-preview', 'gemini-3.1-flash-image',
    'gemini-3.1-flash-image-preview', 'gemini-3.1-flash-lite', 'gemini-3.1-flash-lite-image', 'gemini-3.1-flash-lite-preview', 'gemini-3.1-flash-tts-preview',
    'gemini-3.1-pro-preview', 'gemini-3.1-pro-preview-customtools', 'gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.5-transcribe', 'gemini-3.6-flash',
    'gemini-3.7-flash', 'gemini-3.8-flash', 'gemini-3.8-flash-lite-tts', 'gemini-3.8-flash-tts', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro',
    'gemini-2.0-flash', 'gemini-2.0-flash-001'];
  const freeBody = { models: free.map((name) => ({ name: `models/${name}`, supportedGenerationMethods: ['generateContent'] })) };
  assert.deepEqual(readAiModels('gemini', 200, freeBody),
    ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'gemini-3.7-flash', 'gemini-3.8-flash']);
  assert.equal(recommendedModel('gemini', readAiModels('gemini', 200, freeBody)), 'gemini-3.1-flash-lite');
  // Un'edizione «-001» vale la sua versione; nomi mai visti (nessuna famiglia nota) restano tutti visibili invece di un elenco vuoto.
  assert.deepEqual(curateGeminiModels(['gemini-2.0-flash-001']), ['gemini-2.0-flash-001']);
  assert.deepEqual(readAiModels('gemini', 200, { models: [{ name: 'models/gemini-ultra-x', supportedGenerationMethods: ['generateContent'] }] }), ['gemini-ultra-x']);
  // OpenAI: snapshot datati e anteprime fuori, se resta il nome del modello.
  assert.deepEqual(readAiModels('openai', 200, { data: [{ id: 'gpt-4o-mini' }, { id: 'gpt-4o-mini-2024-07-18' }, { id: 'gpt-5-mini' }, { id: 'gpt-4.5-preview' }, { id: 'chatgpt-4o-latest' }] }),
    ['gpt-4o-mini', 'gpt-5-mini']);
  assert.deepEqual(readAiModels('claude', 200, { data: [{ type: 'model', id: 'claude-sonnet-4-6' }, { type: 'model', id: 'claude-haiku-4-5-20251001' }] }),
    ['claude-haiku-4-5-20251001', 'claude-sonnet-4-6']);
  for (const body of [null, {}, { data: [] }, { data: 'x' }, { data: [{ id: 'whisper-1' }] }]) assert.throws(() => readAiModels('openai', 200, body), { message: aiModelsEmpty });
  assert.throws(() => readAiModels('openai', 401, { error: { message: 'Incorrect API key provided: sk-finta' } }), { message: aiErrors.key });
  assert.throws(() => readAiModels('gemini', 400, { error: { message: 'API key not valid.' } }), { message: aiErrors.key });
  assert.throws(() => readAiModels('claude', 429, {}), { message: aiErrors.limit });
  assert.throws(() => readAiModels('claude', 404, null), { message: aiErrors.models });
  assert.throws(() => readAiModels('openai', 503, null), { message: aiErrors.server });
  for (const message of [aiModelsEmpty, aiErrors.models]) assert.ok(english[message as keyof typeof english]);
});

test('AI: modello consigliato', () => {
  assert.equal(recommendedModel('openai', ['gpt-4o-mini', 'gpt-5', 'gpt-5-mini']), 'gpt-5-mini');
  assert.equal(recommendedModel('openai', ['gpt-4o', 'gpt-4o-mini']), 'gpt-4o-mini');
  assert.equal(recommendedModel('gemini', ['gemini-2.5-flash-lite', 'gemini-2.5-pro']), null);
  assert.equal(recommendedModel('gemini', ['gemini-2.5-flash-lite', 'gemini-2.5-flash']), 'gemini-2.5-flash');
  assert.equal(recommendedModel('claude', ['claude-haiku-4-5-20251001', 'claude-sonnet-4-6']), 'claude-haiku-4-5-20251001');
  assert.equal(recommendedModel('claude', ['claude-opus-5-5', 'claude-sonnet-4-6']), 'claude-sonnet-4-6');
  // Scelta dell'utente del 17 novembre: con Gemini si propone prima gemini-3.1-flash-lite.
  assert.equal(recommendedModel('gemini', ['gemini-2.5-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-pro']), 'gemini-3.1-flash-lite');
});

test('AI: chiavi salvate per destinazione, dati non fidati scartati', () => {
  assert.deepEqual(parseAiKeys(null), {});
  assert.deepEqual(parseAiKeys('non json'), {});
  assert.deepEqual(parseAiKeys('["k"]'), {});
  assert.deepEqual(parseAiKeys(JSON.stringify({ 'api.openai.com': 'sk-1', '': 'x', 'api.anthropic.com': 5, 'generativelanguage.googleapis.com': 'con spazio', 'x.it': 'a'.repeat(600) })),
    { 'api.openai.com': 'sk-1' });
  const keys = withAiKey({ 'api.openai.com': 'sk-1' }, 'generativelanguage.googleapis.com', '  AIza-2  ');
  assert.deepEqual(keys, { 'api.openai.com': 'sk-1', 'generativelanguage.googleapis.com': 'AIza-2' });
  assert.deepEqual(withAiKey(keys, 'api.openai.com', ''), { 'generativelanguage.googleapis.com': 'AIza-2' });
  assert.deepEqual(withAiKey(keys, 'api.openai.com', 'due parole'), { 'generativelanguage.googleapis.com': 'AIza-2' });
  // Le impostazioni non contengono mai la chiave: resta in un elemento separato.
  assert.equal(JSON.stringify(parseAiSettings(JSON.stringify({ provider: 'gemini', apiKey: 'k' }))).includes('k"'), false);
});

test('AI: elenco dei modelli con rete assente (o CORS), timeout e annullamento', async () => {
  const signal = () => new AbortController().signal;
  const settings: AiSettings = { ...defaultAiSettings, provider: 'claude' };
  assert.deepEqual(await listAiModels(settings, '', signal(), async () => { throw new Error('nessuna richiesta senza chiave'); }), []);
  const models = await listAiModels(settings, 'k', signal(), async (url, init) => {
    assert.equal(url, 'https://api.anthropic.com/v1/models?limit=1000');
    assert.equal(init.method, 'GET');
    assert.equal(init.credentials, 'omit');
    return { status: 200, json: async () => ({ data: [{ id: 'claude-haiku-4-5' }] }) };
  });
  assert.deepEqual(models, ['claude-haiku-4-5']);
  await assert.rejects(listAiModels(settings, 'k', signal(), async () => { throw new TypeError('Failed to fetch'); }), { message: aiErrors.network });
  await assert.rejects(listAiModels(settings, 'k', signal(), async () => ({ status: 401, json: async () => ({}) })), { message: aiErrors.key });
  await assert.rejects(listAiModels(settings, 'k', signal(), async () => ({ status: 200, json: async () => { throw new SyntaxError('html'); } })), { message: aiModelsEmpty });
  const hanging = (_: string, init: RequestInit) => new Promise<never>((_resolve, reject) => init.signal!.addEventListener('abort', () => reject(new Error('aborted'))));
  await assert.rejects(listAiModels(settings, 'k', signal(), hanging, 5), { message: aiErrors.timeout });
  const controller = new AbortController();
  const pending = listAiModels(settings, 'k', controller.signal, hanging);
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
});
