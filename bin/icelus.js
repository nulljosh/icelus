#!/usr/bin/env node
// The command line. Same engine as the app, so a file drawn here opens there and back.
//
//   icelus draw [file]                 typed lines in, wireframe text out
//   icelus text <project.json> [--markdown|--ascii]
//   icelus lines <project.json>        a project back as typed lines
//   icelus project [file]              typed lines in, a project file out
//   icelus lint <project.json>         parts off the grid or on top of each other
//   icelus critique <project.json>     a design review: overlaps, cut boxes, placeholder labels, missing states
//   icelus handoff <project.json>      a Markdown build brief for a coding agent
//   icelus react|swiftui <project.json> the layout as a React component or a SwiftUI view
//   icelus deck <project.json>         every screen as a slide, one HTML file that prints to PDF
//   icelus ansi <project.json>         the wireframe in its terminal colors
//   icelus system [dir]                a design system file from a codebase's components and radius tokens
//
// No file, or "-", reads stdin.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  renderElements, gridToText, trimText, toMarkdown, toAscii, serializeProject, parseProject,
  DEFAULT_COLS, DEFAULT_ROWS,
} from '../src/lib/engine.js';
import { parseSketch, toSketch } from '../src/lib/syntax.js';
import { brokenBoxes } from '../src/lib/importer.js';
import { critique, critiqueMessage } from '../src/lib/critique.js';
import { systemFromCode, parseSystem } from '../src/lib/system.js';
import { handoff } from '../src/lib/handoff.js';
import { toReact, toSwiftUI } from '../src/lib/code.js';
import { toDeck } from '../src/lib/deck.js';
import { colorMask, toAnsi } from '../src/lib/color.js';

const USAGE = 'usage: icelus draw|text|lines|project|lint|critique|handoff|react|swiftui|deck|ansi|system [file] [--markdown|--ascii] | icelus check <file.md>...';
const SEE_THROUGH = new Set(['line', 'text', 'banner', 'paint', 'adjust']);

const draw = ({ cols, rows, elements }) => trimText(gridToText(renderElements(elements, cols, rows)));

export function lint({ cols, rows, elements }) {
  const issues = [];
  const solid = elements.filter(el => !SEE_THROUGH.has(el.presetId));
  for (const el of elements) {
    if (el.col < 0 || el.row < 0 || el.col + el.width > cols || el.row + el.height > rows) {
      issues.push(`${el.label} at ${el.col},${el.row} runs off the ${cols}x${rows} grid`);
    }
  }
  solid.forEach((a, i) => solid.slice(i + 1).forEach(b => {
    if (a.col < b.col + b.width && b.col < a.col + a.width && a.row < b.row + b.height && b.row < a.row + a.height) {
      issues.push(`${a.label} at ${a.col},${a.row} overlaps ${b.label} at ${b.col},${b.row}`);
    }
  }));
  return issues;
}

