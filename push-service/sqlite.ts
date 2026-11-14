// `Sql` on Node's built-in SQLite (local server and tests).
import { DatabaseSync } from 'node:sqlite';
import { schema, type Sql } from './service.ts';

export function openSqlite(path = ':memory:'): Sql {
  const db = new DatabaseSync(path);
  for (const statement of schema) db.exec(statement);
  return {
    async run(sql, ...params) { db.prepare(sql).run(...(params as never[])); },
    async all<T>(sql: string, ...params: unknown[]) { return db.prepare(sql).all(...(params as never[])) as T[]; },
  };
}
