import { describe, it, expect } from 'vitest';
import { toHTML } from './html.js';
import { parseSketch } from './syntax.js';

describe('HTML export', () => {
  it('turns typed parts into real elements, placed on the grid', () => {
    const html = toHTML(parseSketch('# Hi\n"Email"  [Sign in]\n[x] Remember me\n[v Country]\n| Name | Plan |\n| Ada | Pro |', 0), 60, 20);
    expect(html).toContain('<h1>Hi</h1>');
    expect(html).toContain('<input placeholder="Email">');
    expect(html).toContain('<button>Sign in</button>');
    expect(html).toContain('<input type="checkbox" checked> Remember me');
    expect(html).toContain('<select><option>Country</option></select>');
    expect(html).toContain('<thead><tr><th>Name</th><th>Plan</th></tr></thead><tbody><tr><td>Ada</td><td>Pro</td></tr>');
    expect(html).toMatch(/left:2ch;top:calc\(4 \* var\(--row\)\)/);
  });

  it('escapes everything a part can carry', () => {
    const el = { id: 'x', presetId: 'text', label: 'Text', template: ['<script>alert(1)</script>'], width: 25, height: 1, col: 0, row: 0 };
    const screen = { ...el, presetId: 'screen', text: '"><img src=x onerror=alert(1)>' };
    const html = toHTML([el, screen], 30, 2, '</title><script>');
    expect(html).not.toMatch(/<script>|<img/);
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });
});
