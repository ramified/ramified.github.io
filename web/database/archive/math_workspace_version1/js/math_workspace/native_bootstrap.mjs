// Workspace-native editor library. Historical calculator HTML and scripts are
// compiled into these factories; loading this file never loads those pages.
import nativeEditors from 'workspace:editors';
import {encodeState,decodeState} from './editors/state.mjs';

globalThis.MathWorkspaceNativeEditors=Object.freeze({
  definitions:Object.freeze(Object.values(nativeEditors).map(entry=>Object.freeze({...entry.metadata}))),
  factories:Object.freeze({...nativeEditors}),
  encodeState,
  decodeState,
});
