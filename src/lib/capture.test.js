import { describe, it, expect } from 'vitest';
import { htmlToSketch, safePageUrl } from './capture.js';
import { parseSketch } from './syntax.js';

const page = `<!doctype html><html><head><title>Acme</title><style>body{}</style><script>var a = "<p>no</p>";</script></head>
<body><nav><a href="/">Home</a><a href="/pricing">Pricing</a><a class="btn">Sign up</a></nav>
<main><h1>Ship faster</h1><p>Plans for every team &amp; budget. <a href="/x">Learn more</a></p>
<form><input type="email" placeholder="Email"><input type="password" name="password"><label><input type="checkbox"> Remember me</label>
<select name="plan"><option>Pro</option><option>Free</option></select><button type="submit">Start</button></form>
<ul><li>Fast</li><li>Cheap -> good</li></ul><hr>
<table><tr><th>Plan</th><th>Price</th></tr><tr><td>Pro</td><td>$9</td></tr></table>
<!-- <p>hidden</p> --><img src="x.png" alt="pic"></main></body></html>`;

describe('capture a page', () => {
  const sketch = htmlToSketch(page);
  it('keeps the page in order as typed lines', () => {
    expect(sketch.split('\n')).toEqual([
      '# Ship faster',
      '[Home]  [Pricing]  [Sign up]',
      'Plans for every team & budget. Learn more',
      '"Email"', '"password"', '[ ] Remember me', '[v Pro]', '[Start]',
      '- Fast', '- Cheap → good', '---',
      '| Plan | Price |', '| Pro | $9 |',
    ]);
  });
  it('drops scripts, styles and comments', () => {
    expect(sketch).not.toMatch(/no|hidden|body\{/);
  });
  it('draws with the typed syntax', () => {
    const parts = parseSketch(sketch, 0);
    expect(parts.some(p => p.presetId === 'table')).toBe(true);
    expect(parts.some(p => p.presetId === 'button')).toBe(true);
  });
  it('falls back to the page title', () => {
    expect(htmlToSketch('<html><head><title>Example Domain</title></head><body><p>Hello there</p></body></html>')).toBe('# Example Domain\nHello there');
  });
  it('caps a huge page', () => {
    expect(htmlToSketch('<p>line</p><p>row</p>'.repeat(200)).split('\n').length).toBeLessThanOrEqual(40);
  });
  it('only fetches public http pages', () => {
    expect(safePageUrl('https://example.com/a?b=1')).toBe('https://example.com/a?b=1');
    for (const bad of ['file:///etc/passwd', 'http://localhost:8787', 'http://127.0.0.1', 'http://10.0.0.1', 'http://[::1]/', 'http://user:pw@example.com', 'http://intranet', 'http://printer.local', 'javascript:alert(1)'])
      expect(safePageUrl(bad)).toBeNull();
  });
});

describe('capture for agents', async () => {
  const { callTool } = await import('./tools.js');
  it('is an API tool that returns lines, text and a project', async () => {
    const out = await callTool('html_to_wireframe', { html: '<h1>Hi</h1><button>Go</button>' });
    expect(out.source).toBe('# Hi\n[Go]');
    expect(out.project.elements.length).toBeGreaterThan(0);
  });
});
