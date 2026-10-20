import { useState, useEffect } from 'react';
import { critique } from '../lib/critique.js';
import { t, partLabel } from '../i18n.js';

// Review: run the critique and list what to fix. Tap an issue to select its part. The list clears on any edit,
// so it never shows a fixed problem.
export default function ReviewList({ elements, cols, rows, system, onClearSystem, onSelect, onRemove, onFixFocus }) {
  const [issues, setIssues] = useState(null);
  useEffect(() => setIssues(null), [elements, system]);
  if (!elements.length) return null;
  const distractions = (issues ?? []).filter(i => i.rule === 'distraction').map(i => i.id);
  const name = id => { const el = elements.find(e => e.id === id); return el ? partLabel({ id: el.presetId, label: el.label }) : ''; };
  return (
    <section className="inspector-section">
      <div className="inspector-section-title">{t('review')}</div>
      {system && (
        <div className="inspector-row review-system">
          <span className="inspector-key">{t('design_system')}</span>
          <span className="inspector-value">{system.name}</span>
          <button type="button" className="btn review-clear" aria-label={t('remove_system', { name: system.name })} onClick={onClearSystem}>×</button>
        </div>
      )}
      <div className="inspector-row">
        <button type="button" className="btn" onClick={() => setIssues(critique(elements, cols, rows, system))}>{t('review_run')}</button>
        {issues && <span className="inspector-value">{issues.length ? issues.length : t('review_clean')}</span>}
      </div>
      {issues?.map((i, k) => (
        <div key={k} className="inspector-row review-row">
          <button type="button" disabled={!i.id} onClick={() => onSelect(i.id)}>
            <span className={`review-dot review-dot--${i.severity}`} aria-hidden="true" />
            <span>{t(`crit_${i.rule}${i.kind ? `_${i.kind}` : ''}`, { part: name(i.id), other: name(i.otherId), word: i.word, note: i.note, style: i.style })}</span>
          </button>
        </div>
      ))}
      {onFixFocus && issues?.some(i => i.rule === 'focus_order') && (
        <button type="button" className="btn history-take" onClick={onFixFocus}>{t('fix_focus_order')}</button>
      )}
      {onRemove && distractions.length > 0 && (
        <button type="button" className="btn history-take" onClick={() => onRemove(distractions)}>{t('remove_distractions', { n: distractions.length })}</button>
      )}
    </section>
  );
}
