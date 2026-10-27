(function(root){
  'use strict';
  const clone=value=>JSON.parse(JSON.stringify(value));
  const record=value=>value&&typeof value==='object'&&!Array.isArray(value);
  const complexFields=['display','snakeLayout','selected'];
  const drawingFields=['labelX','labelY','labelT','labelOffset','labelPositionDirty','hiddenOnCanvas','curve','defaultBendPx'];
  function split(kind,source={}){
    const data=clone(source),view={};
    const take=(from,fields,name)=>{if(!record(from))return;for(const field of fields)if(Object.hasOwn(from,field)){(view[name]||={})[field]=from[field];delete from[field];}};
    if(['complex','filtration'].includes(kind))take(data.legacy,complexFields,'complex');
    if(['variety','sheaf','map'].includes(kind))take(data.workspaceSheafComplex?.payload,[...drawingFields,...(kind==='map'?['modified']:[])],'sheaf');
    return {data,view};
  }
  function layout(view){
    if(!record(view))return null;
    const hidden=view.hiddenOnCanvas===true;
    if(Number.isFinite(view.labelT)&&Number.isFinite(view.labelOffset))return {x:view.labelT,y:view.labelOffset,mode:'map-curve',hidden,...(view.curve?{curve:clone(view.curve)}:{}),...(Number.isFinite(view.defaultBendPx)?{defaultBendPx:view.defaultBendPx}:{}),modified:view.modified===true};
    if(Number.isFinite(view.labelX)&&Number.isFinite(view.labelY))return {x:view.labelX,y:view.labelY,hidden};
    return {hidden};
  }
  function validate(entries,assets){
    if(!Array.isArray(entries))throw new Error('Invalid saved view defaults.');
    const keys=new Set(),live=new Set(assets.map(a=>a.kind+':'+a.id));
    for(const entry of entries){
      if(!Array.isArray(entry)||entry.length!==2||!live.has(entry[0])||keys.has(entry[0])||!record(entry[1]))throw new Error('Invalid saved view defaults.');
      keys.add(entry[0]);
      for(const [type,value]of Object.entries(entry[1]))if(!['complex','sheaf'].includes(type)||!record(value))throw new Error('Invalid saved view defaults.');
    }
  }
  // Imported defaults seed each renderer once. Live appearance belongs to that
  // renderer and is backed up with its panel, never written into asset.data.
  function migrateWorkspace(value){
    const entries=value.workspace.viewDefaults||[];validate(entries,value.assets);
    const defaults=new Map(clone(entries));
    for(const asset of value.assets){const {data,view}=split(asset.kind,asset.data);asset.data=data;if(Object.keys(view).length)defaults.set(asset.kind+':'+asset.id,{...view,...defaults.get(asset.kind+':'+asset.id)});}
    for(const instance of value.assetCards?.instances||[]){
      const kind=instance.targetRef?.kind;
      if(instance.draft?.data)instance.draft.data=split(kind,instance.draft.data).data;
      if(instance.baseDefinition?.data)instance.baseDefinition.data=split(kind,instance.baseDefinition.data).data;
    }
    value.workspace.viewDefaults=[...defaults];return value;
  }
  const api={split,layout,validate,migrateWorkspace};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MathWorkspacePresentation=api;
})(typeof window!=='undefined'?window:globalThis);
