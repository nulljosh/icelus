import { useState, useRef, useEffect } from 'react';
import { t } from '../i18n.js';
import './ChatPanel.css';

// Describe it: say what a screen is for and a model draws it. With a screen picked, say what to change and
// it redraws that screen. Each answer is typed lines the app parses, so it lands like any screen template.
export default function ChatPanel({ onClose, onScreen, current, currentName }) {
  const [turns, setTurns] = useState([]); // [{ role, content }], content is typed lines for the assistant
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const listRef = useRef(null);
  useEffect(() => { listRef.current?.scrollTo(0, listRef.current.scrollHeight); }, [turns, busy]);

  async function send(e) {
    e.preventDefault();
    const message = draft.trim();
    if (!message || busy) return;
    setBusy(true); setProblem('');
    const history = turns.slice(-6);
    setTurns(ts => [...ts, { role: 'user', content: message }]);
    setDraft('');
    try {
      const res = await fetch('/api/describe', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message, history, current: current ?? '' }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.source) throw new Error(data.error || t('describe_failed'));
      setTurns(ts => [...ts, { role: 'assistant', content: data.source }]);
      onScreen(data.source);
    } catch (err) {
      setProblem(err.message || t('describe_failed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="chat" aria-label={t('describe_title')}>
      <header className="chat-head">
        <h2>{t('describe_title')}</h2>
        <button type="button" className="btn" onClick={onClose}>{t('done')}</button>
      </header>
      <div className="chat-list" ref={listRef} aria-live="polite">
        {!turns.length && <p className="chat-hint">{t('describe_hint')}</p>}
        {turns.map((turn, i) => (
          turn.role === 'user'
            ? <p key={i} className="chat-msg chat-you">{turn.content}</p>
            : <div key={i} className="chat-msg chat-icelus"><span>{t('describe_drew')}</span><pre>{turn.content}</pre></div>
        ))}
        {busy && <p className="chat-msg chat-icelus chat-busy">{t('describe_busy')}</p>}
        {problem && <p className="chat-problem" role="alert">{problem}</p>}
      </div>
      <form className="chat-form" onSubmit={send}>
        <p className="chat-target">{currentName ? t('describe_changing', { name: currentName }) : t('describe_new')}</p>
        <textarea id="chat-input" className="chat-input" rows={3} maxLength={2000} value={draft} placeholder={t('describe_placeholder')}
          onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) send(e); }} aria-label={t('describe_title')} />
        <button type="submit" className="btn btn-primary" disabled={busy || !draft.trim()}>{t('send')}</button>
      </form>
    </aside>
  );
}
