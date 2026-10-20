import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import RealLayer from './RealLayer.jsx';
import { FONT_FAMILY, measureCharWidth } from './canvasHelpers.js';
import { renderElements, gridToText } from '../lib/engine.js';
import { realPart } from '../lib/real.js';
import { playView, liveKind, liveStart, liveElement, pressLive, typeLive, TYPE_MAX } from '../lib/play.js';
import { partWords } from '../lib/hotspots.js';
import { t } from '../i18n.js';
import './Present.css';

// Play mode (v54): one screen at a time, as large as fits, drawn in the real look. Press a hotspot to open its
// screen; Back goes to the one before, Escape closes. A press that misses shows where the hotspots are. Live parts
// (v55) work while you play: boxes tick, switches flip, tabs switch and fields take typing, for this session only.
export default function Play({ elements, start, onClose }) {
  const [trail, setTrail] = useState([start]);
  const [hint, setHint] = useState(false);
  const [live, setLive] = useState({});
  const [size, setSize] = useState({ w: innerWidth, h: innerHeight });
  const view = useMemo(() => playView(elements, trail.at(-1)), [elements, trail]);
  const back = () => setTrail(tr => (tr.length > 1 ? tr.slice(0, -1) : tr));
  useEffect(() => {
    const key = e => {
      if (e.target.closest?.('.play-field')) return; // typing in a field
      if (e.key === 'Escape') onClose(); else if (e.key === 'Backspace' || e.key === 'ArrowLeft') back();
    };
    const resize = () => setSize({ w: innerWidth, h: innerHeight });
    addEventListener('keydown', key); addEventListener('resize', resize);
    return () => { removeEventListener('keydown', key); removeEventListener('resize', resize); };
  }, [onClose]);
  useEffect(() => { if (!view) onClose(); }, [view, onClose]);
  if (!view) return null;
  const base = measureCharWidth(14, FONT_FAMILY()) / 14; // a character's width per point of type
  const font = Math.min(28, (size.w - 32) / view.cols / base, (size.h - 128) / view.rows / (20 / 14));
  const charW = base * font, rowH = font * 20 / 14;
  const shown = view.elements.map(el => liveElement(el, live));
  const text = gridToText(renderElements(shown.filter(el => !realPart(el)), view.cols, view.rows));
  const spotIds = new Set(view.spots.map(s => s.id));
  const box = el => ({ left: el.col * charW, width: el.width * charW, ...(el.height === 1 // as tall as the real one-row control
    ? { top: (el.row - 0.25) * rowH, height: 1.5 * rowH } : { top: el.row * rowH, height: el.height * rowH }) });
  const miss = () => { setHint(true); setTimeout(() => setHint(false), 600); };
  return createPortal(
    <div className="present play" role="dialog" aria-modal="true" aria-label={t('play')}>
      <div className="play-stage">
        <div className={`play-screen${hint ? ' is-hint' : ''}`} style={{ width: view.cols * charW, height: view.rows * rowH }} onClick={miss} aria-label={view.title}>
          <pre style={{ fontSize: font, lineHeight: `${rowH}px`, fontFamily: FONT_FAMILY() }}>{text}</pre>
          <RealLayer elements={shown} charW={charW} rowH={rowH} fontSize={font} />
          {shown.filter(el => !spotIds.has(el.id) && liveKind(el)).map(el => <Live key={el.id} el={el} value={live[el.id]} box={box(el)} charW={charW} rowH={rowH} font={font}
            onPress={dCol => setLive(st => pressLive(view, st, el.id, dCol))} onType={w => setLive(st => typeLive(st, el.id, w))} />)}
          {view.spots.map(s => (
            <button key={s.id} type="button" className={`play-spot${s.height === 1 ? ' is-row' : ''}`} aria-label={s.label}
              style={box(s)}
              onClick={e => { e.stopPropagation(); setTrail(tr => [...tr, s.to].slice(-50)); }} />
          ))}
        </div>
      </div>
      <div className="present-bar">
        <button type="button" className="btn" onClick={back} disabled={trail.length < 2}>{t('back')}</button>
        <span className="present-count">{view.title}</span>
        <button type="button" className="btn" onClick={onClose}>{t('done')}</button>
      </div>
    </div>,
    document.body,
  );
}

// One live part: a field to type in, or a clear button over the control that works it. A press from the
// keyboard (no pointer position) steps to the next value.
function Live({ el, value, box, charW, rowH, font, onPress, onType }) {
  const kind = liveKind(el), label = partWords(el);
  if (kind === 'type') {
    const multi = el.presetId === 'textarea', Field = multi ? 'textarea' : 'input';
    const style = multi ? { left: (el.col + 1) * charW, top: (el.row + 1) * rowH, width: (el.width - 2) * charW, height: (el.height - 2) * rowH, lineHeight: `${rowH}px` } : box;
    return <Field className={`play-field${multi ? ' is-multi' : ''}`} style={{ ...style, fontSize: Math.round(font * 0.93) }} value={value ?? ''}
      maxLength={TYPE_MAX} aria-label={label} onChange={e => onType(e.target.value)} onClick={e => e.stopPropagation()} />;
  }
  const role = { tick: 'checkbox', pick: 'radio', flip: 'switch' }[kind];
  return (
    <button type="button" className={`play-spot play-live${el.height === 1 ? ' is-row' : ''}`} style={box} aria-label={label}
      {...(role && { role, 'aria-checked': !!(value ?? liveStart(el)) })}
      onClick={e => { e.stopPropagation(); onPress(e.detail === 0 ? null : Math.floor((e.clientX - e.currentTarget.getBoundingClientRect().left) / charW)); }} />
  );
}
