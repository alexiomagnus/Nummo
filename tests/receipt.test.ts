import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Category } from '../src/domain/category.ts';
import { newDraft, validateDraft } from '../src/domain/expense.ts';
import {
  aiResponseError, amountsIn, amountText, datesIn, emptyProposal, parseAiReceipt, parseReceiptText, receiptDescriptions, receiptNotes, scanConflicts, scanPatch, suggestCategory, suggestDescription,
} from '../src/domain/receipt.ts';
import {
  aiDestination, aiErrors, aiModelsEmpty, aiSetupProblem, buildAiRequest, buildModelsRequest, compatibleBase, matchModels, readAiModels, recommendedModel, defaultAiSettings, parseAiSettings, readAiAnswer, receiptPrompt, type AiSettings,
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

const supermarket = [
  'SUPERMERCATO PROVA SRL', 'VIA ROMA 1 - 00100 ROMA', 'P.IVA 01234567890', 'DOCUMENTO COMMERCIALE', 'di vendita o prestazione',
  'DESCRIZIONE            IVA   Prezzo(€)', 'LATTE INTERO 1L        4%      1,29', 'PASTA 500G             4%      0,89', 'DETERSIVO             22%      5,50',
  'SCONTO FEDELTA                -1,00', 'SUBTOTALE                     7,68', 'TOTALE COMPLESSIVO           24,75', 'di cui IVA                    2,25',
  'Pagamento contante           30,00', 'Pagamento elettronico         0,00', 'Resto                         5,25', '12/11/2026 18:42', 'DOCUMENTO N. 0042-0017',
].join('\n');

test('scontrini: importi italiani letti come centesimi, senza scambiare date, quantità e percentuali', () => {
  assert.deepEqual(amountsIn('TOTALE 12,50 €'), [1250]);
  assert.deepEqual(amountsIn('1.234,56'), [123456]);
  assert.deepEqual(amountsIn('EUR 12.50'), [1250]);
  assert.deepEqual(amountsIn('TOTALE 24, 75'), [2475]);
  assert.deepEqual(amountsIn('2 x 1,50   3,00'), [150, 300]);
  assert.deepEqual(amountsIn('12/11/2026 18:42'), []);
  assert.deepEqual(amountsIn('12.11.2026'), []);
  assert.deepEqual(amountsIn('0,500 kg'), []);
  assert.deepEqual(amountsIn('N. 0042'), []);
});

test('scontrini: date italiane, anno a due cifre, mese scritto; mai future o inesistenti', () => {
  assert.deepEqual(datesIn('12/11/2026 18:42', today), ['2026-11-12']);
  assert.deepEqual(datesIn('Data 05-03-26', today), ['2026-03-05']);
  assert.deepEqual(datesIn('12.11.2026', today), ['2026-11-12']);
  assert.deepEqual(datesIn('2026-11-12', today), ['2026-11-12']);
  assert.deepEqual(datesIn('12 novembre 2026', today), ['2026-11-12']);
  assert.deepEqual(datesIn('3 Nov 2026', today), ['2026-11-03']);
  // Day first; the American order only when day-first is not a date.
  assert.deepEqual(datesIn('03/04/2026', today), ['2026-04-03']);
  assert.deepEqual(datesIn('11/13/2026', today), ['2026-11-13']);
  assert.deepEqual(datesIn('31/02/2026', today), []);
  assert.deepEqual(datesIn('17/11/2026', today), []);
  assert.deepEqual(datesIn('01/01/1999', today), []);
});

test('scontrini: il totale pagato non è subtotale, IVA, sconto, contanti o resto', () => {
  const scan = parseReceiptText(supermarket, categories, today);
  assert.equal(scan.amountMinor, 2475);
  assert.equal(scan.status.amount, 'found');
  assert.equal(scan.date, '2026-11-12');
  assert.equal(scan.status.date, 'found');
  // The shop is the merchant; the description is only what was bought, from the kind of shop.
  assert.equal(scan.merchant, 'Supermercato Prova Srl');
  assert.equal(scan.description, 'Spesa');
  // The shop's name, the description and the category are always to be checked.
  assert.deepEqual([scan.status.merchant, scan.status.description], ['uncertain', 'uncertain']);
  assert.ok(receiptDescriptions.every((word) => word in english));
  assert.equal(suggestDescription('FARMACIA PROVA'), 'Farmacia');
  assert.equal(suggestDescription('BAR DEL SUPERMERCATO'), '');
  assert.equal(parseReceiptText('NEGOZIO PROVA\nTOTALE 5,00', categories, today).description, '');
  assert.equal(scan.categoryId, 'c-food');
  assert.equal(scan.status.categoryId, 'uncertain');
  assert.deepEqual(scan.notes, []);
});

test('scontrini: errori tipici dell’OCR nelle parole, totale su due righe, più totali', () => {
  assert.equal(parseReceiptText('BAR PROVA\nT0TALE EUR0   3,20\nC0NTANTI 5,00\nREST0 1,80', categories, today).amountMinor, 320);
  assert.equal(parseReceiptText('NEGOZIO\nTOTALE\n18,90\nCONTANTI 20,00', categories, today).amountMinor, 1890);
  const many = parseReceiptText('NEGOZIO\nTOTALE 20,00\nSCONTO 2,00\nTOTALE 18,00', categories, today);
  assert.equal(many.amountMinor, 1800);
  assert.equal(many.status.amount, 'uncertain');
  assert.ok(many.notes.includes(receiptNotes.manyTotals));
  // «Totale complessivo» wins over a plain «totale» printed earlier.
  const strong = parseReceiptText('TOTALE REPARTO 20,00\nTOTALE COMPLESSIVO 18,00', categories, today);
  assert.deepEqual([strong.amountMinor, strong.status.amount], [1800, 'found']);
});

test('scontrini: senza riga del totale l’importo è dedotto e segnalato, mai dato per certo', () => {
  const card = parseReceiptText('NEGOZIO PROVA\nARTICOLO 9,90\nPAGAMENTO ELETTRONICO 9,90', categories, today);
  assert.deepEqual([card.amountMinor, card.status.amount], [990, 'uncertain']);
  assert.ok(card.notes.includes(receiptNotes.fromPayment));
  const cash = parseReceiptText('NEGOZIO PROVA\nCONTANTI 20,00\nRESTO 5,50', categories, today);
  assert.deepEqual([cash.amountMinor, cash.status.amount], [1450, 'uncertain']);
  const largest = parseReceiptText('NEGOZIO PROVA\nPANE 2,10\nLATTE 1,29\nIVA 10,00', categories, today);
  assert.deepEqual([largest.amountMinor, largest.status.amount], [210, 'uncertain']);
  assert.ok(largest.notes.includes(receiptNotes.largest));
});

test('scontrini: valori mancanti restano mancanti, niente dati inventati', () => {
  const cut = parseReceiptText('SUPERMERCATO PROVA\nLATTE\nPASTA', categories, today);
  assert.equal(cut.amountMinor, null);
  assert.equal(cut.date, '');
  assert.deepEqual([cut.status.amount, cut.status.date], ['missing', 'missing']);
  assert.equal(emptyProposal(cut), false);
  const blurred = parseReceiptText('~~ ,. |\n 4 ;;\n', categories, today);
  assert.equal(emptyProposal(blurred), true);
  assert.deepEqual([blurred.description, blurred.merchant], ['', '']);
  // A description guessed from a word is not a reading: alone it leaves nothing to review.
  assert.equal(emptyProposal(parseAiReceipt(JSON.stringify({ description: 'Spesa' }), categories, today)), true);
  // Out of the range of an expense: not proposed.
  assert.equal(parseReceiptText('TOTALE 0,00', categories, today).amountMinor, null);
  const dates = parseReceiptText('NEGOZIO\nTOTALE 5,00\n10/11/2026\nReso entro 14/11/2026', categories, today);
  assert.deepEqual([dates.date, dates.status.date], ['2026-11-10', 'uncertain']);
});

test('scontrini: la categoria è solo una di quelle esistenti, altrimenti nessuna', () => {
  assert.equal(suggestCategory('FARMACIA PROVA', categories), '');
  assert.equal(suggestCategory('FARMACIA PROVA', [...categories, { id: 'c-health', label: 'Salute', icon: 'cross' }]), 'c-health');
  // By icon when no name fits.
  assert.equal(suggestCategory('STAZIONE DI SERVIZIO\nGASOLIO', [{ id: 'c-x', label: 'Macchina', icon: 'fuel' }]), 'c-x');
  // Two fitting categories or two kinds of shop: no guess.
  assert.equal(suggestCategory('SUPERMERCATO', [{ id: 'a', label: 'Spesa casa', icon: null }, { id: 'b', label: 'Alimentari', icon: null }]), '');
  assert.equal(suggestCategory('SUPERMERCATO CON FARMACIA', [...categories, { id: 'c-health', label: 'Salute', icon: 'cross' }]), '');
  assert.equal(suggestCategory('RICEVUTA TRASPORTI URBANI', categories), 'c-move');
  assert.equal(suggestCategory('SUPERMERCATO', []), '');
});

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
  const scan = parseReceiptText(supermarket, categories, today);
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

const openai: AiSettings = { provider: 'openai', model: 'modello-prova', endpoint: '', consent: '', scan: 'ocr' };
const image = { mime: 'image/jpeg', base64: 'QUJD' };

test('AI: impostazioni dal browser validate, la chiave non ne fa mai parte', () => {
  assert.deepEqual(parseAiSettings(null), defaultAiSettings);
  assert.deepEqual(parseAiSettings('{oops'), defaultAiSettings);
  assert.deepEqual(parseAiSettings(JSON.stringify({ provider: 'altro', model: 5, apiKey: 'sk-finta', key: 'sk-finta' })), defaultAiSettings);
  const saved = parseAiSettings(JSON.stringify({ provider: 'gemini', model: ' m ', endpoint: '', consent: 'generativelanguage.googleapis.com', apiKey: 'finta' }));
  assert.deepEqual(saved, { provider: 'gemini', model: 'm', endpoint: '', consent: 'generativelanguage.googleapis.com', scan: 'ocr' });
  assert.equal(parseAiSettings(JSON.stringify({ scan: 'ai' })).scan, 'ai');
  assert.equal(parseAiSettings(JSON.stringify({ scan: 'altro' })).scan, 'ocr');
  assert.equal('apiKey' in saved, false);
  assert.equal(aiSetupProblem(defaultAiSettings) !== null, true);
  assert.equal(aiSetupProblem({ ...openai, model: '' }), 'Indica il modello da usare.');
  assert.equal(aiSetupProblem(openai), null);
  assert.equal(aiSetupProblem({ ...openai, provider: 'compatible', endpoint: 'http://esempio.test/v1' }), 'Indica un indirizzo HTTPS valido per l’API.');
});

test('AI: indirizzi compatibili solo HTTPS (o HTTP sullo stesso dispositivo), destinazione del consenso', () => {
  assert.equal(compatibleBase('https://esempio.test/v1/'), 'https://esempio.test/v1');
  assert.equal(compatibleBase('https://esempio.test/v1/chat/completions'), 'https://esempio.test/v1');
  assert.equal(compatibleBase('http://localhost/v1'), 'http://localhost/v1');
  for (const bad of ['', 'esempio.test', 'http://esempio.test/v1', 'ftp://esempio.test', 'https://utente:segreto@esempio.test/v1', 'https://esempio.test/v1?key=1', 'javascript:alert(1)']) {
    assert.equal(compatibleBase(bad), null, bad);
  }
  assert.equal(aiDestination(openai), 'api.openai.com');
  assert.equal(aiDestination({ ...openai, provider: 'gemini' }), 'generativelanguage.googleapis.com');
  assert.equal(aiDestination({ ...openai, provider: 'compatible', endpoint: 'https://esempio.test/v1' }), 'esempio.test');
  assert.equal(aiDestination(defaultAiSettings), '');
});

test('AI: richiesta per provider, chiave solo nelle intestazioni, categorie esistenti nel prompt', () => {
  const prompt = receiptPrompt(categories, today, 'TOTALE 24,75');
  assert.match(prompt, /"Alimentari", "Intrattenimento"/);
  assert.match(prompt, /2026-11-16/);
  assert.match(prompt, /TOTALE 24,75/);
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
  const custom = buildAiRequest({ ...openai, provider: 'compatible', endpoint: 'https://esempio.test/v1/' }, 'k', image, prompt);
  assert.equal(custom.url, 'https://esempio.test/v1/chat/completions');
  assert.throws(() => buildAiRequest(openai, '  ', image, prompt), { message: 'Inserisci la chiave API.' });
  assert.throws(() => buildAiRequest(defaultAiSettings, 'k', image, prompt), { message: 'Analisi con AI non attiva.' });
});

test('AI: risposte ed errori del provider (chiave, limite, modello, server, risposta vuota)', () => {
  assert.equal(readAiAnswer('openai', 200, { choices: [{ message: { content: '{"total":"1.00"}' } }] }), '{"total":"1.00"}');
  assert.equal(readAiAnswer('compatible', 200, { choices: [{ message: { content: [{ type: 'text', text: '{"a":' }, { type: 'text', text: '1}' }] } }] }), '{"a":1}');
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
  for (const message of [...Object.values(receiptNotes), ...Object.values(aiErrors), aiResponseError, 'Indica il modello da usare.', 'Indica un indirizzo HTTPS valido per l’API.', 'Inserisci la chiave API.', 'Analisi con AI non attiva.']) {
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
  // A compatible server: asked as soon as the address is usable, with the key only if there is one.
  const local = { ...base, provider: 'compatible' as const, endpoint: 'http://localhost:11434/v1/' };
  assert.deepEqual(buildModelsRequest(local, ''), { url: 'http://localhost:11434/v1/models', init: { method: 'GET', headers: {} } });
  assert.deepEqual(buildModelsRequest(local, 'k')!.init.headers, { Authorization: 'Bearer k' });
  assert.equal(buildModelsRequest({ ...local, endpoint: 'http://esempio.test/v1' }, 'k'), null);
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
  assert.deepEqual(readAiModels('claude', 200, { data: [{ type: 'model', id: 'claude-sonnet-4-6' }, { type: 'model', id: 'claude-haiku-4-5-20251001' }] }),
    ['claude-haiku-4-5-20251001', 'claude-sonnet-4-6']);
  // Compatible servers: nothing filtered, `data`, `models` or a bare array.
  assert.deepEqual(readAiModels('compatible', 200, { object: 'list', data: [{ id: 'llava:13b' }, { id: 'nomic-embed-text' }] }), ['llava:13b', 'nomic-embed-text']);
  assert.deepEqual(readAiModels('compatible', 200, { models: [{ name: 'llava' }] }), ['llava']);
  assert.deepEqual(readAiModels('compatible', 200, ['b', 'a']), ['a', 'b']);
  for (const body of [null, {}, { data: [] }, { data: 'x' }, { data: [{ id: 'whisper-1' }] }]) assert.throws(() => readAiModels('openai', 200, body), { message: aiModelsEmpty });
  assert.throws(() => readAiModels('openai', 401, { error: { message: 'Incorrect API key provided: sk-finta' } }), { message: aiErrors.key });
  assert.throws(() => readAiModels('gemini', 400, { error: { message: 'API key not valid.' } }), { message: aiErrors.key });
  assert.throws(() => readAiModels('claude', 429, {}), { message: aiErrors.limit });
  assert.throws(() => readAiModels('compatible', 404, null), { message: aiErrors.models });
  assert.throws(() => readAiModels('compatible', 503, null), { message: aiErrors.server });
  for (const message of [aiModelsEmpty, aiErrors.models]) assert.ok(english[message as keyof typeof english]);
});

test('AI: modello consigliato e ricerca nell’elenco', () => {
  assert.equal(recommendedModel('openai', ['gpt-4o-mini', 'gpt-5', 'gpt-5-mini']), 'gpt-5-mini');
  assert.equal(recommendedModel('openai', ['gpt-4o', 'gpt-4o-mini']), 'gpt-4o-mini');
  assert.equal(recommendedModel('gemini', ['gemini-2.5-flash-lite', 'gemini-2.5-pro']), null);
  assert.equal(recommendedModel('gemini', ['gemini-2.5-flash-lite', 'gemini-2.5-flash']), 'gemini-2.5-flash');
  assert.equal(recommendedModel('claude', ['claude-haiku-4-5-20251001', 'claude-sonnet-4-6']), 'claude-haiku-4-5-20251001');
  assert.equal(recommendedModel('claude', ['claude-opus-5-5', 'claude-sonnet-4-6']), 'claude-sonnet-4-6');
  assert.equal(recommendedModel('compatible', ['llava']), null);
  const models = ['gpt-4o', 'gpt-4o-mini', 'gpt-5-mini', 'o3'];
  assert.deepEqual(matchModels(models, ''), models);
  assert.deepEqual(matchModels(models, 'gpt-4o'), models);
  assert.deepEqual(matchModels(models, 'MINI'), ['gpt-4o-mini', 'gpt-5-mini']);
  assert.deepEqual(matchModels(models, '5 mini'), ['gpt-5-mini']);
  assert.deepEqual(matchModels(models, 'llava'), []);
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
