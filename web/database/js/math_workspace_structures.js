(function(root){
  'use strict';
  const rings=root.MathWorkspaceRings||(typeof require==='function'?require('./math_workspace_rings.js'):null);
  const presentation=root.MathWorkspacePresentation||(typeof require==='function'?require('./math_workspace_presentation.js'):null);
  const kinds=['complex','filtration','field-extension'];
  const labels={complex:'Complex',filtration:'Filtration','field-extension':'Field extension'};
  const clone=value=>JSON.parse(JSON.stringify(value));
  const key=a=>a.kind+':'+a.id;
  function term(value){
    if(typeof value==='string')return {symbol:value,ref:''};
    if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('A complex term needs a symbol or asset reference.');
    return {symbol:String(value.symbol??''),ref:String(value.ref??'')};
  }
  function normalize(kind,source={}){
    source=presentation.split(kind,source).data;
    if(kind==='filtration'){
      const objects=(source.objects??['F_0','F_1','F_2']).map(term),quotients=(source.quotients??Array.from({length:Math.max(0,objects.length-1)},(_,i)=>'G_'+i)).map(term);
      const startDegree=Number(source.startDegree??0),direction=source.direction||'increasing';
      if(!objects.length||objects.length>80||quotients.length!==objects.length-1)throw new Error('A filtration needs 1–80 terms and one subquotient between adjacent terms.');
      if(!Number.isSafeInteger(startDegree)||!['increasing','decreasing'].includes(direction))throw new Error('Choose an integer starting index and filtration direction.');
      if(!['diagram','declared'].includes(source.condition||'diagram'))throw new Error('Verification cannot be claimed without a computation certificate.');
      return {objects,quotients,startDegree,direction,condition:source.condition||'diagram',...(source.legacy?{legacy:clone(source.legacy)}:{})};
    }
    if(kind==='complex'){
      const objects=(source.objects??['A','B','C']).map(term),maps=(source.maps??Array.from({length:Math.max(0,objects.length-1)},(_,i)=>'d_'+i)).map(term);
      if(!objects.length||objects.length>80||maps.length!==objects.length-1)throw new Error('A complex needs 1–80 terms and one differential between adjacent terms.');
      const startDegree=Number(source.startDegree??0),direction=source.direction||'cochain';
      if(!Number.isSafeInteger(startDegree)||!['chain','cochain'].includes(direction))throw new Error('Choose an integer starting degree and chain or cochain direction.');
      if(!['diagram','declared'].includes(source.condition||'diagram'))throw new Error('Verification cannot be claimed without a computation certificate.');
      return {objects,maps,startDegree,direction,condition:source.condition||'diagram',...(source.legacy?{legacy:clone(source.legacy)}:{})};
    }
    if(kind==='field-extension'){
      const polynomial=String(source.polynomial??'x^2-2').trim(),generator=String(source.generator??'a').trim();
      if(!polynomial||!generator)throw new Error('Supply a defining polynomial and generator.');
      return {base:String(source.base??''),target:String(source.target??''),polynomial,generator,embedding:String(source.embedding??'').trim()};
    }
    throw new Error('Unsupported structure.');
  }
  function references(kind,data){return kind==='field'?[data.constantField].filter(Boolean):['complex','filtration'].includes(kind)?[...data.objects,...(data.maps||data.quotients)].map(t=>t.ref).filter(Boolean):[data.base,data.target].filter(Boolean);}
  function issues(asset,assets){
    const d=asset.data,get=ref=>assets.find(a=>key(a)===ref),out=[];
    if(asset.kind==='field'){
      out.push(...rings.issues(asset,assets));
    }else if(['complex','filtration'].includes(asset.kind)){
      [...d.objects,...(d.quotients||[])].forEach(t=>{if(t.ref&&!['sheaf','variety','matrix'].includes(get(t.ref)?.kind))out.push('A term references a missing or incompatible object: '+t.ref);});
      (d.maps||[]).forEach((t,i)=>{
        if(!t.ref)return;
        const map=get(t.ref);if(!map||map.kind!=='map'){out.push('A differential must reference a Map asset.');return;}
        for(const [field,index]of [['domain',i],['codomain',i+1]])if(d.objects[index].ref&&map.data[field]!==d.objects[index].ref)out.push('Differential '+(i+1)+' does not match its '+field+' term.');
      });
    }else{
      out.push(...rings.issues(asset,assets));
    }
    return out;
  }
  function complexEntry(asset,assets,view={}){
    const legacy=presentation.split(asset.kind,asset.data).data.legacy||{};
    const name=t=>t.ref?(assets.find(a=>key(a)===t.ref)?.name||t.symbol||t.ref):t.symbol;
    if(asset.kind==='filtration'){
      const objects=asset.data.objects.map(name),quotients=asset.data.quotients.map(name);
      if(asset.data.direction==='decreasing'){objects.reverse();quotients.reverse();}
      return {...legacy,...view,id:asset.id,kind:'filtration',length:objects.length,objects,maps:[],quotients,selected:true};
    }
    return {...legacy,...view,id:asset.id,kind:'chain-complex',length:asset.data.objects.length,objects:asset.data.objects.map(name),maps:asset.data.maps.map(name),selected:true};
  }
  function fromComplexEntry(entry){
    if(entry.kind==='filtration')return normalize('filtration',{objects:entry.objects,quotients:entry.quotients,legacy:entry});
    if(entry.kind&&entry.kind!=='chain-complex')throw new Error('Unsupported diagram kind.');
    return normalize('complex',{objects:entry.objects,maps:entry.maps,legacy:entry});
  }
  function extensionInput(asset,assets){
    const failures=issues(asset,assets);if(failures.length)throw new Error(failures.join(' '));
    const base=assets.find(a=>key(a)===asset.data.base),type=base.data.dataType;
    if(asset.data.embedding)throw new Error('Explicit embeddings are preserved but are not yet supported by the ramification adapter.');
    if(type==='function-field'){
      const constant=assets.find(a=>key(a)===base.data.constantField);
      if(base.data.functionFieldPolynomial)throw new Error('Ramification over an algebraic function-field base is not yet supported. Open its defining extension over the rational function field instead.');
      if(base.data.rationalFunctionVariables.length!==1||base.data.rationalFunctionVariables[0]!=='t')throw new Error('The local ramification engine requires a single base variable named t. The saved field definition was not changed.');
      if(!constant||!['finite-field','finite-extension'].includes(constant.data.dataType))throw new Error('Function-field ramification currently requires a finite constant field. The saved field definition was not changed.');
      return {baseKind:'Fqt',q:(BigInt(constant.data.finiteFieldPrime)**BigInt(constant.data.finiteFieldDegree||1)).toString(),generator:asset.data.generator,polynomial:asset.data.polynomial};
    }
    if(!['rational','number-field'].includes(type))throw new Error('This base field is not supported by the local ramification engine; no base-field substitution was made.');
    return {baseKind:type==='rational'?'Q':'lmfdb',baseQuery:base.data.numberFieldPolynomial,generator:asset.data.generator,polynomial:asset.data.polynomial};
  }
  const api={kinds,labels,normalize,references,issues,complexEntry,fromComplexEntry,extensionInput};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MathWorkspaceStructures=api;
})(typeof window!=='undefined'?window:globalThis);
