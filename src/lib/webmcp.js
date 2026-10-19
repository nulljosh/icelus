// WebMCP tool registration. Exposes Icelus's wireframe actions to in-browser
// agents via document.modelContext.
//
// ponytail: tools dispatch the same reducer actions the toolbar and canvas
// dispatch, so undo/redo covers anything an agent does.
import { useEffect, useRef } from 'react';
import { gridToText, textToGrid, ADJUSTMENTS } from './engine.js';
import { PRESETS as CORE, CATEGORIES as CORE_CATEGORIES, PACKS, PACK_CATEGORIES, getPreset } from './presets.js';

const PRESETS = [...CORE, ...PACKS];
const CATEGORIES = [...CORE_CATEGORIES, ...PACK_CATEGORIES];
import { BOX_STYLES } from './lines.js';
import { noteList } from './shapes.js';
import { critique, critiqueMessage } from './critique.js';
import { handoff } from './handoff.js';
import { toReact, toSwiftUI } from './code.js';
import { slides } from './deck.js';
import { strokeCells } from './brush.js';
import { marquee, wand, cellText } from './select.js';
import { gradientMarks } from './gradient.js';
import { timeline } from './history.js';
import { SYNTAX_HELP, parseSketch } from './syntax.js';

const NUM = { type: 'number' };

// A tool that acts on one part by id. Unknown ids come back as an error, not a silent no-op.
function elementTool(get, name, description, properties, action, optional = false) {
  return {
    name, description,
    inputSchema: { type: 'object', properties: { id: { type: 'string', description: 'Part id from list_elements' }, ...properties }, required: ['id', ...(optional ? [] : Object.keys(properties))] },
    execute: async (args) => {
      if (!get().state.elements.some(el => el.id === args.id)) return { error: `No part with id "${args.id}"` };
      get().dispatch(action(args));
      return { ok: true };
    },
  };
}

