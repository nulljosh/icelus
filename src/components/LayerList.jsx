import { t, partLabel } from '../i18n.js';
import { partsInside } from '../lib/lines.js';
import { partWords } from '../lib/hotspots.js';

// The layer list: each screen with its parts, front first. Tap a row to select it (the only way to pick a locked
// part), hide it, lock it, or step it up and down.
const EYE = <path d="M2 10s3-5.5 8-5.5S18 10 18 10s-3 5.5-8 5.5S2 10 2 10Zm8 2.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />;
const SHUT = <path d="M3 3l14 14M8.3 5A8 8 0 0 1 10 4.5c5 0 8 5.5 8 5.5a14 14 0 0 1-2.4 3M5.4 6.6A14 14 0 0 0 2 10s3 5.5 8 5.5a7 7 0 0 0 2.6-.5" />;
const LOCK = <path d="M5.5 9V6.5a4.5 4.5 0 0 1 9 0V9M4.5 9h11v8h-11Z" />;
const OPEN = <path d="M5.5 9V6.5a4.5 4.5 0 0 1 8.7-1.6M4.5 9h11v8h-11Z" />;
const icon = d => <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>;

export default function LayerList({ elements, selectedId, onSelect, onUpdate, onReorder }) {
  if (!elements.length) return null;
  const front = [...elements].reverse();
  const screens = front.filter(el => el.presetId === 'screen');
  const home = el => screens.find(sc => partsInside([el], sc).length)?.id;
  const loose = front.filter(el => el.presetId !== 'screen' && !home(el));
  const row = (el, child) => {
    const i = front.indexOf(el);
    const name = el.presetId === 'screen' ? el.text || partLabel({ id: 'screen', label: el.label }) : partLabel({ id: el.presetId, label: el.label });
    const words = el.presetId === 'screen' ? '' : partWords(el);
    return (
      <div key={el.id} className={`inspector-row layer-row${child ? ' is-child' : ''}${el.presetId === 'screen' ? ' is-screen' : ''}${el.id === selectedId ? ' is-selected' : ''}${el.hidden ? ' is-hidden' : ''}`}>
        <button type="button" className="layer-name" onClick={() => onSelect(el.id)}>
          <span>{name}</span>{words && words !== name && <small>{words}</small>}
        </button>
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
    );
  };
  // Each screen with the parts on it, like the layer tree in a design tool; loose parts last.
  return (
    <>
      {screens.map(sc => (
        <section key={sc.id} className="inspector-section">
          {row(sc, false)}
          {front.filter(el => el.presetId !== 'screen' && home(el) === sc.id).map(el => row(el, true))}
        </section>
      ))}
      {loose.length > 0 && (
        <section className="inspector-section">
          {screens.length > 0 && <div className="inspector-section-title">{t('not_on_screen')}</div>}
          {loose.map(el => row(el, false))}
        </section>
      )}
    </>
  );
}
