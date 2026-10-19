import { t } from '../i18n.js';

// What to do with the picked cells: copy them as text, cut them, fill them with the brush's mark, or let go.
// Drag inside the picked cells to move what they hold.
export default function SelectBar({ tool, count, onCopy, onCut, onFill, onClear, onDone }) {
  return (
    <div className="brush-bar" role="toolbar" aria-label={t('part_marquee')}>
      <span className="select-count">{count ? t('cells_picked', { n: count }) : t(tool === 'wand' ? 'tap_to_pick' : 'drag_to_pick')}</span>
      {count > 0 && (
        <>
          <button type="button" className="btn" onClick={onCopy}>{t('copy_cells')}</button>
          <button type="button" className="btn" onClick={onCut}>{t('cut_cells')}</button>
          <button type="button" className="btn" onClick={onFill}>{t('fill_cells')}</button>
          <button type="button" className="btn" onClick={onClear}>{t('deselect')}</button>
        </>
      )}
      <button type="button" className="btn" onClick={onDone}>{t('done')}</button>
    </div>
  );
}
