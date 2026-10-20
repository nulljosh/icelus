import { t } from '../i18n.js';
import { canOpen } from '../lib/hotspots.js';

// A hotspot (v53): the screen a press on this part opens. Only shown once the canvas has a screen.
export default function HotspotPicker({ el, elements, onUpdate }) {
  const screens = elements.filter(s => s.presetId === 'screen');
  if (!canOpen(el) || !screens.length) return null;
  return (
    <div className="inspector-row">
      <label className="inspector-key" htmlFor="opens">{t('opens')}</label>
      <select id="opens" className="inspector-select" value={screens.some(s => s.id === el.opens) ? el.opens : ''}
        onChange={e => onUpdate(el.id, { opens: e.target.value || null })}>
        <option value="">{t('opens_none')}</option>
        {screens.map(s => <option key={s.id} value={s.id}>{s.text || 'Screen'}</option>)}
      </select>
    </div>
  );
}
