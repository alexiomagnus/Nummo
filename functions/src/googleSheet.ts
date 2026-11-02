import type { Cell, Sheet } from './ports.ts';
import { lastColumn, sameCells } from './sheetRow.ts';

export type SheetConfig = {
  spreadsheetId: string;
  tab: string;
  // Returns an OAuth access token for the backend's service identity; never a user token.
  accessToken: () => Promise<string>;
  fetch?: typeof fetch;
};

export class SheetsApiError extends Error {
  readonly status: number;
  constructor(status: number) {
    super(`Sheets API: HTTP ${status}`);
    this.status = status;
  }
}

const api = 'https://sheets.googleapis.com/v4/spreadsheets';

export function googleSheet(config: SheetConfig): Sheet {
  const doFetch = config.fetch ?? fetch;
  const tab = `'${config.tab.replaceAll("'", "''")}'`;
  const url = (range: string, query: string) =>
    `${api}/${encodeURIComponent(config.spreadsheetId)}/values/${encodeURIComponent(range)}?${query}`;

  async function call(target: string, init: RequestInit = {}): Promise<Record<string, unknown>> {
    const response = await doFetch(target, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${await config.accessToken()}` },
      signal: AbortSignal.timeout(20_000),
    });
    // The body may echo cell contents: never include it in errors or logs.
    if (!response.ok) throw new SheetsApiError(response.status);
    return await response.json() as Record<string, unknown>;
  }
  const rows = (body: Record<string, unknown>) => (Array.isArray(body.values) ? body.values as unknown[][] : []);
  const rowRange = (row: number) => `${tab}!A${row}:${lastColumn}${row}`;

  return {
    async readRow(row) {
      return rows(await call(url(rowRange(row), 'valueRenderOption=UNFORMATTED_VALUE')))[0] ?? [];
    },
    async writeRow(row, cells: readonly Cell[]) {
      const range = rowRange(row);
      const body = await call(
        url(range, 'valueInputOption=RAW&includeValuesInResponse=true&responseValueRenderOption=UNFORMATTED_VALUE'),
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ range, majorDimension: 'ROWS', values: [cells] }),
        },
      );
      const updated = body.updatedData as Record<string, unknown> | undefined;
      const echoed = updated ? rows(updated)[0] ?? [] : [];
      if (!sameCells(echoed, cells)) throw new Error('Scrittura nel foglio non verificata.');
    },
    async readDataRows() {
      return rows(await call(url(`${tab}!A2:${lastColumn}`, 'valueRenderOption=UNFORMATTED_VALUE')));
    },
  };
}
