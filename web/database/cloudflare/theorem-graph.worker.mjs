import { API } from './theorem-graph-common.mjs';
import { handleAPI } from './theorem-graph-api.mjs';
export { passwordHash } from './theorem-graph-common.mjs';
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith(API + '/')) return handleAPI(request, env, ctx);
    if (url.pathname === '/') return Response.redirect(url.origin + '/theorem_graph_calculator.html', 302);
    if (!env.ASSETS) return new Response('Editor assets are not built.', { status: 503 });
    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Referrer-Policy', 'no-referrer');
    headers.set('X-Frame-Options', 'DENY');
    return new Response(response.body, { status: response.status, headers });
  }
};
