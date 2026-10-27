(function(root){
  'use strict';
  const copy=value=>JSON.parse(JSON.stringify(value));
  function bindings(definition,assetKey,refs={}){
    if(definition.input)return {asset:assetKey||''};
    const result={};
    for(const name of Object.keys(refs).sort()){
      if(name==='active'||definition.overview&&name==='asset')continue;
      const value=refs[name];
      if(name==='nodes')result[name]=[...new Set(value||[])].sort();
      else if(value!==undefined)result[name]=value;
    }
    return result;
  }
  function identity(definition,assetKey,refs={},rule){
    return JSON.stringify([definition.id,bindings(definition,assetKey,refs),definition.id==='branching'?(rule||'diag-gl'):null]);
  }
  function create(isLive=()=>true){
    const groups=new Map(),entries=new Map();
    function unregister(id){
      const entry=entries.get(id);if(!entry)return;
      const group=groups.get(entry.key);group?.delete(id);if(!group?.size)groups.delete(entry.key);entries.delete(id);
    }
    function register(panel){
      const refs=panel.computation?.refs||{},values=bindings(panel.definition,panel.assetKey,refs);
      if(Object.values(values).flat().some(key=>typeof key==='string'&&key.includes(':')&&!isLive(key))){unregister(panel.id);return;}
      const key=identity(panel.definition,panel.assetKey,refs,panel.computation?.rule);
      if(entries.get(panel.id)?.key===key)return;
      unregister(panel.id);
      const group=groups.get(key)||new Map(),others=[...group.values()];
      if(others.length&&!panel.comparison)panel.comparison=true;
      if(panel.comparison){
        const used=new Set(others.map(other=>other.comparisonIndex||1));
        if(!panel.comparisonIndex||used.has(panel.comparisonIndex))panel.comparisonIndex=Math.max(1,...used)+1;
      }
      group.set(panel.id,panel);groups.set(key,group);entries.set(panel.id,{key,panel,bindings:copy(values)});
    }
    function sync(panels){
      const ids=new Set();for(const panel of panels){ids.add(panel.id);register(panel);}
      for(const id of entries.keys())if(!ids.has(id))unregister(id);
    }
    function find(definition,assetKey='',refs={},rule){
      const requested=bindings(definition,assetKey,refs),candidates=[];
      for(const {panel,bindings:current} of entries.values()){
        if(panel.definition.id!==definition.id)continue;
        if(rule!==undefined&&(panel.computation?.rule||'diag-gl')!==rule)continue;
        if(definition.input&&assetKey&&current.asset!==assetKey)continue;
        if(!definition.input&&Object.entries(requested).some(([name,value])=>JSON.stringify(current[name]??'')!==JSON.stringify(value)))continue;
        candidates.push(panel);
      }
      return candidates.sort((a,b)=>Number(!!a.comparison)-Number(!!b.comparison)||Number(!!a.closed)-Number(!!b.closed))[0]||null;
    }
    return {register,unregister,sync,find,clear(){groups.clear();entries.clear();},get size(){return entries.size;}};
  }
  const api={bindings,identity,create};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MathWorkspacePanelInstances=api;
})(typeof window!=='undefined'?window:globalThis);
