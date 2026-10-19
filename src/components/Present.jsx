import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { slideSize } from '../lib/deck.js';
import { t } from '../i18n.js';
import './Present.css';

// Present: one screen at a time, full screen. Arrows, space or a click move; Escape closes. Print lays every
// slide on its own page, so Save as PDF in the print dialog gives the deck as a PDF.
export default function Present({ slides, onClose }) {
  const [at, setAt] = useState(0);
  const go = d => setAt(i => Math.max(0, Math.min(slides.length - 1, i + d)));
  useEffect(() => {
    document.body.classList.add('presenting');
    document.documentElement.requestFullscreen?.().catch(() => {});
    const key = e => {
      if (e.key === 'Escape') onClose();
      else if (['ArrowRight', 'ArrowDown', ' ', 'PageDown'].includes(e.key)) { e.preventDefault(); go(1); }
      else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); go(-1); }
    };
    addEventListener('keydown', key);
    return () => {
      removeEventListener('keydown', key);
      document.body.classList.remove('presenting');
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, [onClose]);
  return createPortal(
    <div className="present" role="dialog" aria-modal="true" aria-label={t('present')}>
      {slides.map((s, i) => {
        const { w, h } = slideSize(s.text);
        return (
          <section key={i} className={`present-slide${i === at ? ' on' : ''}`} style={{ '--w': w, '--h': h }} aria-label={s.title}
            onClick={e => go(e.clientX < window.innerWidth / 3 ? -1 : 1)}>
            <pre>{s.text}</pre>
          </section>
        );
      })}
      <div className="present-bar">
        <button type="button" className="btn btn-icon-round" onClick={() => go(-1)} disabled={at === 0} aria-label={t('previous')}>‹</button>
        <span className="present-count">{t('slide_count', { n: at + 1, of: slides.length })}</span>
        <button type="button" className="btn btn-icon-round" onClick={() => go(1)} disabled={at === slides.length - 1} aria-label={t('next')}>›</button>
        <button type="button" className="btn" onClick={() => window.print()}>{t('save_pdf')}</button>
        <button type="button" className="btn" onClick={onClose}>{t('done')}</button>
      </div>
    </div>,
    document.body,
  );
}
