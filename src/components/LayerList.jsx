import { t, partLabel } from '../i18n.js';

// The layer list: every part, front first. Tap a row to select it (the only way to pick a locked part),
// hide it, lock it, or step it up and down.
const EYE = <path d="M2 10s3-5.5 8-5.5S18 10 18 10s-3 5.5-8 5.5S2 10 2 10Zm8 2.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />;
const SHUT = <path d="M3 3l14 14M8.3 5A8 8 0 0 1 10 4.5c5 0 8 5.5 8 5.5a14 14 0 0 1-2.4 3M5.4 6.6A14 14 0 0 0 2 10s3 5.5 8 5.5a7 7 0 0 0 2.6-.5" />;
const LOCK = <path d="M5.5 9V6.5a4.5 4.5 0 0 1 9 0V9M4.5 9h11v8h-11Z" />;
const OPEN = <path d="M5.5 9V6.5a4.5 4.5 0 0 1 8.7-1.6M4.5 9h11v8h-11Z" />;
const icon = d => <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>;

export default function LayerList({ elements, selectedId, onSelect, onUpdate, onReorder }) {
  if (!elements.length) return null;
  return (
    <section className="inspector-section">
      <div className="inspector-section-title">{t('layers')}</div>
      {[...elements].reverse().map((el, i) => (
        <div key={el.id} className={`inspector-row layer-row${el.id === selectedId ? ' is-selected' : ''}${el.hidden ? ' is-hidden' : ''}`}>
          <button type="button" className="layer-name" onClick={() => onSelect(el.id)}>{el.text?.split('\n')[0] || partLabel({ id: el.presetId, label: el.label })}</button>
          <span className="layer-tools">
            <button type="button" aria-label={t(el.hidden ? 'show' : 'hide')} aria-pressed={!!el.hidden} onClick={() => onUpdate(el.id, { hidden: !el.hidden })}>{icon(el.hidden ? SHUT : EYE)}</button>
            <button type="button" aria-label={t(el.locked ? 'unlock' : 'lock')} aria-pressed={!!el.locked} onClick={() => onUpdate(el.id, { locked: !el.locked })}>{icon(el.locked ? LOCK : OPEN)}</button>
            {/* Up and down only on the picked layer, so every name has room. */}
            {el.id === selectedId && <>
              <button type="button" aria-label={t('layer_up')} disabled={i === 0} onClick={() => onReorder(el.id, 'up')}>↑</button>
              <button type="button" aria-label={t('layer_down')} disabled={i === elements.length - 1} onClick={() => onReorder(el.id, 'down')}>↓</button>
            </>}
          </span>
        </div>
      ))}
    </section>
  );
}
