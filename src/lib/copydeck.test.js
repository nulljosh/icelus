import { describe, it, expect } from 'vitest';
import { createElement, updateElement } from './engine.js';
import { getPreset, SCREEN_TOOL } from './presets.js';
import { callTool } from './tools.js';
import { serializeProject } from './project.js';
import { copyEntries, applyCopy, cleanTranslation, cleanStrings, translateMessages, COPY_MAX } from './copydeck.js';

describe('copy deck', () => {
  const btn = createElement(getPreset('button'), 2, 2);
  const signIn = updateElement([btn], btn.id, { text: '[ Sign in ]' })[0];
  const screen = createElement(SCREEN_TOOL, 0, 0), table = createElement(getPreset('table'), 2, 6), check = createElement(getPreset('checkbox'), 2, 4);

  it('lists every run of words, one entry each', () => {
    const texts = copyEntries([screen, signIn, check, createElement(getPreset('input'), 2, 8)]).map(e => e.text);
    expect(texts).toEqual(['Screen', 'Sign in', 'Label']); // an empty field has no words
    expect(copyEntries([table]).length).toBeGreaterThan(2); // each cell
  });

  it('edits swap just the words, frames and tables stay whole', () => {
    const [s, b] = copyEntries([screen, signIn]);
    const out = applyCopy([screen, signIn], { [s.key]: 'Log in', [b.key]: 'Continue' });
    expect(out[0].text).toBe('Log in');
    expect(out[0].template[0]).toContain('Log in');
    expect(out[1].template).toEqual(['[ Continue ]']);
    expect(out[1].width).toBe(12);
    const cell = copyEntries([table])[0];
    const t2 = applyCopy([table], { [cell.key]: 'Who' })[0];
    expect(t2.template.join('\n')).toContain('Who');
    expect(t2.template[0]).toMatch(/^┌/u); // still a table
    expect(applyCopy([signIn], {})).toEqual([signIn]);
    expect(applyCopy([signIn], { [copyEntries([signIn])[0].key]: 'Two\nlines' })[0].template).toEqual(['[ Two lines ]']);
  });

  it('two edits on one line both land', () => {
    const row = { ...signIn, template: ['Name  Email'], width: 11 };
    const [a, c] = copyEntries([row]);
    expect(applyCopy([row], { [a.key]: 'Nom', [c.key]: 'Courriel' })[0].template).toEqual(['Nom  Courriel']);
  });

  it('caps the entries and the translate input', () => {
    const many = Array.from({ length: 300 }, (_, i) => ({ ...signIn, id: `b${i}` }));
    expect(copyEntries(many)).toHaveLength(COPY_MAX);
    expect(cleanStrings(['a', 'b'])).toEqual(['a', 'b']);
    expect(cleanStrings([])).toBeNull();
    expect(cleanStrings(['x'.repeat(201)])).toBeNull();
    expect(cleanStrings([1])).toBeNull();
    expect(cleanStrings(Array(41).fill('x'.repeat(200)))).toBeNull(); // over 8,000 in all
  });

  it('reads the model reply strictly', () => {
    expect(translateMessages(['OK'], 'French')[0].content).toContain('French');
    expect(cleanTranslation('Here you go: ["Envoyer", "Annuler"]', ['Send', 'Cancel'])).toEqual(['Envoyer', 'Annuler']);
    expect(cleanTranslation('["Envoyer"]', ['Send', 'Cancel'])).toBeNull(); // wrong length
    expect(cleanTranslation('nope', ['Send'])).toBeNull();
    expect(cleanTranslation('["", 3]', ['Send', 'Cancel'])).toEqual(['Send', 'Cancel']); // blanks keep the original
  });

  it('copy_deck and the copy op over the API', () => {
    const project = JSON.parse(serializeProject({ cols: 40, rows: 12, elements: [screen, signIn] }));
    const { entries } = callTool('copy_deck', { project });
    expect(entries.map(e => e.text)).toEqual(['Screen', 'Sign in']);
    const out = callTool('edit_project', { project, ops: [{ op: 'copy', texts: { [entries[1].key]: 'Se connecter' } }] });
    expect(out.text).toContain('[ Se connecter ]');
    expect(() => callTool('edit_project', { project, ops: [{ op: 'copy', texts: 'x' }] })).toThrow(/texts/);
  });
});
