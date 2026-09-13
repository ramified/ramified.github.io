function database() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('pure-math-workspace', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('projects');
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
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
