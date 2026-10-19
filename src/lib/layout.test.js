import { describe, it, expect } from 'vitest';
import { autoLayout, cleanAuto } from './layout.js';
import { createElement, updateElement, moveElement, deleteElement, serializeProject, parseProject } from './engine.js';
import { getPreset, SCREEN_TOOL } from './presets.js';
import { callTool } from './tools.js';

const screenAt = (w = 40, h = 30) => { const s = createElement(SCREEN_TOOL, 0, 0); return updateElement([s], s.id, { width: w, height: h })[0]; };

describe('auto layout', () => {
  const screen = screenAt();
  const a = createElement(getPreset('list'), 1, 1), b = createElement(getPreset('button'), 1, 5), c = createElement(getPreset('button'), 1, 9);
  const on = els => updateElement(els, screen.id, { auto: { gap: 1, pad: 1 } });

  it('stacks the parts of a screen with gap and padding, and hugs them', () => {
    const before = [screen, a, b, c], after = autoLayout(before, on(before));
    const at = id => after.find(el => el.id === id);
    expect([at(a.id).col, at(a.id).row]).toEqual([2, 2]);
    expect(at(b.id).row).toBe(2 + a.height + 1);
    expect(at(c.id).row).toBe(at(b.id).row + b.height + 1);
    expect(at(screen.id).height).toBe(at(c.id).row + c.height + 1 + 1);
    expect(autoLayout(after, after)).toBe(after); // nothing to move, same list back
  });

  it('pushes the rest down when a part grows, and pulls up when one goes', () => {
    const laid = autoLayout([screen, a, b, c], on([screen, a, b, c]));
    const grown = updateElement(laid, a.id, { text: '• one\n• two\n• three\n• four\n• five\n• six' });
    const out = autoLayout(laid, grown), was = laid.find(el => el.id === b.id).row;
    expect(out.find(el => el.id === b.id).row).toBe(was + 3);
    const gone = autoLayout(laid, deleteElement(laid, b.id));
    expect(gone.find(el => el.id === c.id).row).toBe(was);
  });

  it('reorders when a part is dragged, lets go of one dragged out, leaves other screens alone', () => {
    const laid = autoLayout([screen, a, b, c], on([screen, a, b, c]));
    const dragged = moveElement(laid, c.id, 2, 1);
    const out = autoLayout(laid, dragged);
    expect(out.find(el => el.id === c.id).row).toBe(2);
    expect(out.find(el => el.id === a.id).row).toBeGreaterThan(2);
    const outside = autoLayout(laid, moveElement(laid, c.id, 60, 2));
    expect(outside.find(el => el.id === c.id).col).toBe(60);
    const plain = [screen, a, b, c];
    expect(autoLayout(plain, plain)).toBe(plain);
  });

  it('keeps auto in the project file, cleaned, and edit_project turns it on and off', () => {
    expect(cleanAuto({ gap: 99, pad: 2 })).toEqual({ gap: 1, pad: 2 });
    expect(cleanAuto('x')).toBeNull();
    const saved = parseProject(serializeProject({ cols: 80, rows: 40, elements: on([screen, a]) }));
    expect(saved.elements[0].auto).toEqual({ gap: 1, pad: 1 });
    expect(parseProject(JSON.stringify({ elements: [{ ...a, auto: { gap: 1, pad: 1 } }] })).elements[0].auto).toBeUndefined();
    const project = JSON.parse(serializeProject({ cols: 80, rows: 40, elements: [screen, a, b, c] }));
    const out = callTool('edit_project', { project, ops: [{ op: 'auto', index: 0, gap: 2, pad: 1 }] });
    expect(out.project.elements[0].auto).toEqual({ gap: 2, pad: 1 });
    expect(out.project.elements[2].row).toBe(2 + a.height + 2);
    expect(callTool('edit_project', { project: out.project, ops: [{ op: 'auto', index: 0, off: true }] }).project.elements[0].auto).toBeUndefined();
  });
});
