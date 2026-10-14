// The existing site proxy is reused. No new service or CAS execution backend.
export const LMFDB_PROXY = 'https://lmfdb-proxy.ramified.workers.dev';
export async function lookupNumberField(query, fetcher = fetch) {
  if(typeof query!=='string'||!query.trim()||query.length>2000) throw new Error('Enter an LMFDB label, natural name or defining polynomial');
  const url=new URL(`${LMFDB_PROXY}/field`);url.searchParams.set('q',query.trim());
  const response=await fetcher(url.toString(),{headers:{Accept:'application/json'},credentials:'omit'});
  const payload=await response.json();
  if(!response.ok) throw new Error(typeof payload.error==='string'?payload.error:`LMFDB lookup failed (${response.status})`);
  if(!payload.field||typeof payload.field.label!=='string'||!Array.isArray(payload.field.coeffs)) throw new Error('LMFDB proxy response is missing the field record');
  return {query:query.trim(),endpoint:LMFDB_PROXY,payload,retrievedAt:new Date().toISOString()};
}
