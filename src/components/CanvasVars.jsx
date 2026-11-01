import { t } from '../i18n.js';
import { VAR_MAX, WIDTH_MAX, canvasColors, canvasWidths, colorMode } from '../lib/modes.js';
import { COLORS } from '../lib/color.js';
import { liveKind } from '../lib/play.js';

// Color and width variables (modes.js): named colors with a light and a dark value, the color mode that picks
// between them, and named widths. Parts bind to them in the inspector.
export const colorName = i => (i < 8 ? t(`color_${i}`) : t('color_bright', { name: t(`color_${i - 8}`) }));
const fresh = (taken, base) => { let i = 1; while (taken[i === 1 ? base : `${base}-${i}`] !== undefined) i++; return i === 1 ? base : `${base}-${i}`; };

export default function CanvasVars({ elements, onCanvas }) {
  const colors = canvasColors(elements), widths = canvasWidths(elements);
  const pick = (id, value, onChange, label) => (
    <select id={id} aria-label={label} className="inspector-select" value={value} onChange={e => onChange(Number(e.target.value))}>
      {COLORS.map((c, i) => <option key={i} value={i}>{colorName(i)}</option>)}
    </select>
  );
  return (
    <>
      <div className="inspector-row">
        <label className="inspector-key" htmlFor="color-mode">{t('color_mode')}</label>
        <select id="color-mode" className="inspector-select" value={colorMode(elements)} onChange={e => onCanvas({ colorMode: e.target.value })}>
          <option value="light">{t('theme_light')}</option>
          <option value="dark">{t('theme_dark')}</option>
        </select>
      </div>
      {Object.entries(colors).map(([name, [light, dark]]) => (
        <div key={name} className="inspector-row">
          <span className="inspector-key">{name}</span>
          {pick(`color-${name}-light`, light, v => onCanvas({ colorVar: name, pair: [v, dark] }), `${name} ${t('theme_light')}`)}
          {pick(`color-${name}-dark`, dark, v => onCanvas({ colorVar: name, pair: [light, v] }), `${name} ${t('theme_dark')}`)}
          <span className="layer-tools">
            <button type="button" aria-label={t('remove_var', { name })} onClick={() => onCanvas({ colorVar: name, pair: null })}>×</button>
          </span>
        </div>
      ))}
      {Object.keys(colors).length < VAR_MAX && (
        <button type="button" className="btn history-take" onClick={() => onCanvas({ colorVar: fresh(colors, 'color'), pair: [4, 12] })}>{t('add_color_var')}</button>
      )}
      {Object.entries(widths).map(([name, width]) => (
        <div key={name} className="inspector-row">
          <label className="inspector-key" htmlFor={`width-${name}`}>{name}</label>
          <input id={`width-${name}`} className="inspector-input" type="number" min="1" max={WIDTH_MAX} value={width}
            onChange={e => e.target.value && onCanvas({ widthVar: name, width: Number(e.target.value) })} />
          <span className="layer-tools">
            <button type="button" aria-label={t('remove_var', { name })} onClick={() => onCanvas({ widthVar: name, width: null })}>×</button>
          </span>
        </div>
      ))}
      {Object.keys(widths).length < VAR_MAX && (
        <button type="button" className="btn history-take" onClick={() => onCanvas({ widthVar: fresh(widths, 'width'), width: 20 })}>{t('add_width_var')}</button>
      )}
    </>
  );
}

// A part's width bound to a named width, shown once the project has one, and for a live part the variable it
// sets while playing (play.js), which words written {name} on any screen show.
export function VarRows({ el, elements, onUpdate }) {
  const names = Object.keys(canvasWidths(elements));
  return (
    <>
      {names.length > 0 && <div className="inspector-row">
        <label className="inspector-key" htmlFor="width-var">{t('width_var')}</label>
        <select id="width-var" className="inspector-select" value={el.widthVar ?? ''} onChange={e => onUpdate(el.id, { bind: { key: 'width', name: e.target.value || null } })}>
          <option value="">{t('color_none')}</option>
          {names.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>}
      {liveKind(el) && <div className="inspector-row">
        <label className="inspector-key" htmlFor="sets-var">{t('sets_var')}</label>
        <input key={el.id} id="sets-var" className="inspector-input" defaultValue={el.sets ?? ''} placeholder="name" maxLength={16} spellCheck={false}
          onBlur={e => { const v = e.target.value.trim().toLowerCase(); if (v !== (el.sets ?? '')) onUpdate(el.id, { sets: v || null }); }} />
      </div>}
    </>
  );
}
