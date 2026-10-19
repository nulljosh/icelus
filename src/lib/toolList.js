// The tool list behind /api and /mcp: names, descriptions and input schemas. The work is in tools.js.

import { DEFAULT_COLS, DEFAULT_ROWS, BOX_STYLES } from './engine.js';
import { PRESETS as CORE, CATEGORIES as CORE_CATEGORIES, PACKS, PACK_CATEGORIES } from './presets.js';
import { SYNTAX_HELP } from './syntax.js';

const PRESETS = [...CORE, ...PACKS];
const CATEGORIES = [...CORE_CATEGORIES, ...PACK_CATEGORIES];
export const EDIT_OPS = 'move, resize, text, style, tweak, note, variations, keep, delete, color, mask, blend, play, expand, clean, harmonize, auto, pin, adjust, arrow, paint, erase, gradient, cut, fill, move_cells, snapshot or restore';
export const MAX_OPS = 200;

const componentSchema = {
  type: 'object',
  properties: {
    text: { type: 'string', description: 'The wireframe to modify, as ASCII/Unicode text. Omit for a blank grid.' },
    componentId: { type: 'string', description: 'Component id from list_components.' },
    col: { type: 'integer', description: 'Column to place at, 0-based from the left.' },
    row: { type: 'integer', description: 'Row to place at, 0-based from the top.' },
    cols: { type: 'integer', description: `Grid width. Default ${DEFAULT_COLS}.` },
    rows: { type: 'integer', description: `Grid height. Default ${DEFAULT_ROWS}.` },
  },
  required: ['componentId', 'col', 'row'],
};

