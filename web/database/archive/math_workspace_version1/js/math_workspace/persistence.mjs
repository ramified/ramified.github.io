function database() {
  return new Promise((resolve, reject) => {
    let finished=false;
    const fail=error=>{if(finished)return;finished=true;clearTimeout(timer);reject(error);};
    const timer=setTimeout(()=>fail(new Error('Local storage did not respond')),4000);
    let request;
    try{request=indexedDB.open('pure-math-workspace',1);}catch(error){fail(error);return;}
    request.onupgradeneeded = () => request.result.createObjectStore('projects');
    request.onsuccess = () => {if(finished){request.result.close();return;}finished=true;clearTimeout(timer);resolve(request.result);};
    request.onerror = () => fail(request.error);
    request.onblocked = () => fail(new Error('Local storage is blocked by another open page'));
  });
}
async function transact(mode, value) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('projects', mode), store = tx.objectStore('projects');
    const request = mode === 'readwrite' ? store.put(value, 'current') : store.get('current');
    tx.oncomplete = () => { db.close(); resolve(request.result); };
    tx.onerror = tx.onabort = () => { db.close(); reject(tx.error || new Error('Storage transaction failed')); };
  });
}
export const loadProject = () => transact('readonly');
let queue = Promise.resolve();
export function saveProject(value) { const snapshot = structuredClone(value); queue = queue.catch(() => {}).then(() => transact('readwrite', snapshot)); return queue; }
