// Rate limit for /api and /mcp: 60 a minute per IP, 10 a minute on /api/capture (it fetches other sites).
// ponytail: counts live per isolate, so the cap is per Cloudflare location and resets when an isolate recycles.
// Pages has no ratelimit binding; a zone WAF rule makes it global once a token with Zone WAF Edit exists.
const hits = new Map();

export function limited(ip, path, now = Date.now()) {
  const capture = path.startsWith('/api/capture');
  const key = (capture ? 'c:' : 'a:') + ip;
  const minute = Math.floor(now / 60000);
  const h = hits.get(key);
  if (h && h.m === minute) return ++h.n > (capture ? 10 : 60);
  if (hits.size > 10000) hits.clear();
  hits.set(key, { m: minute, n: 1 });
  return false;
}

export async function onRequest({ request, next }) {
  const { pathname } = new URL(request.url);
  if (/^\/(api|mcp)(\/|$)/.test(pathname) && limited(request.headers.get('cf-connecting-ip') || '', pathname)) {
    return new Response('Too many requests, try again in a minute.', {
      status: 429,
      headers: { 'retry-after': '60', 'access-control-allow-origin': '*' },
    });
  }
  return next();
}
