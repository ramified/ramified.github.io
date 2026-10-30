(function(root){
  'use strict';
  const getModule=(global,file)=>root[global]||(typeof require==='function'?require(file):null);
  const numbers=getModule('MathWorkspaceNumbers','./math_workspace_numbers.js'),rings=getModule('MathWorkspaceRings','./math_workspace_rings.js'),structures=getModule('MathWorkspaceStructures','./math_workspace_structures.js'),slicing=getModule('MathWorkspaceSlicing','./math_workspace_slicing.js');
  const keyOf=asset=>asset.kind+':'+asset.id;
  const sheaf=getModule('MathWorkspaceSheafModel','./math_workspace_sheaf_model.js');
  const topology=getModule('MathWorkspaceTopology','./math_workspace_topology.js'),mosaic=getModule('MathWorkspaceMosaic','./math_workspace_mosaic.js');
  function dependencies(asset){
    const refs=(asset.dependencies||[]).map(keyOf),data=asset.data;
    if(topology.kinds.includes(asset.kind))refs.push(data.source);
    if(asset.kind==='mosaic-diagram')refs.push(data.space);
    if(asset.kind==='number'||asset.kind==='matrix')refs.push(data.field);
    if(asset.kind==='field'&&data.dataType==='function-field')refs.push(data.constantField);
    if(asset.kind==='field-extension')refs.push(data.base,data.target);
    if(asset.kind==='matrix'&&data.construction)refs.push(data.construction.lie);
    for(const spec of numbers.references(asset.kind,asset.type))if(spec.scalar)refs.push(numbers.referenceKey(data,spec));
    refs.push(...sheaf.references(asset));
    return [...new Set(refs.filter(Boolean))];
  }
  function localIssues(asset,assets){
    try{
      if(topology.kinds.includes(asset.kind))return topology.issues(asset,assets);
      if(asset.kind==='mosaic-diagram')return mosaic.issues(asset,assets);
      const issues=rings.issues(asset,assets);
      if(issues.length)return issues;
      const sheafIssues=sheaf.issues(asset,assets);if(sheafIssues.length)return sheafIssues;
      if(asset.kind==='number'){
        if(asset.data.hasValue&&!numbers.isReady())return [];
        try{numbers.evaluate(asset,assets);}catch(error){
          const ring=assets.find(item=>keyOf(item)===asset.data.field);
          return [asset.data.hasValue&&ring ? asset.data.value+' is not usable in '+(ring.plainName||ring.name||ring.data.dataType)+'. '+error.message : error.message];
        }
      }
      if(asset.kind==='matrix'){
        const matrix=slicing.materialize(asset,assets),ring=assets.find(item=>keyOf(item)===asset.data.field)||{kind:'field',id:'matrix-coefficients',data:matrix.data};
        if(!numbers.isReady())return [];
        const checked=new Set();
        for(let row=0;row<matrix.data.rows;row++)for(let col=0;col<matrix.data.cols;col++){
          const value=String(matrix.data.entries[row][col]).trim()||'0';if(checked.has(value))continue;checked.add(value);
          try{numbers.evaluate({kind:'number',id:'entry',name:'entry',data:{field:keyOf(ring),hasValue:true,value}},[ring]);}
          catch(error){return ['Entry ('+(row+1)+', '+(col+1)+'): '+error.message];}
        }
      }
      for(const spec of numbers.references(asset.kind,asset.type))if(spec.scalar)numbers.scalar(asset,spec,assets);
      return [];
    }catch(error){return [error.message];}
  }
  function analyze(assets){
    const byKey=new Map(assets.map(asset=>[keyOf(asset),asset])),result={},visiting=new Set();
    function visit(asset){
      const key=keyOf(asset);
      if(result[key])return result[key];
      if(visiting.has(key))return {valid:false,issues:[{sourceKey:key,message:'Cyclic asset reference.'}]};
      visiting.add(key);
      let issues=[];
      for(const ref of dependencies(asset)){
        const dependency=byKey.get(ref);
        if(dependency)issues.push(...visit(dependency).issues);
        else issues.push({sourceKey:key,message:'Missing asset: '+ref});
      }
      if(!issues.length)issues=localIssues(asset,assets).map(message=>({sourceKey:key,message}));
      const unique=new Map(issues.map(issue=>[issue.sourceKey+'\n'+issue.message,issue]));
      result[key]={valid:!unique.size,issues:[...unique.values()]};visiting.delete(key);
      return result[key];
    }
    assets.forEach(visit);return result;
  }
  function messages(diagnostic,assets){
    return (diagnostic?.issues||[]).map(issue=>{
      const source=assets.find(asset=>keyOf(asset)===issue.sourceKey);
      return (source?(source.plainName||source.name)+': ':'')+issue.message;
    });
  }
  const api={dependencies,localIssues,analyze,messages};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MathWorkspaceDiagnostics=api;
})(typeof window!=='undefined'?window:globalThis);
