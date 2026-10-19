// The layout as code that compiles: a React component with plain CSS, or a SwiftUI view. Each part becomes
// the control it stands for (the same reading as html.js), placed on the character grid. Every string goes
// in as a quoted literal, never as markup or interpolation, so nothing a person typed can break the file.
// Ported line for line in ios/App/Code.swift.

const first = (el, re) => el.template[0]?.match(re);
const n = v => Math.max(0, Math.round(Number(v) || 0));

/** What a part is, read from its characters: { kind, ... }. Unknown parts are 'pre' with their lines. */
export function readPart(el) {
  const t = el.template[0] ?? '';
  let m;
  switch (el.presetId) {
    case 'screen': return { kind: 'screen', title: el.text ?? 'Screen' };
    case 'button': return { kind: 'button', label: first(el, /^\[\s*(.*?)\s*\]$/)?.[1] ?? t };
    case 'input': return { kind: 'input', placeholder: first(el, /^\[\s*(.*?)_*\s*\]$/)?.[1] ?? '' };
    case 'checkbox':
      if ((m = first(el, /^\[(.)\]\s*(.*)$/))) return { kind: 'checkbox', on: m[1] !== ' ', label: m[2] };
      break;
    case 'radio':
      if ((m = first(el, /^\((.)\)\s*(.*)$/))) return { kind: 'radio', on: m[1] !== ' ', label: m[2] };
      break;
    case 'select': return { kind: 'select', value: first(el, /^\[▾\s*(.*?)\s*\]$/)?.[1] ?? '' };
    case 'divider': return { kind: 'divider' };
    case 'banner': return { kind: 'heading', text: el.text ?? el.label ?? '' };
    case 'text': return { kind: 'text', lines: [...el.template] };
    case 'table': {
      const rows = el.template.filter(l => l.includes('│')).map(l => l.split('│').slice(1, -1).map(c => c.trim()));
      if (rows.length) return { kind: 'table', head: rows[0], body: rows.slice(1) };
    }
  }
  return { kind: 'pre', lines: [...el.template] };
}

