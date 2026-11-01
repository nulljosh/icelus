import { t } from '../i18n.js';
import { ALIGNS } from '../lib/layout.js';

// Auto layout across (layout.js): parts run left to right and wrap; each row aligned top, middle or bottom.
export default function AutoAcross({ auto, onChange }) {
  return (
    <>
      <div className="inspector-row">
        <label className="inspector-key" htmlFor="auto-across">{t('auto_across')}</label>
        <input id="auto-across" type="checkbox" className="inspector-switch" checked={auto.across === true}
          onChange={e => { const { across, align, wrap, ...rest } = auto; onChange(e.target.checked ? { ...rest, across: true, align: 'top' } : rest); }} />
      </div>
      {auto.across && (
        <div className="inspector-row">
          <label className="inspector-key" htmlFor="auto-align">{t('auto_align')}</label>
          <select id="auto-align" className="inspector-select" value={auto.align ?? 'top'} onChange={e => onChange({ ...auto, align: e.target.value })}>
            {ALIGNS.map(v => <option key={v} value={v}>{t(`align_${v}`)}</option>)}
          </select>
        </div>
      )}
    </>
  );
}
