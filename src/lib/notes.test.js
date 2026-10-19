import { describe, it, expect } from 'vitest';
import { updateElement, parseProject, serializeProject, duplicateElement } from './engine.js';
import { noteList } from './shapes.js';
import { callTool } from './tools.js';

const btn = { id: 'a', presetId: 'button', label: 'Button', col: 2, row: 1, width: 6, height: 1, template: ['[ OK ]'] };

describe('notes', () => {
  it('pins a trimmed note and resolves it when empty', () => {
    const noted = updateElement([btn], 'a', { note: '  make it bigger ' });
    expect(noted[0].note).toBe('make it bigger');
    expect(updateElement(noted, 'a', { note: '' })[0]).not.toHaveProperty('note');
    expect(updateElement([btn], 'a', { note: 'x'.repeat(900) })[0].note).toHaveLength(500);
  });
  it('rides in the project file but not in a copy', () => {
    const noted = updateElement([btn], 'a', { note: 'bigger' });
    const back = parseProject(serializeProject({ cols: 20, rows: 5, elements: noted }));
    expect(back.elements[0].note).toBe('bigger');
    expect(duplicateElement(noted, 'a').elements[1]).not.toHaveProperty('note');
    expect(noteList(noted)).toEqual([{ id: 'a', part: 'button', col: 2, row: 1, note: 'bigger' }]);
  });
  it('lists and resolves notes through the API', async () => {
    const project = { blockprint: 1, cols: 20, rows: 5, elements: updateElement([btn], 'a', { note: 'bigger' }) };
    expect((await callTool('list_notes', { project })).notes).toEqual([{ index: 0, part: 'button', col: 2, row: 1, note: 'bigger' }]);
    const out = await callTool('edit_project', { project, ops: [{ op: 'note', index: 0, note: '' }] });
    expect(out.project.elements[0]).not.toHaveProperty('note');
    expect(out.text).not.toContain('bigger');
  });
});
