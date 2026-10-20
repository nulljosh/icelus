import { useEffect, useMemo, useState } from 'react';
import RealLayer from './RealLayer.jsx';
import { FILE_TEMPLATES, templateProject, cleanIndex, fileId, addFile, renameFile, removeFile, touchFile } from '../lib/files.js';
import { serializeProject, parseProject } from '../lib/engine.js';
import { playView, startScreen } from '../lib/play.js';
import { t } from '../i18n.js';
import './FilesPanel.css';

// Files (files.js): the open file is the working canvas, every file is kept under its own key, and the index
// keeps the names. The first run files the canvas you already had as Untitled.
const INDEX_KEY = 'icelus-files', slot = id => `icelus-file-${id}`;
const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key, value) => { try { localStorage.setItem(key, value); } catch { /* storage full or blocked */ } };

export function useFiles(state, dispatch, enabled) {
  const [index, setIndex] = useState(() => {
    const ix = cleanIndex(read(INDEX_KEY));
    return ix.files.length ? ix : addFile(ix, fileId(), 'Untitled');
  });
  useEffect(() => { if (enabled) write(INDEX_KEY, JSON.stringify(index)); }, [index, enabled]);
  // The open file's copy follows the canvas on every change, the same as the working copy.
  useEffect(() => { if (enabled && index.current) write(slot(index.current), serializeProject(state)); },
    [state.elements, state.cols, state.rows, state.snapshots, state.actions, index.current, enabled]);

  const load = project => dispatch({ type: 'OPEN_FILE', ...project });
  const open = id => {
    if (id === index.current) return;
    load(parseProject(read(slot(id)) ?? '') ?? templateProject('blank'));
    setIndex(ix => ({ ...touchFile(ix, ix.current), current: id }));
  };
  const create = templateId => {
    const id = fileId(), project = templateProject(templateId), name = FILE_TEMPLATES.find(x => x.id === templateId)?.name;
    write(slot(id), serializeProject(project));
    setIndex(ix => addFile(touchFile(ix, ix.current), id, templateId === 'blank' ? 'Untitled' : name));
    load(project);
  };
  const duplicate = id => {
    const raw = id === index.current ? serializeProject(state) : read(slot(id)), copy = fileId();
    const name = index.files.find(f => f.id === id)?.name ?? 'Untitled';
    if (!raw) return;
    write(slot(copy), raw);
    setIndex(ix => addFile(touchFile(ix, ix.current), copy, `${name} copy`));
    load(parseProject(raw));
  };
  const remove = id => {
    const next = removeFile(index, id);
    if (next === index) return;
    try { localStorage.removeItem(slot(id)); } catch { /* ignore */ }
    if (id === index.current) load(parseProject(read(slot(next.current)) ?? '') ?? templateProject('blank'));
    setIndex(next);
  };
  const rename = (id, name) => setIndex(ix => renameFile(ix, id, name));
  return { index, open, create, duplicate, remove, rename, name: index.files.find(f => f.id === index.current)?.name ?? 'Untitled' };
}

// The first screen of a template, drawn small in the real look.
const THUMBS = Object.fromEntries(FILE_TEMPLATES.map(x => {
  const els = templateProject(x.id).elements, first = startScreen(els);
  return [x.id, first ? playView(els, first.id) : null];
}));
function TemplateThumb({ id }) {
  const v = THUMBS[id];
  if (!v) return <span className="file-thumb is-blank" aria-hidden="true" />;
  const charW = 3, rowH = 7, scale = Math.min(1, 116 / (v.cols * charW), 72 / (v.rows * rowH)); // fits the phone thumb too
  return (
    <span className="file-thumb" aria-hidden="true">
      <span className="file-thumb-art" style={{ width: v.cols * charW, height: v.rows * rowH, transform: `scale(${scale})` }}>
        <RealLayer elements={v.elements} charW={charW} rowH={rowH} fontSize={5.5} />
      </span>
    </span>
  );
}

const ago = ms => {
  const m = Math.round((Date.now() - ms) / 60000);
  return !ms ? '' : m < 1 ? t('just_now') : m < 60 ? t('minutes_ago', { n: m }) : m < 1440 ? t('hours_ago', { n: Math.round(m / 60) }) : new Date(ms).toLocaleDateString();
};

export default function FilesPanel({ files, onClose }) {
  const { index, open, create, duplicate, remove, rename } = files;
  const [editing, setEditing] = useState(null), [draft, setDraft] = useState(''), [deleting, setDeleting] = useState(null);
  const sorted = useMemo(() => [...index.files].sort((a, b) => (a.id === index.current ? -1 : b.id === index.current ? 1 : b.updated - a.updated)), [index]);
  const go = fn => (...a) => { fn(...a); onClose(); };
  const save = id => { rename(id, draft); setEditing(null); };
  return (
    <div className="tour-overlay" onClick={onClose}>
      <div className="tour-card account-card files-card" role="dialog" aria-modal="true" aria-label={t('files')} onClick={e => e.stopPropagation()}
        onKeyDown={e => { if (e.key === 'Escape' && !editing) onClose(); }}>
        <div className="account-head">
          <h2 className="account-title">{t('files')}</h2>
          <button type="button" className="account-done" onClick={onClose}>{t('done')}</button>
        </div>
        <h3 className="files-head">{t('new_file')}</h3>
        <div className="files-templates">
          {FILE_TEMPLATES.map(x => (
            <button key={x.id} type="button" className="file-template" onClick={go(() => create(x.id))}>
              <TemplateThumb id={x.id} />
              <span>{t(`template_${x.id.replace('-', '_')}`)}</span>
            </button>
          ))}
        </div>
        <h3 className="files-head">{t('your_files')}</h3>
        <ul className="files-list">
          {sorted.map(f => (
            <li key={f.id} className={`file-row${f.id === index.current ? ' is-open' : ''}`}>
              {editing === f.id ? (
                <input className="file-rename" value={draft} maxLength={60} autoFocus aria-label={t('rename')}
                  onChange={e => setDraft(e.target.value)} onBlur={() => save(f.id)}
                  onKeyDown={e => { if (e.key === 'Enter') save(f.id); if (e.key === 'Escape') setEditing(null); }} />
              ) : (
                <button type="button" className="file-open" onClick={go(() => open(f.id))}>
                  <b>{f.name}</b><small>{f.id === index.current ? t('open_now') : ago(f.updated)}</small>
                </button>
              )}
              {deleting === f.id ? (
                <span className="file-actions">
                  <button type="button" className="btn btn-danger" onClick={() => { remove(f.id); setDeleting(null); }}>{t('delete')}</button>
                  <button type="button" className="btn" onClick={() => setDeleting(null)}>{t('cancel')}</button>
                </span>
              ) : (
                <span className="file-actions">
                  <button type="button" className="file-icon" onClick={() => { setEditing(f.id); setDraft(f.name); }} aria-label={t('rename')} title={t('rename')}>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M11.5 3.5l3 3-8 8H3.5v-3l8-8z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
                  </button>
                  <button type="button" className="file-icon" onClick={go(() => duplicate(f.id))} aria-label={t('duplicate')} title={t('duplicate')}>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="6" y="6" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.6" /><path d="M12 3.5H5A1.5 1.5 0 0 0 3.5 5v7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                  </button>
                  {index.files.length > 1 && (
                    <button type="button" className="file-icon is-danger" onClick={() => setDeleting(f.id)} aria-label={t('delete')} title={t('delete')}>
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3.5 5h11M7 5V3.5h4V5M5 5l.7 9.5h6.6L13 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                  )}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
