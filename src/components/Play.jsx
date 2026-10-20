import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import RealLayer from './RealLayer.jsx';
import { FONT_FAMILY, measureCharWidth } from './canvasHelpers.js';
import { renderElements, gridToText } from '../lib/engine.js';
import { realPart } from '../lib/real.js';
import { playView } from '../lib/play.js';
import { t } from '../i18n.js';
import './Present.css';

// Play mode (v54): one screen at a time, as large as fits, drawn in the real look. Press a hotspot to open its
// screen; Back goes to the one before, Escape closes. A press that misses shows where the hotspots are.
export default function Play({ elements, start, onClose }) {
  const [trail, setTrail] = useState([start]);
  const [hint, setHint] = useState(false);
  const [size, setSize] = useState({ w: innerWidth, h: innerHeight });
  const view = useMemo(() => playView(elements, trail.at(-1)), [elements, trail]);
  const back = () => setTrail(tr => (tr.length > 1 ? tr.slice(0, -1) : tr));
  useEffect(() => {
    const key = e => { if (e.key === 'Escape') onClose(); else if (e.key === 'Backspace' || e.key === 'ArrowLeft') back(); };
    const resize = () => setSize({ w: innerWidth, h: innerHeight });
    addEventListener('keydown', key); addEventListener('resize', resize);
    return () => { removeEventListener('keydown', key); removeEventListener('resize', resize); };
  }, [onClose]);
  useEffect(() => { if (!view) onClose(); }, [view, onClose]);
  if (!view) return null;
  const base = measureCharWidth(14, FONT_FAMILY()) / 14; // a character's width per point of type
  const font = Math.min(28, (size.w - 32) / view.cols / base, (size.h - 128) / view.rows / (20 / 14));
  const charW = base * font, rowH = font * 20 / 14;
  const text = gridToText(renderElements(view.elements.filter(el => !realPart(el)), view.cols, view.rows));
  const miss = () => { setHint(true); setTimeout(() => setHint(false), 600); };
  return createPortal(
    <div className="present play" role="dialog" aria-modal="true" aria-label={t('play')}>
      <div className="play-stage">
        <div className={`play-screen${hint ? ' is-hint' : ''}`} style={{ width: view.cols * charW, height: view.rows * rowH }} onClick={miss} aria-label={view.title}>
          <pre style={{ fontSize: font, lineHeight: `${rowH}px`, fontFamily: FONT_FAMILY() }}>{text}</pre>
          <RealLayer elements={view.elements} charW={charW} rowH={rowH} fontSize={font} />
          {view.spots.map(s => (
            <button key={s.id} type="button" className={`play-spot${s.height === 1 ? ' is-row' : ''}`} aria-label={s.label}
              style={{ left: s.col * charW, width: s.width * charW, ...(s.height === 1 // as tall as the real one-row control
                ? { top: (s.row - 0.25) * rowH, height: 1.5 * rowH } : { top: s.row * rowH, height: s.height * rowH }) }}
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
