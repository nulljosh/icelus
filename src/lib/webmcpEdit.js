import { expandChanges } from './heal.js';

// The live-canvas tools for actions (v41) and expand (v42), split out of webmcp.js to keep it small.
const NUM = { type: 'number' };

export function editTools(get) {
  return [
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
