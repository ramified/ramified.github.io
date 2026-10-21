import {parse} from 'acorn';
import workers from 'workspace:workers';
import {encodeState,decodeState,applyState} from './state.mjs';
import presets from 'workspace:presets';
import {createCardDock,dockStyles} from './dock.mjs';

const realWindow=globalThis, realDocument=globalThis.document;
const canonical=url=>String(url).split(/[?#]/)[0].replace(/^.*\/web\/database\//,'').replace(/^\.\//,'');
const forbidden=new Set(['__proto__','prototype','constructor']);
let mathQueue=Promise.resolve();

// Original inline handlers run against the editor's own functions and DOM.
// This evaluator accepts the small expression syntax used in those attributes;
// it never evaluates generated JavaScript or changes the recipe language.
function inlineHandler(source,scope,element,event){
  const ast=parse(source,{ecmaVersion:'latest',allowReturnOutsideFunction:true});
  const env={...scope,event};
  const property=(object,key)=>{if(forbidden.has(String(key)))throw new Error('Invalid handler property');return object[key];};
  function value(n){
    switch(n.type){
      case 'Literal':return n.value;
      case 'Identifier':if(n.name==='undefined')return undefined;if(n.name in env)return env[n.name];throw new Error(`Unknown editor handler ${n.name}`);
      case 'ThisExpression':return element;
      case 'MemberExpression':return property(value(n.object),n.computed?value(n.property):n.property.name);
      case 'ArrayExpression':return n.elements.map(value);
      case 'ObjectExpression':return Object.fromEntries(n.properties.map(p=>[p.key.name||p.key.value,value(p.value)]));
      case 'CallExpression':{const obj=n.callee.type==='MemberExpression'?value(n.callee.object):undefined;const fn=value(n.callee);if(typeof fn!=='function')throw new Error('Invalid editor handler');return fn.apply(obj,n.arguments.map(value));}
      case 'UnaryExpression':{const v=value(n.argument);if(n.operator==='!')return !v;if(n.operator==='-')return -v;if(n.operator==='+')return +v;if(n.operator==='typeof')return typeof v;break;}
      case 'ConditionalExpression':return value(n.test)?value(n.consequent):value(n.alternate);
      case 'LogicalExpression':return n.operator==='&&'?(value(n.left)&&value(n.right)):n.operator==='??'?(value(n.left)??value(n.right)):(value(n.left)||value(n.right));
      case 'BinaryExpression':{const a=value(n.left),b=value(n.right);switch(n.operator){case '+':return a+b;case '-':return a-b;case '*':return a*b;case '/':return a/b;case '===':return a===b;case '!==':return a!==b;case '==':return a==b;case '!=':return a!=b;case '>':return a>b;case '<':return a<b;case '>=':return a>=b;case '<=':return a<=b;}break;}
      case 'AssignmentExpression':{const v=value(n.right);if(n.left.type==='Identifier')env[n.left.name]=v;else{const o=value(n.left.object),key=n.left.computed?value(n.left.property):n.left.property.name;if(forbidden.has(key))throw new Error('Invalid handler property');o[key]=v;}return v;}
      case 'SequenceExpression':{let v;for(const item of n.expressions)v=value(item);return v;}
    }
    throw new Error(`Unsupported editor handler expression ${n.type}`);
  }
  function statement(n){
    if(n.type==='ExpressionStatement')return value(n.expression);
    if(n.type==='ReturnStatement')return n.argument?value(n.argument):undefined;
    if(n.type==='BlockStatement'){let v;for(const s of n.body)v=statement(s);return v;}
    if(n.type==='IfStatement')return value(n.test)?statement(n.consequent):n.alternate?statement(n.alternate):undefined;
    if(n.type==='VariableDeclaration'){for(const d of n.declarations)env[d.id.name]=d.init?value(d.init):undefined;return;}
    if(n.type==='EmptyStatement')return;
    throw new Error(`Unsupported editor handler statement ${n.type}`);
  }
  let result;for(const n of ast.body)result=statement(n);if(result===false)event.preventDefault();
}

export function createEditorContext(host,definition,{id,onChange=()=>{},onError=console.error,snapshot=null,inspectorHost=null,onCardAction=null,getCardActionState=null}={}){
  const shadow=host.attachShadow({mode:'open'}),style=realDocument.createElement('style');
  style.textContent=definition.css+'\n:host{display:block;min-width:0;height:100%;overflow:hidden;isolation:isolate}:host([data-workspace-main]) .card-head{display:none!important}.editor-document,.editor-body{height:100%;min-height:0!important;overflow:hidden}.editor-body>.layout{max-width:none;height:100%;min-height:0;margin:0!important}.editor-body>header:first-child{display:none}.calculator-input-settings-trigger,.panel-settings-btn{display:none!important}'+dockStyles;
  const docRoot=realDocument.createElement('div');docRoot.className='editor-document';docRoot.lang=realDocument.documentElement.lang;
  const head=realDocument.createElement('div');head.className='editor-head';
  const body=realDocument.createElement('div');body.className='editor-body';body.innerHTML=definition.html;
  host.tabIndex=-1;
  body.addEventListener('pointerdown',e=>{if(!e.target.closest('input,textarea,select,button,a,[contenteditable]'))host.focus({preventScroll:true});});
  docRoot.append(head,body);shadow.append(style,docRoot);
  const inspectorShadow=inspectorHost?.attachShadow?.({mode:'open'})||null;
  let inspectorHead=null,inspectorBody=null,inspectorLayout=null;
  if(inspectorShadow){
    const inspectorStyle=style.cloneNode(true),root=realDocument.createElement('div');root.className='editor-document workspace-inspector-document';
    inspectorHead=realDocument.createElement('div');inspectorHead.className='editor-head';
    inspectorBody=realDocument.createElement('div');inspectorBody.className='editor-body';
    inspectorLayout=realDocument.createElement('div');inspectorLayout.className='layout workspace-editor-inspector-layout';
    inspectorBody.append(inspectorLayout);root.append(inspectorHead,inspectorBody);inspectorShadow.append(inspectorStyle,root);
  }
  const detachedCards=new Map();
  const roots=()=>[shadow,...(inspectorShadow?[inspectorShadow]:[]),...[...detachedCards.values()].map(surface=>surface.shadow)];
  const anySurfaceActive=()=>canvasActive||inspectorActive||[...detachedCards.values()].some(surface=>surface.active);
  // The original page body color is page chrome, not part of an asset display.
  const surfaceStyle=realDocument.createElement('style');surfaceStyle.textContent='.editor-document,.editor-body{background:transparent!important;border:0!important;box-shadow:none!important}.workspace-native-surface,.workspace-native-content,.workspace-native-toolbar{background:transparent!important;border:0!important;border-radius:0!important;box-shadow:none!important}';
  head.append(surfaceStyle);inspectorHead?.append(surfaceStyle.cloneNode(true));
  const findOne=selector=>roots().map(root=>root.querySelector(selector)).find(Boolean)||null;
  const findAll=selector=>roots().flatMap(root=>[...root.querySelectorAll(selector)]);
  let canvasActive=true,inspectorActive=false,disposed=false,ready=false,bridge=null,stateBinding=null,assetAdapter=null,handlers={},link={},saving=false,dock=null,bindingToken=null,forcedInteraction='',forcedInteractionGeneration=0;
  const disposal=[],readyListeners=[],loadListeners=[],listeners=[],rafs=new Map(),timers=new Set(),intervals=new Set(),workerSet=new Set(),eventBindingTokens=new WeakMap(),eventChangeDetails=new WeakMap();let sequence=0;
  const error=e=>{onError(e instanceof Error?e:new Error(String(e)));};
  const changed=(emittedBindingToken=bindingToken,detail={})=>{if(!saving&&!disposed)onChange({bindingToken:emittedBindingToken,...(!detail?.interaction&&forcedInteraction?{interaction:forcedInteraction}:{}),...(detail||{})});};
  // Viewport changes are presentation updates, never Asset edits. Observe the
  // actual drawing area (including toolbar wrapping), not the browser width.
  let viewportArea=host,viewportFrame=null,viewportSignature='',viewportForced=false;
  function getViewport(){
    const rect=viewportArea.getBoundingClientRect(),css=realWindow.getComputedStyle(viewportArea);
    return {width:Math.max(0,rect.width-parseFloat(css.paddingLeft||0)-parseFloat(css.paddingRight||0)),height:Math.max(0,rect.height-parseFloat(css.paddingTop||0)-parseFloat(css.paddingBottom||0)),compact:host.dataset.density==='compact',dpr:realWindow.devicePixelRatio||1};
  }
  function resizeViewport(force=false){
    viewportForced ||= force;
    if(disposed||viewportFrame!==null)return;
    viewportFrame=realWindow.requestAnimationFrame(()=>{
      viewportFrame=null;if(disposed||!canvasActive||!ready)return;
      const size=getViewport();if(size.width<1||size.height<1)return;
      const signature=[Math.round(size.width*10),Math.round(size.height*10),size.compact,size.dpr].join(':');
      if(!viewportForced&&signature===viewportSignature)return;
      viewportSignature=signature;viewportForced=false;
      const previous=saving;saving=true;
      try{if(assetAdapter?.viewport)assetAdapter.viewport(size);else {bridge?.resize?.();for(const l of listeners.filter(l=>l.target===realWindow&&l.type==='resize'))l.callback(new Event('resize'));}}catch(e){error(e);}finally{saving=previous;}
    });
  }
  const viewportObserver=new realWindow.ResizeObserver(()=>resizeViewport());viewportObserver.observe(host);
  disposal.push(()=>{viewportObserver.disconnect();if(viewportFrame!==null)realWindow.cancelAnimationFrame(viewportFrame);});
  const markInteraction=interaction=>{const generation=++forcedInteractionGeneration;forcedInteraction=String(interaction||'');realWindow.queueMicrotask(()=>{if(generation===forcedInteractionGeneration)forcedInteraction='';});};
  const local={};
  const workspaceSettings=realWindow.MathWorkspaceSettings;
  const settingsSessions=new Set();
  const mathApi=realWindow.MathJax?.typesetPromise?new Proxy(realWindow.MathJax,{get(target,key){
    if(key==='typesetPromise')return (elements=[body])=>{
      const run=mathQueue.then(()=>{if(!disposed)return target.typesetPromise(elements);}).then(()=>{
        const css=realDocument.getElementById('MJX-SVG-styles');if(css){if(!shadow.getElementById('MJX-SVG-styles'))head.append(css.cloneNode(true));if(inspectorShadow&&!inspectorShadow.getElementById('MJX-SVG-styles'))inspectorHead.append(css.cloneNode(true));for(const surface of detachedCards.values())if(!surface.shadow.getElementById('MJX-SVG-styles'))surface.shadow.prepend(css.cloneNode(true));}
      });mathQueue=run.catch(()=>{});return run;
    };
    if(key==='typesetClear')return (elements=[body])=>target.typesetClear(elements);
    return target[key];
  }}):null;
  const localStorageMap=new Map(Object.entries(snapshot?.storage||{}));
  const storage={getItem:k=>localStorageMap.get(String(k))??null,setItem:(k,v)=>{localStorageMap.set(String(k),String(v));changed();},removeItem:k=>{localStorageMap.delete(String(k));changed();},clear:()=>localStorageMap.clear(),key:i=>[...localStorageMap.keys()][i]??null,get length(){return localStorageMap.size;}};
  function settingsApi(value){
    if(!workspaceSettings||!value?.register)return value;
    return new Proxy(value,{get(target,key){if(key!=='register')return Reflect.get(target,key);return options=>{
      const session=target.register({...options,externalDialog:undefined,storage:workspaceSettings.storage,showTrigger:false,showCards:false});
      if(session&&!settingsSessions.has(session)){settingsSessions.add(session);disposal.push(workspaceSettings.register(definition.page,session,{host,inspectorHost,toolkit:target,settingsOnly:String(id).startsWith('workspace-settings-')}));}
      return session;
    };}});
  }
  function listen(target,type,fn,opts){
    if(type==='DOMContentLoaded'){readyListeners.push(fn);return;}
    if(type==='load'&&target===realWindow){loadListeners.push(fn);return;}
    const callback=e=>{
      const emittedBindingToken=eventBindingTokens.get(e)??bindingToken;
      if(disposed||(!anySurfaceActive()&&['keydown','keyup','pointerdown','pointermove','pointerup','mousedown','mouseup','mousemove','wheel','resize'].includes(type)))return;
      if(['keydown','keyup'].includes(type)&&!roots().some(root=>root.contains(realDocument.activeElement)||root.host===realDocument.activeElement)&&![...settingsSessions].some(session=>session.capture&&session.isOpen()))return;
      if(['pointerdown','mousedown','click'].includes(type)&&!roots().some(root=>e.composedPath().includes(root.host)))return;
      const actual=e.composedPath?.()[0];
      const event=actual&&actual!==e.target?new Proxy(e,{get(t,k){if(k==='target')return actual;const v=Reflect.get(t,k,t);return typeof v==='function'?v.bind(t):v;}}):e;
      try{typeof fn==='function'?fn.call(environment.window,event):fn.handleEvent(event);}catch(e){error(e);}finally{if(!['resize','mousemove','pointermove','pointerenter','pointerleave','mousedown','pointerdown','focus','blur','focusin','focusout'].includes(type))changed(emittedBindingToken,eventChangeDetails.get(e)||changeDetailForEvent(e));}
    };
    target.addEventListener(type,callback,opts);listeners.push({target,type,fn,callback,opts});
  }
  function unlisten(target,type,fn){const item=listeners.find(x=>x.target===target&&x.type===type&&x.fn===fn);if(item){target.removeEventListener(type,item.callback,item.opts);listeners.splice(listeners.indexOf(item),1);}}
  const timeout=(fn,ms,...args)=>{const token=realWindow.setTimeout(()=>{timers.delete(token);if(!disposed){try{fn(...args);}catch(e){error(e);}}},ms);timers.add(token);return token;};
  const raf=fn=>{const callback=t=>{try{fn(t);}catch(e){error(e);}},token=++sequence,item={fn:callback,native:null};rafs.set(token,item);if(canvasActive||inspectorActive)item.native=realWindow.requestAnimationFrame(t=>{rafs.delete(token);if(!disposed)callback(t);});return token;};
  const cancelRaf=token=>{const item=rafs.get(token);if(item?.native)realWindow.cancelAnimationFrame(item.native);rafs.delete(token);};
  class EditorWorker{
    constructor(url,options){const source=workers[canonical(url)];if(!source)throw new Error(`Worker was not packaged: ${url}`);const blob=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));const worker=new realWindow.Worker(blob,{...options,type:'classic'});workerSet.add(worker);const stop=worker.terminate.bind(worker);worker.terminate=()=>{stop();workerSet.delete(worker);URL.revokeObjectURL(blob);};return worker;}
  }
  const observer=(Name)=>class{constructor(callback){this.inner=new realWindow[Name]((...args)=>{if(!disposed&&(Name!=='ResizeObserver'||canvasActive))callback(...args);});disposal.push(()=>this.inner.disconnect());}observe(...args){this.inner.observe(...args);}unobserve(...args){this.inner.unobserve?.(...args);}disconnect(){this.inner.disconnect();}takeRecords(){return this.inner.takeRecords?.()||[];}};
  // Helpers attach non-enumerable session data with Object.defineProperty.
  // A separate proxy target keeps those expandos out of the real document.
  const facadeDocument=new Proxy(Object.create(Object.getPrototypeOf(realDocument)),{get(target,key){
    if(Object.hasOwn(target,key))return Reflect.get(target,key,target);
    if(key==='body')return body;if(key==='head')return head;if(key==='documentElement')return docRoot;if(key==='readyState')return ready?'complete':'loading';if(key==='activeElement')return roots().map(root=>root.activeElement).find(Boolean);
    if(key==='contains')return node=>roots().some(root=>root.contains(node));
    if(key==='defaultView')return environment.window;
    if(key==='getElementsByClassName')return (...args)=>roots().flatMap(root=>[...root.getElementsByClassName(...args)]);
    if(key==='getElementsByTagName')return (...args)=>roots().flatMap(root=>[...root.getElementsByTagName(...args)]);
    if(key==='getElementById')return k=>findOne(`#${CSS.escape(k)}`);
    if(key==='querySelector')return s=>s==='body'?body:s==='html'?docRoot:findOne(s);
    if(key==='querySelectorAll')return s=>findAll(s);
    if(key==='addEventListener')return (t,f,o)=>listen(realDocument,t,f,o);
    if(key==='removeEventListener')return (t,f)=>unlisten(realDocument,t,f);
    if(key==='elementFromPoint')return (...args)=>shadow.elementFromPoint?.(...args)||body;
    if(key==='createElement')return (...args)=>{const node=realDocument.createElement(...args);
      if(String(args[0]).toLowerCase()==='script'){
        let src='';Object.defineProperty(node,'src',{get:()=>src,set:url=>{src=String(url);queueMicrotask(()=>{if(disposed)return;if(/mathjax.*\/tex-(?:chtml|svg)/i.test(src)&&mathApi){mathApi.typesetPromise().then(()=>node.dispatchEvent(new Event('load'))).catch(error);return;}const run=presets[canonical(src)];if(!run){node.dispatchEvent(new Event('error'));error(new Error(`Script was not packaged: ${src}`));return;}try{run(win);node.dispatchEvent(new Event('load'));}catch(e){error(e);node.dispatchEvent(new Event('error'));}});}});
      }
      return node;};
    if(key==='title')return definition.page;
    const v=Reflect.get(realDocument,key,realDocument);return typeof v==='function'?v.bind(realDocument):v;
  },set(target,key,value){if(key==='title')return true;Reflect.set(target,key,value);return true;}});
  const pageUrl=new URL(definition.page,realDocument.baseURI);
  const location={href:pageUrl.href,pathname:pageUrl.pathname,search:'',hash:'',origin:pageUrl.origin};
  const environment={document:facadeDocument,location,localStorage:storage,sessionStorage:storage,Worker:EditorWorker,ResizeObserver:realWindow.ResizeObserver?observer('ResizeObserver'):undefined,MutationObserver:observer('MutationObserver'),requestAnimationFrame:raf,cancelAnimationFrame:cancelRaf,setTimeout:timeout,clearTimeout:t=>{timers.delete(t);realWindow.clearTimeout(t);},setInterval:(fn,ms)=>{const t=realWindow.setInterval(()=>{if((canvasActive||inspectorActive)&&!disposed)fn();},ms);intervals.add(t);return t;},clearInterval:t=>{intervals.delete(t);realWindow.clearInterval(t);},fetch:(...args)=>realWindow.fetch(...args)};
  const win=new Proxy(local,{get(target,key){
    if(key==='MathJax'&&mathApi)return mathApi;
    if(key in environment)return environment[key];if(key==='window'||key==='globalThis'||key==='self')return win;
    if(key==='addEventListener')return (t,f,o)=>listen(realWindow,t,f,o);
    if(key==='removeEventListener')return (t,f)=>unlisten(realWindow,t,f);
    if(key==='history')return {replaceState:()=>{},pushState:()=>{}};
    if(key==='matchMedia')return query=>{const media=realWindow.matchMedia(query);return {get matches(){return media.matches;},media:media.media,addEventListener:(t,f,o)=>listen(media,t,f,o),removeEventListener:(t,f)=>unlisten(media,t,f),addListener:f=>listen(media,'change',f),removeListener:f=>unlisten(media,'change',f)};};
    if(Object.hasOwn(link,key))return link[key];if(Object.hasOwn(target,key))return target[key];if(Object.hasOwn(handlers,key))return handlers[key];
    const v=realWindow[key];return typeof v==='function'&&!/^[A-Z]/.test(String(key))?v.bind(realWindow):v;
  },set(target,key,value){if(key==='MathJax'){target[key]=realWindow.MathJax?.typesetPromise?realWindow.MathJax:value;return true;}if(key==='CalculatorInputSettings')value=settingsApi(value);if(Object.hasOwn(link,key))link[key]=value;else target[key]=value;return true;}});
  environment.window=win;
  function bindInline(){
    for(const node of findAll('*'))for(const a of [...node.attributes])if(/^on[a-z]+$/.test(a.name)){
      const type=a.name.slice(2),source=a.value;node.removeAttribute(a.name);node.addEventListener(type,e=>{const emittedBindingToken=eventBindingTokens.get(e)??bindingToken;try{inlineHandler(source,{...link,...handlers,...local,window:win,document:facadeDocument,Math,Number,String,parseInt,parseFloat,JSON},node,e);}catch(e){error(e);}finally{changed(emittedBindingToken,eventChangeDetails.get(e)||changeDetailForEvent(e));}});
    }
  }
  const inlineObserver=new realWindow.MutationObserver(bindInline);inlineObserver.observe(body,{subtree:true,childList:true});if(inspectorBody)inlineObserver.observe(inspectorBody,{subtree:true,childList:true});disposal.push(()=>inlineObserver.disconnect());
  const changeDetailForEvent=e=>{const chrome=e.target.closest?.('.workspace-card-tool,.card-pin-btn,.card-head,.drag-handle');const appearance=e.target.closest?.('[data-workspace-canvas-appearance-control],[data-map-control],[data-object-kind][data-object-id]');return chrome?{interaction:'card-chrome'}:appearance?{interaction:'canvas-appearance'}:{}};
  function bindSurfaceEvents(surface){for(const type of ['input','change','click','pointerup','keyup']){const mark=e=>{eventBindingTokens.set(e,bindingToken);eventChangeDetails.set(e,changeDetailForEvent(e));},notify=e=>{const token=eventBindingTokens.get(e)??bindingToken,detail=eventChangeDetails.get(e)||changeDetailForEvent(e);if(type==='pointerup')timeout(()=>changed(token,detail),0);else changed(token,detail);};surface.addEventListener(type,mark,true);surface.addEventListener(type,notify);}}
  bindSurfaceEvents(body);if(inspectorBody)bindSurfaceEvents(inspectorBody);
  function uiSnapshot(){return {controls:findAll('input[id],select[id],textarea[id]').filter(n=>n.type!=='file').map(n=>({id:n.id,value:n.value,checked:n.checked})),cards:findAll('.card').map((n,i)=>({i,key:n.dataset.workspaceCardId,collapsed:n.classList.contains('collapsed'),hidden:n.hidden,userHidden:n.classList.contains('calculator-card-user-hidden'),pinned:n.classList.contains('is-pinned'),wide:n.dataset.cardWideState})),dock:dock?.capture(),scrollTop:host.scrollTop};}
  function restoreUi(ui){if(!ui)return;for(const c of ui.controls||[]){const n=findOne(`#${CSS.escape(c.id)}`);if(n&&n.type!=='file'){n.value=c.value;if(c.checked!==undefined)n.checked=c.checked;}}for(const c of ui.cards||[]){const list=findAll('.card'),n=c.key?list.find(n=>n.dataset.workspaceCardId===c.key):list[c.i];if(n){n.classList.toggle('collapsed',c.collapsed);n.hidden=!!c.hidden;n.classList.toggle('calculator-card-user-hidden',!!c.userHidden);n.classList.toggle('is-pinned',!!c.pinned);n.querySelector('.card-head')?.setAttribute('aria-expanded',String(!c.collapsed));if(c.wide&&win.CalculatorCards)win.CalculatorCards.setWide(n,c.wide==='wide');}}dock?.restore(ui.dock);host.scrollTop=ui.scrollTop||0;}
  function capture(){return {version:1,model:bridge?encodeState(bridge.capture()):stateBinding?encodeState(stateBinding.get(),stateBinding.classes):null,ui:uiSnapshot(),storage:Object.fromEntries(localStorageMap)};}
  function restore(s){if(!s)return;saving=true;try{if(s.storage){localStorageMap.clear();for(const [key,value] of Object.entries(s.storage))localStorageMap.set(key,String(value));}restoreUi(s.ui);if(s.model){if(bridge)bridge.restore(decodeState(s.model));else if(stateBinding)stateBinding.restore(decodeState(s.model,stateBinding.classes));}restoreUi(s.ui);assetAdapter?.afterRestore?.(s);}finally{saving=false;resizeViewport(true);}}
  // Inspector controls such as continuous frame motion also use animation frames.
  // Suspend their work only when both native surfaces are inactive.
  function syncActivity(){
    if(anySurfaceActive()){
      for(const [token,item] of rafs)if(item.native===null)item.native=realWindow.requestAnimationFrame(t=>{rafs.delete(token);if(!disposed)item.fn(t);});
    }else{
      bridge?.deactivate?.();
      for(const l of listeners.filter(l=>l.target===realWindow&&l.type==='blur'))l.callback(new Event('blur'));
      for(const item of rafs.values()){if(item.native!==null)realWindow.cancelAnimationFrame(item.native);item.native=null;}
    }
  }
  function syncSurfacePlacement(){for(const surface of [host,inspectorHost,...[...detachedCards.values()].map(item=>item.host)].filter(Boolean))surface.toggleAttribute('data-workspace-main',!!surface.closest('.workspace-canvas-pane-slot'));}
  function moveCardSurface(key,target){
    if(detachedCards.has(key))return true;
    const card=dock?.cardFor?.(key);if(!card)return false;
    const marker=realDocument.createComment('workspace card dock');card.before(marker);
    const root=target.attachShadow({mode:'open'}),documentRoot=realDocument.createElement('div'),surfaceBody=realDocument.createElement('div'),layout=realDocument.createElement('div'),side=realDocument.createElement('div');
    documentRoot.className='editor-document workspace-inspector-document';surfaceBody.className='editor-body';layout.className='layout workspace-editor-inspector-layout';side.className='side workspace-card-inspector';
    for(const css of (inspectorShadow||shadow).querySelectorAll('style'))root.append(css.cloneNode(true));
    side.append(card);layout.append(side);surfaceBody.append(layout);documentRoot.append(surfaceBody);root.append(documentRoot);
    target.tabIndex=-1;surfaceBody.addEventListener('pointerdown',e=>{if(!e.target.closest('input,textarea,select,button,a,[contenteditable]'))target.focus({preventScroll:true});});
    detachedCards.set(key,{host:target,shadow:root,card,marker,active:true});bindSurfaceEvents(surfaceBody);inlineObserver.observe(surfaceBody,{subtree:true,childList:true});syncSurfacePlacement();syncActivity();return true;
  }
  function returnCardSurface(key){const surface=detachedCards.get(key);if(!surface)return;surface.marker.before(surface.card);surface.marker.remove();surface.host.remove();detachedCards.delete(key);syncActivity();}
  function mountObjectSurfaces({content=[],toolbar=[],modify=[]}={}){
    const modifying=modify.length>0,target=modifying&&inspectorBody?inspectorBody:body;
    const shell=realDocument.createElement('section');shell.className='workspace-native-surface';shell.dataset.surfaceRole=modifying?'modify':'view';
    const bar=realDocument.createElement('div');bar.className='workspace-native-toolbar';bar.setAttribute('role','toolbar');bar.setAttribute('aria-label','View controls');
    const area=realDocument.createElement('div');area.className='workspace-native-content';
    // Move the original nodes: their listeners, drafts and calculator references survive.
    toolbar.filter(Boolean).forEach(node=>bar.append(node));
    (modifying?modify:content).filter(Boolean).forEach(node=>area.append(node));
    for(const child of [...target.children])child.hidden=true;
    if(modifying&&bar.childNodes.length)shell.append(bar);
    shell.append(area);
    if(!modifying&&bar.childNodes.length)shell.append(bar);
    target.append(shell);
    const css=realDocument.createElement('style');css.textContent='.editor-body>[hidden],.workspace-native-surface [hidden]{display:none!important}.workspace-native-surface{height:100%;min-height:0;display:flex;flex-direction:column;min-width:0}.workspace-native-toolbar{display:flex;align-items:center;flex-wrap:wrap;max-height:35%;overflow:auto;box-sizing:border-box;gap:7px 12px;padding:6px 0;border:0;flex:0 0 auto}.workspace-native-toolbar>*,.workspace-native-toolbar .canvas-toolbar{max-width:100%;flex-wrap:wrap}.workspace-native-content{flex:1;min-height:0;min-width:0;overflow:auto}.workspace-native-content>div:has(>canvas){height:100%!important;min-height:0!important;min-width:0;box-sizing:border-box}.workspace-native-surface[data-surface-role="view"] .workspace-native-content{overflow:hidden}:host([data-density="compact"]) .workspace-native-toolbar{gap:4px 8px;padding:3px 0;font-size:.72rem}:host([data-density="compact"]) .canvas-toolbar{gap:4px!important;padding:2px!important}.workspace-native-surface[data-surface-role="modify"]{height:auto}.workspace-native-surface[data-surface-role="modify"] .workspace-native-content{overflow:visible}.workspace-native-toolbar .card-body{padding:0;border:0}.calculator-input-settings-trigger{display:none!important}';
    (modifying&&inspectorHead?inspectorHead:head).append(css);
    if(!modifying){viewportArea=area;viewportObserver.observe(area);resizeViewport(true);}
    return {shell,toolbar:bar,content:area};
  }
  const api={host,inspectorHost,shadow,inspectorShadow,environment,applyState,linkGlobals:v=>{link=v;},registerHandlers:v=>{handlers=v;},registerState:v=>{stateBinding=v;},setBridge:v=>{bridge=v;},setAssetAdapter:v=>{assetAdapter={...(assetAdapter||{}),...(v||{})};},markInteraction,notifyChange:detail=>changed(bindingToken,detail),applyAssets:(snapshot,activeRef,properties,binding)=>assetAdapter?.apply?.(snapshot,activeRef,properties,binding)??false,focusAssetCard:key=>assetAdapter?.reveal?.(key)??false,captureAssetProperties:()=>assetAdapter?.capture?.()??null,captureAssetLayout:()=>assetAdapter?.layout?.()??[],captureSceneGeometry:()=>assetAdapter?.scene?.()??null,captureCanvasAppearance:()=>assetAdapter?.appearance?.()??null,setCanvasAppearanceTarget:(ref,context)=>assetAdapter?.appearanceTarget?.(ref,context)??false,assetPositionFromClient:(x,y)=>assetAdapter?.scenePoint?.(x,y)??null,collectAssets:()=>assetAdapter?.collect?.()??null,restoreAssetPayloads:snapshot=>assetAdapter?.restore?.(snapshot)??false,positionAsset:(ref,point)=>assetAdapter?.position?.(ref,point)??false,
    mountObjectSurfaces,getViewport,resizeViewport,
    setViewportElement(node){if(!node)return;viewportArea=node;viewportObserver.observe(node);resizeViewport(true);},
    setViewportDensity(value){if(host.dataset.density!==value){host.dataset.density=value;resizeViewport(true);}},
    openInputSettings(){const session=[...settingsSessions][0];if(!session)return false;const css=realDocument.createElement('style');css.textContent='.editor-body>*:not(.calculator-input-settings-overlay){display:none!important}.editor-body,.editor-document{height:auto!important;overflow:visible!important}.calculator-input-settings-overlay{position:static!important;display:block!important;padding:0!important;background:none!important}.calculator-input-settings-dialog{width:100%!important;max-height:none!important;box-shadow:none!important;border:0!important}.calculator-input-settings-header{display:none!important}';head.append(css);api.setCanvasActive(true);session.open();return true;},
    capture,restore,
    configureObjectPanel:config=>assetAdapter?.panel?.({...config,surfaceRole:config.mode,mode:config.mode==='modify'?'input':config.mode})??false,readObjectResult:()=>assetAdapter?.result?.()??null,objectIO:(action,value)=>assetAdapter?.io?.(action,value),
    setBindingToken:value=>{bindingToken=value??null;},
    listCards:()=>dock?.listCards?.().map(card=>({...card,docked:detachedCards.has(card.key)}))||[],getCardNode:key=>dock?.cardFor?.(key)||null,moveCardSurface,returnCardSurface,
    setCardSurfaceActive(key,value){const surface=detachedCards.get(key);if(!surface)return;surface.active=!!value;surface.host.hidden=!value;syncSurfacePlacement();syncActivity();if(value){dock?.update();bridge?.resize?.();}},
    setCardVisible:(key,visible)=>dock?.setVisible?.(key,visible)||false,prioritizeCard:key=>dock?.prioritizeCard?.(key)||false,focusCard:key=>dock?.focusCard?.(key)||false,refreshCardDock:()=>dock?.update?.(),
    getCardPresentation:key=>dock?.getPresentation?.(key)||null,setCardPresentation:(key,value)=>dock?.setPresentation?.(key,value)||false,
    setCardLabel(key,text,ariaLabel){const node=dock?.labelNode?.(key);if(!node)return false;mathApi?.typesetClear?.([node]);dock.setLabel?.(key,text,ariaLabel);const typeset=mathApi?.typesetPromise?.([node]);typeset?.catch(error);return true;},
    setCanvasActive(value){if(disposed)return;const activated=!canvasActive&&!!value;canvasActive=!!value;host.hidden=!canvasActive;syncSurfacePlacement();syncActivity();if(canvasActive){dock?.update();resizeViewport(activated);}},
    setInspectorActive(value){if(disposed)return;inspectorActive=!!value;if(inspectorHost)inspectorHost.hidden=!inspectorActive;syncSurfacePlacement();syncActivity();if(inspectorActive)dock?.update();},
    activate(){api.setCanvasActive(true);},deactivate(){api.setCanvasActive(false);},
    dispose(){if(disposed)return;for(const key of detachedCards.keys())returnCardSurface(key);api.setCanvasActive(false);api.setInspectorActive(false);disposed=true;mathApi?.typesetClear();for(const l of listeners)l.target.removeEventListener(l.type,l.callback,l.opts);timers.forEach(realWindow.clearTimeout);intervals.forEach(realWindow.clearInterval);workerSet.forEach(w=>w.terminate());disposal.forEach(f=>f());host.remove();inspectorHost?.remove();},
    start(){bindInline();ready=true;for(const fn of readyListeners){try{fn.call(facadeDocument,new Event('DOMContentLoaded'));}catch(e){error(e);}}for(const fn of loadListeners){try{fn.call(win,new Event('load'));}catch(e){error(e);}}bindInline();dock=createCardDock(body,{changed:detail=>changed(bindingToken,detail),resize:()=>bridge?.resize?.(),inspectorLayout,onCardAction,getCardActionState});if(snapshot)restore(snapshot);mathApi?.typesetPromise?.([body,inspectorBody].filter(Boolean)).catch(error);return api;}
  };
  return api;
}
