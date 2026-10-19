import { useMemo } from 'react';
import { t, partLabel } from '../i18n.js';
import { timeline } from '../lib/history.js';
import { recordAction } from '../lib/actions.js';

// The History panel: every step by name, newest first. Tap one to jump there; steps after it stay redoable
// (dimmed) until the next edit. Snapshots are named copies of the canvas that travel with the project file.
// Actions record the steps made after Record and replay them on whatever is selected.
const RESTORE = <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 4v4h4M4.6 12a6 6 0 1 0 .9-6L4 8" /></svg>;
const PLAY = <svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M6 4.5v11l9-5.5z" /></svg>;
const partName = el => el.text?.split('\n')[0] || partLabel({ id: el.presetId, label: el.label });

export function stepLabel(s) {
  if (['start', 'reorder', 'replace', 'clear'].includes(s.kind)) return t(`step_${s.kind}`);
  if (s.kind === 'change' || s.count > 1) return t(`step_${s.kind}_n`, { n: s.count });
  if (!s.el) return t('step_edit_canvas');
  return t(`step_${s.kind}`, { part: partName(s.el) });
}

export default function HistoryList({ state, dispatch }) {
  const at = state.history.length;
  const steps = useMemo(() => timeline(state).map((s, i) => ({ ...s, i })).reverse(), [state.history, state.elements, state.future]); // eslint-disable-line react-hooks/exhaustive-deps
  const snapshots = state.snapshots ?? [];
  const actions = state.actions ?? [];
  const recording = state.recording != null;
  const recorded = useMemo(() => (recording ? recordAction(state, state.recording, '').steps.length : 0), [recording, state.history, state.elements]); // eslint-disable-line react-hooks/exhaustive-deps
  const canPlay = Boolean(state.picked?.length || state.selectedId);
  return (
    <>
      <section className="inspector-section">
        <div className="inspector-section-title">{t('snapshots')}</div>
        {snapshots.map((s, i) => (
          <div key={`${i}-${s.name}`} className="inspector-row layer-row">
            <input className="layer-name history-name" aria-label={t('snapshot_name')} defaultValue={s.name}
              onBlur={e => e.target.value !== s.name && dispatch({ type: 'RENAME_SNAPSHOT', index: i, name: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()} />
            <span className="layer-tools">
              <button type="button" aria-label={t('restore')} title={t('restore')} onClick={() => dispatch({ type: 'RESTORE_SNAPSHOT', index: i })}>{RESTORE}</button>
              <button type="button" aria-label={t('delete_snapshot')} onClick={() => dispatch({ type: 'DELETE_SNAPSHOT', index: i })}>×</button>
            </span>
          </div>
        ))}
        <button type="button" className="btn history-take" onClick={() => dispatch({ type: 'SNAPSHOT' })}>{t('take_snapshot')}</button>
      </section>
      <section className="inspector-section">
        <div className="inspector-section-title">{t('actions')}</div>
        {actions.map((a, i) => (
          <div key={`${i}-${a.name}`} className="inspector-row layer-row">
            <input className="layer-name history-name" aria-label={t('action_name')} defaultValue={a.name}
              onBlur={e => e.target.value !== a.name && dispatch({ type: 'RENAME_ACTION', index: i, name: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()} />
            <span className="layer-tools">
              <button type="button" aria-label={t('play_action')} title={canPlay ? t('play_action') : t('play_needs_selection')} disabled={!canPlay}
                onClick={() => dispatch({ type: 'PLAY_ACTION', index: i })}>{PLAY}</button>
              <button type="button" aria-label={t('delete_action')} onClick={() => dispatch({ type: 'DELETE_ACTION', index: i })}>×</button>
            </span>
          </div>
        ))}
        <button type="button" className={`btn history-take${recording ? ' is-recording' : ''}`} aria-pressed={recording}
          onClick={() => dispatch({ type: recording ? 'STOP_ACTION' : 'RECORD_ACTION' })}>
          {recording ? t('stop_recording', { n: recorded }) : t('record_action')}
        </button>
      </section>
      <section className="inspector-section">
        <div className="inspector-section-title">{t('steps')}</div>
        {steps.map(s => (
          <div key={s.i} className={`inspector-row layer-row${s.i === at ? ' is-selected' : ''}${s.i > at ? ' is-hidden' : ''}`}>
            <button type="button" className="layer-name" aria-current={s.i === at ? 'step' : undefined}
              onClick={() => dispatch({ type: 'GO_TO_STEP', index: s.i })}>{stepLabel(s)}</button>
            {s.i === at && <span className="history-check" aria-hidden="true">✓</span>}
          </div>
        ))}
      </section>
    </>
  );
}
