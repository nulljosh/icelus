import { useState } from 'react';
import { t } from '../i18n.js';
import { partSpacing } from '../lib/inspect.js';
import { partSnippet } from '../lib/code.js';

// Inspect (v50): where the part sits, its size, the gap to its neighbours on each side, and its own code.
export default function InspectPanel({ el, elements }) {
  const [format, setFormat] = useState('react'), [copied, setCopied] = useState(false);
  const gap = partSpacing(elements, el.id), code = partSnippet(el, format);
  const side = v => (v === null ? '–' : v);
  const copy = async () => { try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* no clipboard */ } };
  return (
    <>
      <div className="inspector-row"><span className="inspector-key">{t('position')}</span><span className="inspector-value">{el.col}, {el.row}</span></div>
      <div className="inspector-row"><span className="inspector-key">{t('size')}</span><span className="inspector-value">{el.width}×{el.height}</span></div>
      <div className="inspector-row">
        <span className="inspector-key">{t('spacing')}</span>
        <span className="inspector-value" aria-label={t('spacing_sides', { left: side(gap.left), right: side(gap.right), top: side(gap.top), bottom: side(gap.bottom) })}>
          ←{side(gap.left)} →{side(gap.right)} ↑{side(gap.top)} ↓{side(gap.bottom)}
        </span>
      </div>
      <div className="inspector-row">
        <label className="inspector-key" htmlFor="inspect-code">{t('code')}</label>
        <select id="inspect-code" className="inspector-select" value={format} onChange={e => setFormat(e.target.value)}>
          <option value="react">React</option>
          <option value="swiftui">SwiftUI</option>
        </select>
      </div>
      <pre className="inspector-code">{code}</pre>
      <button type="button" className="btn history-take" onClick={copy}>{copied ? t('copied_code') : t('copy_code')}</button>
    </>
  );
}
