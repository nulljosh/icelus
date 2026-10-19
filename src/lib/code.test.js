import { describe, it, expect } from 'vitest';
import { transformSync } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { toReact, toSwiftUI, componentName, readPart } from './code.js';
import { parseSketch } from './syntax.js';
import { screenFrame } from './lines.js';

// Compile the component for real and render it, so "it compiles" is tested, not assumed.
function render(source) {
  const { code } = transformSync(source, { loader: 'jsx', format: 'cjs', jsx: 'transform' });
  const mod = { exports: {} };
  new Function('React', 'module', 'exports', code)(React, mod, mod.exports);
  return renderToStaticMarkup(React.createElement(mod.exports.default));
}

describe('code export', () => {
  const screen = { id: 's', presetId: 'screen', label: 'Screen', text: 'Sign in', col: 0, row: 0, width: 30, height: 12, template: screenFrame('Sign in', 30, 12) };
  const parts = parseSketch('"Email"\n[Email___]\n[x] Remember me\n[Sign in]', 2, 2);
  const els = [screen, ...parts];

  it('names components safely', () => {
    expect(componentName('sign-in flow')).toBe('SignInFlow');
    expect(componentName('3 screens')).toBe('Layout3Screens');
    expect(componentName('')).toBe('Layout');
    expect(componentName('</script>{x}')).toBe('ScriptX');
  });

  it('reads parts as the controls they stand for', () => {
    expect(readPart(parts.at(-1))).toEqual({ kind: 'button', label: 'Sign in' });
    expect(readPart(parts.find(p => p.presetId === 'checkbox'))).toEqual({ kind: 'checkbox', on: true, label: 'Remember me' });
  });

  it('a React component that compiles and renders the real controls', () => {
    const html = render(toReact(els, 60, 20, 'Acme'));
    expect(html).toContain('<section class="screen" aria-label="Sign in"');
    expect(html).toContain('<button type="button">Sign in</button>');
    expect(html).toMatch(/<input type="checkbox" checked=""\/> Remember me/);
    expect(html).toContain('left:2ch');
  });

  it('typed text stays text: braces, quotes, tags and backticks', () => {
    const evil = '{alert(1)}</style><script>"`${x}`\\';
    const el = { id: 't', presetId: 'text', label: 'Text', template: [evil], col: 0, row: 0, width: 40, height: 1 };
    const html = render(toReact([el, { ...el, presetId: 'evil" onload="x' }], 40, 2, evil));
    expect(html).toContain('{alert(1)}&lt;/style&gt;&lt;script&gt;&quot;`${x}`\\');
    expect(html).not.toContain('<script>');
    const swift = toSwiftUI([el], 40, 2, evil);
    expect(swift).toContain('Text(verbatim: "{alert(1)}</style><script>\\"`${x}`\\\\")');
    expect(swift).toContain('struct Alert1StyleScriptXView: View');
  });

  it('a SwiftUI view on the grid', () => {
    const swift = toSwiftUI(els, 60, 20, 'Acme');
    expect(swift).toContain('struct AcmeView: View');
    expect(swift).toContain('Button {} label: { Text(verbatim: "Sign in") }');
    expect(swift).toContain('Toggle(isOn: .constant(true)) { Text(verbatim: "Remember me") }');
    expect(swift).toMatch(/\.offset\(x: 2 \* ch, y: \d+ \* row\)/);
  });

  it('an empty canvas and huge coordinates still make valid files', () => {
    expect(render(toReact([], 10, 5))).toContain('<main class="icelus"');
    const big = { id: 'b', presetId: 'button', label: 'B', template: ['[ Go ]'], col: 1e9, row: -5, width: 'x', height: 1 };
    const html = render(toReact([big], 10, 5));
    expect(html).toContain('left:1000000000ch');
    expect(html).toContain('top:calc(0 * var(--row))');
    expect(toSwiftUI([big], 10, 5)).toContain('.frame(width: 0 * ch');
  });
});
