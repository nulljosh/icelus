import { useState } from 'react';
import { t, LANGUAGES, language } from '../i18n.js';
import { copyEntries } from '../lib/copydeck.js';

const names = (() => { try { return new Intl.DisplayNames([language], { type: 'language' }); } catch { return null; } })();
const nameOf = code => names?.of(code) ?? code;

// Copy deck (v52): every run of words on the canvas in one list. Edit one and only its characters change; Translate
// sends them all to the model in one go (POST /api/translate), one step of undo.
export default function CopyDeck({ elements, onEdit }) {
  const entries = copyEntries(elements);
  const [to, setTo] = useState(language === 'fr' ? 'es' : 'fr'), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const translate = async () => {
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/translate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ strings: entries.map(e => e.text), to }) });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.strings)) throw new Error(data.error || t('translate_failed'));
      onEdit(Object.fromEntries(entries.map((e, i) => [e.key, data.strings[i]])));
    } catch (err) { setError(err.message || t('translate_failed')); }
    setBusy(false);
  };
  if (!entries.length) return <p className="inspector-empty">{t('copy_empty')}</p>;
  return (
    <section className="inspector-section">
      <div className="inspector-row">
        <label className="inspector-key" htmlFor="copy-to">{t('translate_to')}</label>
        <select id="copy-to" className="inspector-select" style={{ maxWidth: "60%" }} value={to} onChange={e => setTo(e.target.value)}>
          {LANGUAGES.map(l => <option key={l} value={l}>{nameOf(l)}</option>)}
        </select>
      </div>
      <button type="button" className="btn history-take" disabled={busy} onClick={translate}>{busy ? t('translating') : t('translate')}</button>
      {error && <p className="inspector-hint" role="alert">{error}</p>}
      {entries.map(e => (
        <div key={`${e.id}-${e.key}`} className="inspector-row">
          <label className="inspector-key" htmlFor={`copy-${e.key}`}>{e.label}</label>
          <input id={`copy-${e.key}`} className="inspector-input" defaultValue={e.text} maxLength={200}
            onBlur={ev => ev.target.value !== e.text && onEdit({ [e.key]: ev.target.value })}
            onKeyDown={ev => ev.key === 'Enter' && ev.currentTarget.blur()} />
        </div>
      ))}
    </section>
  );
}
