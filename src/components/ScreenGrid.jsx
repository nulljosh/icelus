import { useState } from 'react';
import { t } from '../i18n.js';
import { canvasGrids, isVarName } from '../lib/modes.js';
import { GRID_MAX } from '../lib/grids.js';

// A screen's column grid (v49): columns (0 is off) and the gutter, and one tap to give every screen the same grid.
export default function ScreenGrid({ element, elements = [], onUpdate, onEverywhere, onCanvas }) {
  const g = element.grid, cols = g?.cols ?? 0;
  const styles = canvasGrids(elements), [name, setName] = useState('');
  const same = (a, b) => a && b && a.cols === b.cols && a.gutter === b.gutter && (a.baseline ?? 0) === (b.baseline ?? 0);
  const current = Object.keys(styles).find(k => same(styles[k], g)) ?? '';
  const save = () => { const n = name.trim().toLowerCase().replace(/\s+/g, '-'); if (isVarName(n) && onCanvas) { onCanvas({ gridStyle: n, grid: g }); setName(''); } };
  const set = changes => onUpdate(element.id, { grid: { cols, gutter: g?.gutter ?? 1, ...(g?.baseline && { baseline: g.baseline }), ...changes } });
  return (
    <>
      <div className="inspector-row">
        <label className="inspector-key" htmlFor="grid-cols">{t('grid_columns')}</label>
        <input id="grid-cols" className="inspector-range" type="range" min="0" max={GRID_MAX} value={cols}
          onChange={e => (Number(e.target.value) ? set({ cols: Number(e.target.value) }) : onUpdate(element.id, { grid: null }))} />
        <span className="inspector-value">{cols || t('grid_off')}</span>
      </div>
      {g && (
        <div className="inspector-row">
          <label className="inspector-key" htmlFor="grid-gutter">{t('grid_gutter')}</label>
          <input id="grid-gutter" className="inspector-range" type="range" min="0" max="8" value={g.gutter}
            onChange={e => set({ gutter: Number(e.target.value) })} />
          <span className="inspector-value">{g.gutter}</span>
        </div>
      )}
      {g && (
        <div className="inspector-row">
          <label className="inspector-key" htmlFor="grid-baseline">{t('grid_baseline')}</label>
          <input id="grid-baseline" className="inspector-range" type="range" min="0" max="8" value={g.baseline ?? 0}
            onChange={e => set({ baseline: Number(e.target.value) })} />
          <span className="inspector-value">{g.baseline || t('grid_off')}</span>
        </div>
      )}
      {Object.keys(styles).length > 0 && (
        <div className="inspector-row">
          <label className="inspector-key" htmlFor="grid-style">{t('grid_style')}</label>
          <select id="grid-style" className="inspector-select" value={current} onChange={e => e.target.value && onUpdate(element.id, { grid: styles[e.target.value] })}>
            <option value="">–</option>
            {Object.keys(styles).map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
      )}
      {g && onCanvas && !current && (
        <div className="inspector-row">
          <label className="inspector-key" htmlFor="grid-name">{t('save_grid_style')}</label>
          <input id="grid-name" className="inspector-input" value={name} maxLength={16} placeholder="phone" spellCheck={false}
            onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') save(); }} onBlur={save} />
        </div>
      )}
      {g && onEverywhere && <button type="button" className="btn history-take" onClick={() => onEverywhere(element.id)}>{t('grid_everywhere')}</button>}
    </>
  );
}
