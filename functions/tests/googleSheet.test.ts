import assert from 'node:assert/strict';
import { test } from 'node:test';
import { googleSheet, SheetsApiError } from '../src/googleSheet.ts';

type Call = { url: string; init: RequestInit };
function fakeFetch(respond: (call: Call) => { status?: number; body: unknown }) {
  const calls: Call[] = [];
  const fn = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const { status = 200, body } = respond({ url, init });
    return new Response(JSON.stringify(body), { status });
  }) as unknown as typeof fetch;
  return { calls, fn };
}
const cells = ['id', '2026-11-02', 1250, 'EUR', '=1+1', '', '', '2026-11-02T10:00:00.000Z', 'web_app', 1];

test('scrittura RAW sulla riga indicata, con token di servizio, verificata dalla risposta', async () => {
  const fake = fakeFetch(() => ({ body: { updatedData: { values: [cells.slice(0, 5).concat(['', '', ...cells.slice(7)])] } } }));
  const sheet = googleSheet({ spreadsheetId: 'sheet/1', tab: "Spese d'oggi", accessToken: async () => 'tok', fetch: fake.fn });
  await sheet.writeRow(7, cells);
  const call = fake.calls[0]!;
  const url = new URL(call.url);
  assert.equal(url.pathname, `/v4/spreadsheets/sheet%2F1/values/${encodeURIComponent("'Spese d''oggi'!A7:J7")}`);
  assert.equal(url.searchParams.get('valueInputOption'), 'RAW');
  assert.equal(call.init.method, 'PUT');
  assert.equal((call.init.headers as Record<string, string>).Authorization, 'Bearer tok');
  assert.deepEqual(JSON.parse(call.init.body as string).values, [cells]);
});

test('scrittura non confermata dalla risposta: errore, non successo', async () => {
  const fake = fakeFetch(() => ({ body: { updatedData: { values: [['id']] } } }));
  const sheet = googleSheet({ spreadsheetId: 's', tab: 'Spese', accessToken: async () => 't', fetch: fake.fn });
  await assert.rejects(sheet.writeRow(2, cells), /non verificata/);
});

test('errore HTTP: codice senza contenuto della risposta', async () => {
  const fake = fakeFetch(() => ({ status: 403, body: { error: { message: 'segreto' } } }));
  const sheet = googleSheet({ spreadsheetId: 's', tab: 'Spese', accessToken: async () => 't', fetch: fake.fn });
  await assert.rejects(sheet.readDataRows(), (error: unknown) =>
    error instanceof SheetsApiError && error.status === 403 && !error.message.includes('segreto'));
});

test('lettura delle righe dati senza formattazione; riga assente = vuota', async () => {
  const fake = fakeFetch(({ url }) => ({ body: url.includes('A2%3AJ?') ? { values: [cells] } : {} }));
  const sheet = googleSheet({ spreadsheetId: 's', tab: 'Spese', accessToken: async () => 't', fetch: fake.fn });
  assert.deepEqual(await sheet.readDataRows(), [cells]);
  assert.deepEqual(await sheet.readRow(9), []);
  assert.ok(fake.calls.every((call) => new URL(call.url).searchParams.get('valueRenderOption') === 'UNFORMATTED_VALUE'));
});
