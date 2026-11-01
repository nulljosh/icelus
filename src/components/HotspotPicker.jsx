import { useState } from 'react';
import { t } from '../i18n.js';
import { canOpen, MOVES, BACK, isLink } from '../lib/hotspots.js';

// A hotspot (v53): the screen a press on this part opens. Only shown once the canvas has a screen.
export default function HotspotPicker({ el, elements, onUpdate }) {
  const screens = elements.filter(s => s.presetId === 'screen');
  const opens = screens.some(s => s.id === el.opens);
  const [linking, setLinking] = useState(false), [url, setUrl] = useState(isLink(el.opens) ? el.opens : 'https://');
  const [forId, setForId] = useState(el.id);
  if (forId !== el.id) { setForId(el.id); setLinking(false); setUrl(isLink(el.opens) ? el.opens : 'https://'); } // another part picked
  const isUrl = isLink(el.opens) || linking;
  if (!canOpen(el) || !screens.length) return null;
  const commit = () => { if (isLink(url.trim())) { onUpdate(el.id, { opens: url.trim() }); setLinking(false); } };
  return (<>
    <div className="inspector-row">
      <label className="inspector-key" htmlFor="opens">{t('opens')}</label>
      <select id="opens" className="inspector-select" value={isUrl ? 'link' : el.opens === BACK || screens.some(s => s.id === el.opens) ? el.opens : ''}
        onChange={e => { if (e.target.value === 'link') { setLinking(true); return; } setLinking(false); onUpdate(el.id, { opens: e.target.value || null }); }}>
        <option value="">{t('opens_none')}</option>
        <option value={BACK}>{t('back')}</option>
        <option value="link">{t('web_link')}</option>
        {screens.map(s => <option key={s.id} value={s.id}>{s.text || 'Screen'}</option>)}
      </select>
    </div>
    {isUrl && (
      <div className="inspector-row">
        <label className="inspector-key" htmlFor="opens-url">{t('web_link')}</label>
        <input id="opens-url" className="inspector-input" type="url" inputMode="url" value={url} spellCheck={false}
          onChange={e => setUrl(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') commit(); }} />
      </div>
    )}
    {opens && (
      <div className="inspector-row">
        <label className="inspector-key" htmlFor="move">{t('move')}</label>
        <select id="move" className="inspector-select" value={el.move ?? ''} onChange={e => onUpdate(el.id, { move: e.target.value || null })}>
          <option value="">{t('move_cut')}</option>
          {MOVES.map(m => <option key={m} value={m}>{t(`move_${m}`)}</option>)}
        </select>
      </div>
    )}
  </>);
}
