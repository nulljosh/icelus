import { expandChanges } from './heal.js';
import { MODES, isVarName } from './modes.js';
import { AUTO_MAX } from './layout.js';
import { makeLibrary, parseLibrary } from './library.js';
import { canOpen } from './hotspots.js';

// The live-canvas tools for actions (v41), expand (v42), variables and modes (v47), libraries (v48) and hotspots (v53), split out of webmcp.js to keep it small.
const NUM = { type: 'number' };

export function editTools(get) {
  return [
    {
      name: 'library',
      description: 'With no library, publishes the canvas symbols as a part library (JSON). With one (from this tool or project_to_library), every linked copy on the canvas takes its version, minus what a copy owns. One step of undo.',
      inputSchema: { type: 'object', properties: { library: { type: 'object' }, name: { type: 'string' } } },
      execute: async ({ library, name }) => {
        const { state, dispatch } = get();
        if (library === undefined) return { library: makeLibrary(state.elements, name) };
        const parsed = parseLibrary(library);
        if (!parsed) return { error: 'library must be { icelusLibrary: 1, name, parts }' };
        dispatch({ type: 'PULL_LIBRARY', library: parsed });
        return { ok: true };
      },
    },
    {
      name: 'set_canvas',
      description: `Draw the whole canvas in one line set (mode: ${MODES.join(', ')}, or null for each part's own), and/or set a named spacing variable (name, value 0 to ${AUTO_MAX}, null removes it) that auto layout screens use by name. One step of undo each.`,
      inputSchema: { type: 'object', properties: { mode: { type: ['string', 'null'] }, name: { type: 'string' }, value: { type: ['number', 'null'] } } },
      execute: async args => {
        const { dispatch } = get();
        if ('mode' in args) { if (args.mode !== null && !MODES.includes(args.mode)) return { error: `mode must be null or one of ${MODES.join(', ')}` }; dispatch({ type: 'CANVAS', mode: args.mode }); }
        if (args.name !== undefined) {
          const v = args.value;
          if (!isVarName(args.name)) return { error: 'name must be lowercase letters, digits or dashes, at most 16' };
          if (v !== null && !(Number.isInteger(v) && v >= 0 && v <= AUTO_MAX)) return { error: `value must be 0 to ${AUTO_MAX} or null` };
          dispatch({ type: 'CANVAS', name: args.name, value: v });
        }
        return { ok: true };
      },
    },
    {
      name: 'link_part',
      description: 'Make the selected part a hotspot: pressing it opens the screen with this name (screen: null takes the link off). One step of undo.',
      inputSchema: { type: 'object', properties: { screen: { type: ['string', 'null'] } }, required: ['screen'] },
      execute: async ({ screen }) => {
        const { state, dispatch } = get();
        const el = state.elements.find(x => x.id === state.selectedId);
        if (!canOpen(el)) return { error: 'select a part first (not a screen, line, paint or adjustment)' };
        const to = screen === null ? null : state.elements.find(s => s.presetId === 'screen' && (s.text || 'Screen') === screen);
        if (to === undefined) return { error: `no screen named ${screen}` };
        dispatch({ type: 'UPDATE_ELEMENT', id: el.id, changes: { opens: to?.id ?? null } });
        return { ok: true };
      },
    },
    {
      name: 'expand_part',
      description: 'Grow the selected table by rows or list by items (by: 1 to 50), carrying the pattern on: Item 3 then Item 4, Mon then Tue. One step of undo.',
      inputSchema: { type: 'object', properties: { by: NUM } },
      execute: async ({ by = 1 }) => {
        const { state, dispatch } = get();
        const el = state.elements.find(x => x.id === state.selectedId);
        const changes = expandChanges(el, by);
        if (!changes) return { error: 'select a table or a list first' };
        dispatch({ type: 'UPDATE_ELEMENT', id: el.id, changes });
        return { ok: true };
      },
    },
    {
      name: 'record_action',
      description: 'Start recording an action; the edits that follow are its steps. stop: true saves them as a named action in the project file.',
      inputSchema: { type: 'object', properties: { stop: { type: 'boolean' }, name: { type: 'string' } } },
      execute: async ({ stop = false, name = '' }) => { get().dispatch({ type: stop ? 'STOP_ACTION' : 'RECORD_ACTION', name }); return { ok: true }; },
    },
    {
      name: 'play_action',
      description: 'Replay a saved action by name on the selected parts (one step of undo). With no name, lists the actions and their steps.',
      inputSchema: { type: 'object', properties: { name: { type: 'string' } } },
      execute: async ({ name }) => {
        const { state, dispatch } = get();
        const actions = state.actions ?? [];
        if (name === undefined) return { actions };
        const index = actions.findIndex(a => a.name === name);
        if (index < 0) return { error: `no action named ${name}` };
        if (!state.picked?.length && !state.selectedId) return { error: 'select a part first' };
        dispatch({ type: 'PLAY_ACTION', index });
        return { ok: true };
      },
    },
  ];
}