/** A component name from a project name: PascalCase letters and digits, never starting with a digit. */
export function componentName(name) {
  const words = String(name ?? '').normalize('NFKD').replace(/[^A-Za-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);
  const id = words.map(w => w[0].toUpperCase() + w.slice(1)).join('').slice(0, 60);
  return !id ? 'Layout' : /^[0-9]/.test(id) ? `Layout${id}` : id;
}

const js = s => JSON.stringify(String(s)); // a JS string literal; in JSX it goes inside {}

function jsx(p) {
  switch (p.kind) {
    case 'button': return `<button type="button">{${js(p.label)}}</button>`;
    case 'input': return `<input placeholder={${js(p.placeholder)}} />`;
    case 'checkbox': case 'radio': return `<label><input type="${p.kind}" defaultChecked={${p.on}} /> {${js(p.label)}}</label>`;
    case 'select': return `<select><option>{${js(p.value)}}</option></select>`;
    case 'divider': return '<hr />';
    case 'heading': return `<h1>{${js(p.text)}}</h1>`;
    case 'text': return `<p>{${js(p.lines.join('\n'))}}</p>`;
    case 'table': return `<table><thead><tr>${p.head.map(c => `<th>{${js(c)}}</th>`).join('')}</tr></thead>` +
      `<tbody>${p.body.map(r => `<tr>${r.map(c => `<td>{${js(c)}}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    default: return `<pre>{${js(p.lines.join('\n'))}}</pre>`;
  }
}

const CSS = cols => `.icelus { --row: 1.5em; position: relative; font: 14px/1.5 ui-monospace, "SF Mono", Menlo, monospace; width: ${cols}ch; }
.icelus .part, .icelus .screen { position: absolute; box-sizing: border-box; }
.icelus .accent { color: #1D4ED8; }
.icelus .screen { border: 1px solid currentColor; border-radius: 8px; }
.icelus .screen h2 { margin: 0; padding: 0 1ch; font-size: inherit; }
.icelus pre, .icelus p, .icelus h1 { margin: 0; font: inherit; white-space: pre; }
.icelus h1 { font-weight: 700; font-size: 2em; line-height: calc(3 * var(--row) / 2); }
.icelus input, .icelus select, .icelus button { font: inherit; width: 100%; box-sizing: border-box; }
.icelus label input { width: auto; }
.icelus hr { margin: calc(var(--row) / 2) 0 0; }
.icelus table { border-collapse: collapse; width: 100%; }
.icelus th, .icelus td { border: 1px solid currentColor; padding: 0 1ch; text-align: left; }`;

/** One .jsx file: a React component that renders the layout, its plain CSS in a <style> beside it. */
export function toReact(elements, cols, rows, name = 'Layout') {
  const id = componentName(name);
  const parts = elements.map(el => {
    const p = readPart(el);
    const box = `style={{ left: '${n(el.col)}ch', top: 'calc(${n(el.row)} * var(--row))', width: '${n(el.width)}ch', height: 'calc(${n(el.height)} * var(--row))' }}`;
    if (p.kind === 'screen') return `      <section className="screen" aria-label={${js(p.title)}} ${box}><h2>{${js(p.title)}}</h2></section>`;
    return `      <div className={${js(`part part-${el.presetId}${el.accent ? ' accent' : ''}`)}} ${box}>${jsx(p)}</div>`;
  });
  return `// ${id}, drawn in Icelus. A React component with plain CSS; restyle it as you build.
const css = ${js(CSS(n(cols)))};

export default function ${id}() {
  return (
    <main className="icelus" style={{ height: 'calc(${n(rows)} * var(--row))' }}>
      <style>{css}</style>
${parts.join('\n')}
    </main>
  );
}
`;
}

const sw = s => `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')}"`;

function swiftUI(p) {
  switch (p.kind) {
    case 'button': return `Button {} label: { Text(verbatim: ${sw(p.label)}) }`;
    case 'input': return `TextField(${sw(p.placeholder)} as String, text: .constant(""))`;
    case 'checkbox': return `Toggle(isOn: .constant(${p.on})) { Text(verbatim: ${sw(p.label)}) }`;
    case 'radio': return `Label { Text(verbatim: ${sw(p.label)}) } icon: { Image(systemName: "${p.on ? 'largecircle.fill.circle' : 'circle'}") }`;
    case 'select': return `Menu(${sw(p.value)} as String) {}`;
    case 'divider': return 'Divider()';
    case 'heading': return `Text(verbatim: ${sw(p.text)}).font(.largeTitle.bold())`;
    case 'text': return `Text(verbatim: ${sw(p.lines.join('\n'))})`;
    case 'table': return `Grid(alignment: .leading) { ${[p.head, ...p.body].map((r, i) =>
      `GridRow { ${r.map(c => `Text(verbatim: ${sw(c)})${i ? '' : '.bold()'}`).join('; ')} }`).join('; ')} }`;
    default: return `Text(verbatim: ${sw(p.lines.join('\n'))})`;
  }
}

/** One .swift file: a SwiftUI view that places every part on the grid. Needs iOS 16 or macOS 13 (Grid). */
export function toSwiftUI(elements, cols, rows, name = 'Layout') {
  const id = `${componentName(name)}View`;
  const parts = elements.map(el => {
    const p = readPart(el);
    const view = p.kind === 'screen'
      ? `RoundedRectangle(cornerRadius: 8).stroke().overlay(alignment: .topLeading) { Text(verbatim: ${sw(p.title)}).padding(.horizontal, ch) }`
      : swiftUI(p) + (el.accent ? '.foregroundStyle(Color(red: 0.11, green: 0.31, blue: 0.85))' : '');
    return `            ${view}\n                .frame(width: ${n(el.width)} * ch, height: ${n(el.height)} * row, alignment: .topLeading)\n                .offset(x: ${n(el.col)} * ch, y: ${n(el.row)} * row)`;
  });
  return `// ${id}, drawn in Icelus. A SwiftUI view on the character grid; restyle it as you build.
import SwiftUI

struct ${id}: View {
    let ch: CGFloat = 8.4
    let row: CGFloat = 21

    var body: some View {
        ZStack(alignment: .topLeading) {
${parts.join('\n')}
        }
        .font(.system(size: 14, design: .monospaced))
        .frame(width: ${n(cols)} * ch, height: ${n(rows)} * row, alignment: .topLeading)
    }
}
`;
}
