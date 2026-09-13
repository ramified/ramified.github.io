export function workerExecutor(operation, args, { signal } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Cancelled', 'AbortError'));
    const worker = new Worker(new URL('./worker.mjs', import.meta.url), { type: 'module' });
    let timer;
    const finish = (fn, value) => { clearTimeout(timer); worker.terminate(); signal?.removeEventListener('abort', cancel); fn(value); };
    const cancel = () => finish(reject, new DOMException('Cancelled', 'AbortError'));
    signal?.addEventListener('abort', cancel, { once: true });
    timer = setTimeout(() => finish(reject, new Error('Computation exceeded the 30 second workspace budget')), 30000);
    worker.onmessage = ({ data }) => data.error ? finish(reject, Object.assign(new Error(data.error.message), { name: data.error.name })) : finish(resolve, data.value);
    worker.onerror = event => finish(reject, new Error(event.message || 'Worker failed'));
    worker.postMessage({ operation, args });
  });
}
