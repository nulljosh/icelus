import { useReducer, useCallback, useState, useEffect, useRef, useMemo } from 'react';
import { t, partLabel } from './i18n.js';
import './App.css';
import Toolbar from './components/Toolbar.jsx';
import Canvas from './components/Canvas.jsx';
import Inspector from './components/Inspector.jsx';
import Boxy from './components/Boxy.jsx';
import Tutorial from './components/Tutorial.jsx';
import Present from './components/Present.jsx';
import BrushBar from './components/BrushBar.jsx';
import ChatPanel from './components/ChatPanel.jsx';
import HistoryList from './components/HistoryList.jsx';
import { recordAction, saveAction, playAction, cleanActionName } from './lib/actions.js';
import { harmonize } from './lib/heal.js';
import { autoLayout, constrain, syncTwins, makeSizes } from './lib/layout.js';
import { setMode, setVar } from './lib/modes.js';
import { makeLibrary, parseLibrary, pullLibrary, libraryPalette } from './lib/library.js';
import { maxOf } from './lib/extent.js';
import SelectBar from './components/SelectBar.jsx';
import { paint, paintMarks, erase } from './lib/brush.js';
import { colorMask, hasColor, toAnsi } from './lib/color.js';
import { drawCells } from './components/canvasHelpers.js';
import { cutCells, fillCells, moveCells, shiftCells, cellText } from './lib/select.js';
import { slides, toDeck } from './lib/deck.js';
import AccountPanel, { useAccount } from './components/AccountPanel.jsx';
import { displayName } from './lib/account.js';
import { TUTORIAL, lessonSnapshot, stepDone, newestButton } from './lib/tutorial.js';
import { variations, keepVariation } from './lib/tweaks.js';
import { handoff } from './lib/handoff.js';
import { toReact, toSwiftUI } from './lib/code.js';
import {
  createState, undo, redo, pushHistory, gridToText,
  createElement, renderElements, moveElement, deleteElement, updateElement, swapSymbol,
  duplicateElement, reorderElement, nudgeElement, createLine,
  toAscii, trimText, toMarkdown, serializeProject, parseProject, screensDocument,
  groupElements, ungroupElements, groupMates, makeSymbol, detachSymbol, symbolUses, freshTag, accentMask, adjustLayer, partsInside,
} from './lib/engine.js';
import { getPreset } from './lib/presets.js';
import { goToStep, takeSnapshot, cleanSnapshotName } from './lib/history.js';
import { useWebMCP } from './lib/webmcp.js';
import { encodeShare, decodeShare } from './lib/share.js';
import { parseSketch, toSketch, screenTemplate } from './lib/syntax.js';
import { photoToText, photoGrid } from './lib/photo.js';
import { parsePalette, addToPalette } from './lib/palette.js';
import { parseSystem, withSystem } from './lib/system.js';
import { toHTML } from './lib/html.js';
import { importText } from './lib/importer.js';

// The canvas grows to hold whatever is on it (screens side by side), up to the 500 cell limit files allow.
function fitCanvas(state, elements) {
  const right = Math.max(0, ...elements.map(el => el.col + el.width)), bottom = Math.max(0, ...elements.map(el => el.row + el.height));
  return { cols: Math.min(500, Math.max(state.cols, right + 2)), rows: Math.min(500, Math.max(state.rows, bottom + 2)) };
}

// Every edit lets pinned parts follow a resized screen and restacks screens with auto layout on (layout.js). Undo and redo land on states already laid out.
function reducer(state, action) {
  const next = edit(state, action);
  if (next.elements === state.elements || ['UNDO', 'REDO', 'GO_TO_STEP'].includes(action.type)) return next;
  const elements = autoLayout(state.elements, constrain(state.elements, syncTwins(state.elements, next.elements)));
  return elements === next.elements ? next : { ...next, elements, grid: renderElements(elements, next.cols, next.rows) };
}