// The fenced blocks of a Markdown file, each checked for broken boxes. Lines are 1-based, as editors count.
export function checkMarkdown(md) {
  const lines = md.split('\n');
  const issues = [];
  for (let i = 0; i < lines.length; i++) {
    if (!/^\s*(```|~~~)/.test(lines[i])) continue;
    const fence = lines[i].trim().slice(0, 3);
    let end = i + 1;
    while (end < lines.length && !lines[end].trim().startsWith(fence)) end++;
    for (const b of brokenBoxes(lines.slice(i + 1, end).join('\n'))) issues.push({ line: i + 2 + b.row, col: b.col });
    i = end;
  }
  return issues;
}

// The source files of a codebase, skipping builds and dependencies. ponytail: 2000 files, add a flag if a repo needs more.
const SOURCE = /\.(jsx?|tsx?|vue|svelte|swift|kt|s?css)$/;
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.build', 'DerivedData', '.next', 'Pods']);
export function sourceFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (out.length >= 2000) break;
    const path = join(dir, name), st = statSync(path);
    if (st.isDirectory()) { if (!SKIP_DIRS.has(name) && !name.startsWith('.')) sourceFiles(path, out); }
    else if (SOURCE.test(name) && !/\.(test|spec)\./.test(name) && st.size < 500_000) out.push(path);
  }
  return out;
}

export function run([command, ...rest], read, list = sourceFiles) {
  const file = rest.find(a => !a.startsWith('--'));
  const flags = new Set(rest.filter(a => a.startsWith('--')));
  const project = () => {
    const p = parseProject(read(file));
    if (!p) throw new Error(`${file ?? 'stdin'} is not a Icelus project`);
    return p;
  };
  const sketch = () => ({ cols: DEFAULT_COLS, rows: DEFAULT_ROWS, elements: parseSketch(read(file), 0) });
  switch (command) {
    case 'draw': return { out: draw(sketch()) };
    case 'project': return { out: serializeProject(sketch()) };
    case 'lines': {
      const { source, skipped } = toSketch(project().elements);
      return { out: source, err: skipped.length ? `skipped, no typed word for: ${skipped.join(', ')}` : '' };
    }
    case 'text': {
      const text = draw(project());
      return { out: flags.has('--markdown') ? toMarkdown(text) : flags.has('--ascii') ? toAscii(text) : text };
    }
    case 'lint': {
      const issues = lint(project());
      return { out: issues.length ? issues.join('\n') : 'ok', code: issues.length ? 1 : 0 };
    }
    case 'handoff': {
      const p = project();
      return { out: handoff(p.elements, p.cols, p.rows, file ? basename(file).replace(/\.[^.]+$/, '') : 'Icelus project') };
    }
    case 'react':
    case 'swiftui': {
      const p = project();
      const name = file ? basename(file).replace(/\.[^.]+$/, '') : 'Layout';
      return { out: (command === 'react' ? toReact : toSwiftUI)(p.elements, p.cols, p.rows, name) };
    }
    case 'ansi': {
      const p = project();
      return { out: toAnsi(renderElements(p.elements, p.cols, p.rows), colorMask(p.elements, p.cols, p.rows)) };
    }
    case 'deck': {
      const p = project();
      return { out: toDeck(p.elements, p.cols, p.rows, file ? basename(file).replace(/\.[^.]+$/, '') : 'Icelus deck') };
    }
    case 'system': {
      const dir = file ?? '.';
      const system = systemFromCode(list(dir).map(path => ({ path, text: read(path) })), basename(resolve(dir)));
      return { out: JSON.stringify(system, null, 1), err: `${system.parts.length} parts, ${system.style} boxes` };
    }
    case 'critique': {
      const sysFile = rest.find(a => a.startsWith('--system='));
      const p = project(), issues = critique(p.elements, p.cols, p.rows, sysFile ? parseSystem(read(sysFile.slice(9))) : null);
      return { out: issues.length ? issues.map(i => `${i.severity}: ${critiqueMessage(i)}`).join('\n') : 'ok', code: issues.some(i => i.severity === 'error') ? 1 : 0 };
    }
    case 'check': {
      // Every fenced code block in each Markdown file: report box corners that never close.
      const files = rest.filter(a => !a.startsWith('--'));
      const issues = files.flatMap(f => checkMarkdown(read(f)).map(i => `${f}:${i.line}:${i.col + 1} box does not close`));
      return { out: issues.length ? issues.join('\n') : `ok, ${files.length} file${files.length === 1 ? '' : 's'}`, code: issues.length ? 1 : 0 };
    }
    default: return { err: USAGE, code: 2 };
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const read = f => readFileSync(!f || f === '-' ? 0 : f, 'utf8');
  try {
    const { out, err, code = 0 } = run(process.argv.slice(2), read);
    if (out) console.log(out);
    if (err) console.error(err);
    process.exit(code);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
