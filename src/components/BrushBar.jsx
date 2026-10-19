import { BRUSH_SIZES, BRUSH_CHARS } from '../lib/brush.js';
import { GRADIENT_MODES } from '../lib/gradient.js';
import { ADJUSTMENTS } from '../lib/engine.js';
import { t } from '../i18n.js';

// The brush's two settings while it is picked: how wide (one to five cells) and which mark. The eraser
// takes the same sizes. Done puts the brush down.
export default function BrushBar({ tool, brush, onChange, onDone }) {
  return (
    <div className="brush-bar" role="toolbar" aria-label={t(`part_${tool}`)}>
      {tool === 'adjust' ? (
        <select className="inspector-select" aria-label={t('part_adjust')} value={brush.adjust} onChange={e => onChange({ ...brush, adjust: e.target.value })}>
          {ADJUSTMENTS.map(a => <option key={a} value={a}>{t(`adjust_${a}`)}</option>)}
        </select>
      ) : tool === 'gradient' ? (
        <div className="brush-group" role="group" aria-label={t('part_gradient')}>
          {GRADIENT_MODES.map(ramp => (
            <button key={ramp} type="button" className={`brush-option brush-word${brush.ramp === ramp ? ' is-on' : ''}`}
              aria-pressed={brush.ramp === ramp} onClick={() => onChange({ ...brush, ramp })}>{t(`ramp_${ramp}`)}</button>
          ))}
        </div>
      ) : (
      <div className="brush-group" role="group" aria-label={t('brush_size')}>
        {BRUSH_SIZES.map(size => (
          <button key={size} type="button" className={`brush-option${brush.size === size ? ' is-on' : ''}`}
            aria-pressed={brush.size === size} onClick={() => onChange({ ...brush, size })}>{size}</button>
        ))}
      </div>
      )}
      {tool === 'brush' && (
        <div className="brush-group" role="group" aria-label={t('brush_mark')}>
          {BRUSH_CHARS.map(char => (
            <button key={char} type="button" className={`brush-option brush-mark${brush.char === char ? ' is-on' : ''}`}
              aria-pressed={brush.char === char} onClick={() => onChange({ ...brush, char })}>{char}</button>
          ))}
        </div>
      )}
      <button type="button" className="btn" onClick={onDone}>{t('done')}</button>
    </div>
  );
}