export const TOOLS = [
  {
    name: 'list_components',
    description:
      `The ${PRESETS.length} wireframe components available to place, each with the Unicode box-drawing ` +
      'template it stamps and its size in character cells. Call this before place_component to get valid ids.',
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string', enum: CATEGORIES, description: 'Restrict to one category.' },
      },
    },
  },
  {
    name: 'place_component',
    description:
      'Stamp a component onto a wireframe at a grid position and return the result. Stateless: pass the ' +
      'current wireframe in as `text` and use the returned `text` as the input to the next call. ' +
      'Anything falling outside the grid is clipped, not an error.',
    inputSchema: componentSchema,
  },
  {
    name: 'render_wireframe',
    description:
      'Normalize arbitrary text onto the character grid — pads short lines, clips overflow, and returns ' +
      'the exact text the editor would show. Use it to check a hand-written wireframe before placing onto it.',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'ASCII/Unicode wireframe, one line per row.' },
        cols: { type: 'integer', description: `Grid width. Default ${DEFAULT_COLS}.` },
        rows: { type: 'integer', description: `Grid height. Default ${DEFAULT_ROWS}.` },
      },
      required: ['text'],
    },
  },
  {
    name: 'html_to_wireframe',
    description:
      'Capture a web page as a wireframe: pass its HTML and get its headings, links, buttons, fields, lists and ' +
      'tables back in page order, as typed lines (source), wireframe text and a project to edit. Scripts, styles ' +
      'and images are dropped. POST /api/capture with a url does the fetch for you.',
    inputSchema: {
      type: 'object',
      properties: { html: { type: 'string', description: 'The page HTML.' }, cols: { type: 'number' }, rows: { type: 'number' } },
      required: ['html'],
    },
  },
  {
    name: 'sketch_to_wireframe',
    description:
      'Draw a whole screen from a few typed lines and return the wireframe text plus a Icelus project ' +
      'file (save it as .json and open it in the app to keep editing). ' + SYNTAX_HELP,
    inputSchema: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'The screen, written in the syntax above.' },
        cols: { type: 'integer', description: `Grid width. Default ${DEFAULT_COLS}.` },
        rows: { type: 'integer', description: `Grid height. Default ${DEFAULT_ROWS}.` },
      },
      required: ['source'],
    },
  },
  {
    name: 'edit_project',
    description:
      'Edit an Icelus project file part by part and return the new wireframe text plus project. ' +
      'Stateless: pass the project in, keep the one that comes back. Each op names a part by `index`, its ' +
      'place in `elements` when the call starts. Ops: move {col,row}, resize {width,height}, text {text}, ' +
      `style {style: ${BOX_STYLES.join('|')}}, tweak a screen {spacing, padding: 0-8, style}, note {note} (empty resolves it), color {ink, paper: 0-15 terminal colors, null clears}, mask {inset: {top,right,bottom,left} cells hidden from each edge, clip: index of a part to show it only inside (null clears either)}, blend {mode: join|over|under|knockout, how a part meets what is under it}, clean (no index; removes the distractions critique_project finds: stray marks, parts that show nothing), snapshot {name} (no index; keeps a named copy of the canvas in the project), restore {name} (no index; the canvas goes back to that snapshot), auto {gap, pad: 0-8, or off: true} on a screen (auto layout: its parts stay stacked, gap rows apart, and restack after every edit), pin {x: left|right|both|center, y: top|bottom|both|center} (constraints: when its screen is resized the part follows; both stretches it), harmonize (the part takes the box style, ink and paper most parts on its screen share), expand {by: 1-50} (a table grows by rows, a list by items, carrying the pattern on: Item 3 then Item 4), play {name of a project action, or steps: [{op: move, dCol, dRow} | {op: set, changes: {style, ink, paper, blend, variant, accent, hidden, locked}} | {op: text, text} | {op: resize, width, height} | {op: delete}]} (replays an action on the part), adjust {kind} on an adjustment layer, variations (three takes of a screen), keep (one take, the rest cleared), delete (arrows that ran through the part join up), arrow {fromCol,fromRow,toCol,toRow} (no index; an end ` +
      'on a part stays pinned to it), paint {points: [[col,row],...], size: 1-5, char} (no index; a freehand stroke joined ' +
      'point to point, one see-through part) erase {points, size} (no index; clears painted cells only), adjust {area: {col,row,width,height}, kind: invert|dim|ascii|single|double|rounded|heavy} (no index; ' +
      'an adjustment layer that changes everything drawn under it in its area), gradient {from: [col,row], to: [col,row], mode: straight|round} ' +
      '(no index; a ░▒▓█ ramp as one stroke of paint), and on a selection (no index; area {col,row,width,height} ' +
      'or wand {col,row}, the run of one character): cut (its paint and the whole parts inside), fill {char}, move_cells {dCol,dRow}.',
    inputSchema: {
      type: 'object',
      properties: {
        project: { type: 'object', description: 'A Icelus project: { blockprint: 1, cols, rows, elements }.' },
        ops: { type: 'array', items: { type: 'object' }, description: `Up to ${MAX_OPS} edits, applied in order.` },
      },
      required: ['project', 'ops'],
    },
  },
  {
    name: 'critique_project',
    description:
      'Review a Icelus project the way a designer would: parts off the grid, parts that overlap, boxes cut open, ' +
      'placeholder labels, a list with no empty state, a form with no error state, and open notes. Each issue has a ' +
      'rule, a severity (error, warn, info), its cell and a message. Fix them with edit_project and run it again. ' +
      'Pass a design system (from system_from_code) to also flag boxes off its style.',
    inputSchema: {
      type: 'object',
      properties: {
        project: { type: 'object', description: 'A Icelus project: { blockprint: 1, cols, rows, elements }.' },
        system: { type: 'object', description: 'Optional design system file: { icelusSystem: 1, name, style, parts }.' },
      },
      required: ['project'],
    },
  },
  {
    name: 'system_from_code',
    description:
      'Make a Icelus design system from a codebase: pass source files (React, Vue, Svelte, SwiftUI, Compose, CSS) ' +
      'and get a system file whose parts are its components drawn in text, in the box style its radius tokens use. ' +
      'Open the file in Icelus to add the parts to the palette, or pass it to critique_project.',
    inputSchema: {
      type: 'object',
      properties: {
        files: { type: 'array', items: { type: 'object', properties: { path: { type: 'string' }, text: { type: 'string' } } }, description: 'Up to 200 files: { path, text }.' },
        name: { type: 'string', description: 'The system name, often the repo name.' },
      },
      required: ['files'],
    },
  },
  {
    name: 'list_notes',
    description:
      'The notes people pinned to parts of a Icelus project: what they want changed, with each part\'s index. ' +
      'Act on them with edit_project, then resolve each with a note op and an empty note.',
    inputSchema: {
      type: 'object',
      properties: { project: { type: 'object', description: 'A Icelus project: { blockprint: 1, cols, rows, elements }.' } },
      required: ['project'],
    },
  },
  {
    name: 'wireframe_to_handoff',
    description:
      'Hand a Icelus project to a coding agent: one Markdown build brief with every screen drawn in text, its typed ' +
      'lines, a parts table (kind, words, cell position and size, state), the flow between screens, open notes, what ' +
      'Review still flags, and the project file. Build the app from it.',
    inputSchema: {
      type: 'object',
      properties: {
        project: { type: 'object', description: 'A Icelus project: { blockprint: 1, cols, rows, elements }.' },
        name: { type: 'string', description: 'The project name for the title.' },
      },
      required: ['project'],
    },
  },
  {
    name: 'wireframe_to_sketch',
    description:
      'The way back from sketch_to_wireframe: write a Icelus project as typed lines. Parts the syntax has ' +
      'no word for (cards, nav bars, arrows) are left out and listed in `skipped`.',
    inputSchema: {
      type: 'object',
      properties: { project: { type: 'object', description: 'A Icelus project: { blockprint: 1, cols, rows, elements }.' } },
      required: ['project'],
    },
  },
  {
    name: 'wireframe_to_code',
    description:
      'Turn a Icelus project into code that compiles: a React component with plain CSS (one .jsx file) or a ' +
      'SwiftUI view (one .swift file, iOS 16 or macOS 13). Buttons, inputs, checkboxes, radios, selects, tables, ' +
      'headings and screens become real controls at their grid positions. Restyle it from there.',
    inputSchema: {
      type: 'object',
      properties: {
        project: { type: 'object', description: 'A Icelus project: { blockprint: 1, cols, rows, elements }.' },
        format: { type: 'string', enum: ['react', 'swiftui'], description: 'react (default) or swiftui.' },
        name: { type: 'string', description: 'The component name, for example Sign in.' },
      },
      required: ['project'],
    },
  },
  {
    name: 'wireframe_to_deck',
    description:
      'Turn a Icelus project into a deck: every screen as a slide in reading order, as one self-contained HTML ' +
      'file that presents with the arrow keys and prints one slide per page (Save as PDF gives the PDF). Also ' +
      'returns the slides as { title, text }.',
    inputSchema: {
      type: 'object',
      properties: {
        project: { type: 'object', description: 'A Icelus project: { blockprint: 1, cols, rows, elements }.' },
        title: { type: 'string', description: 'The deck title.' },
      },
      required: ['project'],
    },
  },
  {
    name: 'wireframe_to_ansi',
    description:
      'A Icelus project as ANSI text: the wireframe with each part\'s ink and paper as terminal colors (SGR codes), ' +
      'for a terminal, a README rendered by a terminal tool, or a log. Plain text copies stay colorless.',
    inputSchema: {
      type: 'object',
      properties: { project: { type: 'object', description: 'A Icelus project: { blockprint: 1, cols, rows, elements }.' } },
      required: ['project'],
    },
  },
  {
    name: 'wireframe_to_html',
    description:
      'Hand a Icelus project to a developer as one HTML page: buttons, inputs, checkboxes, selects, tables and ' +
      'headings become real elements at the same grid positions; anything else stays a <pre> of its characters.',
    inputSchema: {
      type: 'object',
      properties: { project: { type: 'object', description: 'A Icelus project: { blockprint, cols, rows, elements }.' } },
      required: ['project'],
    },
  },
  {
    name: 'text_to_project',
    description:
      'Turn any text wireframe (box-drawing or +---+ ASCII) into an editable Icelus project: boxes become parts, ' +
      'tables stay whole, loose text and [ buttons ] become their own parts. Drawing the project gives back the same text.',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'The wireframe, one line per row.' },
        cols: { type: 'integer', description: `Grid width. Default ${DEFAULT_COLS}.` },
        rows: { type: 'integer', description: `Grid height. Default ${DEFAULT_ROWS}.` },
      },
      required: ['text'],
    },
  },
];

export const TOOL_NAMES = TOOLS.map(t => t.name);
