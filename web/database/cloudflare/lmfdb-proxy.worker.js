const LMFDB_API_BASE = 'https://www.lmfdb.org/api';
const FIELD_TABLE = 'nf_fields';
const EXTRA_TABLE = 'nf_fields_extra';
const FIELD_COLUMNS = [
  'label',
  'degree',
  'disc_abs',
  'disc_sign',
  'coeffs',
  'ramps',
  'local_algs',
  'r2',
  'galois_label',
  'class_number',
  'class_group'
].join(',');
const EXTRA_COLUMNS = ['label', 'frobs', 'zk'].join(',');
const CACHE_SECONDS = 6 * 60 * 60;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400'
};

export default {
  async fetch(request, env, ctx) {
    void env;
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return withCors(new Response(null, { status: 204 }));
    }

    if (request.method !== 'GET') {
      return jsonResponse({ error: 'Method not allowed.' }, 405);
    }

    if (url.pathname !== '/field') {
      return jsonResponse({ error: 'Unknown endpoint. Use /field?q=2.2.5.1.' }, 404);
    }

    try {
      const query = normalizeInput(url.searchParams.get('q') || '');
      const fieldUrl = buildFieldUrl(query);
      const fieldJson = await fetchLmfdbJson(fieldUrl, ctx);
      const record = firstRecord(fieldJson);

      if (!record) {
        const detail = query.type === 'polynomial'
          ? 'No exact API coefficient match; try the LMFDB label.'
          : 'No LMFDB number field matched this query.';
        return jsonResponse({ error: detail, query }, 404);
      }

      const label = String(record.label || '');
      const warnings = [];
      let extra = null;
      let extraUrl = null;
      if (label) {
        extraUrl = buildExtraUrl(label);
        try {
          extra = firstRecord(await fetchLmfdbJson(extraUrl, ctx));
        } catch (error) {
          warnings.push(error.message || 'Could not fetch nf_fields_extra.');
        }
      }

      return jsonResponse({
        source: 'LMFDB',
        query: query.original,
        queryType: query.type,
        normalizedInput: query.normalized,
        field: record,
        extra,
        urls: {
          field: fieldUrl,
          extra: extraUrl
        },
        warnings
      }, 200, {
        'Cache-Control': `public, max-age=${CACHE_SECONDS}`
      });
    } catch (error) {
      const status = error.status || 400;
      return jsonResponse({ error: error.message || 'Could not query LMFDB.' }, status);
    }
  }
};

function withCors(response) {
  const next = new Response(response.body, response);
  Object.entries(CORS_HEADERS).forEach(([key, value]) => next.headers.set(key, value));
  return next;
}

function jsonResponse(body, status = 200, headers = {}) {
  return withCors(new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...headers
    }
  }));
}

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  throw error;
}

function normalizeInput(raw) {
  const original = raw.trim();
  if (!original) badRequest('Missing query.');
  if (original.length > 180) badRequest('Query is too long.');
  if (/https?:\/\//i.test(original) || /[<>{}\[\];]/.test(original)) {
    badRequest('Only LMFDB labels, nicknames, and monic integer polynomials are accepted.');
  }

  if (/^\d+\.\d+\.\d+\.\d+$/.test(original)) {
    return { original, type: 'label', normalized: original, label: original };
  }

  if (/^Q$/i.test(original)) {
    return { original, type: 'nickname', normalized: 'Q', label: '1.1.1.1' };
  }

  if (/^Qi$/i.test(original)) {
    return { original, type: 'nickname', normalized: 'Qi', label: '2.0.4.1' };
  }

  const sqrtMatch = /^Qsqrt\(?([+-]?\d+)\)?$/i.exec(original.replace(/\s+/g, ''));
  if (sqrtMatch) {
    const d = squarefreePart(Number(sqrtMatch[1]));
    if (!Number.isSafeInteger(d) || d === 0 || d === 1) {
      badRequest('QsqrtN must use a nonzero nonsquare integer N.');
    }
    const discriminant = positiveMod(d, 4) === 1 ? d : 4 * d;
    const r1 = d > 0 ? 2 : 0;
    return {
      original,
      type: 'nickname',
      normalized: `Qsqrt${d}`,
      label: `2.${r1}.${Math.abs(discriminant)}.1`
    };
  }

  const coeffs = parseMonicIntegerPolynomial(original);
  return {
    original,
    type: 'polynomial',
    normalized: polynomialText(coeffs),
    coeffs
  };
}

function buildFieldUrl(query) {
  const url = new URL(`${LMFDB_API_BASE}/${FIELD_TABLE}/`);
  url.searchParams.set('_format', 'json');
  url.searchParams.set('_fields', FIELD_COLUMNS);
  if (query.label) {
    url.searchParams.set('label', query.label);
  } else if (query.coeffs) {
    url.searchParams.set('coeffs', `li${query.coeffs.join(',')}`);
  }
  return url.toString();
}

