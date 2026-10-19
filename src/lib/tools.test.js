// The engine is already covered by engine.test.js. This only covers the boundary the
// network surfaces add: untrusted input reaching callTool.

import { describe, it, expect } from 'vitest';
import { callTool, ToolError, MAX_TEXT } from './tools.js';
import { DEFAULT_COLS, DEFAULT_ROWS } from './engine.js';

const bad = (name, args) => expect(() => callTool(name, args)).toThrow(ToolError);

describe('list_components', () => {
  it('returns every preset with its categories', () => {
    const r = callTool('list_components', {});
    expect(r.count).toBe(r.components.length);
    expect(r.components.length).toBeGreaterThan(0);
    expect(r.categories).toContain(r.components[0].category);
  });

  it('filters by category', () => {
    const cat = callTool('list_components', {}).categories[0];
    const r = callTool('list_components', { category: cat });
    expect(r.components.every(c => c.category === cat)).toBe(true);
  });

  it('rejects an unknown category rather than silently returning nothing', () => {
    bad('list_components', { category: 'Nope' });
  });
});

describe('place_component', () => {
  it('stamps onto a blank grid when no text is given', () => {
    const r = callTool('place_component', { componentId: 'button', col: 0, row: 0 });
    expect(r.text.split('\n')).toHaveLength(DEFAULT_ROWS);
    expect(r.text.split('\n')[0]).toMatch(/^\[ OK \]/);
    expect(r.placed.id).toBe('button');
  });

  it('round-trips: the output is valid input to the next call', () => {
    const one = callTool('place_component', { componentId: 'button', col: 0, row: 0 });
    const two = callTool('place_component', { text: one.text, componentId: 'button', col: 0, row: 2 });
    expect(two.text.split('\n')[0]).toMatch(/^\[ OK \]/);
    expect(two.text.split('\n')[2]).toMatch(/^\[ OK \]/);
  });

  it('clips off-grid placement instead of throwing', () => {
    const r = callTool('place_component', { componentId: 'button', col: DEFAULT_COLS - 2, row: 0 });
    expect(r.text.split('\n')[0]).toHaveLength(DEFAULT_COLS);
  });

  it('rejects an unknown componentId', () => {
    bad('place_component', { componentId: 'not-a-thing', col: 0, row: 0 });
  });

  it('rejects non-integer and wildly out-of-range coordinates', () => {
    bad('place_component', { componentId: 'button', col: 1.5, row: 0 });
    bad('place_component', { componentId: 'button', col: 'three', row: 0 });
    bad('place_component', { componentId: 'button', col: 0, row: 999_999 });
    bad('place_component', { componentId: 'button', col: NaN, row: 0 });
  });

  it('requires coordinates at all', () => {
    bad('place_component', { componentId: 'button' });
  });

  it('rejects absurd grid dimensions', () => {
    bad('place_component', { componentId: 'button', col: 0, row: 0, cols: 0 });
    bad('place_component', { componentId: 'button', col: 0, row: 0, rows: 100_000 });
  });
});

describe('render_wireframe', () => {
  it('pads and clips to the grid', () => {
    const r = callTool('render_wireframe', { text: 'ab', cols: 5, rows: 2 });
    expect(r.text).toBe('ab   \n     ');
  });

  it('handles multi-byte characters as single cells', () => {
    const r = callTool('render_wireframe', { text: '│─┐', cols: 4, rows: 1 });
    expect(r.text).toBe('│─┐ ');
  });

  it('rejects a non-string and an oversized payload', () => {
    bad('render_wireframe', { text: 42 });
    bad('render_wireframe', { text: 'x'.repeat(MAX_TEXT + 1) });
  });
});

describe('dispatch', () => {
  it('returns null for an unknown tool so callers can 404 it', () => {
    expect(callTool('nope', {})).toBeNull();
  });

  it('survives null/garbage arguments', () => {
    expect(callTool('list_components', null).count).toBeGreaterThan(0);
    expect(callTool('list_components', 'nonsense').count).toBeGreaterThan(0);
  });
});

describe('sketch_to_wireframe', () => {
  it('draws a typed screen and returns an openable project', async () => {
    const { callTool } = await import('./tools.js');
    const { parseProject } = await import('./engine.js');
    const r = callTool('sketch_to_wireframe', { source: '"Email"\n[Sign in]' });
    expect(r.text).toBe('\n  [ Email_________ ]\n\n  [ Sign in ]');
    expect(parseProject(JSON.stringify(r.project)).elements).toHaveLength(2);
  });

  it('rejects a source that is not a string', async () => {
    const { callTool } = await import('./tools.js');
    expect(() => callTool('sketch_to_wireframe', { source: 5 })).toThrow();
  });
});

