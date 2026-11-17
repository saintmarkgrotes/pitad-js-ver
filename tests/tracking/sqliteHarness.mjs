import { DatabaseSync } from 'node:sqlite';
import { createRunRepository } from '../../src/database/local/repositoryCore.js';

export function harness(path = ':memory:') {
  const db = new DatabaseSync(path);
  const adapter = {
    async execAsync(sql) { db.exec(sql); },
    async runAsync(sql, ...params) { return db.prepare(sql).run(...params); },
    async getFirstAsync(sql, ...params) { return db.prepare(sql).get(...params) ?? null; },
    async getAllAsync(sql, ...params) { return db.prepare(sql).all(...params); },
  };
  return { db, adapter, repository: createRunRepository(async () => adapter) };
}
