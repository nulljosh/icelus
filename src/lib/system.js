// A design system from code, Claude Design's "design system from your codebase" for a text grid. Read a repo's
// components (React, Vue, Svelte, SwiftUI, Compose) and its radius tokens, and make a part library: each
// component drawn the way its kind looks in text, in the box style the code uses. A system file is
// { icelusSystem: 1, name, style, parts: [{ label, template }] }. Load it in the app and its parts join Mine;
// Review then checks screens against its style. Native reads system files in Palette.swift.
import { styleChar } from './lines.js';
import { maxOf } from './extent.js';

export const SYSTEM_STYLES = ['single', 'rounded'];
const MAX_PARTS = 60;
const SKIP = /(Provider|Context|Store|Hook|Test|Spec|Preview|Story|Stories)$/;
const DECLARE = [
  /\bfunction\s+([A-Z][A-Za-z0-9]+)\s*\(/g, // function Button(
  /\b(?:const|let)\s+([A-Z][A-Za-z0-9]+)\s*=\s*(?:\(|React\.|forwardRef|memo|styled)/g, // const Card = (
  /\bclass\s+([A-Z][A-Za-z0-9]+)\s+extends\s+(?:React\.)?(?:Pure)?Component\b/g,
  /\bstruct\s+([A-Z][A-Za-z0-9]+)\s*:\s*(?:[A-Za-z, ]*\b)?View\b/g, // struct ProfileCard: View
  /@Composable\s+(?:private\s+|internal\s+)?fun\s+([A-Z][A-Za-z0-9]+)\s*\(/g,
];
const RADIUS = [/border-radius\s*:\s*(\d+)/g, /--r[a-z-]*\s*:\s*(\d+)px/g, /cornerRadius:\s*(\d+)/g, /RoundedCornerShape\((\d+)/g];

// Split PascalCase into words and drop the kind word: PrimaryButton is "Primary".
const words = (name, kind) => {
  const all = name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2').split(' ');
  const rest = all.filter(w => !kind.test(w));
  return (rest.length ? rest : all).join(' ');
};
const box = (title, rows = 2) => {
  const w = Math.max(16, [...title].length + 6);
  return [`┌─ ${title} ${'─'.repeat(w - 5 - [...title].length)}┐`, ...Array(rows).fill(`│${' '.repeat(w - 2)}│`), `└${'─'.repeat(w - 2)}┘`];
};
const KINDS = [
  [/^(Button|Btn|Cta)$/i, w => [`[ ${w} ]`]],
  [/^(Input|Field|Textfield|Textbox|Search|Textarea)$/i, w => [w, `[${'_'.repeat(Math.max(14, w.length + 2))}]`]],
  [/^(Checkbox|Check)$/i, w => [`[x] ${w}`]],
  [/^(Radio)$/i, w => [`(o) ${w}`]],
  [/^(Toggle|Switch)$/i, w => [`[●──] ${w}`]],
  [/^(Select|Dropdown|Picker|Menu)$/i, w => [`[ ${w} ▾ ]`]],
  [/^(Badge|Tag|Chip|Pill|Label)$/i, w => [`( ${w} )`]],
  [/^(Icon|Glyph)$/i, w => [`[${w[0]}]`]],
  [/^(Avatar)$/i, w => [`(${w.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase().padEnd(2)})`]],
  [/^(Nav|Navbar|Header|Toolbar|Tabbar|Appbar|Topbar)$/i, w => { const t = `│ ${w} `; const n = Math.max(24, t.length + 4); return [`┌${'─'.repeat(n - 2)}┐`, `${t}${' '.repeat(n - t.length - 3)}≡ │`, `└${'─'.repeat(n - 2)}┘`]; }],
  [/^(List|Table|Grid|Feed)$/i, w => { const b = box(w, 3); b.splice(2, 0, `├${'─'.repeat([...b[0]].length - 2)}┤`); return b; }],
];
function draw(name) {
  const last = name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').split(' ').at(-1);
  for (const [kind, make] of KINDS) if (kind.test(last)) return make(words(name, kind));
  return box(words(name, /^$/));
}

// files: [{ path, text }]. A Vue or Svelte file is a component named after itself.
export function systemFromCode(files, name = 'Design system') {
  const names = new Set(), radii = [];
  for (const { path = '', text = '' } of files) {
    const file = path.match(/([A-Z][A-Za-z0-9]+)\.(vue|svelte)$/);
    if (file) names.add(file[1]);
    for (const re of DECLARE) for (const m of text.matchAll(re)) names.add(m[1]);
    for (const re of RADIUS) for (const m of text.matchAll(re)) radii.push(Number(m[1]));
  }
  const rounded = radii.filter(r => r > 0).length > radii.length / 2;
  const style = rounded ? 'rounded' : 'single';
  const parts = [...names].filter(n => !SKIP.test(n) && n.length <= 40).sort().slice(0, MAX_PARTS)
    .map(label => ({ label, template: draw(label).map(l => [...l].map(ch => styleChar(ch, style)).join('')) }));
  return { icelusSystem: 1, name: String(name).slice(0, 40), style, parts };
}

// A system file read back, kept only if well formed. Parts become Mine palette parts.
export function parseSystem(raw) {
  let d;
  try { d = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return null; }
  if (!d || d.icelusSystem !== 1 || !Array.isArray(d.parts)) return null;
  const parts = d.parts.filter(p => p && typeof p.label === 'string' && p.label.length <= 40 && Array.isArray(p.template)
    && p.template.length > 0 && p.template.length <= 60 && p.template.every(l => typeof l === 'string' && l.length <= 200)).slice(0, MAX_PARTS);
  return { icelusSystem: 1, name: typeof d.name === 'string' ? d.name.slice(0, 40) : 'Design system',
    style: SYSTEM_STYLES.includes(d.style) ? d.style : 'single', parts: parts.map(({ label, template }) => ({ label, template })) };
}

// Add a system's parts to the palette, replacing parts of the same name, so loading it twice changes nothing.
export function withSystem(palette, system) {
  const names = new Set(system.parts.map(p => p.label));
  const kept = palette.filter(p => !names.has(p.label));
  return [...kept, ...system.parts.map(p => ({ id: `mine-sys-${p.label}`, label: p.label, category: 'Mine', template: p.template,
    width: Math.max(1, maxOf(p.template.map(l => [...l].length))), height: p.template.length }))].slice(-100);
}
