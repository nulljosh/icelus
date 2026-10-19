// The one definition of what Icelus can do over the network: functions/api/ and functions/mcp.js both call
// `callTool`, so they cannot drift. Unlike webmcp.js (stateful, the live canvas) these are transforms: a
// wireframe goes in, a wireframe comes out, so there is no database, session store or Durable Object.

import { makeLibrary } from './library.js';
import { createGrid, gridToText, textToGrid, stampComponent, renderElements, serializeProject, trimText, parseProject } from './engine.js';
import { PRESETS as CORE, CATEGORIES as CORE_CATEGORIES, PACKS, PACK_CATEGORIES, getPreset } from './presets.js';
import { parseSketch, toSketch } from './syntax.js';
import { toHTML } from './html.js';
import { importText } from './importer.js';
import { critique, critiqueMessage } from './critique.js';
import { systemFromCode, parseSystem } from './system.js';
import { htmlToSketch } from './capture.js';
import { handoff } from './handoff.js';
import { toReact, toSwiftUI } from './code.js';
import { slides, toDeck } from './deck.js';
import { colorMask, toAnsi } from './color.js';
import { ToolError, MAX_TEXT, MAX_COLS, MAX_ROWS, int, text, dimensions } from './toolArgs.js';
import { editProject } from './editProject.js';
import { TOOLS, TOOL_NAMES } from './toolList.js';
export { MAX_TEXT, TOOLS, TOOL_NAMES };

// The core parts plus the platform packs (iOS, Material, terminal, email).
const PRESETS = [...CORE, ...PACKS];
const CATEGORIES = [...CORE_CATEGORIES, ...PACK_CATEGORIES];

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

    case 'edit_project':
      return editProject(args);

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

    case 'project_to_library': {
      const project = parseProject(JSON.stringify(args.project ?? null));
      if (!project) throw new ToolError('project must be a Icelus project with an elements array');
      return { library: makeLibrary(project.elements, typeof args.name === 'string' ? args.name : 'Library') };
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
