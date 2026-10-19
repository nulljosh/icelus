import { describe, it, expect } from 'vitest';
import { readJson, MAX_BODY } from './body.js';

const req = (body, headers = {}) => new Request('https://x/api', { method: 'POST', body, headers });

describe('readJson', () => {
  it('parses a normal body and refuses bad or oversized ones', async () => {
    expect(await readJson(req('{"a":1}'))).toEqual({ body: { a: 1 } });
    expect(await readJson(req('{nope'))).toEqual({ bad: true });
    expect(await readJson(req('x'.repeat(MAX_BODY + 1)))).toEqual({ tooLarge: true });
    expect(await readJson(req('{}', { 'content-length': String(MAX_BODY + 1) }))).toEqual({ tooLarge: true });
  });
});
