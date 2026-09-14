import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import * as esbuild from 'esbuild';
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';
import {parse,serialize} from 'parse5';
import {editors} from './editors/catalog.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const outputs=new Map(), inputs=new Map();
const read=async p=>{const text=await fs.readFile(path.resolve(root,p),'utf8');inputs.set(p,text);return text;};
const clean=s=>s.split(/[?#]/)[0];
const attr=(n,k)=>n.attrs?.find(a=>a.name===k)?.value;
const nodes=n=>[n,...(n.childNodes||[]).flatMap(nodes)];
const names=body=>body.flatMap(n=>n.type==='VariableDeclaration'?n.declarations.filter(d=>d.id.type==='Identifier').map(d=>d.id.name):['FunctionDeclaration','ClassDeclaration'].includes(n.type)?[n.id.name]:[]);
const exclusions=new Set(['window','document','self','globalThis','location','localStorage','sessionStorage','Worker','ResizeObserver','MutationObserver','requestAnimationFrame','cancelAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','fetch']);
function instrument(source,file,primary){
  const ast=acorn.parse(source,{ecmaVersion:'latest',sourceType:'script'}), patches=[];
  // Every function remains in its original lexical closure. The optional bridge
  // exposes state/lifecycle without moving any mathematical routines.
  if(primary){
    let body=ast.body, end=source.length;
    const outer=ast.body.find(n=>n.type==='ExpressionStatement'&&n.expression.type==='CallExpression'&&['ArrowFunctionExpression','FunctionExpression'].includes(n.expression.callee.type));
    if(outer&&ast.body.length<5){body=outer.expression.callee.body.body;end=outer.expression.callee.body.end-1;}
    const bound=new Set(names(body)), classNames=body.filter(n=>n.type==='ClassDeclaration').map(n=>n.id.name);
    const candidates=['state','S'];const state=candidates.find(n=>bound.has(n));
    const redraw=(file.includes('matrix_calculator')?['renderMatrixGrid','refreshAll']:file.includes('sheaf_')?['recompute']:file.includes('double_young')?['resizeCanvases']:file.includes('mosaic_')?['resizeCanvas','updateReport']:['renderAll','render','redraw']).filter(n=>bound.has(n));
    const mutable=body.filter(n=>n.type==='VariableDeclaration'&&n.kind!=='const').flatMap(n=>n.declarations.filter(d=>d.id.type==='Identifier').map(d=>d.id.name)).filter(n=>!/(timer|queued|timestamp|pointer|canvasmetrics|last.*time|pag[eE]Initialized|Ready|suppress)/i.test(n));
    const extraObjects=['sliceState','VARS'].filter(n=>bound.has(n));
    const keys=[...(state?[state]:[]),...mutable,...extraObjects];
    const restoreResults=file.includes('matrix_calculator')?`if(state.lastOperationResult)renderOperationResult(state.lastOperationResult);if(state.lastPolynomialAction){const latex=formatPolynomialAction(state.lastPolynomialAction.polynomial,'latex');refs.polynomialActionOutput.innerHTML='<div class="matrix-polynomial">'+inlineMathHtml(latex)+'</div>';}`:'';
    if(keys.length)patches.push({start:end,end,text:`\n__editor.registerState({get:()=>({${keys.join(',')}}),restore:value=>{${keys.map(n=>state===n?`__editor.applyState(${n},value.${n});`:extraObjects.includes(n)?`if(value.${n} instanceof Map){${n}.clear();for(const [k,v] of value.${n})${n}.set(k,v);}else __editor.applyState(${n},value.${n});`:`${n}=__editor.applyState(${n},value.${n});`).join('')}${redraw.map(n=>`${n}();`).join('')}${restoreResults}},classes:{${classNames.join(',')}}});\n`});
    if(file.includes('higher_dimensional_slice_explorer')) patches.push({start:end,end,text:`\n__editor.setBridge({capture:()=>({full:fullState(),extras:{sourceMode:state.sourceMode,addToricFanPreset:state.addToricFanPreset,selectedVertex:state.selectedVertex,activeTropicalDistrict:state.activeTropicalDistrict,activeWeylChamber:state.activeWeylChamber,weylKlTargetChamber:state.weylKlTargetChamber,activeToricFace:state.activeToricFace,toricTab:state.toricTab,toricFanTab:state.toricFanTab,weightInfoDimensionMode:state.weightInfoDimensionMode},objectCounter}),restore:s=>{const text=$('import-state').value;$('import-state').value=JSON.stringify(s.full);importState();$('import-state').value=text;Object.assign(state,s.extras);objectCounter=s.objectCounter;syncSourceMode();syncObjectPanel();renderAll();},deactivate:clearAllMotion,resize:resizeCanvas});\n`});
  }
  return patches.sort((a,b)=>b.start-a.start).reduce((s,p)=>s.slice(0,p.start)+p.text+s.slice(p.end),source);
}
async function compileEditor(e){
  const html=await read(e.page),doc=parse(html),all=nodes(doc),body=all.find(n=>n.tagName==='body');
  let css='';
  for(const n of all){if(n.tagName==='style')css+=serialize(n)+'\n';if(n.tagName==='link'&&attr(n,'rel')==='stylesheet'&&!/^https?:/.test(attr(n,'href')))css+=await read(clean(attr(n,'href')))+'\n';}
  // Shadow DOM preserves original selectors and IDs without leaking their styles
  // or colliding with another editor. Root/body rules target its native wrapper.
  css=css.replace(/:root\b/g,':host').replace(/(^|[\s,>+~])html(?=[\s.#:{,>+~])/g,'$1.editor-document').replace(/(^|[\s,>+~])body(?=[\s.#:{,>+~])/g,'$1.editor-body');
  let scripts='';
  for(const n of all.filter(n=>n.tagName==='script')){
    const src=attr(n,'src'); if(src&&/^https?:/.test(src))continue;
    const file=src?clean(src):`${e.page}:inline`;
    scripts+=`\n// Original source: ${file}\n${instrument(src?await read(file):serialize(n),file,file===e.script)}\n`;
  }
  const ast=acorn.parse(scripts,{ecmaVersion:'latest'}), declared=new Set(names(ast.body));
  const globals=new Set();
  walk.simple(ast,{MemberExpression(n){if(n.object.type==='Identifier'&&['window','globalThis','self'].includes(n.object.name)&&!n.computed&&n.property.type==='Identifier')globals.add(n.property.name);}});
  const own=[...globals].filter(n=>!exclusions.has(n)&&!declared.has(n)&&!['MathJax','CSS','Element','PointerEvent','URLSearchParams','innerWidth','innerHeight','devicePixelRatio','isSecureContext','history','addEventListener','removeEventListener','matchMedia','getComputedStyle','confirm','prompt','event'].includes(n));
  const handlers=[...new Set(ast.body.filter(n=>n.type==='FunctionDeclaration').map(n=>n.id.name))];
  const remove=n=>{n.childNodes=(n.childNodes||[]).filter(c=>!['script','style','link'].includes(c.tagName));n.childNodes.forEach(remove);};remove(body);
  const template=serialize(body);
  const source=`import {createEditorContext} from './runtime.mjs';\nexport const metadata=${JSON.stringify(e)};\nexport function mount(host,options){const __editor=createEditorContext(host,${JSON.stringify({page:e.page,html:template,css})},options);const {window,document,location,localStorage,sessionStorage,Worker,ResizeObserver,MutationObserver,requestAnimationFrame,cancelAnimationFrame,setTimeout,clearTimeout,setInterval,clearInterval,fetch}=__editor.environment;const globalThis=window,self=window;\n${own.map(n=>`let ${n};`).join('')}\n__editor.linkGlobals({${own.map(n=>`get ${n}(){return ${n}},set ${n}(v){${n}=v}`).join(',')}});\n${scripts}\n__editor.registerHandlers({${handlers.join(',')}});return __editor.start();}\n`;
  return source.replace('const globalThis=window,self=window;', 'const globalThis=window,self=window,module=undefined,require=undefined;');
}
async function expandWorker(file, seen=new Set()){
  file=clean(file);if(seen.has(file))return '';seen.add(file);let source=await read(file);
  const matches=[...source.matchAll(/importScripts\(([^;]+)\);?/g)];
  for(const m of matches){let inline='';for(const s of m[1].matchAll(/["']([^"']+)["']/g))inline+=await expandWorker(path.posix.join(path.posix.dirname(file),clean(s[1])),seen)+'\n';source=source.replace(m[0],inline);}
  return source;
}
async function build(){
  inputs.clear();outputs.clear();
  for(const file of ['js/math_workspace/build.mjs','js/math_workspace/editors/catalog.mjs','package.json','package-lock.json'])await read(file);
  // SVG output contains its glyphs; it needs no font requests when opened locally.
  for(const file of ['tex-svg-full.js',...(await fs.readdir(path.join(root,'node_modules/mathjax/es5/input/tex/extensions'))).filter(f=>f.endsWith('.js')).map(f=>`input/tex/extensions/${f}`)])outputs.set(`js/math_workspace/dist/mathjax/${file}`,await read(`node_modules/mathjax/es5/${file}`));
  outputs.set('js/math_workspace/dist/mathjax/LICENSE',await read('node_modules/mathjax/LICENSE'));
  const virtual=new Map();for(const e of editors)virtual.set(`editor:${e.id}`,await compileEditor(e));
  const workerResult=await esbuild.build({entryPoints:[path.join(root,'js/math_workspace/worker.mjs')],bundle:true,write:false,format:'iife',target:'es2022'});
  const workers={workspace:workerResult.outputFiles[0].text};
  for(const f of ['js/toric_cone_worker.js','js/background_homology_worker.js','js/mosaic_hyperbolic_metric_worker.js'])workers[f]=await expandWorker(f);
  virtual.set('workspace:workers',`export default ${JSON.stringify(workers)};`);
  let presetCode='export default {\n';
  for(const directory of ['category_presets','ramified_minigame_presets'])for(const file of (await fs.readdir(path.join(root,directory))).filter(f=>f.endsWith('.preset.js')).sort()){
    const p=`${directory}/${file}`;presetCode+=`${JSON.stringify(p)}:(window)=>{const globalThis=window,self=window,module=undefined,require=undefined;${await read(p)}\n},\n`;
  }
  virtual.set('workspace:presets',presetCode+'};');
  virtual.set('workspace:editors',editors.map((e,i)=>`import * as e${i} from 'editor:${e.id}';`).join('\n')+`\nexport default {${editors.map((e,i)=>`${JSON.stringify(e.id)}:e${i}`).join(',')}};`);
  const result=await esbuild.build({entryPoints:[path.join(root,'js/math_workspace/bootstrap.mjs')],bundle:true,write:false,format:'iife',target:'es2022',sourcemap:false,legalComments:'eof',minify:false,plugins:[{name:'calculator-sources',setup(b){b.onResolve({filter:/^(editor:|workspace:)/},a=>({path:a.path,namespace:'calculator'}));b.onLoad({filter:/.*/,namespace:'calculator'},a=>({contents:virtual.get(a.path),loader:'js',resolveDir:path.join(root,'js/math_workspace/editors')}));}}],metafile:true});
  outputs.set('js/math_workspace/dist/workspace.js',result.outputFiles[0].text);
  const revision=createHash('sha256').update(result.outputFiles[0].text).digest('hex');
  for(const file of ['math_workspace.html','math_workspace_browser_test.html']){
    const html=await read(file);outputs.set(file,html.replace(/src="js\/math_workspace\/dist\/workspace\.js(?:\?[^" ]*)?"/g,`src="js/math_workspace/dist/workspace.js?v=${revision.slice(0,16)}"`));
  }
  for(const p of Object.keys(result.metafile.inputs))if(!p.startsWith('calculator:')){try{await read(path.relative(root,path.resolve(p)).replaceAll('\\','/'));}catch{}}
  outputs.set('js/math_workspace/dist/build.json',JSON.stringify({bundler:'esbuild@0.25.12',sha256:revision,editors:editors.map(e=>({id:e.id,source:e.page,status:'parity-pending'}))},null,2)+'\n');
  for(const [p,contents] of outputs){const previous=await fs.readFile(path.join(root,p),'utf8').catch(()=>null);if(process.argv.includes('--check')){if(previous!==contents)throw new Error(`Stale build: ${p}; run npm run workspace:build`);}else if(previous!==contents){await fs.mkdir(path.dirname(path.join(root,p)),{recursive:true});await fs.writeFile(path.join(root,p),contents);}}
  console.log(`Workspace: ${editors.length} native editor factories, ${(result.outputFiles[0].contents.length/1024/1024).toFixed(1)} MB classic bundle`);
}
await build();
if(process.argv.includes('--watch')){
  const stamp=async()=>{
    const files=await Promise.all([...inputs.keys()].map(async p=>`${p}:${(await fs.stat(path.join(root,p)).catch(()=>null))?.mtimeMs}`));
    for(const directory of ['category_presets','ramified_minigame_presets'])files.push(`${directory}:${(await fs.readdir(path.join(root,directory))).sort().join(',')}`);
    return files.join('|');
  };
  let last=await stamp(),building=false;
  setInterval(async()=>{if(building)return;building=true;try{const next=await stamp();if(next!==last){last=next;await build();last=await stamp();}}catch(e){console.error(e);}finally{building=false;}},800);
}
