import { describe, it, expect } from 'vitest';
import { limited, onRequest } from './_middleware.js';

describe('rate limit', () => {
  it('allows 60 a minute on /api, 10 on /api/capture, and resets next minute', () => {
    const t = 1_000 * 60_000;
    for (let i = 0; i < 60; i++) expect(limited('1.1.1.1', '/api/render', t)).toBe(false);
    expect(limited('1.1.1.1', '/mcp', t)).toBe(true);
    for (let i = 0; i < 10; i++) expect(limited('1.1.1.1', '/api/capture', t)).toBe(false);
    expect(limited('1.1.1.1', '/api/capture', t)).toBe(true);
    expect(limited('2.2.2.2', '/api/render', t)).toBe(false);
    expect(limited('1.1.1.1', '/api/render', t + 60_000)).toBe(false);
  });

  it('returns 429 once over, and never touches the site', async () => {
    const next = () => new Response('ok');
    const call = (p) => onRequest({ request: new Request('https://x' + p, { headers: { 'cf-connecting-ip': '9.9.9.9' } }), next });
    for (let i = 0; i < 10; i++) await call('/api/capture');
    expect((await call('/api/capture')).status).toBe(429);
    expect((await call('/')).status).toBe(200);
  });
});
