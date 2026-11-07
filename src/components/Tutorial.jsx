import { TUTORIAL, TOUR_ONLY } from '../lib/tutorial.js';
import { t } from '../i18n.js';

// The tutorial card: one short step at a time, at the bottom of the screen, never in the way of the grid.
const PHONE = new Set(['pick', 'place', 'copy', 'files']);

export default function Tutorial({ step, onClose, onNext }) {
  const name = TUTORIAL[step], last = name === 'done';
  const phone = typeof window !== 'undefined' && window.matchMedia?.('(max-width: 768px)').matches;
  return (
    <div className="lesson" role="status" aria-live="polite">
      {!last && <div className="lesson-count">{t('lesson_count', { n: step + 1, of: TUTORIAL.length - 1 })}</div>}
      <p className="lesson-text">{t(`lesson_${name}${phone && PHONE.has(name) ? '_phone' : ''}`)}</p>
      <button type="button" className={`btn${last ? ' btn-primary' : ''}`} onClick={onClose}>{t(last ? 'lesson_finish' : 'lesson_skip')}</button>
      {TOUR_ONLY.has(name) && <button type="button" className="btn btn-primary" onClick={onNext}>{t('next')}</button>}
    </div>
  );
}
