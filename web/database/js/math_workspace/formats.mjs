import { parseRecipe, printRecipe, literal } from './recipe.mjs';
import { rational } from './kernel.mjs';
export function matrixCAS(asset, target) {
  if (!asset || asset.type !== 'matrix' || !['QQ', 'ZZ'].includes(asset.context.ring)) throw new Error('CAS export requires a QQ or ZZ matrix');
  if (!['sage', 'macaulay2'].includes(target)) throw new Error('Unsupported CAS target');
  const { ring } = asset.context, name = asset.name;
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) throw new Error('Invalid matrix identifier');
  const rows = asset.data.rows.map(row => row.map(rational));
  if (ring === 'ZZ' && rows.flat().some(v => v.includes('/'))) throw new Error('Nonintegral ZZ matrix');
  if (target === 'sage') return `${name} = matrix(${ring}, [${rows.map(row => `[${row.join(', ')}]`).join(', ')}])\n`;
  // Macaulay2 names with underscores are indexed variables. Use a fixed safe
  // lowercase identifier, and preserve the workspace name only in a comment.
  return `-- Workspace asset: ${name}\nworkspaceMatrix = matrix(${ring}, {${rows.map(row => `{${row.join(', ')}}`).join(', ')}})\n`;
}
export function detectImport(text) {
  if (text.length > 20 * 1024 * 1024) throw new Error('Import exceeds 20 MB');
  const clean = text.trim();
  if (!clean) throw new Error('Empty import');
  if (clean.startsWith('{')) {
    const value = JSON.parse(clean);
    if (value.schema === 'pure-math-workspace') return { kind: 'project', value };
    if (Array.isArray(value.lambda) && Array.isArray(value.mu)) {
      return { kind: 'recipe', value: `lambda = partition(${JSON.stringify(value.lambda)})\nmu = partition(${JSON.stringify(value.mu)})` };
    }
    const rows = value.partition || value.rows || value.shape;
    if (Array.isArray(rows) && rows.every(v => typeof v === 'number')) return { kind: 'recipe', value: `lambda = partition(${JSON.stringify(rows)})` };
    throw new Error('Unrecognised JSON import; full legacy adapters are listed in the coverage inventory');
  }
  if (/^[A-Za-z][A-Za-z0-9_]*\s*=/.test(clean.replace(/^\s*#.*$/gm, '').trim())) { parseRecipe(clean); return { kind: 'recipe', value: clean }; }
  let matrixText = clean;
  if (/\\begin\{(?:[pbvVB]?matrix|smallmatrix)\}/.test(clean)) matrixText = clean.replace(/\\(?:begin|end)\{[^}]+\}/g, '').replace(/\\\\/g, '\n').replace(/&/g, ' ');
  const rows = matrixText.split(/[\n;]/).filter(line => line.trim()).map(line => line.trim().split(/[\s,]+/).map(rational));
  return { kind: 'recipe', value: printRecipe([{ name: 'A', operation: 'matrix', args: [literal(rows), 'QQ'] }]) };
}
