// Code export, compiled for real: one of every part through toReact (esbuild + react-dom render) and
// toSwiftUI (swiftc -typecheck for macOS and iOS). Run: node tools/code-check.mjs
import { transformSync } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PRESETS, BANNER_TOOL, TEXT_TOOL } from '../src/lib/presets.js';
import { createElement } from '../src/lib/engine.js';
import { toReact, toSwiftUI } from '../src/lib/code.js';

let row = 0;
const elements = [...PRESETS, BANNER_TOOL, TEXT_TOOL].map(p => {
  const el = createElement(p, 2, row);
  row += el.height + 1;
  return el;
});

const { code } = transformSync(toReact(elements, 100, row, 'Every part'), { loader: 'jsx', format: 'cjs', jsx: 'transform' });
const mod = { exports: {} };
new Function('React', 'module', 'exports', code)(React, mod, mod.exports);
const html = renderToStaticMarkup(React.createElement(mod.exports.default));
console.log(`react ok: ${elements.length} parts, ${html.length} bytes of markup`);

const dir = mkdtempSync(join(tmpdir(), 'icelus-code-'));
const file = join(dir, 'EveryPartView.swift');
writeFileSync(file, toSwiftUI(elements, 100, row, 'Every part'));
execFileSync('xcrun', ['swiftc', '-typecheck', file], { stdio: 'inherit' });
execFileSync('xcrun', ['--sdk', 'iphonesimulator', 'swiftc', '-typecheck', '-target', 'arm64-apple-ios17.0-simulator', file], { stdio: 'inherit' });
console.log('swiftui ok: macOS and iOS typecheck');
