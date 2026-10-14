// Session values preserve Maps, Sets, BigInts and local mathematical classes.
// DOM nodes, functions and cycles are runtime resources, never saved objects.
export function encodeState(value, classes = {}, ancestors = new Set()) {
  if(typeof value === 'bigint') return {$kind:'bigint',value:String(value)};
  if(value === undefined) return {$kind:'undefined'};
  if(typeof value === 'number' && (!Number.isFinite(value)||(Number.isInteger(value)&&!Number.isSafeInteger(value)))) return {$kind:'number',value:String(value)};
  if(value === null || typeof value !== 'object') { if(typeof value==='function') return {$kind:'runtime'}; return value; }
  if(typeof Node!=='undefined' && value instanceof Node) return {$kind:'runtime'};
  if(ancestors.has(value)) return {$kind:'runtime'};
  const chain=new Set(ancestors);chain.add(value);
  const pack=v=>encodeState(v,classes,chain);
  if(value instanceof Map) return {$kind:'map',entries:[...value].map(([k,v])=>[pack(k),pack(v)])};
  if(value instanceof Set) return {$kind:'set',entries:[...value].map(pack)};
  if(ArrayBuffer.isView(value)) return {$kind:'typed',name:value.constructor.name,entries:Array.from(value,pack)};
  if(Array.isArray(value)) return value.map(pack);
  const name=Object.keys(classes).find(k=>Object.getPrototypeOf(value)===classes[k]?.prototype);
  // Observers, promises, workers, contexts and DOM services must be recreated
  // by the editor; restoring a plain object in their place loses their methods.
  if(!name&&![Object.prototype,null].includes(Object.getPrototypeOf(value)))return {$kind:'runtime'};
  return {$kind:'object',...(name?{name}:{}),entries:Object.entries(value).map(([k,v])=>[k,pack(v)])};
}
export function decodeState(value, classes = {}) {
  if(value===null||typeof value!=='object') return value;
  if(Array.isArray(value)) return value.map(v=>decodeState(v,classes));
  const unpack=v=>decodeState(v,classes);
  switch(value.$kind){
    case 'bigint': return BigInt(value.value);
    case 'undefined': case 'runtime': return undefined;
    case 'number': return Number(value.value);
    case 'map': return new Map(value.entries.map(([k,v])=>[unpack(k),unpack(v)]));
    case 'set': return new Set(value.entries.map(unpack));
    case 'typed': {const allowed={Float64Array,Float32Array,Uint8Array,Uint32Array,Int32Array,Uint16Array,Int16Array,Int8Array};if(!allowed[value.name]) throw new Error('Unsupported typed array');return new allowed[value.name](value.entries.map(unpack));}
    case 'object': {
      const result=value.name&&classes[value.name]?Object.create(classes[value.name].prototype):{};
      for(const [key,v] of value.entries){if(['__proto__','constructor','prototype'].includes(key)) throw new Error('Invalid session property');result[key]=unpack(v);}
      return result;
    }
    default: throw new Error('Unsupported session encoding');
  }
}
export function applyState(target,source){
  if(source===undefined)return target;
  if(source===null||typeof source!=='object'||source instanceof Map||source instanceof Set||ArrayBuffer.isView(source))return source;
  if(Array.isArray(source))return source.map((v,i)=>applyState(target?.[i],v));
  const result=target&&typeof target==='object'&&!Array.isArray(target)?target:Object.create(Object.getPrototypeOf(source));
  for(const [k,v] of Object.entries(source))if(v!==undefined)result[k]=applyState(result[k],v);
  return result;
}