function edit(state, action) {
  switch (action.type) {
    case 'SELECT_PRESET':
      return { ...state, selectedPreset: action.preset };

    case 'PLACE_COMPONENT': {
      const { preset, col, row } = action;
      const withHistory = pushHistory(state);
      if (preset.source) {
        // A screen template: the frame goes to the back, its parts on top.
        const [frame, ...parts] = screenTemplate(preset.name, preset.source, col, row);
        const elements = [frame, ...withHistory.elements, ...parts];
        const { cols, rows } = fitCanvas(state, elements);
        return { ...withHistory, cols, rows, elements, grid: renderElements(elements, cols, rows), selectedPreset: null, selectedId: frame.id };
      }
      const el = createElement(preset, col, row);
      // A screen goes to the back, so the parts inside it draw on top in every app, old ones included.
      // A part dropped on a screen takes on its look (heal.js harmonize).
      const elements = preset.id === 'screen' ? [el, ...withHistory.elements] : harmonize([...withHistory.elements, el], el.id);
      const { cols, rows } = fitCanvas(state, elements);
      return {
        ...withHistory,
        cols, rows,
        elements,
        grid: renderElements(elements, cols, rows),
        selectedPreset: null,
        // Text and banners are selected so they open straight into typing.
        selectedId: ['text', 'banner', 'screen'].includes(preset.id) ? el.id : null,
      };
    }

    case 'PLACE_SKETCH': {
      // A typed screen lands under whatever is already on the canvas.
      const below = Math.max(0, ...state.elements.map(el => el.row + el.height));
      const sketch = parseSketch(action.source, below + 1);
      if (!sketch.length) return state;
      const withHistory = pushHistory(state);
      const elements = [...withHistory.elements, ...sketch];
      return { ...withHistory, elements, grid: renderElements(elements, state.cols, state.rows), selectedPreset: null, selectedId: null };
    }

    case 'PLACE_BELOW': {
      // A photo lands under whatever is already on the canvas, like a typed screen.
      const below = Math.max(0, ...state.elements.map(el => el.row + el.height));
      const withHistory = pushHistory(state);
      const el = createElement(action.preset, 2, below + 1);
      const elements = [...withHistory.elements, el];
      return { ...withHistory, elements, grid: renderElements(elements, state.cols, state.rows), selectedPreset: null, selectedId: el.id };
    }

    case 'PLACE_TEXT': {
      // A pasted text wireframe becomes parts, under whatever is already on the canvas.
      const below = state.elements.length ? Math.max(...state.elements.map(el => el.row + el.height)) + 1 : 0;
      const pasted = importText(action.text, below, state.elements.length ? 2 : 0);
      if (!pasted.length) return state;
      const withHistory = pushHistory(state);
      const elements = [...withHistory.elements, ...pasted];
      const { cols, rows } = fitCanvas(state, elements);
      return { ...withHistory, cols, rows, elements, grid: renderElements(elements, cols, rows), selectedPreset: null, selectedId: null };
    }

    case 'PAINT': {
      // One stroke of the brush or eraser: one step of undo. The brush stays picked for the next stroke.
      const elements = action.mode === 'erase' ? erase(state.elements, action.cells)
        : action.mode === 'marks' ? paintMarks(state.elements, action.cells) : paint(state.elements, action.cells, action.char);
      if (elements === state.elements || (action.mode === 'erase' && elements.length === state.elements.length && elements.every((e, i) => e === state.elements[i]))) return state;
      const withHistory = pushHistory(state);
      return { ...withHistory, elements, grid: renderElements(elements, state.cols, state.rows) };
    }

    case 'CELLS': {
      // Cut, fill or move the picked cells: one step of undo. Whole parts inside move or go with them.
      const { cells, op } = action;
      const elements = op === 'cut' ? cutCells(state.elements, cells) : op === 'fill' ? fillCells(state.elements, cells, action.char)
        : moveCells(state.elements, cells, action.dCol, action.dRow, state.cols, state.rows);
      if (elements === state.elements) return state;
      const withHistory = pushHistory(state);
      return { ...withHistory, elements, grid: renderElements(elements, state.cols, state.rows) };
    }

    case 'PLACE_DESCRIBED': {
      // A screen from Describe it: it replaces the picked screen in place, or lands to the right of the rest.
      const { source, replaceId } = action;
      const name = (source.match(/^#\s+(.+)$/m)?.[1] ?? 'Screen').trim().slice(0, 40);
      const withHistory = pushHistory(state);
      const old = replaceId ? withHistory.elements.find(e => e.id === replaceId && e.presetId === 'screen') : null;
      let rest = withHistory.elements, col = 0, row = 0;
      if (old) {
        const gone = new Set([old.id, ...partsInside(rest, old).map(e => e.id)]);
        rest = rest.filter(e => !gone.has(e.id)); col = old.col; row = old.row;
      } else if (rest.length) col = maxOf(rest.map(e => e.col + e.width)) + 4;
      const [frame, ...parts] = screenTemplate(name, source, col, row);
      const elements = [frame, ...rest, ...parts];
      const { cols, rows } = fitCanvas(state, elements);
      return { ...withHistory, cols, rows, elements, grid: renderElements(elements, cols, rows), selectedPreset: null, selectedId: frame.id };
    }

    case 'PLACE_ADJUST': {
      // An adjustment goes on top and is selected, so its kind is right there in the inspector.
      const { col, row, width, height, adjust } = action;
      const layer = adjustLayer(col, row, width, height, adjust);
      const withHistory = pushHistory(state);
      const elements = [...withHistory.elements, layer];
      return { ...withHistory, elements, grid: renderElements(elements, state.cols, state.rows), selectedPreset: null, selectedId: layer.id };
    }

    case 'PLACE_LINE': {
      const withHistory = pushHistory(state);
      const elements = [...withHistory.elements, createLine(withHistory.elements, action.start, action.end)];
      return { ...withHistory, elements, grid: renderElements(elements, state.cols, state.rows), selectedPreset: null, selectedId: null };
    }

    case 'SELECT_ELEMENT': {
      // Shift-click picks several parts to group; a plain click starts over.
      const was = state.picked?.length ? state.picked : state.selectedId ? [state.selectedId] : [];
      const picked = action.add && action.id && state.selectedId
        ? (was.includes(action.id) ? was.filter(id => id !== action.id) : [...was, action.id]) : [];
      return { ...state, selectedId: action.add && !picked.includes(action.id) ? picked.at(-1) ?? null : action.id, picked, selectedPreset: null };
    }

    case 'SYMBOL': {
      // Make the selected part a symbol (its copies stay linked), or cut this copy loose.
      const elements = action.detach ? detachSymbol(state.elements, state.selectedId) : makeSymbol(state.elements, state.selectedId, freshTag());
      return { ...pushHistory(state), elements };
    }

    case 'GROUP': {
      const elements = action.ungroup ? ungroupElements(state.elements, state.selectedId) : groupElements(state.elements, state.picked ?? []);
      if (elements === state.elements) return state;
      return { ...pushHistory(state), elements, picked: [] };
    }

    case 'MOVE_ELEMENT': {
      const { id, col, row } = action;
      const withHistory = pushHistory(state);
      const elements = moveElement(withHistory.elements, id, col, row);
      return { ...withHistory, elements, grid: renderElements(elements, state.cols, state.rows) };
    }

    case 'UPDATE_ELEMENT': {
      const current = state.elements.find(el => el.id === action.id);
      if (!current || (action.changes.text !== undefined && action.changes.text === current.template.join('\n'))) return state;
      const elements = updateElement(state.elements, action.id, action.changes);
      return {...pushHistory(state), elements, grid: renderElements(elements, state.cols, state.rows)};
    }

    case 'DELETE_ELEMENT': {
      const withHistory = pushHistory(state);
      const elements = deleteElement(withHistory.elements, action.id);
      return {
        ...withHistory,
        elements,
        grid: renderElements(elements, state.cols, state.rows),
        selectedId: null,
      };
    }

    case 'SWAP_SYMBOL': {
      const elements = swapSymbol(state.elements, action.id, action.symbol);
      return elements === state.elements ? state : { ...pushHistory(state), elements, grid: renderElements(elements, state.cols, state.rows) };
    }

    // Libraries (library.js): every linked copy takes the opened library's version, one undo step.
    case 'PULL_LIBRARY': {
      const { elements } = pullLibrary(state.elements, action.library);
      return elements === state.elements ? state : { ...pushHistory(state), elements, grid: renderElements(elements, state.cols, state.rows) };
    }

    // Variables and modes (modes.js): the canvas line set, or a named spacing value; one undo step each.
    case 'CANVAS': {
      const elements = 'mode' in action ? setMode(state.elements, action.mode) : setVar(state.elements, action.name, action.value);
      return { ...pushHistory(state), elements, grid: renderElements(elements, state.cols, state.rows) };
    }

    // Sizes (layout.js): the screen at phone, tablet and desktop widths, kept in step.
    case 'MAKE_SIZES': {
      const { elements } = makeSizes(state.elements, action.id);
      if (elements === state.elements) return state;
      const { cols, rows } = fitCanvas(state, elements);
      return { ...pushHistory(state), cols, rows, elements, grid: renderElements(elements, cols, rows) };
    }

    // Review's Remove distractions: one step of undo, arrows through a removed part heal.
    case 'REMOVE_PARTS': {
      const elements = action.ids.reduce((els, id) => deleteElement(els, id), state.elements);
      if (elements === state.elements) return state;
      return { ...pushHistory(state), elements, grid: renderElements(elements, state.cols, state.rows), selectedId: null };
    }

    case 'DUPLICATE': {
      const { elements, id } = duplicateElement(state.elements, action.id, state.cols, state.rows);
      if (!id) return state;
      const { cols, rows } = fitCanvas(state, elements);
      return { ...pushHistory(state), cols, rows, elements, grid: renderElements(elements, cols, rows), selectedId: id };
    }

    case 'VARIATIONS': {
      const { elements, ids } = variations(state.elements, action.id, action.labels);
      if (!ids.length) return state;
      const { cols, rows } = fitCanvas(state, elements);
      return { ...pushHistory(state), cols, rows, elements, grid: renderElements(elements, cols, rows), selectedId: ids[0] };
    }

    case 'KEEP_VARIATION': {
      const elements = keepVariation(state.elements, action.id);
      return { ...pushHistory(state), elements, grid: renderElements(elements, state.cols, state.rows), selectedId: action.id };
    }

    case 'REORDER': {
      const elements = reorderElement(state.elements, action.id, action.to);
      if (elements === state.elements) return state;
      return { ...pushHistory(state), elements, grid: renderElements(elements, state.cols, state.rows) };
    }

    case 'NUDGE': {
      const elements = nudgeElement(state.elements, action.id, action.dCol, action.dRow, state.cols, state.rows);
      if (elements === state.elements) return state;
      return { ...pushHistory(state), elements, grid: renderElements(elements, state.cols, state.rows) };
    }

    case 'LOAD': {
      const elements = action.elements;
      return {
        ...pushHistory(state), cols: action.cols, rows: action.rows, elements, snapshots: action.snapshots ?? state.snapshots, actions: action.actions ?? state.actions, recording: null,
        grid: renderElements(elements, action.cols, action.rows), selectedId: null, selectedPreset: null,
      };
    }

    case 'SET_CURSOR':
      return { ...state, cursor: { col: action.col, row: action.row } };

    case 'UNDO':
      return undo(state);

    case 'REDO':
      return redo(state);

    // History panel (history.js): jump to any step; snapshots are named copies kept in the project file.
    case 'GO_TO_STEP':
      return { ...goToStep(state, action.index), selectedId: null };

    case 'SNAPSHOT':
      return { ...state, snapshots: takeSnapshot(state.snapshots, state.elements, action.name) };

    case 'RENAME_SNAPSHOT':
      return { ...state, snapshots: state.snapshots.map((s, i) => (i === action.index ? { ...s, name: cleanSnapshotName(action.name, i + 1) } : s)) };

    case 'DELETE_SNAPSHOT':
      return { ...state, snapshots: state.snapshots.filter((_, i) => i !== action.index) };

    // Actions (actions.js): recording marks where it started; stop turns the steps since then into an action.
    case 'RECORD_ACTION':
      return { ...state, recording: state.history.length };

    case 'STOP_ACTION': {
      if (state.recording == null) return state;
      const made = recordAction(state, state.recording, action.name, state.actions?.length ?? 0);
      return { ...state, recording: null, actions: made.steps.length ? saveAction(state.actions, made) : state.actions };
    }

    case 'PLAY_ACTION': {
      const act = state.actions?.[action.index];
      const ids = state.picked?.length ? state.picked : state.selectedId ? [state.selectedId] : [];
      if (!act || !ids.length) return state;
      const elements = playAction(state.elements, act.steps, ids, state.cols, state.rows);
      if (elements === state.elements) return state;
      return { ...pushHistory(state), elements, grid: renderElements(elements, state.cols, state.rows),
        selectedId: elements.some(el => el.id === state.selectedId) ? state.selectedId : null };
    }

    case 'RENAME_ACTION':
      return { ...state, actions: state.actions.map((a, i) => (i === action.index ? { ...a, name: cleanActionName(action.name, i + 1) } : a)) };

    case 'DELETE_ACTION':
      return { ...state, actions: state.actions.filter((_, i) => i !== action.index) };

    case 'RESTORE_SNAPSHOT': {
      const snap = state.snapshots?.[action.index];
      if (!snap) return state;
      return { ...pushHistory(state), elements: snap.elements, grid: renderElements(snap.elements, state.cols, state.rows), selectedId: null };
    }

    case 'CLEAR': {
      const withHistory = pushHistory(state);
      return { ...withHistory, elements: [], grid: createState(withHistory.cols, withHistory.rows).grid, selectedId: null };
    }

    case 'SET_GRID': {
      const withHistory = pushHistory(state);
      return { ...withHistory, grid: action.grid, elements: [], selectedId: null };
    }

    default:
      return state;
  }
}

const UndoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M2.5 7L5 4.5M2.5 7L5 9.5M2.5 7H9a4 4 0 0 1 0 8H7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const RedoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M13.5 7L11 4.5M13.5 7L11 9.5M13.5 7H7a4 4 0 0 0 0 8H8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const SunIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="8" y1="0.5" x2="8" y2="2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="8" y1="13.5" x2="8" y2="15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="0.5" y1="8" x2="2.5" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="13.5" y1="8" x2="15.5" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="2.55" y1="2.55" x2="3.96" y2="3.96" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="12.04" y1="12.04" x2="13.45" y2="13.45" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="2.55" y1="13.45" x2="3.96" y2="12.04" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="12.04" y1="3.96" x2="13.45" y2="2.55" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

// A gear: the outer ring's dashes are the teeth.
const GearIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <circle cx="9" cy="9" r="6.4" stroke="currentColor" strokeWidth="2.6" strokeDasharray="2.5 2.53" />
    <circle cx="9" cy="9" r="4.6" stroke="currentColor" strokeWidth="1.6" />
    <circle cx="9" cy="9" r="1.6" fill="currentColor" />
  </svg>
);
const PersonIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <circle cx="9" cy="6" r="3.2" stroke="currentColor" strokeWidth="1.6" />
    <path d="M2.8 16c.6-3.1 3.1-5 6.2-5s5.6 1.9 6.2 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);
const MoonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M13.5 9.5A6 6 0 0 1 6.5 2.5a6 6 0 1 0 7 7z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const DOC_KEY = 'blockprint-doc';
const ASCII_KEY = 'blockprint-ascii';
const PALETTE_KEY = 'glyphic-palette';
const SYSTEM_KEY = 'glyphbox-system';
// `/app/?demo` is the copy the landing page embeds: a seeded sample, no tour, and it never
// reads or writes the visitor's own saved canvas or settings.
const DEMO = new URLSearchParams(window.location.search).has('demo');

function demoState() {
  const base = createState();
  const elements = [['navbar', 2, 1], ['card', 3, 6], ['button', 32, 7], ['input', 32, 11]]
    .map(([id, col, row]) => createElement(getPreset(id), col, row));
  return { ...base, elements, grid: renderElements(elements, base.cols, base.rows) };
}

// The canvas survives a reload: elements and size are saved on every change.
function initialState() {
  if (DEMO) return demoState();
  const base = createState();
  try {
    const raw = localStorage.getItem(DOC_KEY) || '';
    const saved = parseProject(raw);
    // A doc that no longer parses is set aside before the first autosave can overwrite it.
    if (raw && !saved) localStorage.setItem(`${DOC_KEY}-unreadable`, raw);
    if (saved && saved.elements.length) {
      return { ...base, cols: saved.cols, rows: saved.rows, elements: saved.elements, snapshots: saved.snapshots ?? [], actions: saved.actions ?? [],
        grid: renderElements(saved.elements, saved.cols, saved.rows) };
    }
  } catch { /* private mode or blocked storage: start blank */ }
  return base;
}

function download(name, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [asciiOnly, setAsciiOnly] = useState(() => {
    try { return localStorage.getItem(ASCII_KEY) === '1'; } catch { return false; }
  });
  const [toast, setToast] = useState('');
  const fileRef = useRef(null);
  const photoRef = useRef(null);
  const photoModeRef = useRef('photo');
  const [trace, setTrace] = useState(null);
  const [mine, setMine] = useState(() => { try { return parsePalette(localStorage.getItem(PALETTE_KEY)); } catch { return []; } });
  const saveMine = useCallback((next) => {
    setMine(next);
    try { localStorage.setItem(PALETTE_KEY, JSON.stringify(next)); } catch { /* storage full or blocked */ }
  }, []);
  const handleSaveToPalette = useCallback((el) => {
    saveMine(addToPalette(mine, el));
    setToast(t('in_palette', { name: partLabel(el) }));
  }, [mine, saveMine]);
  const handleRemoveMine = useCallback((id) => saveMine(mine.filter(p => p.id !== id)), [mine, saveMine]);
  // A design system file (icelus system): its parts join Mine and Review checks boxes against its style.
  const [system, setSystem] = useState(() => { try { return parseSystem(localStorage.getItem(SYSTEM_KEY)); } catch { return null; } });
  const saveSystem = useCallback((next) => {
    setSystem(next);
    try { if (next) localStorage.setItem(SYSTEM_KEY, JSON.stringify({ ...next, parts: [] })); else localStorage.removeItem(SYSTEM_KEY); } catch { /* blocked */ }
  }, []);
  // The look: real controls by default, or every part in characters. Remembered per viewer.
  const [look, setLookState] = useState(() => { try { return localStorage.getItem('glyphbox-look') === 'text' ? 'text' : 'real'; } catch { return 'real'; } });
  const setLook = useCallback(next => { setLookState(next); try { if (!DEMO) localStorage.setItem('glyphbox-look', next); } catch { /* private window */ } }, []);
  const [brush, setBrush] = useState({ char: '█', size: 1, ramp: 'straight', adjust: 'invert' });
  const [cellSel, setCellSel] = useState([]); // the cells the marquee or wand picked
  const [presenting, setPresenting] = useState(null);
  const [chatOpen, setChatOpen] = useState(false); // Describe it // the slides on show, or null
  const [mobileSheet, setMobileSheet] = useState(null); // null | 'components' | 'inspector' | 'more'
  const [darkMode, setDarkMode] = useState(() => {
    const saved = DEMO ? null : localStorage.getItem('wiretext-theme');
    return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [showTour, setShowTour] = useState(() => !DEMO && !localStorage.getItem('wiretext-tour-seen'));
  const dismissTour = useCallback(() => {
    localStorage.setItem('wiretext-tour-seen', '1');
    setShowTour(false);
  }, []);
  // The tutorial: lesson is the step index, or null when it is not running. Each step compares the canvas with
  // where it stood when the step began, and moves on by itself.
  const [lesson, setLesson] = useState(null);
  // Accounts (jaybulb-api): signed out is first class. A reset link opens the panel by itself.
  const { user, setUser, recovery, setRecovery } = useAccount(!DEMO);
  const [accountOpen, setAccountOpen] = useState(false);
  useEffect(() => { if (recovery) setAccountOpen('profile'); }, [recovery]);
  // More: the advanced controls, shown or hidden everywhere at once, remembered per viewer.
  const [more, setMoreState] = useState(() => { try { return localStorage.getItem('glyphbox-more') === '1'; } catch { return false; } });
  const setMore = useCallback(open => { setMoreState(open); try { localStorage.setItem('glyphbox-more', open ? '1' : '0'); } catch { /* blocked */ } }, []);
  const [copies, setCopies] = useState(0);
  const lessonStart = useRef(lessonSnapshot([]));

  useEffect(() => {
    if (darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    if (!DEMO) localStorage.setItem('wiretext-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const [typing, setTyping] = useState(false);
  // Capture a page: the server reads it and the lines land in the Type it box, to check before drawing.
  const [capturing, setCapturing] = useState(false);
  const [pageUrl, setPageUrl] = useState('https://');
  const [captureBusy, setCaptureBusy] = useState(false);
  const capturePage = useCallback(async () => {
    setCaptureBusy(true);
    try {
      const res = await fetch('/api/capture', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: pageUrl }) });
      const out = await res.json();
      if (!res.ok || !out.source) throw new Error(out.error);
      setSketchSource(out.source);
      setCapturing(false);
      setTyping(true);
    } catch { setToast(t('capture_failed')); } finally { setCaptureBusy(false); }
  }, [pageUrl]);
  const [sketchSource, setSketchSource] = useState('# Sign in\n"Email"\n"Password"\n[x] Remember me\n[Sign in]  [Cancel]');
  const handleSelectPreset = useCallback((preset) => {
    setMobileSheet(null);
    if (preset?.id === 'type') { setTyping(true); return; }
    if (preset?.id === 'capture') { setCapturing(true); return; }
    if (['photo', 'photo-braille', 'photo-shade', 'trace'].includes(preset?.id)) {
      photoModeRef.current = preset.id;
      photoRef.current?.click();
      return;
    }
    dispatch({ type: 'SELECT_PRESET', preset });
  }, []);
  const drawSketch = useCallback(() => {
    dispatch({ type: 'PLACE_SKETCH', source: sketchSource });
    setTyping(false);
  }, [sketchSource]);

  const handlePlaceLine = useCallback((start, end) => dispatch({ type: 'PLACE_LINE', start, end }), []);
  const handlePaint = useCallback((cells, mode) => dispatch({ type: 'PAINT', cells, mode, char: brush.char }), [brush.char]);
  const picking = ['marquee', 'wand'].includes(state.selectedPreset?.id);
  useEffect(() => { if (!picking) setCellSel([]); }, [picking]);
  const cellTools = useMemo(() => ({
    selection: cellSel,
    onSelect: setCellSel,
    onAdjust: (col, row, width, height) => dispatch({ type: 'PLACE_ADJUST', col, row, width, height, adjust: brush.adjust }),
    onMove: (dCol, dRow) => {
      dispatch({ type: 'CELLS', op: 'move', cells: cellSel, dCol, dRow });
      setCellSel(shiftCells(cellSel, dCol, dRow, state.cols, state.rows));
    },
  }), [cellSel, state.cols, state.rows, brush.adjust]);
  const handlePlaceComponent = useCallback((preset, col, row) => {
    dispatch({ type: 'PLACE_COMPONENT', preset, col, row });
  }, []);

  const handleCursorMove = useCallback((col, row) => {
    dispatch({ type: 'SET_CURSOR', col, row });
  }, []);

  useWebMCP({ state, dispatch, system });

  const handleSelectElement = useCallback((id, add = false) => dispatch({ type: 'SELECT_ELEMENT', id, add }), []);
  const handleGroup = useCallback((ungroup = false) => dispatch({ type: 'GROUP', ungroup }), []);
  const handleSymbol = useCallback((detach = false) => dispatch({ type: 'SYMBOL', detach }), []);
  const handleMoveElement = useCallback((id, col, row) => dispatch({ type: 'MOVE_ELEMENT', id, col, row }), []);
  const handleUpdateElement = useCallback((id, changes) => dispatch({ type: 'UPDATE_ELEMENT', id, changes }), []);
  const handleDeleteElement = useCallback((id) => dispatch({ type: 'DELETE_ELEMENT', id }), []);

  const handleUndo = useCallback(() => dispatch({ type: 'UNDO' }), []);
  const handleRedo = useCallback(() => dispatch({ type: 'REDO' }), []);
  const handleClear = useCallback(() => dispatch({ type: 'CLEAR' }), []);

  useEffect(() => {
    if (DEMO) return;
    try { localStorage.setItem(DOC_KEY, serializeProject(state)); } catch { /* storage full or blocked */ }
  }, [state.elements, state.cols, state.rows, state.snapshots, state.actions]);

  useEffect(() => {
    if (DEMO) return;
    try { localStorage.setItem(ASCII_KEY, asciiOnly ? '1' : '0'); } catch { /* ignore */ }
  }, [asciiOnly]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(''), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  // What leaves the app: trimmed of padding, and plain ASCII when that switch is on.
  const outputText = useCallback(() => {
    const text = trimText(gridToText(state.grid));
    return asciiOnly ? toAscii(text) : text;
  }, [state.grid, asciiOnly]);

  const handleExport = useCallback(() => {
    download('wireframe.txt', new Blob([outputText() + '\n'], { type: 'text/plain' }));
  }, [outputText]);

  // A share link opens the sketch it carries. The visitor's own canvas is kept under a backup key and
  // one Undo away, so opening a link never loses work.
  useEffect(() => {
    const code = window.location.hash.match(/^#p=([A-Za-z0-9_-]+)$/)?.[1];
    if (!code) return;
    history.replaceState(null, '', window.location.pathname + window.location.search);
    decodeShare(code).then(json => {
      const shared = json && parseProject(json);
      if (!shared) { setToast(t('share_broken')); return; }
      try { localStorage.setItem(DOC_KEY + '-before-share', localStorage.getItem(DOC_KEY) || ''); } catch { /* ignore */ }
      dispatch({ type: 'LOAD', ...shared });
      setToast(t('share_opened'));
    });
  }, []);

  const handleSaveProject = useCallback(() => {
    download('wireframe.icelus', new Blob([serializeProject(state)], { type: 'application/json' }));
  }, [state]);

  const handlePhoto = useCallback(async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const bitmap = await createImageBitmap(file);
      if (photoModeRef.current === 'trace') {
        setTrace(old => { old?.close(); return bitmap; });
        return;
      }
      const look = { 'photo-braille': 'braille', 'photo-shade': 'shade' }[photoModeRef.current] ?? 'blocks';
      const { w, h } = photoGrid(bitmap.width, bitmap.height, Math.min(60, state.cols - 4), look);
      const ctx = Object.assign(document.createElement('canvas'), { width: w, height: h }).getContext('2d');
      ctx.fillStyle = '#fff'; // transparent pixels read as paper, not ink
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(bitmap, 0, 0, w, h);
      bitmap.close();
      const rgba = ctx.getImageData(0, 0, w, h).data;
      const gray = Array.from({ length: w * h }, (_, i) => 0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2]);
      const template = photoToText(gray, w, h, look);
      dispatch({ type: 'PLACE_BELOW', preset: { id: 'photo', label: 'Photo', template, width: [...template[0]].length, height: template.length } });
    } catch {
      setToast(t('photo_failed'));
    }
  }, [state.cols]);

  useEffect(() => {
    if (DEMO) return;
    const onPaste = (e) => {
      const target = e.target;
      if (target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      const text = e.clipboardData?.getData('text/plain') ?? '';
      if (!text.trim() || text.length > 200_000) return;
      e.preventDefault();
      dispatch({ type: 'PLACE_TEXT', text });
      setToast(t('pasted'));
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, []);

  const handleOpenFile = useCallback(async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 2_000_000) { setToast(t('file_too_big')); return; }
    const text = await file.text();
    const library = parseLibrary(text);
    if (library) { // its parts join Mine, linked; copies already on the canvas take its version
      const ids = new Set(library.parts.map(p => `mine-lib-${p.symbol}`));
      saveMine([...mine.filter(p => !ids.has(p.id)), ...libraryPalette(library)].slice(-100));
      dispatch({ type: 'PULL_LIBRARY', library });
      setToast(t('library_loaded', { name: library.name, n: library.parts.length }));
      return;
    }
    const loaded = parseSystem(text);
    if (loaded) {
      saveMine(withSystem(mine, loaded));
      saveSystem(loaded);
      setToast(t('system_loaded', { name: loaded.name, n: loaded.parts.length }));
      return;
    }
    const project = parseProject(text);
    if (project) {
      dispatch({ type: 'LOAD', ...project });
      setToast(t('opened', { name: file.name }));
    } else if (!text.trim().startsWith('{')) {
      dispatch({ type: 'CLEAR' });
      dispatch({ type: 'PLACE_TEXT', text });
      setToast(t('imported', { name: file.name }));
    } else {
      setToast(t('open_failed'));
    }
  }, [state.cols, state.rows, mine, saveMine, saveSystem]);

  const handleExportPng = useCallback(() => {
    const FONT_SIZE = 14;
    const LINE_HEIGHT = 20;
    const FONT_FAMILY = "'SF Mono', ui-monospace, Menlo, monospace";
    const measureCanvas = document.createElement('canvas');
    const mctx = measureCanvas.getContext('2d');
    mctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
    const charW = mctx.measureText('M').width;

    const cols = state.cols;
    const rows = state.rows;
    const offscreen = document.createElement('canvas');
    offscreen.width = Math.ceil(cols * charW);
    offscreen.height = rows * LINE_HEIGHT;
    const ctx = offscreen.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, offscreen.width, offscreen.height);
    ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
    // The image keeps color and the accent; copied text never does.
    const color = hasColor(state.elements) ? colorMask(state.elements, cols, rows) : null;
    const accent = state.elements.some(el => el.accent) ? accentMask(state.elements, cols, rows) : null;
    drawCells(ctx, state.grid, [0, rows, 0, cols], charW, LINE_HEIGHT, FONT_SIZE, { accent, color, ink: '#000000', lit: '#1D4ED8' });
    offscreen.toBlob(blob => blob && download('wireframe.png', blob), 'image/png');
  }, [state.grid, state.elements, state.cols, state.rows]);

  const copy = useCallback((text, done) => {
    setCopies(c => c + 1);
    navigator.clipboard.writeText(text).then(() => setToast(done), () => setToast(t('copy_blocked')));
  }, []);
  const handleCopy = useCallback(() => copy(outputText(), t('copied')), [copy, outputText]);
  const handleCopyAnsi = useCallback(() => copy(toAnsi(state.grid, colorMask(state.elements, state.cols, state.rows)), t('copied_ansi')), [copy, state.grid, state.elements, state.cols, state.rows]);
  const startLesson = useCallback(() => {
    dismissTour();
    setAccountOpen(false);
    lessonStart.current = lessonSnapshot(state.elements, copies);
    setLesson(0);
  }, [dismissTour, state.elements, copies]);
  useEffect(() => {
    if (lesson === null || TUTORIAL[lesson] === 'done') return;
    const step = TUTORIAL[lesson];
    if (!stepDone(step, { selectedPreset: state.selectedPreset, elements: state.elements, copies }, lessonStart.current)) return;
    // Placed: select the new button, so its Edit text is right there for the next step.
    const placed = step === 'place' && newestButton(state.elements, lessonStart.current);
    if (placed) dispatch({ type: 'SELECT_ELEMENT', id: placed });
    lessonStart.current = lessonSnapshot(state.elements, copies);
    setLesson(lesson + 1);
  }, [lesson, state.selectedPreset, state.elements, copies]);
  const handleCopyMarkdown = useCallback(() => copy(toMarkdown(outputText()), t('copied_markdown')), [copy, outputText]);
  const screensDoc = useMemo(() => screensDocument(state.elements, state.cols, state.rows), [state.elements, state.cols, state.rows]);
  const handleCopyScreens = useCallback(() => copy(screensDoc, t('copied_screens')), [copy, screensDoc]);
  // Hand it to Claude Code: one Markdown brief of every screen, its parts, flow, states and notes.
  const brief = useCallback(() => handoff(state.elements, state.cols, state.rows, t('handoff_name')), [state.elements, state.cols, state.rows]);
  const handleCopyHandoff = useCallback(() => copy(brief(), t('copied_handoff')), [copy, brief]);
  const handleDownloadLibrary = useCallback(() => download('Library.json',
    new Blob([JSON.stringify(makeLibrary(state.elements, t('library_name')), null, 2)], { type: 'application/json' })), [state.elements]);
  const handleDownloadHandoff = useCallback(() => download('BUILD.md', new Blob([brief()], { type: 'text/markdown' })), [brief]);
  // Code that compiles: the layout as a React component with plain CSS, or a SwiftUI view.
  const handleCopyReact = useCallback(() => copy(toReact(state.elements, state.cols, state.rows), t('copied_react')), [copy, state.elements, state.cols, state.rows]);
  const handleCopySwiftUI = useCallback(() => copy(toSwiftUI(state.elements, state.cols, state.rows), t('copied_swiftui')), [copy, state.elements, state.cols, state.rows]);
  // Decks: present the screens one by one, or download them as one HTML file that also prints to PDF.
  const handlePresent = useCallback(() => {
    const list = slides(state.elements, state.cols, state.rows);
    if (list.length) setPresenting(list); else setToast(t('no_slides'));
  }, [state.elements, state.cols, state.rows, state.snapshots]);
  const closePresent = useCallback(() => setPresenting(null), []);
  // Describe it changes the picked screen, read back as typed lines; with no screen picked it draws a new one.
  const describedScreen = state.elements.find(e => e.id === state.selectedId && e.presetId === 'screen') ?? null;
  const describedSource = useMemo(() => (describedScreen ? toSketch(partsInside(state.elements, describedScreen)).source : ''), [describedScreen, state.elements]);
  const handleDownloadDeck = useCallback(() => download('deck.html', new Blob([toDeck(state.elements, state.cols, state.rows)], { type: 'text/html' })), [state.elements, state.cols, state.rows]);
  const handleDownloadHTML = useCallback(() => {
    download('layout.html', new Blob([toHTML(state.elements, state.cols, state.rows)], { type: 'text/html' }));
  }, [state.elements, state.cols, state.rows, state.snapshots]);
  const handleCopySketch = useCallback(() => {
    const { source, skipped } = toSketch(state.elements);
    copy(source, skipped.length ? t('copied_lines_skipped', { n: skipped.length }) : t('copied_lines'));
  }, [copy, state.elements]);
  const handleShareLink = useCallback(() => {
    encodeShare(serializeProject({ ...state, snapshots: null, actions: null })).then(code => {
      copy(`${window.location.origin}${window.location.pathname}#p=${code}`, t('share_copied'));
    });
  }, [state, copy]);

  // An iframe of the read-only embed page, sized to the sketch (14px monospace, line height 1, 16px padding).
  const handleEmbed = useCallback(() => {
    encodeShare(serializeProject({ ...state, snapshots: null, actions: null })).then(code => {
      const right = Math.max(10, ...state.elements.map(el => el.col + el.width));
      const bottom = Math.max(2, ...state.elements.map(el => el.row + el.height));
      const width = Math.ceil(right * 8.5 + 32), height = Math.ceil(bottom * 14 + 32 + 26);
      const src = `${window.location.origin}${import.meta.env.BASE_URL}embed#p=${code}`;
      copy(`<iframe src="${src}" title="Icelus sketch" width="${width}" height="${height}" style="border:0" loading="lazy"></iframe>`, t('embed_copied'));
    });
  }, [state, copy]);

  const handleDuplicate = useCallback((id) => dispatch({ type: 'DUPLICATE', id }), []);
  const handleReorder = useCallback((id, to) => dispatch({ type: 'REORDER', id, to }), []);
  const handleNudge = useCallback((id, dCol, dRow) => dispatch({ type: 'NUDGE', id, dCol, dRow }), []);

  const closeSheet = useCallback(() => setMobileSheet(null), []);

  const toggleSheet = useCallback((name) => {
    setMobileSheet(s => s === name ? null : name);
  }, []);

  const selectedElement = state.elements.find(el => el.id === state.selectedId) || null;
  // Picked parts and the selected part's group get an outline too.
  const outlinedIds = useMemo(() => [...new Set([...(state.picked ?? []), ...groupMates(state.elements, selectedElement).map(el => el.id)])]
    .filter(id => id !== state.selectedId), [state.picked, state.elements, selectedElement, state.selectedId]);
  const closeMenu = (e) => { const d = e.currentTarget.closest('details'); if (d) d.open = false; };
  const empty = state.elements.length === 0 && !state.selectedPreset;

  return (
    <div className="app">
      {typing && (
        <div className="tour-overlay" onClick={() => setTyping(false)}>
          <form className="tour-card type-card" onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => { e.preventDefault(); drawSketch(); }}
            onKeyDown={(e) => { if (e.key === 'Escape') setTyping(false); if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') drawSketch(); }}>
            <h2>{t('type_title')}</h2>
            <textarea autoFocus aria-label={t('type_label')} value={sketchSource}
              onChange={(e) => setSketchSource(e.target.value)} spellCheck={false} />
            <p className="type-help"><code># Title</code> <code>"Email"</code> <code>[Button]</code> <code>[x] Check</code> <code>(o) Radio</code> <code>[v Select]</code> <code>---</code> <code>| a | b |</code>. {t('type_help')}</p>
            <div className="type-actions">
              <button className="btn" type="button" onClick={() => setTyping(false)}>{t('cancel')}</button>
              <button className="btn btn-primary" type="submit">{t('draw_it')}</button>
            </div>
          </form>
        </div>
      )}

      {capturing && (
        <div className="tour-overlay" onClick={() => setCapturing(false)}>
          <form className="tour-card type-card" onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => { e.preventDefault(); capturePage(); }} onKeyDown={(e) => { if (e.key === 'Escape') setCapturing(false); }}>
            <h2>{t('capture_title')}</h2>
            <input className="capture-url" type="url" autoFocus required aria-label={t('capture_label')} value={pageUrl}
              onChange={(e) => setPageUrl(e.target.value)} spellCheck={false} autoCapitalize="off" />
            <p className="type-help">{t('capture_help')}</p>
            <div className="type-actions">
              <button className="btn" type="button" onClick={() => setCapturing(false)}>{t('cancel')}</button>
              <button className="btn btn-primary" type="submit" disabled={captureBusy}>{t(captureBusy ? 'capture_busy' : 'capture_go')}</button>
            </div>
          </form>
        </div>
      )}

      {showTour && (
        <div className="tour-overlay" onClick={dismissTour}>
          <div className="tour-card" onClick={(e) => e.stopPropagation()}>
            <Boxy size={96} />
            <h2>{t('tour_title')}</h2>
            <p className="tour-lead">{t('tour_lead')}</p>
            <button className="btn btn-primary" onClick={startLesson}>{t('tour_lesson')}</button>
            <button className="btn tour-skip" onClick={dismissTour}>{t('tour_explore')}</button>
          </div>
        </div>
      )}
      {accountOpen && (
        <AccountPanel tab={accountOpen} onClose={() => { setAccountOpen(false); setRecovery(false); }} user={user} setUser={setUser} recovery={recovery} setRecovery={setRecovery}
          settings={{ darkMode, setDarkMode, look, setLook, more, setMore, onTutorial: startLesson }} />
      )}
      {lesson !== null && <Tutorial step={lesson} onClose={() => setLesson(null)} />}
      {presenting && <Present slides={presenting} onClose={closePresent} />}
      {chatOpen && <ChatPanel onClose={() => setChatOpen(false)} current={describedSource} currentName={describedScreen?.text}
        onScreen={source => dispatch({ type: 'PLACE_DESCRIBED', source, replaceId: describedScreen?.id })} />}
      <input ref={photoRef} type="file" accept="image/*" hidden onChange={handlePhoto} />
      <input ref={fileRef} type="file" accept=".icelus,.morphis,.morpheus,.glyphbox,.glyphic,.blockprint,.json,.txt,text/plain,application/json" hidden onChange={handleOpenFile} />
      <header className="app-header">
        <span className="app-title"><img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" width="32" height="32" />Icelus</span>

        {/* Desktop header */}
        <div className="app-header-actions header-desktop">
          <button className="btn btn-icon-round" onClick={handleUndo} title={t('undo_hint')} aria-label={t('undo')}><UndoIcon /></button>
          <button className="btn btn-icon-round" onClick={handleRedo} title={t('redo_hint')} aria-label={t('redo')}><RedoIcon /></button>
          {!DEMO && <button className="btn" onClick={() => setChatOpen(o => !o)} aria-pressed={chatOpen}>{t('describe')}</button>}
          <button className="btn" onClick={() => fileRef.current && fileRef.current.click()}>{t('open')}</button>
          <details className="menu">
            <summary className="btn btn-primary">{t('export')}</summary>
            <div className="menu-pop" role="menu">
              {/* Three groups, the way a Mac menu reads: what goes to the clipboard, what saves a file, what you show. */}
              <span className="menu-head">{t('menu_copy')}</span>
              <button role="menuitem" onClick={(e) => { handleCopy(); closeMenu(e); }}>{t('copy_text')}</button>
              <button role="menuitem" onClick={(e) => { handleCopyMarkdown(); closeMenu(e); }}>{t('copy_markdown')}</button>
              <button role="menuitem" onClick={(e) => { handleCopySketch(); closeMenu(e); }}>{t('copy_lines')}</button>
              {hasColor(state.elements) && <button role="menuitem" onClick={(e) => { handleCopyAnsi(); closeMenu(e); }}>{t('copy_ansi')}</button>}
              {screensDoc && <button role="menuitem" onClick={(e) => { handleCopyScreens(); closeMenu(e); }}>{t('copy_screens')}</button>}
              <button role="menuitem" onClick={(e) => { handleCopyReact(); closeMenu(e); }}>{t('copy_react')}</button>
              <button role="menuitem" onClick={(e) => { handleCopySwiftUI(); closeMenu(e); }}>{t('copy_swiftui')}</button>
              <button role="menuitem" onClick={(e) => { handleCopyHandoff(); closeMenu(e); }}>{t('copy_handoff')}</button>
              <hr />
              <span className="menu-head">{t('menu_download')}</span>
              <button role="menuitem" onClick={(e) => { handleExportPng(); closeMenu(e); }}>{t('download_image')}</button>
              <button role="menuitem" onClick={(e) => { handleExport(); closeMenu(e); }}>{t('download_txt')}</button>
              <button role="menuitem" onClick={(e) => { handleDownloadHTML(); closeMenu(e); }}>{t('download_html')}</button>
              <button role="menuitem" onClick={(e) => { handleDownloadDeck(); closeMenu(e); }}>{t('download_deck')}</button>
              <button role="menuitem" onClick={(e) => { handleDownloadHandoff(); closeMenu(e); }}>{t('download_handoff')}</button>
              <button role="menuitem" onClick={(e) => { handleSaveProject(); closeMenu(e); }}>{t('save_project')}</button>
              {state.elements.some(el => el.symbol) && <button role="menuitem" onClick={(e) => { handleDownloadLibrary(); closeMenu(e); }}>{t('download_library')}</button>}
              <hr />
              <span className="menu-head">{t('menu_share')}</span>
              <button role="menuitem" onClick={(e) => { handlePresent(); closeMenu(e); }}>{t('present')}</button>
              <button role="menuitem" onClick={(e) => { handleShareLink(); closeMenu(e); }}>{t('copy_share')}</button>
              <button role="menuitem" onClick={(e) => { handleEmbed(); closeMenu(e); }}>{t('copy_embed')}</button>
              <hr />
              <label className="menu-check"><input type="checkbox" checked={asciiOnly} onChange={(e) => setAsciiOnly(e.target.checked)} />{t('plain_ascii')}</label>
              <button role="menuitem" className="menu-danger" onClick={(e) => { handleClear(); closeMenu(e); }}>{t('clear')}</button>
            </div>
          </details>
          {DEMO ? (<button className="btn btn-icon-round" onClick={() => setDarkMode(d => !d)} title={t('toggle_dark')} aria-label={t('toggle_dark')}>
            {darkMode ? <SunIcon /> : <MoonIcon />}
          </button>) : (<><button className="btn btn-icon-round" onClick={() => setAccountOpen('settings')} title={t('settings')} aria-label={t('settings')}><GearIcon /></button>
          <button className={`btn btn-icon-round${user ? ' is-signed-in' : ''}`} onClick={() => setAccountOpen('profile')} title={t('profile')} aria-label={t('profile')}>
            {user ? <span className="account-initial" aria-hidden="true">{displayName(user).slice(0, 1).toUpperCase()}</span> : <PersonIcon />}
          </button></>)}
        </div>

        {/* Mobile header: icons only */}
        <div className="app-header-actions header-mobile">
          {/* Undo and Redo live in the bottom bar on a phone, so the header keeps the one thing that makes a screen. */}
          {!DEMO && <button className="btn" onClick={() => setChatOpen(o => !o)} aria-pressed={chatOpen}>{t('describe')}</button>}
          {DEMO ? (<button className="btn btn-icon-round" onClick={() => setDarkMode(d => !d)} title={t('toggle_dark')} aria-label={t('toggle_dark')}>
            {darkMode ? <SunIcon /> : <MoonIcon />}
          </button>) : (<><button className="btn btn-icon-round" onClick={() => setAccountOpen('settings')} title={t('settings')} aria-label={t('settings')}><GearIcon /></button>
          <button className={`btn btn-icon-round${user ? ' is-signed-in' : ''}`} onClick={() => setAccountOpen('profile')} title={t('profile')} aria-label={t('profile')}>
            {user ? <span className="account-initial" aria-hidden="true">{displayName(user).slice(0, 1).toUpperCase()}</span> : <PersonIcon />}
          </button></>)}
        </div>
      </header>

      <Toolbar
        real={look === 'real'}
        selectedPreset={state.selectedPreset}
        onSelectPreset={handleSelectPreset}
        isOpen={mobileSheet === 'components'}
        mine={mine}
        onRemoveMine={handleRemoveMine}
      />

      <main className="stage">
        {trace && <button type="button" className="btn trace-off" onClick={() => setTrace(old => { old?.close(); return null; })}>{t('stop_tracing')}</button>}
        <Canvas
          grid={state.grid}
          cols={state.cols}
          rows={state.rows}
          cursor={state.cursor}
          selectedPreset={state.selectedPreset}
          elements={state.elements}
          selectedId={state.selectedId}
          outlinedIds={outlinedIds}
          onGroup={handleGroup}
          darkMode={darkMode}
          trace={trace}
          onPlaceComponent={handlePlaceComponent}
          onPlaceLine={handlePlaceLine}
          onCursorMove={handleCursorMove}
          onSelectElement={handleSelectElement}
          onMoveElement={handleMoveElement}
          onUpdateElement={handleUpdateElement}
          onDeleteElement={handleDeleteElement}
          onDuplicate={handleDuplicate}
          onReorder={handleReorder}
          onNudge={handleNudge}
          onUndo={handleUndo}
          onRedo={handleRedo}
          brush={brush}
          onPaint={handlePaint}
          cells={cellTools}
          look={look}
        />
        {['brush', 'eraser', 'gradient', 'adjust'].includes(state.selectedPreset?.id) && (
          <BrushBar tool={state.selectedPreset.id} brush={brush} onChange={setBrush} onDone={() => dispatch({ type: 'SELECT_PRESET', preset: null })} />
        )}
        {picking && (
          <SelectBar tool={state.selectedPreset.id} count={cellSel.length}
            onCopy={() => copy(cellText(state.grid, cellSel), t('copied_cells', { n: cellSel.length }))}
            onCut={() => { copy(cellText(state.grid, cellSel), t('copied_cells', { n: cellSel.length })); dispatch({ type: 'CELLS', op: 'cut', cells: cellSel }); setCellSel([]); }}
            onFill={() => dispatch({ type: 'CELLS', op: 'fill', cells: cellSel, char: brush.char })}
            onClear={() => setCellSel([])}
            onDone={() => dispatch({ type: 'SELECT_PRESET', preset: null })} />
        )}
        {empty && !trace && (
          <div className="empty" aria-hidden="true">
            <Boxy size={120} />
            <p className="empty-title">{t('empty_title')}</p>
            <p className="empty-sub">{t('empty_hint')}</p>
          </div>
        )}
        {toast && <div className="toast" role="status">{toast}</div>}
      </main>

      <Inspector
        cursor={state.cursor}
        cols={state.cols}
        rows={state.rows}
        selectedPreset={state.selectedPreset}
        selectedElement={selectedElement}
        onDeleteElement={handleDeleteElement}
        onDuplicate={handleDuplicate}
        onReorder={handleReorder}
        pickedCount={state.picked?.length ?? 0}
        onGroup={handleGroup}
        elements={state.elements}
        system={system}
        onClearSystem={() => saveSystem(null)}
        onRemoveParts={ids => dispatch({ type: 'REMOVE_PARTS', ids })}
        onSizes={id => dispatch({ type: 'MAKE_SIZES', id })}
        onSwap={(id, symbol) => dispatch({ type: 'SWAP_SYMBOL', id, symbol })}
        onCanvas={change => dispatch({ type: 'CANVAS', ...change })}
        more={more}
        onMore={setMore}
        onVariations={(id) => dispatch({ type: 'VARIATIONS', id, labels: ['var_stacked', 'var_split', 'var_dense'].map(k => t(k)) })}
        onKeep={(id) => dispatch({ type: 'KEEP_VARIATION', id })}
        onSelectElement={handleSelectElement}
        symbolCount={symbolUses(state.elements, selectedElement)}
        onSymbol={handleSymbol}
        onUpdateElement={handleUpdateElement}
        onSaveToPalette={DEMO ? null : handleSaveToPalette}
        historyPanel={DEMO ? null : <HistoryList state={state} dispatch={dispatch} />}
        isOpen={mobileSheet === 'inspector'}
        onClose={closeSheet}
      />

      {/* Mobile bottom bar */}
      <nav className="mobile-bar">
        <button className="mobile-bar-btn" onClick={handleUndo}>
          <UndoIcon />
          <span>Undo</span>
        </button>
        <button className="mobile-bar-btn" onClick={handleRedo}>
          <RedoIcon />
          <span>Redo</span>
        </button>
        <button
          className={`mobile-bar-btn mobile-bar-btn--add${mobileSheet === 'components' ? ' is-active' : ''}`}
          onClick={() => toggleSheet('components')}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <line x1="10" y1="3" x2="10" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <line x1="3" y1="10" x2="17" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span>{t('add')}</span>
        </button>
        <button
          className={`mobile-bar-btn${mobileSheet === 'inspector' ? ' is-active' : ''}`}
          onClick={() => toggleSheet('inspector')}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.5"/>
            <line x1="9" y1="8.5" x2="9" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="9" cy="5.5" r="0.9" fill="currentColor"/>
          </svg>
          <span>{t('info')}</span>
        </button>
        <button
          className={`mobile-bar-btn${mobileSheet === 'more' ? ' is-active' : ''}`}
          onClick={() => toggleSheet('more')}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="4" cy="9" r="1.3" fill="currentColor"/>
            <circle cx="9" cy="9" r="1.3" fill="currentColor"/>
            <circle cx="14" cy="9" r="1.3" fill="currentColor"/>
          </svg>
          <span>{t('more')}</span>
        </button>
      </nav>

      {/* Mobile more sheet */}
      {mobileSheet === 'more' && (
        <div className="mobile-more-sheet">
          {!DEMO && <button className="mobile-action-item" onClick={() => { setChatOpen(true); closeSheet(); }}>{t('describe')}</button>}
          <button className="mobile-action-item" onClick={() => { handleCopy(); closeSheet(); }}>{t('copy_text')}</button>
          <button className="mobile-action-item" onClick={() => { handleCopyMarkdown(); closeSheet(); }}>{t('copy_markdown')}</button>
          <button className="mobile-action-item" onClick={() => { handleCopySketch(); closeSheet(); }}>{t('copy_lines')}</button>
          {hasColor(state.elements) && <button className="mobile-action-item" onClick={() => { handleCopyAnsi(); closeSheet(); }}>{t('copy_ansi')}</button>}
          {screensDoc && <button className="mobile-action-item" onClick={() => { handleCopyScreens(); closeSheet(); }}>{t('copy_screens')}</button>}
          <button className="mobile-action-item" onClick={() => { handlePresent(); closeSheet(); }}>{t('present')}</button>
          <button className="mobile-action-item" onClick={() => { handleCopyHandoff(); closeSheet(); }}>{t('copy_handoff')}</button>
          <button className="mobile-action-item" onClick={() => { handleCopyReact(); closeSheet(); }}>{t('copy_react')}</button>
          <button className="mobile-action-item" onClick={() => { handleCopySwiftUI(); closeSheet(); }}>{t('copy_swiftui')}</button>
          <button className="mobile-action-item" onClick={() => { handleDownloadHTML(); closeSheet(); }}>{t('download_html')}</button>
          <button className="mobile-action-item" onClick={() => { handleShareLink(); closeSheet(); }}>{t('copy_share')}</button>
          <button className="mobile-action-item" onClick={() => { handleEmbed(); closeSheet(); }}>{t('copy_embed')}</button>
          <button className="mobile-action-item" onClick={() => { handleExport(); closeSheet(); }}>{t('download_txt')}</button>
          <button className="mobile-action-item" onClick={() => { handleExportPng(); closeSheet(); }}>{t('download_image')}</button>
          <button className="mobile-action-item" onClick={() => { handleSaveProject(); closeSheet(); }}>{t('save_project')}</button>
          <button className="mobile-action-item" onClick={() => { fileRef.current && fileRef.current.click(); closeSheet(); }}>{t('open_file')}</button>
          <label className="mobile-action-item mobile-action-check"><input type="checkbox" checked={asciiOnly} onChange={(e) => setAsciiOnly(e.target.checked)} />{t('plain_ascii')}</label>
          <button className="mobile-action-item mobile-action-danger" onClick={() => { handleClear(); closeSheet(); }}>{t('clear_canvas')}</button>
        </div>
      )}

      {/* Backdrop for any open sheet */}
      {mobileSheet && (
        <div className="mobile-backdrop" onClick={closeSheet} />
      )}
    </div>
  );
}
