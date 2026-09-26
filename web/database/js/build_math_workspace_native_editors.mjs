// Rebuild the live workspace-native editor bundle from the standalone sources.
// The builder itself lives with its pinned toolchain in math_workspace_version1.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.env.MATH_WORKSPACE_SOURCE_ROOT = root;
await import('../math_workspace_version1/js/math_workspace/build.mjs');
