const assert = require('assert');
const fs = require('fs');
const path = require('path');

const workerPath = path.join(__dirname, 'lmfdb-proxy.worker.js');

async function loadWorker() {
  const source = fs.readFileSync(workerPath, 'utf8');
  const url = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
  return (await import(url)).default;
}

async function requestField(worker, query) {
  const url = new URL('https://proxy.test/field');
  url.searchParams.set('q', query);
  const response = await worker.fetch(new Request(url), {}, { waitUntil() {} });
  return { response, body: await response.json() };
}

async function run() {
  const worker = await loadWorker();
  const requests = [];
  const labelsByJump = new Map([
    ['Qsqrt5', '2.2.5.1'],
    ['Qsqrt-3', '2.0.3.1'],
    ['Qzeta5', '4.0.125.1'],
    ['Qzeta7', '6.0.16807.1'],
    ['x^3-2', '3.1.108.1'],
    ['x^3+2', '3.1.108.1'],
    ['x^9007199254740991-2', '3.1.108.1']
  ]);
  const originalFetch = global.fetch;

  global.fetch = async (request) => {
    const url = new URL(typeof request === 'string' ? request : request.url);
    requests.push(url.toString());
    if (url.pathname === '/NumberField/') {
      const expression = url.searchParams.get('jump');
      const label = labelsByJump.get(expression);
      return label
        ? new Response(null, { status: 302, headers: { Location: `/NumberField/${label}/` } })
        : new Response('<html>No matches</html>', { status: 200, headers: { 'Content-Type': 'text/html' } });
    }
    if (url.pathname === '/api/nf_fields/') {
      const label = url.searchParams.get('label');
      const coeffs = url.searchParams.get('coeffs');
      const recordLabel = label || (coeffs === 'li-1,-1,1' ? '2.2.5.1' : '');
      return Response.json({ data: recordLabel ? [{ label: recordLabel, degree: 2, coeffs: [-5, 0, 1] }] : [] });
    }
    if (url.pathname === '/api/nf_fields_extra/') {
      return Response.json({ data: [{ label: url.searchParams.get('label'), frobs: [] }] });
    }
    throw new Error(`Unexpected URL: ${url}`);
  };

  try {
    const metaResponse = await worker.fetch(new Request('https://proxy.test/meta'), {}, { waitUntil() {} });
    const meta = await metaResponse.json();
    assert.strictEqual(meta.proxyApiVersion, 2);
    assert.ok(meta.capabilities.includes('Qzeta'));

    const square = await requestField(worker, 'Qsqrt(5)');
    assert.strictEqual(square.response.status, 200);
    assert.strictEqual(square.body.query, 'Qsqrt(5)');
    assert.strictEqual(square.body.queryType, 'nickname');
    assert.strictEqual(square.body.normalizedInput, 'Qsqrt(5)');
    assert.strictEqual(square.body.resolvedInput, 'Qsqrt5');
    assert.strictEqual(square.body.canonicalLabel, '2.2.5.1');
    assert.strictEqual(square.body.proxyApiVersion, 2);
    assert.ok(requests.some((url) => new URL(url).searchParams.get('jump') === 'Qsqrt5'));
    assert.ok(requests.some((url) => new URL(url).searchParams.get('label') === '2.2.5.1'));

    const compactSquare = await requestField(worker, 'Qsqrt-3');
    assert.strictEqual(compactSquare.response.status, 200, 'legacy QsqrtN syntax must remain supported');
    assert.strictEqual(compactSquare.body.resolvedInput, 'Qsqrt-3');

    const root = await requestField(worker, ' Qroot( 3, 2 ) ');
    assert.strictEqual(root.response.status, 200);
    assert.strictEqual(root.body.queryType, 'root');
    assert.strictEqual(root.body.normalizedInput, 'Qroot(3,2)');
    assert.strictEqual(root.body.resolvedInput, 'x^3-2');
    assert.strictEqual(root.body.canonicalLabel, '3.1.108.1');

    const negativeRoot = await requestField(worker, 'Qroot(3,-2)');
    assert.strictEqual(negativeRoot.response.status, 200);
    assert.strictEqual(negativeRoot.body.resolvedInput, 'x^3+2');

    const zeta = await requestField(worker, 'Qzeta(5)');
    assert.strictEqual(zeta.response.status, 200);
    assert.strictEqual(zeta.body.queryType, 'cyclotomic');
    assert.strictEqual(zeta.body.resolvedInput, 'Qzeta5');
    assert.strictEqual(zeta.body.canonicalLabel, '4.0.125.1');

    const largeRoot = await requestField(worker, 'Qroot(9007199254740991,2)');
    assert.strictEqual(largeRoot.response.status, 200, 'safe integer n must not have an upper degree restriction');

    for (const query of [
      'Qroot(9007199254740992,2)', 'Qroot(1,2)', 'Qroot(3,0)',
      'Qsqrt(0)', 'Qzeta(2)', 'Qroot(3)', 'Qzeta(foo)'
    ]) {
      const result = await requestField(worker, query);
      assert.strictEqual(result.response.status, 400, `${query} must be rejected as malformed or invalid`);
    }

    const malformedAlias = await requestField(worker, 'Qzeta(foo)');
    assert.match(malformedAlias.body.error, /field alias/i);
    assert.doesNotMatch(malformedAlias.body.error, /monic integer polynomial/i);

    const zeta7 = await requestField(worker, 'Qzeta(7)');
    assert.strictEqual(zeta7.response.status, 200);
    assert.strictEqual(zeta7.body.canonicalLabel, '6.0.16807.1');

    const unresolved = await requestField(worker, 'Qzeta(11)');
    assert.strictEqual(unresolved.response.status, 404);
    assert.match(unresolved.body.error, /could not resolve/i);
    assert.strictEqual(unresolved.body.proxyApiVersion, 2);

    const directStart = requests.length;
    const direct = await requestField(worker, '2.2.5.1');
    assert.strictEqual(direct.response.status, 200);
    assert.strictEqual(direct.body.canonicalLabel, '2.2.5.1');
    assert.ok(!requests.slice(directStart).some((url) => new URL(url).pathname === '/NumberField/'));

    const polynomial = await requestField(worker, 'x^2-x-1');
    assert.strictEqual(polynomial.response.status, 200);
    assert.strictEqual(polynomial.body.queryType, 'polynomial');
  } finally {
    global.fetch = originalFetch;
  }
}

run()
  .then(() => console.log('lmfdb-proxy.worker_test: natural-name aliases and canonical lookups pass'))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
