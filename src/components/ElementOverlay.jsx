import { useRef, useState } from 'react';
import { t } from '../i18n.js';
import { tableText, CHARTS, SIZED } from '../lib/engine.js';

const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
export default function ElementOverlay({ element, charWidth, rowHeight = 20, cols, rows, onUpdate, editing, onEdit }) {
  const drag = useRef(null);
  const [preview, setPreview] = useState(null);
  // A banner edits its words, not its letters; a table its cells as `a | b` rows; a chart its numbers.| b` rows.
  const source = element.text ?? (element.presetId === 'table' ? tableText(element.template)
    : CHARTS.includes(element.presetId) ? (element.template.join(' ').match(/-?\d+(\.\d+)?/g) || []).join(' ')
    : element.template.join('\n'));
  const [text, setText] = useState(source);
  const box = preview || element;
  function move(e) {
    if (!drag.current) return;
    const {x, y, edge} = drag.current;
    const dx = Math.round((e.clientX - x) / charWidth), dy = Math.round((e.clientY - y) / rowHeight);
    let left = element.col, top = element.row, right = left + element.width, bottom = top + element.height;
    if (edge.includes('w')) left = Math.max(0, Math.min(right - 2, left + dx));
    if (edge.includes('e')) right = Math.min(cols, Math.max(left + 2, right + dx));
    if (edge.includes('n')) top = Math.max(0, Math.min(bottom - 1, top + dy));
    if (edge.includes('s')) bottom = Math.min(rows, Math.max(top + 1, bottom + dy));
    drag.current.box = {col:left, row:top, width:right-left, height:bottom-top};
    setPreview(drag.current.box);
  }
  function finish() {
    const next = drag.current?.box;
    drag.current = null; setPreview(null);
    if (next && Object.keys(next).some(key => next[key] !== element[key])) onUpdate(element.id, next);
  }
  return <div className="element-overlay" style={{left:box.col*charWidth, top:box.row*rowHeight, width:box.width*charWidth, height:box.height*rowHeight}}>
    {!editing && <>
      {!SIZED.includes(element.presetId) && (element.height === 1 ? ['e', 'w'] : HANDLES).map(edge => <button key={edge} className={`resize-handle handle-${edge}`} aria-label={`Resize ${edge}`} style={{cursor:`${edge}-resize`}}
        onPointerDown={e => {e.preventDefault(); e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); drag.current={x:e.clientX,y:e.clientY,edge};}}
        onPointerMove={move} onPointerUp={finish} onPointerCancel={() => {drag.current=null;setPreview(null);}} />)}
      {element.presetId !== 'adjust' && <button className="element-edit btn" onClick={() => {setText(source);onEdit(true);}}>{t('edit_text')}</button>}
    </>}
    {editing && <form className="element-editor" onSubmit={e => {e.preventDefault();onUpdate(element.id,{text});onEdit(false);}}
      onKeyDown={e => {e.stopPropagation();if(e.key==='Escape'){e.preventDefault();onEdit(false);}if((e.metaKey||e.ctrlKey)&&e.key==='Enter'){e.preventDefault();onUpdate(element.id,{text});onEdit(false);}}}>
      <textarea autoFocus aria-label={t('element_text')} value={text} onChange={e=>setText(e.target.value)} spellCheck={false}/>
      <div><button className="btn" type="submit">{t('save')}</button><button className="btn" type="button" onClick={()=>onEdit(false)}>{t('cancel')}</button></div>
    </form>}
  </div>;
}
