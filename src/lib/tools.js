// The one definition of what Icelus can do over the network. Both surfaces — the REST
// routes in functions/api/ and the MCP server in functions/mcp.js — call `callTool` from
// here, so they cannot drift apart.
//
// Deliberately different from src/lib/webmcp.js: those tools are STATEFUL (undo, redo,
// clear all mutate the live canvas in the browser). These are transforms — a wireframe
// goes in, a wireframe comes out. That is what keeps this free of a database, a session
// store and a Durable Object.

import {
  DEFAULT_COLS, DEFAULT_ROWS, createGrid, gridToText, textToGrid, stampComponent,
  renderElements, serializeProject, trimText, parseProject, moveElement, updateElement,
  deleteElement, createLine, BOX_STYLES, ADJUSTMENTS, adjustLayer,
} from './engine.js';
import { BLENDS } from './lines.js';
import { PRESETS as CORE, CATEGORIES as CORE_CATEGORIES, PACKS, PACK_CATEGORIES, getPreset } from './presets.js';

// The core parts plus the platform packs (iOS, Material, terminal, email).
const PRESETS = [...CORE, ...PACKS];
const CATEGORIES = [...CORE_CATEGORIES, ...PACK_CATEGORIES];
import { parseSketch, toSketch, SYNTAX_HELP } from './syntax.js';
import { toHTML } from './html.js';
import { importText } from './importer.js';
import { critique, critiqueMessage } from './critique.js';
import { systemFromCode, parseSystem } from './system.js';
import { htmlToSketch } from './capture.js';
import { variations, keepVariation } from './tweaks.js';
import { handoff } from './handoff.js';
import { toReact, toSwiftUI } from './code.js';
import { slides, toDeck } from './deck.js';
import { strokeCells, paint, paintMarks, erase } from './brush.js';
import { gradientMarks, GRADIENT_MODES } from './gradient.js';
import { colorMask, toAnsi, cleanColor } from './color.js';
import { marquee, wand, cutCells, fillCells, moveCells } from './select.js';

// A 100x50 grid of astral-plane characters is ~40KB; 200KB is generous and still bounded.
export const MAX_TEXT = 200_000;
const MAX_COLS = 500;
const MAX_ROWS = 500;

class ToolError extends Error {}

const int = (v, name, { min, max, fallback }) => {
  if (v === undefined || v === null) {
    if (fallback !== undefined) return fallback;
    throw new ToolError(`${name} is required`);
  }
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isInteger(n)) throw new ToolError(`${name} must be a whole number, got ${JSON.stringify(v)}`);
  if (n < min || n > max) throw new ToolError(`${name} must be between ${min} and ${max}, got ${n}`);
  return n;
};

const text = (v) => {
  if (v === undefined || v === null) return '';
  if (typeof v !== 'string') throw new ToolError('text must be a string');
  // stampComponent indexes a grid sized from this, so an unbounded string is an
  // unbounded allocation on a public endpoint.
  if (v.length > MAX_TEXT) throw new ToolError(`text exceeds ${MAX_TEXT} characters`);
  return v;
};

const dimensions = (args) => ({
  cols: int(args.cols, 'cols', { min: 1, max: MAX_COLS, fallback: DEFAULT_COLS }),
  rows: int(args.rows, 'rows', { min: 1, max: MAX_ROWS, fallback: DEFAULT_ROWS }),
});

import { TOOLS, TOOL_NAMES, MAX_OPS } from './toolList.js';
export { TOOLS, TOOL_NAMES };

