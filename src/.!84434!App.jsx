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
  createElement, renderElements, moveElement, deleteElement, updateElement,
  duplicateElement, reorderElement, nudgeElement, createLine,
  toAscii, trimText, toMarkdown, serializeProject, parseProject, screensDocument,
  groupElements, ungroupElements, groupMates, makeSymbol, detachSymbol, symbolUses, freshTag, accentMask, adjustLayer, partsInside,
} from './lib/engine.js';
import { getPreset } from './lib/presets.js';
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

function reducer(state, action) {
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
      const elements = preset.id === 'screen' ? [el, ...withHistory.elements] : [...withHistory.elements, el];
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
      const elements = nudgeElement(state.el