export function buildTools(get) {
  return [
    // ---- read-only -------------------------------------------------------
    {
      name: 'get_wireframe',
      description: 'Get the current wireframe as ASCII text.',
      inputSchema: { type: 'object', properties: {} },
      execute: async () => ({ text: gridToText(get().state.grid) }),
    },
    {
      name: 'list_components',
      description: 'List the wireframe components available to place, optionally filtered by category.',
      inputSchema: {
        type: 'object',
        properties: { category: { type: 'string', description: `One of: ${CATEGORIES.join(', ')}` } },
      },
      execute: async ({ category } = {}) => ({
        categories: CATEGORIES,
        components: PRESETS
          .filter(p => !category || p.category === category)
          .map(({ id, label, category }) => ({ id, label, category })),
      }),
    },

    // ---- reversible state changes ----------------------------------------
    {
      name: 'place_component',
      description: 'Stamp a component onto the wireframe at a grid position. Undoable.',
      inputSchema: {
        type: 'object',
        properties: {
          componentId: { type: 'string', description: 'Component id from list_components' },
          col: { type: 'number', description: 'Column, 0-based from the left' },
          row: { type: 'number', description: 'Row, 0-based from the top' },
        },
        required: ['componentId', 'col', 'row'],
      },
      execute: async ({ componentId, col, row }) => {
        const preset = getPreset(componentId);
        if (!preset) return { error: `No component with id "${componentId}"` };
        get().dispatch({ type: 'PLACE_COMPONENT', preset, col, row });
        return { placed: componentId, col, row };
      },
    },
    {
      name: 'set_wireframe',
      description: 'Replace the whole wireframe with ASCII text. Undoable.',
      inputSchema: {
        type: 'object',
        properties: { text: { type: 'string', description: 'ASCII wireframe, one line per row' } },
        required: ['text'],
      },
      execute: async ({ text }) => {
        const { state, dispatch } = get();
        dispatch({ type: 'SET_GRID', grid: textToGrid(text, state.cols, state.rows) });
        return { rows: text.split('\n').length };
      },
    },
    {
      name: 'list_elements',
      description: 'List the parts on the canvas with their ids, positions and sizes, in stacking order.',
      inputSchema: { type: 'object', properties: {} },
      execute: async () => ({
        elements: get().state.elements.map(({ id, presetId, col, row, width, height, style, note }) =>
          ({ id, part: presetId, col, row, width, height, ...(style && { style }), ...(note && { note }) })),
      }),
    },
    elementTool(get, 'move_element', 'Move a part so its top-left corner sits at col, row. Undoable.',
      { col: NUM, row: NUM }, ({ id, col, row }) => ({ type: 'MOVE_ELEMENT', id, col, row })),
    elementTool(get, 'resize_element', 'Resize a part, keeping its corners and borders. Undoable.',
      { width: NUM, height: NUM }, ({ id, width, height }) => ({ type: 'UPDATE_ELEMENT', id, changes: { width, height } })),
    elementTool(get, 'set_text', 'Replace the text of a part (a banner redraws its block letters). Undoable.',
      { text: { type: 'string' } }, ({ id, text }) => ({ type: 'UPDATE_ELEMENT', id, changes: { text } })),
    elementTool(get, 'style_element', `Restyle a box. One of: ${BOX_STYLES.join(', ')}. Undoable.`,
      { style: { type: 'string', enum: BOX_STYLES } }, ({ id, style }) => ({ type: 'UPDATE_ELEMENT', id, changes: { style } })),
    elementTool(get, 'color_element', 'Give a part an ink and a paper from the 16 terminal colors (0-15; null clears). Plain copy stays colorless. Undoable.',
      { ink: { type: ['integer', 'null'] }, paper: { type: ['integer', 'null'] } }, ({ id, ink, paper }) => ({ type: 'UPDATE_ELEMENT', id, changes: { ink, paper } }), true),
    elementTool(get, 'blend_element', 'How a part meets what is under it: join (box lines merge, the default), over (replaces without joining), under (fills only empty cells), knockout (clears its whole box). Undoable.',
      { mode: { type: 'string', enum: ['join', 'over', 'under', 'knockout'] } }, ({ id, mode }) => ({ type: 'UPDATE_ELEMENT', id, changes: { blend: mode } }), true),
    elementTool(get, 'mask_element', 'Hide part of a part without cutting it: inset {top,right,bottom,left} crops cells off each edge, clip names another part id to show it only inside that part. null clears either. Undoable.',
      { inset: { type: ['object', 'null'] }, clip: { type: ['string', 'null'] } }, ({ id, inset, clip }) => ({ type: 'UPDATE_ELEMENT', id, changes: { mask: inset, clip } }), true),
    {
      name: 'handoff',
      description: 'The canvas as a Markdown build brief for a coding agent: every screen drawn, its parts, flow, states, notes and the project file.',
      inputSchema: { type: 'object', properties: {} },
      execute: async () => { const { state } = get(); return { markdown: handoff(state.elements, state.cols, state.rows) }; },
    },
    {
      name: 'history',
      description: 'Every undo step, oldest first, named by what changed, with the index of the step the canvas is on, plus the named snapshots.',
      inputSchema: { type: 'object', properties: {} },
      execute: async () => {
        const { state } = get();
        return { at: state.history.length, steps: timeline(state).map(s => ({ kind: s.kind, part: s.el?.label, count: s.count })),
          snapshots: (state.snapshots ?? []).map(s => s.name) };
      },
    },
    {
      name: 'go_to_step',
      description: 'Jump the canvas to a step from history by index. Later steps stay redoable until the next edit.',
      inputSchema: { type: 'object', properties: { index: NUM }, required: ['index'] },
      execute: async ({ index }) => { get().dispatch({ type: 'GO_TO_STEP', index }); return { ok: true }; },
    },
    {
      name: 'snapshot',
      description: 'Keep a named copy of the canvas in the project file. restore: true with a name puts the canvas back to that snapshot (undoable).',
      inputSchema: { type: 'object', properties: { name: { type: 'string' }, restore: { type: 'boolean' } } },
      execute: async ({ name = '', restore = false }) => {
        const { state, dispatch } = get();
        if (!restore) { dispatch({ type: 'SNAPSHOT', name }); return { ok: true }; }
        const index = (state.snapshots ?? []).findIndex(s => s.name === name);
        if (index < 0) return { error: `no snapshot named ${name}` };
        dispatch({ type: 'RESTORE_SNAPSHOT', index });
        return { ok: true };
      },
    },
    {
      name: 'paint',
      description: 'Paint a freehand stroke through [col, row] points with one character, 1 to 5 cells wide. One step of undo. erase: true clears painted cells instead.',
      inputSchema: { type: 'object', properties: { points: { type: 'array', items: { type: 'array', items: NUM } }, size: NUM, char: { type: 'string' }, erase: { type: 'boolean' } }, required: ['points'] },
      execute: async ({ points, size = 1, char = '█', erase = false }) => {
        const { state, dispatch } = get();
        if (!Array.isArray(points) || !points.length || points.length > 2000 || !points.every(p => Array.isArray(p) && p.length === 2 && p.every(Number.isInteger))) {
          return { error: 'points must be 1 to 2000 [col, row] whole-number pairs' };
        }
        const cells = strokeCells(points, Math.max(1, Math.min(5, size | 0)), state.cols, state.rows);
        dispatch({ type: 'PAINT', cells, mode: erase ? 'erase' : 'paint', char });
        return { cells: cells.length };
      },
    },
    {
      name: 'adjust',
      description: 'Add an adjustment layer over an area that changes everything drawn under it without touching the parts: invert, dim, ascii (every character plain ASCII), or a box style (single, double, rounded, heavy). Undoable.',
      inputSchema: { type: 'object', properties: { col: NUM, row: NUM, width: NUM, height: NUM, kind: { type: 'string', enum: ADJUSTMENTS } }, required: ['col', 'row', 'width', 'height', 'kind'] },
      execute: async ({ col, row, width, height, kind }) => {
        if (![col, row, width, height].every(Number.isInteger) || width < 1 || height < 1 || col < 0 || row < 0) return { error: 'col, row, width and height must be whole numbers, width and height at least 1' };
        if (!ADJUSTMENTS.includes(kind)) return { error: `kind must be one of ${ADJUSTMENTS.join(', ')}` };
        get().dispatch({ type: 'PLACE_ADJUST', col, row, width: Math.min(width, 500), height: Math.min(height, 500), adjust: kind });
        return { ok: true };
      },
    },
    {
      name: 'gradient',
      description: 'Lay a ░▒▓█ ramp from one cell to another as one stroke of paint: straight (light at from, solid at to, across the box they span) or round (solid at from, fading to the edge at to). Undoable.',
      inputSchema: { type: 'object', properties: { from: { type: 'array', items: NUM }, to: { type: 'array', items: NUM }, mode: { type: 'string', enum: ['straight', 'round'] } }, required: ['from', 'to'] },
      execute: async ({ from, to, mode = 'straight' }) => {
        const { state, dispatch } = get();
        const pt = p => Array.isArray(p) && p.length === 2 && p.every(Number.isInteger);
        if (!pt(from) || !pt(to)) return { error: 'from and to must be [col, row] whole numbers' };
        if (mode !== 'straight' && mode !== 'round') return { error: 'mode must be straight or round' };
        const cells = gradientMarks(from, to, mode, state.cols, state.rows);
        dispatch({ type: 'PAINT', cells, mode: 'marks' });
        return { cells: cells.length };
      },
    },
    {
      name: 'cells',
      description: 'Work on cells, not parts: pick an area {col,row,width,height} or the wand run from {col,row}, then copy (returns the text), cut, fill {char} or move {dCol,dRow}. Cut and move take paint and whole parts inside, never part of one. Undoable.',
      inputSchema: { type: 'object', properties: { op: { type: 'string', enum: ['copy', 'cut', 'fill', 'move'] }, area: { type: 'object' }, wand: { type: 'object' }, char: { type: 'string' }, dCol: NUM, dRow: NUM }, required: ['op'] },
      execute: async ({ op, area, wand: from, char = '█', dCol = 0, dRow = 0 }) => {
        const { state, dispatch } = get();
        const whole = v => Number.isInteger(v);
        let cells;
        if (area && [area.col, area.row, area.width, area.height].every(whole)) cells = marquee([area.col, area.row], [area.col + area.width - 1, area.row + area.height - 1], state.cols, state.rows);
        else if (from && whole(from.col) && whole(from.row)) cells = wand(state.grid, from.col, from.row);
        else return { error: 'give area {col,row,width,height} or wand {col,row} as whole numbers' };
        if (op === 'copy') return { text: cellText(state.grid, cells), cells: cells.length };
        if (!['cut', 'fill', 'move'].includes(op)) return { error: 'op must be copy, cut, fill or move' };
        if (op === 'move' && !(whole(dCol) && whole(dRow))) return { error: 'dCol and dRow must be whole numbers' };
        dispatch({ type: 'CELLS', op, cells, char, dCol, dRow });
        return { cells: cells.length };
      },
    },
    {
      name: 'slides',
      description: 'The canvas as a deck: each screen as a slide { title, text } in reading order.',
      inputSchema: { type: 'object', properties: {} },
      execute: async () => { const { state } = get(); return { slides: slides(state.elements, state.cols, state.rows) }; },
    },
    {
      name: 'export_code',
      description: 'The canvas as code that compiles: a React component with plain CSS, or a SwiftUI view.',
      inputSchema: { type: 'object', properties: { format: { type: 'string', enum: ['react', 'swiftui'] } } },
      execute: async ({ format = 'react' } = {}) => {
        const { state } = get();
        return { format, code: (format === 'swiftui' ? toSwiftUI : toReact)(state.elements, state.cols, state.rows) };
      },
    },
    {
      name: 'critique',
      description: 'Review the canvas: parts off the grid, overlaps, boxes cut open, placeholder labels, missing empty and error states, open notes. Fix each, then run it again.',
      inputSchema: { type: 'object', properties: {} },
      execute: async () => {
        const { state, system } = get();
        return { issues: critique(state.elements, state.cols, state.rows, system).map(i => ({ ...i, message: critiqueMessage(i) })) };
      },
    },
    {
      name: 'list_notes',
      description: 'List the notes people pinned to parts: what they want changed. Act on each, then resolve it with set_note and an empty note.',
      inputSchema: { type: 'object', properties: {} },
      execute: async () => ({ notes: noteList(get().state.elements) }),
    },
    elementTool(get, 'set_note', 'Pin a note to a part (up to 500 characters), or pass an empty note to resolve it. Undoable.',
      { note: { type: 'string' } }, ({ id, note }) => ({ type: 'UPDATE_ELEMENT', id, changes: { note } })),
    elementTool(get, 'make_variations', 'Make three takes on a screen side by side, stacked, split and dense, from the same parts. Undoable.',
      {}, ({ id }) => ({ type: 'VARIATIONS', id })),
    elementTool(get, 'keep_variation', 'Keep one take of a screen and clear the other takes away, parts and all. Undoable.',
      {}, ({ id }) => ({ type: 'KEEP_VARIATION', id })),
    elementTool(get, 'tweak_screen', 'Tweak a screen: spacing (blank rows between bands of parts, 0-8), padding (blank cells inside the frame, 0-8) '
      + `and style (one box style for every box in it: ${BOX_STYLES.join(', ')}). Undoable.`,
      { spacing: NUM, padding: NUM, style: { type: 'string', enum: BOX_STYLES } },
      ({ id, spacing, padding, style }) => ({ type: 'UPDATE_ELEMENT', id, changes: { tweak: { spacing, padding, style } } }), true),
    elementTool(get, 'delete_element', 'Delete a part. Undoable.', {}, ({ id }) => ({ type: 'DELETE_ELEMENT', id })),
    elementTool(get, 'select_element', 'Select a part so the person sees it highlighted.', {}, ({ id }) => ({ type: 'SELECT_ELEMENT', id })),
    {
      name: 'draw_arrow',
      description: 'Draw an elbow arrow between two cells. An end on a part stays pinned to it when the part moves. Undoable.',
      inputSchema: {
        type: 'object',
        properties: { fromCol: NUM, fromRow: NUM, toCol: NUM, toRow: NUM },
        required: ['fromCol', 'fromRow', 'toCol', 'toRow'],
      },
      execute: async ({ fromCol, fromRow, toCol, toRow }) => {
        get().dispatch({ type: 'PLACE_LINE', start: { col: fromCol, row: fromRow }, end: { col: toCol, row: toRow } });
        return { ok: true };
      },
    },
    {
      name: 'type_screen',
      description: `Type a screen in the plain syntax and add it below what is there. Undoable.\n${SYNTAX_HELP}`,
      inputSchema: { type: 'object', properties: { source: { type: 'string' } }, required: ['source'] },
      execute: async ({ source }) => {
        get().dispatch({ type: 'PLACE_SKETCH', source });
        return { added: parseSketch(source).length };
      },
    },
    {
      name: 'clear_wireframe',
      description: 'Erase the wireframe. Undoable with undo.',
      inputSchema: { type: 'object', properties: {} },
      execute: async () => { get().dispatch({ type: 'CLEAR' }); return { cleared: true }; },
    },
    {
      name: 'undo',
      description: 'Undo the last wireframe change.',
      inputSchema: { type: 'object', properties: {} },
      execute: async () => { get().dispatch({ type: 'UNDO' }); return { ok: true }; },
    },
    {
      name: 'redo',
      description: 'Redo the last undone wireframe change.',
      inputSchema: { type: 'object', properties: {} },
      execute: async () => { get().dispatch({ type: 'REDO' }); return { ok: true }; },
    },
  ];
}

export function useWebMCP(ctx) {
  const ref = useRef(ctx);
  ref.current = ctx;

  useEffect(() => {
    const mc = document.modelContext;
    if (!mc?.registerTool) return; // browser without WebMCP support
    let cancelled = false;
    const registered = [];

    (async () => {
      for (const tool of buildTools(() => ref.current)) {
        if (cancelled) return;
        try {
          registered.push(await mc.registerTool(tool));
        } catch (err) {
          console.warn('[webmcp] failed to register', tool.name, err?.message);
        }
      }
    })();

    return () => {
      cancelled = true;
      for (const h of registered) { try { h?.unregister?.(); } catch { /* gone already */ } }
    };
  }, []);
}
