// A data language: no eval, property access, arbitrary expressions or JavaScript.
export class RecipeError extends Error {
  constructor(message, line, column) {
    super(message); this.name = 'RecipeError'; this.line = line; this.column = column;
  }
}
export const identifier = /^[A-Za-z][A-Za-z0-9_]*$/;
const forbidden = new Set(['__proto__', 'prototype', 'constructor']);
export function parseRecipe(source) {
  if (source.length > 1000000) throw new RecipeError('Recipe exceeds 1 MB', 1, 1);
  let i = 0, line = 1, column = 1;
  const tokens = [];
  const advance = () => { const c = source[i++]; if (c === '\n') { line++; column = 1; } else column++; return c; };
  const error = message => { throw new RecipeError(message, line, column); };
  while (i < source.length) {
    const c = source[i];
    if (/\s/.test(c)) { advance(); continue; }
    if (c === '#') { while (i < source.length && source[i] !== '\n') advance(); continue; }
    const location = { line, column };
    if ('=(),[]{}:;'.includes(c)) { tokens.push({ type: advance(), ...location }); continue; }
    if (c === '"') {
      const start = i; advance(); let closed = false;
      while (i < source.length) {
        const next = advance();
        if (next === '\\') { if (i < source.length) advance(); }
        else if (next === '"') { closed = true; break; }
      }
      if (!closed) error('Unclosed string');
      try { tokens.push({ type: 'literal', value: JSON.parse(source.slice(start, i)), ...location }); }
      catch { error('Invalid quoted string'); }
      continue;
    }
    const number = source.slice(i).match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/);
    if (number) {
      for (const unused of number[0]) advance();
      const value = Number(number[0]);
      if (!Number.isFinite(value) || (Number.isInteger(value) && !Number.isSafeInteger(value))) error('Use a quoted string for large exact numbers');
      tokens.push({ type: 'literal', value, ...location }); continue;
    }
    const name = source.slice(i).match(/^[A-Za-z][A-Za-z0-9_]*/);
    if (name) {
      for (const unused of name[0]) advance();
      if (forbidden.has(name[0])) error('Reserved identifier');
      tokens.push({ type: 'name', value: name[0], ...location }); continue;
    }
    error(`Unexpected character ${c}`);
  }
  tokens.push({ type: 'end', line, column });
  let p = 0;
  const fail = message => { const t = tokens[p]; throw new RecipeError(message, t.line, t.column); };
  const take = type => { if (tokens[p].type !== type) fail(`Expected ${type}`); return tokens[p++]; };
  const value = (depth = 0) => {
    if (depth > 40) fail('Nesting exceeds 40 levels');
    const t = tokens[p];
    if (t.type === 'literal') { p++; return t.value; }
    if (t.type === 'name') {
      p++;
      if (t.value === 'true') return true;
      if (t.value === 'false') return false;
      if (t.value === 'null') return null;
      return { ref: t.value };
    }
    if (t.type === '[') {
      p++; const result = [];
      if (tokens[p].type !== ']') do { result.push(value(depth + 1)); if (tokens[p].type !== ',') break; p++; } while (tokens[p].type !== ']');
      take(']'); return result;
    }
    if (t.type === '{') {
      p++; const entries = [];
      if (tokens[p].type !== '}') do {
        const key = tokens[p];
        if (!['name', 'literal'].includes(key.type) || typeof key.value !== 'string' || forbidden.has(key.value)) fail('Invalid record key');
        p++; take(':');
        if (entries.some(([k]) => k === key.value)) fail('Duplicate record key');
        entries.push([key.value, value(depth + 1)]);
        if (tokens[p].type !== ',') break; p++;
      } while (tokens[p].type !== '}');
      take('}'); return { record: entries };
    }
    fail('Expected a literal, reference, list or record');
  };
  const statements = [], names = new Set();
  while (tokens[p].type !== 'end') {
    const name = take('name');
    if (['true', 'false', 'null'].includes(name.value)) fail('Literal keywords cannot be assigned');
    if (names.has(name.value)) fail(`Duplicate assignment ${name.value}`);
    names.add(name.value); take('='); const operation = take('name').value; take('(');
    const args = [];
    if (tokens[p].type !== ')') do { args.push(value()); if (tokens[p].type !== ',') break; p++; } while (tokens[p].type !== ')');
    take(')'); if (tokens[p].type === ';') p++;
    if (tokens[p].type !== 'end' && tokens[p].line === name.line) fail('Put each assignment on a separate line');
    statements.push({ name: name.value, operation, args, line: name.line, column: name.column });
    if (statements.length > 1000) fail('Recipe exceeds 1000 assignments');
  }
  return statements;
}
export function resolveValue(value, resolve) {
  if (Array.isArray(value)) return value.map(v => resolveValue(v, resolve));
  if (value && typeof value === 'object') {
    if ('ref' in value) return resolve(value.ref);
    if ('record' in value) return Object.fromEntries(value.record.map(([k, v]) => [k, resolveValue(v, resolve)]));
  }
  return value;
}
export function references(value) {
  if (Array.isArray(value)) return value.flatMap(references);
  if (value && typeof value === 'object') {
    if ('ref' in value) return [value.ref];
    if ('record' in value) return value.record.flatMap(([, v]) => references(v));
  }
  return [];
}
export function printValue(value) {
  if (Array.isArray(value)) return `[${value.map(printValue).join(', ')}]`;
  if (value && typeof value === 'object') {
    if ('ref' in value) return value.ref;
    if ('record' in value) return `{${value.record.map(([k, v]) => `${JSON.stringify(k)}: ${printValue(v)}`).join(', ')}}`;
  }
  return JSON.stringify(value);
}
export function literal(value) {
  if (Array.isArray(value)) return value.map(literal);
  if (value && typeof value === 'object') return { record: Object.entries(value).map(([k, v]) => [k, literal(v)]) };
  return value;
}
export function printRecipe(statements) {
  return statements.map(s => `${s.name} = ${s.operation}(${s.args.map(printValue).join(', ')})`).join('\n');
}
