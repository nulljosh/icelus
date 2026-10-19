import { t } from '../i18n.js';
import { GRID_MAX } from '../lib/grids.js';

// A screen's column grid (v49): columns (0 is off) and the gutter, and one tap to give every screen the same grid.
export default function ScreenGrid({ element, onUpdate, onEverywhere }) {
  const g = element.grid, cols = g?.cols ?? 0;
  const set = changes => onUpdate(element.id, { grid: { cols, gutter: g?.gutter ?? 1, ...changes } });
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
      {g && onEverywhere && <button type="button" className="btn history-take" onClick={() => onEverywhere(element.id)}>{t('grid_everywhere')}</button>}
    </>
  );
}
