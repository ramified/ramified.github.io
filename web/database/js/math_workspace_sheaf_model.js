(function(root){
  'use strict';
  const key=a=>a.kind+':'+a.id, copy=v=>v==null?v:JSON.parse(JSON.stringify(v));
  const direct=new Set(['abstract','locally-free','structure','tangent','cotangent','canonical','twist','divisor-line','universal-bundle']);
  const tensorLimit=6;
  let tensorExponentParser;
  let divisorBasisProvider;
  function divisorBasis(baseKey,assets){if(!divisorBasisProvider)throw new Error('Divisor mathematics is not ready.');return divisorBasisProvider(baseKey,assets);}
  function divisorCoefficients(data,assets){
    const allowed=new Set(divisorBasis(data.base,assets).map(d=>d.id)),out={};
    const gcd=(a,b)=>{a=a<0n?-a:a;while(b){const r=a%b;a=b;b=r;}return a;};
    for(const [id,value] of Object.entries(data.divisorCoefficients||{})){
      const raw=String(value).trim().replace(/\s+/g,''),match=raw.match(/^([+-]?\d+)(?:\/(\d+))?$/);
      if(!match)throw new Error('Enter a complete integer or fraction for divisor class '+id+'.');
      const num=BigInt(match[1]),den=BigInt(match[2]||'1');
      if(!den)throw new Error('A divisor coefficient cannot have zero denominator.');
      if(!num)continue;
      if(!allowed.has(id))throw new Error('Divisor class '+id+' is unavailable on this base; set its coefficient to 0.');
      const factor=gcd(num,den),n=num/factor,d=den/factor;out[id]=String(n)+(d===1n?'':'/'+d);
    }
    return out;
  }
  // Bott's algorithm for S_lambda(Omega^1) or S_lambda(T) on P^n,
  // using Omega^1=Q^*(-1), T=Q(1), and the Weyl dimension formula.
  // Reference: https://www.macaulay2.com/doc/OLD/Macaulay2-1.20/share/doc/Macaulay2/BoijSoederberg/html/_bott_lp__List_cm__Z__Z_rp.html
  function projectiveSchurCohomology(n,partition,type){
    if(!Number.isInteger(n)||n<0||n>15||!['tangent','cotangent'].includes(type)||!Array.isArray(partition)||partition.some((x,i)=>!Number.isInteger(x)||x<1||i&&x>partition[i-1]))throw new Error('Invalid projective Schur data.');
    const dims=Array(n+1).fill(0n);if(partition.length>n)return dims;
    const lambda=Array.from({length:n},(_,i)=>partition[i]||0),size=lambda.reduce((a,b)=>a+b,0);
    const dual=type==='tangent'?lambda.map((_,i)=>(lambda[0]||0)-lambda[n-1-i]):lambda;
    const twist=type==='tangent'?size+(lambda[0]||0):-size;
    const weights=[twist,...dual].map((x,i)=>x+n-i);
    if(new Set(weights).size!==weights.length)return dims;
    let degree=0;for(let i=0;i<weights.length;i++)for(let j=i+1;j<weights.length;j++)if(weights[i]<weights[j])degree++;
    const sorted=weights.slice().sort((a,b)=>b-a);let numerator=1n,denominator=1n;
    for(let i=0;i<sorted.length;i++)for(let j=i+1;j<sorted.length;j++){numerator*=BigInt(sorted[i]-sorted[j]);denominator*=BigInt(j-i);}
    dims[degree]=numerator/denominator;return dims;
  }
  function tensorParents(data={}){return Array.isArray(data.parents)?data.parents.slice():[data.first||'',data.second||''];}
  function tensorExponents(data={}){
    const parents=tensorParents(data);
    if(parents.length>tensorLimit)throw new Error('Use at most '+tensorLimit+' tensor factors.');
    return parents.map((_,index)=>{
      const raw=String(data.exponents?.[index]??'1').trim();
      if(!raw)throw new Error('Enter a complete exponent for factor '+(index+1)+'.');
      try{
        if(/^[+-]?\d+$/.test(raw))return BigInt(raw).toString();
        // Validate with the native grammar, but keep the entered expression.
        // Expanding it here could change identifier grouping in another graph.
        if(tensorExponentParser){tensorExponentParser(raw);return raw;}
        throw new Error('Symbolic exponent mathematics is not ready.');
      }catch(error){throw new Error('Exponent '+(index+1)+': '+error.message);}
    });
  }
  function degrees(raw=''){
    raw=String(raw).trim();if(!raw||raw==='0')return [];
    if(!/^\d+(?:[\s,;|]+\d+)*$/.test(raw))throw new Error('Degrees must be positive integers separated by commas, spaces, semicolons or |.');
    const values=raw.split(/[\s,;|]+/).map(Number);
    if(values.length>8)throw new Error('Use at most 8 equations.');
    if(values.some(n=>!Number.isSafeInteger(n)||n<1||n>99))throw new Error('Each degree must be an integer from 1 to 99.');
    return values;
  }
  function integer(raw,min,max,label){const n=Number(raw);if(String(raw??'').trim()===''||!Number.isSafeInteger(n)||n<min||n>max)throw new Error(label+' must be an integer from '+min+' to '+max+'.');return n;}
  function dimension(a,assets,seen=new Set()){
    if(!a||seen.has(key(a)))throw new Error('Missing or cyclic variety reference.');
    seen=new Set(seen).add(key(a));const d=a.data||{},get=k=>assets.find(a=>key(a)===k);
    switch(a.type){
      case 'point':return 0;case 'curve':return 1;
      case 'symmetric-product-curve':return integer(d.power??3,0,15,'Symmetric power');
      case 'ppav-moduli':{const g=integer(d.genus??2,1,5,'Genus');return g*(g+1)/2;}
      case 'grassmannian':{const n=integer(d.n??4,2,16,'n'),r=integer(d.r??2,1,n-1,'r'),dim=r*(n-r);if(dim>15)throw new Error('Grassmannian dimension exceeds the calculator limit 15.');return dim;}
      case 'complete-intersection':{const ds=degrees(d.degrees??''),ambient=integer(d.ambientDimension??3,0,23,'Ambient dimension'),dim=ambient-ds.length;if(dim<0||dim>15)throw new Error('Complete-intersection dimension must be from 0 to 15.');return dim;}
      case 'product':{const dim=dimension(get(d.first),assets,seen)+dimension(get(d.second),assets,seen);if(dim>15)throw new Error('Product dimension exceeds the calculator limit 15.');return dim;}
      case 'toric':return Number(get(d.fan||d.cone)?.data.ambientDimension??d.dimension);
      default:return integer(d.dimension??3,0,15,'Dimension');
    }
  }
  function endpoints(map,assets,seen=new Set()){
    if(!map||map.kind!=='map'||seen.has(key(map)))throw new Error('Missing or cyclic map reference.');
    seen=new Set(seen).add(key(map));const get=k=>assets.find(a=>key(a)===k),d=map.data||{};
    if(map.type==='composition'){const first=endpoints(get(d.domain),assets,seen),second=endpoints(get(d.codomain),assets,seen);if(first.codomain!==second.domain)throw new Error('The second map must start at the first map’s target.');return {domain:first.domain,codomain:second.codomain};}
    return {domain:d.domain,codomain:d.codomain};
  }
  function base(a,assets,seen=new Set()){
    if(!a||a.kind!=='sheaf'||seen.has(key(a)))return '';seen=new Set(seen).add(key(a));
    const d=a.data||{},get=k=>assets.find(a=>key(a)===k);
    if(direct.has(a.type))return d.base||'';
    if(['direct-sum','tensor','internal-hom'].includes(a.type)){
      const refs=a.type==='tensor'&&d.parents?d.parents:[d.first,d.second],bases=refs.map(k=>base(get(k),assets,seen));
      if(!refs.length)return d.base||'';return bases[0]&&bases.every(b=>b===bases[0])?bases[0]:'';
    }
    if(['dual','self-direct-sum','self-tensor-product','schur'].includes(a.type))return base(get(d.parent),assets,seen);
    const map=get(d.map);if(!map)return '';const e=endpoints(map,assets);
    return a.type==='ideal-sheaf'||a.type==='map-operation'&&d.operation==='pushforward'?e.codomain:e.domain;
  }
  const ignoredRefs=new Set(['id','__workspaceAssetKey','name','defaultName','tensorDefaultName','sequenceId','inclusionMapId','quotientMapId','lineage','homology','specialLabels']);
  function refs(value,out=new Set()){
    if(typeof value==='string'&&/^(variety|sheaf|map|number|complex):[^\s]+$/.test(value))out.add(value);
    else if(Array.isArray(value))value.forEach(v=>refs(v,out));
    else if(value&&typeof value==='object')for(const [k,v]of Object.entries(value))if(!ignoredRefs.has(k))refs(v,out);
    return [...out];
  }
  function references(a){const d=a.data||{};return [...new Set([...refs(d.construction),...refs(d.workspaceSheafComplex?.payload?.construction),...(d.parents||[])])].filter(k=>k!==key(a));}
  function issues(a,assets){
    if(!['variety','sheaf','map'].includes(a.kind))return [];
    const d=a.data||{},get=k=>assets.find(a=>key(a)===k);
    try{
      if(a.kind==='variety'){dimension(a,assets);return [];}
      if(a.kind==='map'){
        const e=endpoints(a,assets),from=get(e.domain),to=get(e.codomain),kind=a.type==='sheaf'?'sheaf':'variety';
        if(!from||!to||from.kind!==to.kind||!['variety','sheaf'].includes(from.kind)||a.type!=='composition'&&from.kind!==kind)throw new Error('Choose compatible map endpoints.');
        if(from.kind==='sheaf'&&base(from,assets)!==base(to,assets))throw new Error('The sheaves must have the same base variety.');
        if(a.type==='abel-jacobi'){
          if(!['curve','symmetric-product-curve'].includes(from.type))throw new Error('Abel–Jacobi requires a curve or symmetric product of a curve.');
          const c=to.data.workspaceSheafComplex?.payload?.construction||to.data.construction;
          if(c?.type!=='jacobian'||![key(from),from.data.workspaceSheafComplex?.payload?.id].includes(c.sourceId||c.curveId))throw new Error('Use Input to create or select the source’s Jacobian.');
        }
        return [];
      }
      if(a.type==='tensor')tensorExponents(d);
      const b=base(a,assets),variety=get(b);
      if(!variety||variety.kind!=='variety')throw new Error('This construction must determine a compatible base variety.');
      if(['tangent','cotangent'].includes(a.type)&&d.differentialWedge===true)integer(d.wedgeDegree??1,0,dimension(variety,assets),'Exterior degree');
      if(a.type==='divisor-line')divisorCoefficients(d,assets);
      if(a.type==='twist'){integer(d.twist??1,-24,24,'Twist');if(!['projective','complete-intersection','grassmannian'].includes(variety.type))throw new Error('O_X(r) requires projective space, a complete intersection or a Grassmannian.');}
      if(a.type==='universal-bundle'&&!['projective','grassmannian'].includes(variety.type))throw new Error('Universal bundles require projective space or a Grassmannian.');
      if(a.type==='schur'){const parts=String(d.partition??'2,1').replace(/[;|(){}\[\]]/g,',').split(/[,\s]+/).filter(Boolean).map(Number);if(!parts.length||parts.some((p,i)=>!Number.isInteger(p)||p<1||i&&p>parts[i-1])||parts.reduce((x,y)=>x+y,0)>(parts.every(p=>p===1)?15:12))throw new Error('Partition must be non-increasing positive integers with total at most 12 (exterior columns: at most 15).');}
      if(['self-direct-sum','self-tensor-product'].includes(a.type)&&String(d.multiplicity??'2').trim()==='')throw new Error('Enter a multiplicity.');
      if(['ideal-sheaf','normal-bundle','conormal-bundle','relative-tangent','relative-cotangent','map-operation'].includes(a.type)){
        const m=get(d.map),e=endpoints(m,assets),from=get(e.domain),to=get(e.codomain);
        if(from?.kind!=='variety'||to?.kind!=='variety')throw new Error('This construction requires a map of varieties.');
        if(['normal-bundle','conormal-bundle'].includes(a.type)&&dimension(from,assets)>dimension(to,assets))throw new Error('An embedding cannot have negative codimension.');
        if(['ideal-sheaf','normal-bundle','conormal-bundle','relative-tangent','relative-cotangent'].includes(a.type)&&d.confirmed!==true&&!(d.confirmed==null&&d.workspaceSheafComplex?.payload?.construction))throw new Error('Confirm the geometric hypotheses in Input before using this construction.');
        if(a.type==='map-operation'){const parent=get(d.parent);if(!parent||base(parent,assets)!==(d.operation==='pushforward'?e.domain:e.codomain))throw new Error('Choose a source sheaf on the correct side of the map.');}
      }
      return [];
    }catch(error){return [error.message];}
  }
  function remap(value,ids){
    if(typeof value==='string')return ids.get(value)||value;
    if(Array.isArray(value))return value.map(v=>remap(v,ids));
    if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,remap(v,ids)]));
    return value;
  }
  function project(a,ids,assets,properties){
    const d=a.data||{},k=key(a),saved=properties?.objects?.[k]||a.properties||{},aliases=new Map(ids);
    for(const other of assets){const old=other.data?.workspaceSheafComplex?.payload?.id;if(old)aliases.set(old,ids.get(key(other)));}
    const payload=remap(copy(d.workspaceSheafComplex?.payload||{}),aliases),n={...payload,id:ids.get(k),__workspaceAssetKey:k,name:a.name,nameDirty:true};
    if(a.kind==='variety')Object.assign(n,{type:a.type==='product'?'abstract':a.type,dim:String(d.dimension??3),genus:String(d.genus??2),symmetricProductM:String(d.power??3),symmetricProductGenus:String(d.genus??2),ppavGenus:String(d.genus??2),grassmannianR:String(d.r??2),grassmannianN:String(d.n??4),ciAmbient:String(d.ambientDimension??3),ciDegrees:String(d.degrees??''),grassmannianYoungBasis:!!saved.grassmannianYoungBasis,construction:a.type==='product'?{type:'product',varietyIds:[ids.get(d.first),ids.get(d.second)]}:remap(d.construction,aliases)||payload.construction||null});
    if(a.kind==='sheaf')Object.assign(n,{type:direct.has(a.type)?a.type:payload.type||'abstract',twist:String(d.twist??1),rank:String(payload.construction?payload.rank??'':d.rank??payload.rank??''),baseVarietyId:ids.get(base(a,assets))||ids.get(d.base)||null,basis:saved.basis||payload.basis||'chern',divisorCoefficients:copy(d.divisorCoefficients||payload.divisorCoefficients||{}),construction:remap(d.construction,aliases)||payload.construction||null});
    if(a.kind==='sheaf'){
      n.workspaceDifferentialWedge=['tangent','cotangent'].includes(a.type)&&d.differentialWedge===true?{type:a.type,degree:Number(d.wedgeDegree??1)}:null;
      if(['tangent','cotangent'].includes(a.type))n.rank=String(dimension(assets.find(v=>key(v)===d.base),assets));
    }
    if(a.kind==='map'){const e=endpoints(a,assets);Object.assign(n,{domainKind:getKind(e.domain),domainId:ids.get(e.domain),codomainKind:getKind(e.codomain),codomainId:ids.get(e.codomain),construction:a.type==='composition'?{type:'composition',mapIds:[ids.get(d.domain),ids.get(d.codomain)]}:remap(d.construction,aliases)||payload.construction||null,curve:null});}
    if(saved.homology)n.homology=copy(saved.homology);
    return n;
    function getKind(k){return assets.find(a=>key(a)===k)?.kind||null;}
  }
  function editedData(previous,type,data){
    if(previous.kind!=='sheaf'||!data.workspaceSheafComplex?.payload?.construction)return data;
    const fields=['base','first','second','parents','exponents','parent','map','operation','multiplicity','partition','exact','proper','confirmed','differentialWedge','wedgeDegree','divisorCoefficients'];
    if(type===previous.type&&!fields.some(k=>JSON.stringify(previous.data[k])!==JSON.stringify(data[k])))return data;
    const next=copy(data);delete next.construction;
    next.workspaceSheafComplex={payload:{id:data.workspaceSheafComplex.payload.id}};
    return next;
  }
  const api={direct,tensorLimit,tensorParents,tensorExponents,setTensorExponentParser(parser){tensorExponentParser=parser;},divisorBasis,divisorCoefficients,setDivisorBasisProvider(provider){divisorBasisProvider=provider;},projectiveSchurCohomology,degrees,dimension,endpoints,base,references,issues,remap,project,editedData};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MathWorkspaceSheafModel=api;
})(typeof window!=='undefined'?window:globalThis);
