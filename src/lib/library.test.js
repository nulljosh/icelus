import { describe, it, expect } from 'vitest';
import { createElement, updateElement } from './engine.js';
import { getPreset } from './presets.js';
import { makeLibrary, parseLibrary, pullLibrary, libraryPalette, LIBRARY_MAX } from './library.js';
import { parsePalette } from './palette.js';
import { callTool } from './tools.js';
import { serializeProject } from './project.js';

describe('libraries', () => {
  const copy = (id, col, symbol) => ({ ...createElement(getPreset(id), col, 0), symbol });
  const a = copy('button', 0, 'btn'), b = copy('button', 10, 'btn'), card = { ...copy('card', 0, 'card'), style: 'double' };

  it('publishes one part per symbol and reads it back', () => {
    const lib = makeLibrary([a, b, card, createElement(getPreset('input'), 0, 5)], 'Kit');
    expect(lib.name).toBe('Kit');
    expect(lib.parts.map(p => p.symbol)).toEqual(['btn', 'card']);
    expect(parseLibrary(JSON.stringify(lib))).toEqual(lib);
    expect(lib.parts[1].style).toBe('double');
  });

  it('pulls a newer version into every linked copy, minus what a copy owns', () => {
    const edited = updateElement([a, b], a.id, { text: 'Pay now' }); // the library author changes the button
    const lib = makeLibrary(edited, 'Kit');
    const owner = { ...b, own: ['text'] };
    const other = { ...createElement(getPreset('button'), 30, 0), symbol: 'btn' };
    const { elements, changed } = pullLibrary([owner, other, card], lib);
    expect(changed).toBe(1);
    expect(elements[1].template.join('')).toContain('Pay now');
    expect(elements[0].template.join('')).not.toContain('Pay now'); // owns its words
    expect(elements[2]).toBe(card); // not in the library
    const again = pullLibrary(elements, lib);
    expect(again.changed).toBe(0);
    expect(again.elements).toBe(elements);
  });

  it('a placed library part stays linked through the palette', () => {
    const lib = makeLibrary([card]);
    const [part] = libraryPalette(lib);
    expect(part.symbol).toBe('card');
    expect(part.template.join('')).toContain('╔'); // style baked in, like any Mine part
    expect(parsePalette(JSON.stringify([part]))[0].symbol).toBe('card');
    expect(createElement(part, 0, 0).symbol).toBe('card');
  });

  it('refuses bad files and caps the size', () => {
    expect(parseLibrary('nope')).toBeNull();
    expect(parseLibrary({ icelusLibrary: 2, parts: [] })).toBeNull();
    const junk = parseLibrary({ icelusLibrary: 1, name: 'x'.repeat(99), parts: [
      { symbol: 's', label: 'Ok', template: ['[ ]'], style: 'neon' }, { symbol: 's', label: 'Dupe', template: ['x'] },
      { symbol: '', label: 'No id', template: ['x'] }, { symbol: 't', label: 'Bad', template: [1] }, null] });
    expect(junk.name).toHaveLength(40);
    expect(junk.parts).toEqual([{ symbol: 's', label: 'Ok', presetId: 'custom', template: ['[ ]'] }]);
    const many = { icelusLibrary: 1, parts: Array.from({ length: 300 }, (_, i) => ({ symbol: `s${i}`, label: 'P', template: ['x'] })) };
    expect(parseLibrary(many).parts).toHaveLength(LIBRARY_MAX);
  });

  it('publishes and pulls through the API', () => {
    const project = JSON.parse(serializeProject({ cols: 40, rows: 10, elements: [a, card] }));
    const { library } = callTool('project_to_library', { project, name: 'Kit' });
    expect(library.parts).toHaveLength(2);
    library.parts[1].template = ['╭──────╮', '│ New  │', '╰──────╯'];
    const out = callTool('edit_project', { project, ops: [{ op: 'pull', library }] });
    expect(out.text).toContain('New');
    expect(() => callTool('edit_project', { project, ops: [{ op: 'pull', library: { nope: 1 } }] })).toThrow(/library/);
  });
});
