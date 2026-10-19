import { t } from '../i18n.js';
import { MODES, VAR_MAX, canvasMode, canvasVars } from '../lib/modes.js';
import { AUTO_MAX } from '../lib/layout.js';

// The canvas as a whole (v47): its line mode over every part, and named spacing that auto layout screens use.
export default function CanvasPanel({ elements, cursor, cols, rows, onCanvas }) {
  const mode = canvasMode(elements) ?? '', vars = canvasVars(elements), names = Object.keys(vars);
  const fresh = () => { let i = names.length + 1; while (vars[`space-${i}`] !== undefined) i++; return i === 1 ? 'space' : `space-${i}`; };
  return (
    <section className="inspector-section">
      <div className="inspector-section-title">{t('canvas')}</div>
      <div className="inspector-row">
        <label className="inspector-key" htmlFor="canvas-mode">{t('canvas_lines')}</label>
        <select id="canvas-mode" className="inspector-select" value={mode} onChange={e => onCanvas({ mode: e.target.value || null })}>
          <option value="">{t('canvas_lines_own')}</option>
          {MODES.map(m => <option key={m} value={m}>{t(`adjust_${m}`)}</option>)}
        </select>
      </div>
      {names.map(name => (
        <div key={name} className="inspector-row">
          <label className="inspector-key" htmlFor={`var-${name}`}>{name}</label>
          <input id={`var-${name}`} className="inspector-range" type="range" min="0" max={AUTO_MAX} value={vars[name]}
            onChange={e => onCanvas({ name, value: Number(e.target.value) })} />
          <span className="inspector-value">{vars[name]}</span>
          <span className="layer-tools">
            <button type="button" aria-label={t('remove_var', { name })} onClick={() => onCanvas({ name, value: null })}>×</button>
          </span>
        </div>
      ))}
      {names.length < VAR_MAX && (
        <button type="button" className="btn history-take" onClick={() => onCanvas({ name: fresh(), value: 1 })}>{t('add_var')}</button>
      )}
      <div className="inspector-row"><span className="inspector-key">{t('col')}</span><span className="inspector-value">{cursor.col}</span></div>
      <div className="inspector-row"><span className="inspector-key">{t('row')}</span><span className="inspector-value">{cursor.row}</span></div>
      <div className="inspector-row"><span className="inspector-key">{t('size')}</span><span className="inspector-value">{cols}×{rows}</span></div>
    </section>
  );
}