describe('edit_project', () => {
  const start = () => callTool('sketch_to_wireframe', { source: '"Email"\n[Sign in]' }).project;

  it('moves, styles and deletes by starting index, and draws a pinned arrow', () => {
    const r = callTool('edit_project', {
      project: start(),
      ops: [
        { op: 'delete', index: 0 },
        { op: 'move', index: 1, col: 10, row: 8 },
        { op: 'arrow', fromCol: 0, fromRow: 0, toCol: 11, toRow: 8 },
      ],
    });
    const [button, arrow] = r.project.elements;
    expect(r.project.elements).toHaveLength(2);
    expect([button.col, button.row]).toEqual([10, 8]);
    expect(arrow.to.id).toBe(button.id);
    expect(r.text).toContain('Sign in');
  });

  it('refuses bad input', () => {
    bad('edit_project', { project: { nope: 1 }, ops: [] });
    bad('edit_project', { project: start(), ops: [{ op: 'move', index: 9, col: 1, row: 1 }] });
    bad('edit_project', { project: start(), ops: [{ op: 'style', index: 0, style: 'wavy' }] });
    bad('edit_project', { project: start(), ops: [{ op: 'delete', index: 0 }, { op: 'delete', index: 0 }] });
    bad('edit_project', { project: start(), ops: Array(201).fill({ op: 'delete', index: 0 }) });
  });
});

describe('wireframe_to_sketch', () => {
  it('writes a project back as typed lines', () => {
    const { project } = callTool('sketch_to_wireframe', { source: '"Email"  [Go]' });
    expect(callTool('wireframe_to_sketch', { project })).toEqual({ source: '"Email"  [Go]', skipped: [] });
    bad('wireframe_to_sketch', { project: 'nope' });
  });
});

describe('wireframe_to_code', () => {
  it('returns React by default and SwiftUI on request, and refuses other formats', () => {
    const { project } = callTool('sketch_to_wireframe', { source: '[Go]' });
    expect(callTool('wireframe_to_code', { project, name: 'Start' }).code).toContain('export default function Start()');
    expect(callTool('wireframe_to_code', { project, format: 'swiftui' }).code).toContain('struct LayoutView: View');
    bad('wireframe_to_code', { project, format: 'vue' });
    bad('wireframe_to_code', { project: 'x' });
  });
});

describe('edit_project paint and erase', () => {
  it('paints a stroke, erases part of it, and refuses bad points', () => {
    const { project } = callTool('sketch_to_wireframe', { source: '[Go]', cols: 20, rows: 4 });
    const painted = callTool('edit_project', { project, ops: [{ op: 'paint', points: [[0, 3], [9, 3]], char: '▒' }] });
    expect(painted.text.split('\n').at(-1)).toBe('▒▒▒▒▒▒▒▒▒▒');
    const erased = callTool('edit_project', { project: painted.project, ops: [{ op: 'erase', points: [[0, 3], [4, 3]], size: 1 }] });
    expect(erased.text.split('\n').at(-1)).toBe('     ▒▒▒▒▒');
    bad('edit_project', { project, ops: [{ op: 'paint', points: [] }] });
    bad('edit_project', { project, ops: [{ op: 'paint', points: [[1, 'x']] }] });
    bad('edit_project', { project, ops: [{ op: 'paint', points: [[1, 1]], size: 9 }] });
    bad('edit_project', { project, ops: [{ op: 'erase', points: Array(2001).fill([0, 0]) }] });
    bad('edit_project', { project, ops: Array(3).fill({ op: 'paint', points: Array(2000).fill([0, 0]) }) });
  });
});

describe('adjustment layers', () => {
  it('adds one over an area, changes its kind, and refuses a bad one', () => {
    const { project } = callTool('sketch_to_wireframe', { source: '[Go]' });
    const added = callTool('edit_project', { project, ops: [{ op: 'adjust', area: { col: 0, row: 0, width: 20, height: 3 }, kind: 'ascii' }] });
    expect(added.text).toContain('[ Go ]');
    const inverted = callTool('edit_project', { project: added.project, ops: [{ op: 'adjust', index: added.project.elements.length - 1, kind: 'invert' }] });
    expect(inverted.text).toContain('█');
    bad('edit_project', { project, ops: [{ op: 'adjust', area: { col: 0, row: 0, width: 2, height: 2 }, kind: 'melt' }] });
    bad('edit_project', { project, ops: [{ op: 'adjust', area: { col: 0, row: 0, width: 0, height: 2 }, kind: 'dim' }] });
  });
});

