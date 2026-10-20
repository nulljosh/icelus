import { describe, it, expect } from 'vitest';
import { FILE_TEMPLATES, FILES_MAX, templateProject, cleanIndex, uniqueName, addFile, renameFile, removeFile, touchFile, cleanName, fileId } from './files.js';
import { serializeProject, parseProject } from './engine.js';
import { playPath, startScreen } from './play.js';

describe('files', () => {
  it('every template builds, links every listed button, and saves', () => {
    for (const t of FILE_TEMPLATES) {
      const p = templateProject(t.id);
      expect(p.elements.filter(e => e.presetId === 'screen')).toHaveLength(t.screens.length);
      expect(p.elements.filter(e => e.opens)).toHaveLength(t.links.length);
      expect(p.elements.every(e => e.col + e.width <= p.cols && e.row + e.height <= p.rows)).toBe(true);
      expect(parseProject(serializeProject(p)).elements).toHaveLength(p.elements.length);
    }
    expect(templateProject('nope').elements).toEqual([]); // falls back to blank
  });

  it('a template plays straight away', () => {
    const els = templateProject('onboarding').elements;
    const next = els.filter(e => e.opens);
    const out = playPath(els, startScreen(els).id, [next[0].id, next[1].id]);
    expect(out.error).toBeUndefined();
    expect(out.path.map(v => v.title)).toEqual(['Welcome', 'Notifications', 'Ready']);
  });

  it('cleans an untrusted index', () => {
    expect(cleanIndex('not json')).toEqual({ files: [], current: null });
    const raw = { files: [{ id: 'f-a', name: '  Home\u0007  ', updated: 5 }, { id: 'f-a', name: 'dupe' }, { id: '../x', name: 'bad' }, null,
      { id: 'f-b', name: 'x'.repeat(200) }], current: 'f-zzz' };
    const ix = cleanIndex(JSON.stringify(raw));
    expect(ix.files.map(f => f.id)).toEqual(['f-a', 'f-b']);
    expect(ix.files[0]).toEqual({ id: 'f-a', name: 'Home', updated: 5 });
    expect(ix.files[1].name).toHaveLength(60);
    expect(ix.current).toBe('f-a'); // an unknown current falls back to the first
    expect(cleanIndex({ files: Array.from({ length: 300 }, (_, i) => ({ id: `f-${i}`, name: 'n' })) }).files).toHaveLength(FILES_MAX);
  });

  it('adds, names, renames, touches and removes', () => {
    let ix = { files: [], current: null };
    ix = addFile(ix, 'f-1', 'Sign in', 1);
    ix = addFile(ix, 'f-2', 'Sign in', 2);
    expect(ix.files.map(f => f.name)).toEqual(['Sign in 2', 'Sign in']);
    expect(ix.current).toBe('f-2');
    expect(uniqueName(ix, '')).toBe('Untitled');
    ix = renameFile(ix, 'f-2', '  Checkout ');
    expect(ix.files[0].name).toBe('Checkout');
    expect(renameFile(ix, 'f-2', '   ').files[0].name).toBe('Checkout'); // an empty name is ignored
    expect(touchFile(ix, 'f-1', 9).files[1].updated).toBe(9);
    ix = removeFile(ix, 'f-2');
    expect(ix).toEqual({ files: [{ id: 'f-1', name: 'Sign in', updated: 1 }], current: 'f-1' });
    expect(removeFile(ix, 'f-1')).toBe(ix); // never the last one
    expect(cleanName('a\nb')).toBe('ab');
    expect(fileId()).toMatch(/^f-[a-z0-9]+$/);
  });

  it('stops at the limit', () => {
    let ix = { files: [], current: null };
    for (let i = 0; i < FILES_MAX + 5; i++) ix = addFile(ix, `f-${i}`, 'File', i);
    expect(ix.files).toHaveLength(FILES_MAX);
  });
});
