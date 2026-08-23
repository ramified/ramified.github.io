const LMFDB_API_BASE = 'https://www.lmfdb.org/api';
const LMFDB_NUMBER_FIELD_BASE = 'https://www.lmfdb.org/NumberField/';
const FIELD_TABLE = 'nf_fields';
const EXTRA_TABLE = 'nf_fields_extra';
const FIELD_COLUMNS = [
  'label',
  'degree',
  'disc_abs',
  'disc_sign',
  'coeffs',
  'embeddings_gen_real',
  'embeddings_gen_imag',
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
      let resolvedLabel = query.label || '';
      let jumpUrl = null;
      if (query.resolvedInput) {
        const resolved = await resolveNaturalName(query.resolvedInput);
        resolvedLabel = resolved.label;
        jumpUrl = resolved.url;
      }
      const canonicalQuery = resolvedLabel ? { ...query, label: resolvedLabel, coeffs: null } : query;
      const fieldUrl = buildFieldUrl(canonicalQuery);
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
        resolvedInput: query.resolvedInput || query.normalized,
        canonicalLabel: label,
        field: record,
        extra,
        urls: {
          jump: jumpUrl,
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

  const compact = original.replace(/\s+/g, '');
  const sqrtMatch = /^Qsqrt(?:\(([+-]?\d+)\)|([+-]?\d+))$/i.exec(compact);
  if (sqrtMatch) {
    const d = parseSafeInteger(sqrtMatch[1] || sqrtMatch[2], 'The radicand d');
    if (d === 0) badRequest('The radicand d must be nonzero.');
    return {
      original,
      type: 'nickname',
      normalized: `Qsqrt(${d})`,
      resolvedInput: `Qsqrt${d}`
    };
  }

  const rootMatch = /^Qroot\(([+-]?\d+),([+-]?\d+)\)$/i.exec(compact);
  if (rootMatch) {
    const n = parseSafeInteger(rootMatch[1], 'The root index n');
    const d = parseSafeInteger(rootMatch[2], 'The radicand d');
    if (n < 2) badRequest('The root index n must be at least 2.');
    if (d === 0) badRequest('The radicand d must be nonzero.');
    return {
      original,
      type: 'root',
      normalized: `Qroot(${n},${d})`,
      resolvedInput: pureRootPolynomial(n, d)
    };
  }

  const zetaMatch = /^Qzeta\(([+-]?\d+)\)$/i.exec(compact);
  if (zetaMatch) {
    const n = parseSafeInteger(zetaMatch[1], 'The cyclotomic index n');
    if (n < 3) badRequest('The cyclotomic index n must be at least 3.');
    return {
      original,
      type: 'cyclotomic',
      normalized: `Qzeta(${n})`,
      resolvedInput: `Qzeta${n}`
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

function parseSafeInteger(value, label) {
  const number = Number(value);
  if (!Number.isSafeInteger(number)) badRequest(`${label} must be a safe integer.`);
  return number;
}

function pureRootPolynomial(n, d) {
  return `x^${n}${d < 0 ? '+' : '-'}${Math.abs(d)}`;
}

async function resolveNaturalName(expression) {
  const url = new URL(LMFDB_NUMBER_FIELD_BASE);
  url.searchParams.set('jump', expression);
  const request = new Request(url, {
    method: 'GET',
    redirect: 'manual',
    headers: { Accept: 'text/html' }
  });
  let response;
  try {
    response = await fetch(request);
  } catch (_) {
    const error = new Error('Could not reach the LMFDB number-field resolver.');
    error.status = 502;
    throw error;
  }

  const location = response.headers.get('Location') || response.url || '';
  const label = extractCanonicalLabel(location);
  if (label) return { label, url: url.toString() };

  if (!response.ok && response.status >= 500) {
    const error = new Error(`LMFDB resolver failed with HTTP ${response.status}.`);
    error.status = 502;
    throw error;
  }

  const error = new Error(`LMFDB could not resolve ${expression} to a number field.`);
  error.status = 404;
  throw error;
}

function extractCanonicalLabel(value) {
  if (!value) return '';
  try {
    const pathname = new URL(value, LMFDB_NUMBER_FIELD_BASE).pathname;
    const match = /(?:^|\/)(\d+\.\d+\.\d+\.\d+)(?:\/|$)/.exec(pathname);
    return match ? match[1] : '';
  } catch (_) {
    return '';
  }
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
