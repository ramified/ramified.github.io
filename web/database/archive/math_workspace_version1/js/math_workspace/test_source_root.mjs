import {registerHooks} from 'node:module';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const workspaceURL=new URL('./',import.meta.url);
const archivedJSURL=new URL('../',workspaceURL);
const sourceRoot=path.resolve(process.env.MATH_WORKSPACE_SOURCE_ROOT||fileURLToPath(new URL('../../../../',import.meta.url)));
const sourceJSURL=pathToFileURL(path.join(sourceRoot,'js')+path.sep);

// Keep workspace modules local; resolve their classic calculator imports from
// the same configurable source root used by the live workspace build.
registerHooks({resolve(specifier,context,nextResolve){
  if(context.parentURL?.startsWith(workspaceURL.href)&&specifier.startsWith('../')){
    const target=new URL(specifier,context.parentURL);
    if(target.href.startsWith(archivedJSURL.href)&&!target.href.startsWith(workspaceURL.href)){
      return nextResolve(new URL(target.href.slice(archivedJSURL.href.length),sourceJSURL).href,context);
    }
  }
  return nextResolve(specifier,context);
}});
