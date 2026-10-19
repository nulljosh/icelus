import { describe, it, expect } from 'vitest';
import { encodeShare, decodeShare, MAX_SHARE } from './share.js';

describe('share links', () => {
  it('round-trips a project through a URL-safe code', async () => {
    const json = JSON.stringify({ blockprint: 1, cols: 100, rows: 50, elements: [{ template: ['┌──┐', '│ ● │', '└──┘'] }] });
    const code = await encodeShare(json);
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(await decodeShare(code)).toBe(json);
  });

  it('rejects codes that are not share codes', async () => {
    expect(await decodeShare('not a code!')).toBeNull();
    expect(await decodeShare('AAAA')).toBeNull();
  });
});

describe('decodeShare limits', () => {
  it('refuses a link that inflates past the cap', async () => {
    const bomb = await encodeShare(' '.repeat(MAX_SHARE + 1));
    expect(bomb.length).toBeLessThan(10_000);
    expect(await decodeShare(bomb)).toBeNull();
  });
});
