import { t } from '../i18n.js';

// Show and hide per copy (lines.js hiddenLines): one checkbox per line of a symbol copy.
export default function ShowLines({ el, onUpdate }) {
  if (el.template.length < 2) return null;
  const hide = el.hideLines ?? [];
  return (
    <div className="inspector-row">
      <span className="inspector-key">{t('show_lines')}</span>
      <span className="inspector-value">
        {el.template.map((line, i) => {
          const hidden = hide.includes(i), label = line.replace(/[│┃║┌┐└┘╭╮╰╯┏┓┗┛─━═]/g, ' ').trim() || `${i + 1}`;
          return (
            <label key={i} className="inspector-check">
              <input type="checkbox" checked={!hidden} onChange={() => onUpdate(el.id, { hideLines: hidden ? hide.filter(x => x !== i) : [...hide, i] })} />
              {' '}{label.slice(0, 24)}
            </label>
          );
        })}
      </span>
    </div>
  );
}
