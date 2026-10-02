import { DatabaseSync } from "node:sqlite";
import type { SqlRunner, SqlValue } from "../../src/core/store";

/** node:sqlite behind the same synchronous interface as Durable Object SQLite. */
export function memorySql(): SqlRunner {
  const db = new DatabaseSync(":memory:");
  return (<T>(query: string, ...params: SqlValue[]) => {
    const stmt = db.prepare(query);
    if (/^\s*(select|with|pragma)/i.test(query) || /\breturning\b/i.test(query)) {
      return stmt.all(...params).map((r) => ({ ...r })) as T[];
    }
    stmt.run(...params);
    return [] as T[];
  }) as SqlRunner;
}