describe('color', () => {
  it('colors a part, exports ANSI, and refuses a bad color', () => {
    const { project } = callTool('sketch_to_wireframe', { source: '[Go]' });
    const colored = callTool('edit_project', { project, ops: [{ op: 'color', index: 0, ink: 1, paper: 15 }] });
    expect(colored.project.elements[0]).toMatchObject({ ink: 1, paper: 15 });
    expect(colored.text).not.toContain('\x1b');
    expect(callTool('wireframe_to_ansi', { project: colored.project }).ansi).toContain('\x1b[31;107m');
    expect(callTool('edit_project', { project: colored.project, ops: [{ op: 'color', index: 0, ink: null }] }).project.elements[0].ink).toBeUndefined();
    bad('edit_project', { project, ops: [{ op: 'color', index: 0, ink: 16 }] });
    bad('edit_project', { project, ops: [{ op: 'color', index: 0, paper: 'red' }] });
  });
});

describe('edit_project gradient', () => {
  it('lays a straight or round ramp and refuses a bad one', () => {
    const { project } = callTool('sketch_to_wireframe', { source: '', cols: 12, rows: 3 });
    expect(callTool('edit_project', { project, ops: [{ op: 'gradient', from: [0, 2], to: [7, 2] }] }).text.split('\n').at(-1)).toBe('░░▒▒▓▓██');
    expect(callTool('edit_project', { project, ops: [{ op: 'gradient', from: [5, 1], to: [8, 1], mode: 'round' }] }).text).toContain('█');
    bad('edit_project', { project, ops: [{ op: 'gradient', from: [0, 0], to: [1, 1], mode: 'spiral' }] });
    bad('edit_project', { project, ops: [{ op: 'gradient', from: [0], to: [1, 1] }] });
  });
});

describe('edit_project selections', () => {
  it('cuts, fills and moves an area or a wand run, and refuses a bad one', () => {
    const { project } = callTool('sketch_to_wireframe', { source: '[Go]  [Stop]', cols: 30, rows: 4 });
    const area = { col: 0, row: 0, width: 9, height: 4 };
    expect(callTool('edit_project', { project, ops: [{ op: 'cut', area }] }).text).not.toContain('Go');
    const moved = callTool('edit_project', { project, ops: [{ op: 'move_cells', area, dCol: 0, dRow: 2 }] });
    expect(moved.text.split('\n').at(-1)).toContain('Go');
    const filled = callTool('edit_project', { project, ops: [{ op: 'fill', area: { col: 0, row: 3, width: 4, height: 1 }, char: '░' }] });
    expect(filled.text.split('\n').at(-1)).toBe('░░░░');
    const wanded = callTool('edit_project', { project: filled.project, ops: [{ op: 'cut', wand: { col: 1, row: 3 } }] });
    expect(wanded.text).not.toContain('░');
    bad('edit_project', { project, ops: [{ op: 'cut' }] });
    bad('edit_project', { project, ops: [{ op: 'fill', area: { col: 0, row: 0, width: 0, height: 1 } }] });
    bad('edit_project', { project, ops: [{ op: 'cut', wand: { col: 'x', row: 0 } }] });
  });
});

describe('huge input', () => {
  it('a wand fill over a 500 by 500 canvas and a 200,000 line text do not throw', () => {
    const empty = { blockprint: 1, cols: 500, rows: 500, elements: [] };
    expect(callTool('edit_project', { project: empty, ops: [{ op: 'fill', wand: { col: 9, row: 9 }, char: '░' }] }).project.elements[0].width).toBe(500);
    const { project } = callTool('sketch_to_wireframe', { source: 'hello' });
    expect(() => callTool('edit_project', { project, ops: [{ op: 'text', index: 0, text: '\n'.repeat(199_999) }] })).not.toThrow();
    const flow = Array.from({ length: 20_000 }, (_, i) => `n${i} -> n${i + 1}`).join('\n').slice(0, 199_000);
    expect(callTool('sketch_to_wireframe', { source: flow }).project.elements.length).toBeLessThan(500);
  });
});

describe('wireframe_to_deck', () => {
  it('returns slides and one HTML deck, and refuses a bad project', () => {
    const { project } = callTool('sketch_to_wireframe', { source: '[Go]' });
    const r = callTool('wireframe_to_deck', { project, title: '<b>Pitch</b>' });
    expect(r.slides).toHaveLength(1);
    expect(r.html).toContain('<title>&lt;b&gt;Pitch&lt;/b&gt;</title>');
    bad('wireframe_to_deck', { project: [] });
  });
});

describe('wireframe_to_html', () => {
  it('returns a page with real elements', () => {
    const { project } = callTool('sketch_to_wireframe', { source: '[Go]' });
    expect(callTool('wireframe_to_html', { project }).html).toContain('<button>Go</button>');
    bad('wireframe_to_html', { project: 7 });
  });
});

describe('text_to_project', () => {
  it('makes an editable project from a text wireframe', () => {
    const r = callTool('text_to_project', { text: '┌────┐\n│ Hi │\n└────┘\n[ Go ]' });
    expect(r.parts).toBe(3);
    expect(r.project.elements.map(e => e.presetId)).toEqual(['box', 'text', 'button']);
    bad('text_to_project', { text: 5 });
  });
});
