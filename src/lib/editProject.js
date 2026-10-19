// edit_project: a list of ops applied to a project, in order, as one call. Split out of tools.js.
import {
  renderElements, serializeProject, trimText, gridToText, parseProject, moveElement, updateElement,
  deleteElement, createLine, BOX_STYLES, ADJUSTMENTS, adjustLayer, swapSymbol,
} from './engine.js';
import { OWN_KEYS } from './shapes.js';
import { BLENDS } from './lines.js';
import { takeSnapshot } from './history.js';
import { playAction, cleanStep } from './actions.js';
import { expandChanges, harmonize } from './heal.js';
import { autoLayout, constrain, syncTwins, makeSizes, AUTO_MAX } from './layout.js';
import { parseLibrary, pullLibrary } from './library.js';
import { MODES, VAR_MAX, isVarName, setMode, setVar, canvasVars } from './modes.js';
import { variations, keepVariation } from './tweaks.js';
import { removeDistractions } from './critique.js';
import { strokeCells, paint, paintMarks, erase } from './brush.js';
import { gradientMarks, GRADIENT_MODES } from './gradient.js';
import { cleanColor } from './color.js';
import { marquee, wand, cutCells, fillCells, moveCells } from './select.js';
import { MAX_OPS, EDIT_OPS } from './toolList.js';
import { ToolError, MAX_COLS, MAX_ROWS, int, text } from './toolArgs.js';

export function editProject(args) {
  const project = parseProject(JSON.stringify(args.project ?? null));
  if (!project) throw new ToolError('project must be a Icelus project with an elements array');
  if (!Array.isArray(args.ops) || args.ops.length > MAX_OPS) throw new ToolError(`ops must be an array of at most ${MAX_OPS}`);
  // Strokes cost per point, so one call carries at most 5,000 points across all its paint and erase ops.
  const strokePoints = args.ops.reduce((sum, op) => sum + (Array.isArray(op?.points) ? op.points.length : 0), 0);
  if (strokePoints > 5000) throw new ToolError('paint and erase ops carry at most 5000 points in one call');
  // Indices are resolved to ids up front, so a delete does not shift the parts later ops name.
  const ids = project.elements.map(el => el.id);
  let { elements, snapshots = [], actions = [] } = project;
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
    if (op.op === 'pull') { // a library's newer parts into every linked copy (library.js)
      const library = parseLibrary(op.library);
      if (!library) throw new ToolError(`${at}.library must be a library from project_to_library`);
      elements = pullLibrary(elements, library).elements;
      return;
    }
    if (op.op === 'mode') { // the whole canvas in one line set (modes.js); null goes back to each part's own
      if (op.mode !== null && !MODES.includes(op.mode)) throw new ToolError(`${at}.mode must be null or one of ${MODES.join(', ')}`);
      elements = setMode(elements, op.mode);
      return;
    }
    if (op.op === 'var') { // a named spacing value auto layout screens use by name; null removes it
      if (!isVarName(op.name)) throw new ToolError(`${at}.name must be lowercase letters, digits or dashes, at most 16`);
      if (op.value !== null && Object.keys(canvasVars(elements)).length >= VAR_MAX && canvasVars(elements)[op.name] === undefined) throw new ToolError(`a project holds at most ${VAR_MAX} variables`);
      elements = setVar(elements, op.name, op.value === null ? null : n('value', 0, AUTO_MAX));
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
    if (op.op === 'clean') { elements = removeDistractions(elements, project.cols, project.rows); return; }
    if (op.op === 'snapshot') { snapshots = takeSnapshot(snapshots, elements, typeof op.name === 'string' ? op.name : ''); return; }
    if (op.op === 'restore') {
      const snap = snapshots.find(sn => sn.name === op.name);
      if (!snap) throw new ToolError(`${at}.name must name a snapshot: ${snapshots.map(sn => sn.name).join(', ') || 'the project has none'}`);
      elements = snap.elements;
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
    else if (op.op === 'expand') {
      // A table grows by rows, a list by items, each carrying its pattern on.
      const changes = expandChanges(elements.find(el => el.id === id), op.by === undefined ? 1 : n('by', 1, 50));
      if (!changes) throw new ToolError(`${at} names a part that does not expand (tables and lists do)`);
      elements = updateElement(elements, id, changes);
    }
    else if (op.op === 'harmonize') elements = harmonize(elements, id);
    else if (op.op === 'own') elements = updateElement(elements, id, { own: OWN_KEYS.filter(k => op[k] === true) });
    else if (op.op === 'swap') {
      const other = elements.find(el => el.id === ids[int(op.with, `${at}.with`, { min: 0, max: ids.length - 1 })]);
      if (!other?.symbol) throw new ToolError(`${at}.with must name a part that is a symbol`);
      elements = swapSymbol(elements, id, other.symbol);
    }
    else if (op.op === 'sizes') elements = makeSizes(elements, id).elements;
    else if (op.op === 'pin') elements = updateElement(elements, id, { pin: { x: op.x, y: op.y } });
    else if (op.op === 'auto') elements = updateElement(elements, id, { auto: op.off ? null : { gap: op.gap ?? 1, pad: op.pad ?? 1 } });
    else if (op.op === 'play') {
      // An action's steps on this part: by name from the project's actions, or given inline.
      const saved = typeof op.name === 'string' ? actions.find(a => a.name === op.name) : null;
      if (typeof op.name === 'string' && !saved) throw new ToolError(`${at}.name must name an action: ${actions.map(a => a.name).join(', ') || 'the project has none'}`);
      if (!saved && (!Array.isArray(op.steps) || op.steps.length > 50)) throw new ToolError(`${at} needs name or steps (at most 50)`);
      elements = playAction(elements, saved ? saved.steps : op.steps.map(cleanStep).filter(Boolean), [id], project.cols, project.rows);
    }
    else if (op.op === 'tweak') {
      if (op.style !== undefined && !BOX_STYLES.includes(op.style)) throw new ToolError(`${at}.style must be one of ${BOX_STYLES.join(', ')}`);
      const knob = k => (op[k] === undefined ? undefined : n(k, 0, 8));
      elements = updateElement(elements, id, { tweak: { spacing: knob('spacing'), padding: knob('padding'), style: op.style } });
    } else if (op.op === 'delete') elements = deleteElement(elements, id);
    else throw new ToolError(`${at}.op must be ${EDIT_OPS}`);
  });
  const { cols, rows } = project;
  elements = autoLayout(project.elements, constrain(project.elements, syncTwins(project.elements, elements)));
  return {
    text: trimText(gridToText(renderElements(elements, cols, rows))),
    project: JSON.parse(serializeProject({ cols, rows, elements, snapshots, actions })),
  };
}