/// Runs one tool. Throws ToolError for bad input — callers turn that into a 400 or an MCP
/// isError result. Returns null for an unknown tool name so callers can 404 it.
export function callTool(name, rawArgs) {
  const args = rawArgs && typeof rawArgs === 'object' && !Array.isArray(rawArgs) ? rawArgs : {};

  switch (name) {
    case 'list_components': {
      const { category } = args;
      if (category !== undefined && !CATEGORIES.includes(category)) {
        throw new ToolError(`Unknown category: ${category}. One of: ${CATEGORIES.join(', ')}`);
      }
      const components = category ? PRESETS.filter(p => p.category === category) : PRESETS;
      return { categories: CATEGORIES, count: components.length, components };
    }

    case 'place_component': {
      const { cols, rows } = dimensions(args);
      const preset = getPreset(args.componentId);
      if (!preset) {
        throw new ToolError(
          `Unknown componentId: ${JSON.stringify(args.componentId)}. Call list_components for valid ids.`,
        );
      }
      // Off-grid placement clips rather than throwing (stampComponent already skips
      // out-of-range cells), but a wildly out-of-range coordinate is a caller bug worth
      // naming rather than silently returning an unchanged wireframe.
      const col = int(args.col, 'col', { min: -MAX_COLS, max: MAX_COLS });
      const row = int(args.row, 'row', { min: -MAX_ROWS, max: MAX_ROWS });
      const grid = args.text ? textToGrid(text(args.text), cols, rows) : createGrid(cols, rows);
      return {
        text: gridToText(stampComponent(grid, preset.template, col, row)),
        cols,
        rows,
        placed: { id: preset.id, label: preset.label, col, row, width: preset.width, height: preset.height },
      };
    }

    case 'render_wireframe': {
      const { cols, rows } = dimensions(args);
      return { text: gridToText(textToGrid(text(args.text), cols, rows)), cols, rows };
    }

    case 'html_to_wireframe': {
      if (typeof args.html !== 'string') throw new ToolError('html must be a string');
      const source = htmlToSketch(args.html.slice(0, 2_000_000));
      const { cols, rows } = dimensions(args);
      const elements = parseSketch(source);
      return { source, text: trimText(gridToText(renderElements(elements, cols, rows))), project: JSON.parse(serializeProject({ cols, rows, elements })) };
    }

    case 'sketch_to_wireframe': {
      const { cols, rows } = dimensions(args);
      const elements = parseSketch(text(args.source));
      return {
        text: trimText(gridToText(renderElements(elements, cols, rows))),
        project: JSON.parse(serializeProject({ cols, rows, elements })),
      };
    }

    case 'edit_project': {
      const project = parseProject(JSON.stringify(args.project ?? null));
      if (!project) throw new ToolError('project must be a Icelus project with an elements array');
      if (!Array.isArray(args.ops) || args.ops.length > MAX_OPS) throw new ToolError(`ops must be an array of at most ${MAX_OPS}`);
      // Strokes cost per point, so one call carries at most 5,000 points across all its paint and erase ops.
      const strokePoints = args.ops.reduce((sum, op) => sum + (Array.isArray(op?.points) ? op.points.length : 0), 0);
      if (strokePoints > 5000) throw new ToolError('paint and erase ops carry at most 5000 points in one call');
      // Indices are resolved to ids up front, so a delete does not shift the parts later ops name.
      const ids = project.elements.map(el => el.id);
      let { elements } = project;
      args.ops.forEach((op, i) => {
        const at = `ops[${i}]`;
        if (!op || typeof op !== 'object') throw new ToolError(`${at} must be an object`);
        const n = (k, min = -MAX_COLS, max = MAX_COLS) => int(op[k], `${at}.${k}`, { min, max });
        if (op.op === 'paint' || op.op === 'erase') {
          if (!Array.isArray(op.points) || !op.points.length || op.points.length > 2000) throw new ToolError(`${at}.points must be 1 to 2000 [col, row] pairs`);
          const points = op.points.map((p, j) => {
            if (!Array.isArray(p) || p.length !== 2) throw new ToolError(`${at}.points[${j}] must be [col, row]`);
            return [int(p[0], `${at}.points[${j}][0]`, { min: -MAX_COLS, max: MAX_COLS }), int(p[1], `${at}.points[${j}][1]`, { min: -MAX_ROWS, max: MAX_ROWS })];
          });
          const size = op.size === undefined ? 1 : n('size', 1, 5);
          const cells = strokeCells(points, size, project.cols, project.rows);
          elements = op.op === 'paint' ? paint(elements, cells, typeof op.char === 'string' ? op.char : '█') : erase(elements, cells);
          return;
        }
        if (op.op === 'adjust' && op.index === undefined) {
          // A new adjustment layer over an area: invert, dim, ascii or a box style for everything under it.
          if (!ADJUSTMENTS.includes(op.kind)) throw new ToolError(`${at}.kind must be one of ${ADJUSTMENTS.join(', ')}`);
          const a = op.area && typeof op.area === 'object' ? op.area : {};
          const k = (key, min) => int(a[key], `${at}.area.${key}`, { min, max: MAX_COLS });
          elements = [...elements, adjustLayer(k('col', 0), k('row', 0), k('width', 1), k('height', 1), op.kind)];
          return;
        }
        if (op.op === 'gradient') {
          const pt = key => {
            if (!Array.isArray(op[key]) || op[key].length !== 2) throw new ToolError(`${at}.${key} must be [col, row]`);
            return [int(op[key][0], `${at}.${key}[0]`, { min: -MAX_COLS, max: MAX_COLS }), int(op[key][1], `${at}.${key}[1]`, { min: -MAX_ROWS, max: MAX_ROWS })];
          };
          const mode = op.mode ?? 'straight';
          if (!GRADIENT_MODES.includes(mode)) throw new ToolError(`${at}.mode must be straight or round`);
          elements = paintMarks(elements, gradientMarks(pt('from'), pt('to'), mode, project.cols, project.rows));
          return;
        }
        if (op.op === 'cut' || op.op === 'fill' || op.op === 'move_cells') {
          // A selection is an area {col, row, width, height} or the wand's run of one character from {col, row}.
          let cells;
          if (op.area && typeof op.area === 'object') {
            const a = op.area, k = key => int(a[key], `${at}.area.${key}`, { min: key === 'width' || key === 'height' ? 1 : 0, max: MAX_COLS });
            const col = k('col'), row = k('row');
            cells = marquee([col, row], [col + k('width') - 1, row + k('height') - 1], project.cols, project.rows);
          } else if (op.wand && typeof op.wand === 'object') {
            const w = key => int(op.wand[key], `${at}.wand.${key}`, { min: 0, max: MAX_COLS });
            cells = wand(renderElements(elements, project.cols, project.rows), w('col'), w('row'));
          } else throw new ToolError(`${at} needs area {col, row, width, height} or wand {col, row}`);
          if (op.op === 'cut') elements = cutCells(elements, cells);
          else if (op.op === 'fill') elements = fillCells(elements, cells, typeof op.char === 'string' ? op.char : '█');
          else elements = moveCells(elements, cells, n('dCol'), n('dRow'), project.cols, project.rows);
          return;
        }
        if (op.op === 'arrow') {
          elements = [...elements, createLine(elements, { col: n('fromCol'), row: n('fromRow') }, { col: n('toCol'), row: n('toRow') })];
          return;
        }
        const id = ids[int(op.index, `${at}.index`, { min: 0, max: ids.length - 1 })];
        if (!elements.some(el => el.id === id)) throw new ToolError(`${at} names a part an earlier op deleted`);
        if (op.op === 'move') elements = moveElement(elements, id, n('col'), n('row'));
        else if (op.op === 'resize') elements = updateElement(elements, id, { width: n('width', 1), height: n('height', 1) });
        else if (op.op === 'text') elements = updateElement(elements, id, { text: text(op.text) });
        else if (op.op === 'style') {
          if (!BOX_STYLES.includes(op.style)) throw new ToolError(`${at}.style must be one of ${BOX_STYLES.join(', ')}`);
          elements = updateElement(elements, id, { style: op.style });
        } else if (op.op === 'variations') elements = variations(elements, id).elements;
        else if (op.op === 'keep') elements = keepVariation(elements, id);
        else if (op.op === 'note') elements = updateElement(elements, id, { note: text(op.note ?? '') });
        else if (op.op === 'adjust') {
          if (!ADJUSTMENTS.includes(op.kind)) throw new ToolError(`${at}.kind must be one of ${ADJUSTMENTS.join(', ')}`);
          elements = updateElement(elements, id, { adjust: op.kind });
        } else if (op.op === 'color') {
          for (const key of ['ink', 'paper']) if (op[key] !== undefined && op[key] !== null && cleanColor(op[key]) === undefined) throw new ToolError(`${at}.${key} must be a color 0 to 15, or null to clear it`);
          elements = updateElement(elements, id, { ink: op.ink, paper: op.paper });
        } else if (op.op === 'mask') {
          // Insets crop the part; clip names another part by index to show it only inside that part's box.
          const clip = op.clip === undefined ? undefined : op.clip === null ? null : ids[int(op.clip, `${at}.clip`, { min: 0, max: ids.length - 1 })];
          const mask = op.inset === undefined ? undefined : op.inset === null ? null : Object.fromEntries(['top', 'right', 'bottom', 'left'].map(k => [k, op.inset[k] === undefined ? 0 : int(op.inset[k], `${at}.inset.${k}`, { min: 0, max: MAX_COLS })]));
          elements = updateElement(elements, id, { mask, clip });
        }
        else if (op.op === 'blend') {
          if (!BLENDS.includes(op.mode)) throw new ToolError(`${at}.mode must be one of ${BLENDS.join(', ')}`);
          elements = updateElement(elements, id, { blend: op.mode });
        }
        else if (op.op === 'tweak') {
          if (op.style !== undefined && !BOX_STYLES.includes(op.style)) throw new ToolError(`${at}.style must be one of ${BOX_STYLES.join(', ')}`);
          const knob = k => (op[k] === undefined ? undefined : n(k, 0, 8));
          elements = updateElement(elements, id, { tweak: { spacing: knob('spacing'), padding: knob('padding'), style: op.style } });
        } else if (op.op === 'delete') elements = deleteElement(elements, id);
        else throw new ToolError(`${at}.op must be move, resize, text, style, tweak, note, variations, keep, delete, color, mask, blend, adjust, arrow, paint, erase, gradient, cut, fill or move_cells`);
      });
      const { cols, rows } = project;
      return {
        text: trimText(gridToText(renderElements(elements, cols, rows))),
        project: JSON.parse(serializeProject({ cols, rows, elements })),
      };
    }

    case 'critique_project': {
      const project = parseProject(JSON.stringify(args.project ?? null));
      if (!project) throw new ToolError('project must be a Icelus project with an elements array');
      const index = new Map(project.elements.map((el, i) => [el.id, i]));
      const system = args.system == null ? null : parseSystem(args.system);
      if (args.system != null && !system) throw new ToolError('system must be a Icelus design system file');
      return { issues: critique(project.elements, project.cols, project.rows, system).map(({ id, otherId, ...i }) =>
        ({ ...i, ...(id && { index: index.get(id) }), message: critiqueMessage(i) })) };
    }

    case 'system_from_code': {
      if (!Array.isArray(args.files) || args.files.length > 200) throw new ToolError('files must be an array of up to 200 { path, text }');
      const files = args.files.map((f, i) => {
        if (!f || typeof f !== 'object') throw new ToolError(`files[${i}] must be an object`);
        return { path: String(f.path ?? '').slice(0, 300), text: text(f.text) };
      });
      return systemFromCode(files, typeof args.name === 'string' ? args.name : 'Design system');
    }

    case 'list_notes': {
      const project = parseProject(JSON.stringify(args.project ?? null));
      if (!project) throw new ToolError('project must be a Icelus project with an elements array');
      return { notes: project.elements.flatMap((el, index) => (el.note ? [{ index, part: el.presetId, col: el.col, row: el.row, note: el.note }] : [])) };
    }

    case 'wireframe_to_handoff': {
      const project = parseProject(JSON.stringify(args.project ?? null));
      if (!project) throw new ToolError('project must be a Icelus project with an elements array');
      const name = typeof args.name === 'string' && args.name.trim() ? args.name.trim().slice(0, 80) : 'Icelus project';
      return { markdown: handoff(project.elements, project.cols, project.rows, name) };
    }

    case 'wireframe_to_sketch': {
      const project = parseProject(JSON.stringify(args.project ?? null));
      if (!project) throw new ToolError('project must be a Icelus project with an elements array');
      return toSketch(project.elements);
    }

    case 'wireframe_to_code': {
      const project = parseProject(JSON.stringify(args.project ?? null));
      if (!project) throw new ToolError('project must be a Icelus project with an elements array');
      const format = args.format ?? 'react';
      if (format !== 'react' && format !== 'swiftui') throw new ToolError('format must be react or swiftui');
      const name = typeof args.name === 'string' ? args.name.slice(0, 80) : 'Layout';
      const make = format === 'react' ? toReact : toSwiftUI;
      return { format, code: make(project.elements, project.cols, project.rows, name) };
    }

    case 'wireframe_to_deck': {
      const project = parseProject(JSON.stringify(args.project ?? null));
      if (!project) throw new ToolError('project must be a Icelus project with an elements array');
      const title = typeof args.title === 'string' && args.title.trim() ? args.title.trim().slice(0, 80) : 'Icelus deck';
      return { slides: slides(project.elements, project.cols, project.rows), html: toDeck(project.elements, project.cols, project.rows, title) };
    }

    case 'wireframe_to_ansi': {
      const project = parseProject(JSON.stringify(args.project ?? null));
      if (!project) throw new ToolError('project must be a Icelus project with an elements array');
      const { elements, cols, rows } = project;
      return { ansi: toAnsi(renderElements(elements, cols, rows), colorMask(elements, cols, rows)) };
    }

    case 'wireframe_to_html': {
      const project = parseProject(JSON.stringify(args.project ?? null));
      if (!project) throw new ToolError('project must be a Icelus project with an elements array');
      return { html: toHTML(project.elements, project.cols, project.rows) };
    }

    case 'text_to_project': {
      const { cols, rows } = dimensions(args);
      const elements = importText(text(args.text));
      return { project: JSON.parse(serializeProject({ cols, rows, elements })), parts: elements.length };
    }

    default:
      return null;
  }
}

export { ToolError };
