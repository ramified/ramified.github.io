// SQLite-backed D1 adapter for local verification. Never included in deployment.
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');
class TestDatabase {
  constructor(filename = ':memory:') {
    this.sqlite = new DatabaseSync(filename);
    this.sqlite.exec(fs.readFileSync(path.join(__dirname, 'theorem-graph-schema.sql'), 'utf8'));
  }
  prepare(sql) {
    const statement = this.sqlite.prepare(sql);
    const make = args => ({
      bind: (...values) => make(values),
      first: async () => statement.get(...args) || null,
      all: async () => ({ results: statement.all(...args), success: true }),
      run: async () => ({ meta: statement.run(...args), success: true })
    });
    return make([]);
  }
  async batch(statements) {
    this.sqlite.exec('BEGIN');
    try {
      const results = [];
      for (const statement of statements) results.push(await statement.all());
      this.sqlite.exec('COMMIT'); return results;
    } catch (error) { this.sqlite.exec('ROLLBACK'); throw error; }
  }
  close() { this.sqlite.close(); }
}
module.exports = { TestDatabase };
