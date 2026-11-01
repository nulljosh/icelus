import { describe, it, expect } from 'vitest';
import { createElement, updateElement, serializeProject, parseProject } from './engine.js';
import { getPreset } from './presets.js';
import { realPart } from './real.js';
import { HTML_MAX } from './play.js';
import { callTool } from './tools.js';

describe('live code parts', () => {
  const code = () => createElement(getPreset('livecode'), 2, 2);
  it('keeps its HTML, capped, and draws as a code part in the real look', () => {
    const el = updateElement([code()], code().id, { html: '<b>hi</b>' })[0];
    const a = code(), [set] = updateElement([a], a.id, { html: '<b>hi</b>' });
    expect(set.html).toBe('<b>hi</b>');
    expect(realPart(set)).toEqual({ kind: 'livecode', html: '<b>hi</b>' });
    expect(updateElement([a], a.id, { html: 'x'.repeat(HTML_MAX + 5) })[0].html.length).toBe(HTML_MAX);
    expect(el).toBeTruthy();
  });
  it('only a code part takes HTML, and a project file keeps it only there', () => {
    const card = createElement(getPreset('card'), 0, 0);
    expect(updateElement([card], card.id, { html: '<b>x</b>' })[0].html).toBeUndefined();
    const a = code(), [set] = updateElement([a], a.id, { html: '<i>ok</i>' });
    const back = parseProject(serializeProject({ cols: 40, rows: 12, elements: [set, { ...card, html: '<b>no</b>' }] })).elements;
    expect(back[0].html).toBe('<i>ok</i>');
    expect(back[1].html).toBeUndefined();
  });
  it('agents set it with the html op', () => {
    const project = JSON.parse(serializeProject({ cols: 40, rows: 12, elements: [code()] }));
    const out = callTool('edit_project', { project, ops: [{ op: 'html', index: 0, html: '<p>live</p>' }] });
    expect(out.project.elements[0].html).toBe('<p>live</p>');
    expect(() => callTool('edit_project', { project, ops: [{ op: 'html', index: 0, html: 5 }] })).toThrow(/html/);
  });
});