function buildExtraUrl(label) {
  const url = new URL(`${LMFDB_API_BASE}/${EXTRA_TABLE}/`);
  url.searchParams.set('_format', 'json');
  url.searchParams.set('_fields', EXTRA_COLUMNS);
  url.searchParams.set('label', label);
  return url.toString();
}

async function fetchLmfdbJson(url, ctx) {
  const request = new Request(url, {
    method: 'GET',
    headers: { Accept: 'application/json' }
  });
  const cache = globalThis.caches?.default || null;
  const cached = cache ? await cache.match(request) : null;
  if (cached) return cached.json();

  const response = await fetch(request);
  const text = await response.text();
  const trimmed = text.trimStart();
  if (trimmed.startsWith('<!doctype html') || trimmed.startsWith('<html') || /recaptcha/i.test(trimmed.slice(0, 700))) {
    const error = new Error('LMFDB returned a browser-check page instead of API JSON. Try again later or use a more specific label.');
    error.status = 502;
    throw error;
  }

  let json;
  try {
    json = JSON.parse(text);
  } catch (_) {
    const error = new Error('LMFDB returned a non-JSON response.');
    error.status = 502;
    throw error;
  }

  if (!response.ok) {
    const error = new Error(json.error || `LMFDB request failed with HTTP ${response.status}.`);
    error.status = 502;
    throw error;
  }

  if (cache && Array.isArray(json.data) && json.data.length) {
    const cacheResponse = new Response(JSON.stringify(json), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': `public, max-age=${CACHE_SECONDS}`
      }
    });
    ctx?.waitUntil(cache.put(request, cacheResponse));
  }

  return json;
}

function firstRecord(json) {
  return Array.isArray(json?.data) ? json.data[0] || null : null;
}

function squarefreePart(value) {
  const sign = value < 0 ? -1 : 1;
  let n = Math.abs(Math.trunc(value));
  let result = 1;
  for (let p = 2; p * p <= n; p += p === 2 ? 1 : 2) {
    let count = 0;
    while (n % p === 0) {
      n = Math.floor(n / p);
      count++;
    }
    if (count % 2) result *= p;
  }
  if (n > 1) result *= n;
  return sign * result;
}

function positiveMod(a, m) {
  return ((a % m) + m) % m;
}

function parseMonicIntegerPolynomial(input) {
  const source = input.replace(/\s+/g, '').replace(/\*/g, '');
  if (!source || !/^[+\-]?(?:\d*x(?:\^\d+)?|\d+)(?:[+\-](?:\d*x(?:\^\d+)?|\d+))*$/i.test(source)) {
    badRequest('Enter a monic integer polynomial such as x^2-x-1.');
  }

  const coeffs = [];
  const terms = source.match(/[+\-]?[^+\-]+/g) || [];
  terms.forEach((term) => {
    let sign = 1;
    let body = term;
    if (body.startsWith('+')) body = body.slice(1);
    if (body.startsWith('-')) {
      sign = -1;
      body = body.slice(1);
    }

    let degree = 0;
    let coeff = 0;
    const xIndex = body.toLowerCase().indexOf('x');
    if (xIndex >= 0) {
      const coeffText = body.slice(0, xIndex);
      coeff = coeffText ? Number(coeffText) : 1;
      const exponentMatch = /\^(\d+)$/.exec(body.slice(xIndex + 1));
      degree = exponentMatch ? Number(exponentMatch[1]) : 1;
    } else {
      coeff = Number(body);
    }

    if (!Number.isSafeInteger(coeff) || !Number.isSafeInteger(degree) || degree > 20) {
      badRequest('Polynomial coefficients and degree must be small integers.');
    }
    coeffs[degree] = (coeffs[degree] || 0) + sign * coeff;
  });

  while (coeffs.length && coeffs[coeffs.length - 1] === 0) coeffs.pop();
  if (coeffs.length < 3) badRequest('Polynomial degree must be at least 2.');
  if (coeffs[coeffs.length - 1] !== 1) badRequest('Polynomial must be monic.');
  for (let index = 0; index < coeffs.length; index++) coeffs[index] = coeffs[index] || 0;
  return coeffs;
}

function polynomialText(coeffs) {
  const terms = [];
  for (let degree = coeffs.length - 1; degree >= 0; degree--) {
    const coeff = coeffs[degree];
    if (!coeff) continue;
    const abs = Math.abs(coeff);
    const sign = coeff < 0 ? '-' : '+';
    const body = degree === 0
      ? String(abs)
      : `${abs === 1 ? '' : abs}x${degree === 1 ? '' : `^${degree}`}`;
    terms.push({ sign, body });
  }
  if (!terms.length) return '0';
  return terms.map((term, index) => {
    if (index === 0) return term.sign === '-' ? `-${term.body}` : term.body;
    return `${term.sign}${term.body}`;
  }).join('');
}
