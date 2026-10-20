import './Inspector.css';
import { expandChanges } from '../lib/heal.js';
import { useState, useEffect } from 'react';
import { BOX_STYLES, tableCells, VARIANTS, ADJUSTMENTS } from '../lib/engine.js';
import { FILLS, NOTE_MAX } from '../lib/shapes.js';
import { t, partLabel } from '../i18n.js';
import { COLORS } from '../lib/color.js';
import { BLENDS, partsInside } from '../lib/lines.js';
import { PIN_X, PIN_Y } from '../lib/layout.js';
import LayerList from './LayerList.jsx';
import CanvasPanel from './CanvasPanel.jsx';
import ScreenGrid from './ScreenGrid.jsx';
import InspectPanel from './InspectPanel.jsx';
import { canvasVars, knobValue } from '../lib/modes.js';
import ReviewList from './ReviewList.jsx';
import { screenTweaks } from '../lib/tweaks.js';

// A terminal color's name: the base name, with Bright for the second eight.
const colorName = i => (i < 8 ? t(`color_${i}`) : t('color_bright', { name: t(`color_${i - 8}`) }));

const LINE_CHARS = /[─│┌┐└┘├┤┬┴┼]/u;

// A table's rows and columns, each a minus, the count and a plus. The engine redraws the frame from the cells.
// A note pinned to the part, for you or an agent. It saves when you leave the field; Resolve clears it.
function NoteField({ element, onUpdate }) {
  const [draft, setDraft] = useState(element.note || '');
  useEffect(() => setDraft(element.note || ''), [element.id, element.note]);
  const save = () => { if (draft.trim() !== (element.note || '')) onUpdate(element.id, { note: draft }); };
  return (
    <div className="inspector-row inspector-note">
      <label className="inspector-key" htmlFor="note">{t('note')}</label>
      <textarea id="note" className="inspector-textarea" rows="2" value={draft} maxLength={NOTE_MAX}
        placeholder={t('note_hint')} onChange={e => setDraft(e.target.value)} onBlur={save} />
      {element.note && <button type="button" className="btn" onClick={() => onUpdate(element.id, { note: '' })}>{t('resolve')}</button>}
    </div>
  );
}

// A screen's live knobs: drag spacing or padding and the screen restacks; one style for every box in it.
function Tweaks({ element, elements, onUpdate }) {
  const vars = canvasVars(elements), names = Object.keys(vars), a = element.auto;
  const bound = { spacing: a?.gap, padding: a?.pad }; // a number, or the name of a canvas variable (modes.js)
  const now = a ? { spacing: knobValue(a.gap, vars), padding: knobValue(a.pad, vars) } : screenTweaks(elements, element);
  // With auto layout on, the knobs are the stack's own gap and padding, kept on the screen (layout.js).
  const tweak = changes => (a && changes.style === undefined
    ? onUpdate(element.id, { auto: { gap: changes.spacing ?? bound.spacing, pad: changes.padding ?? bound.padding } })
    : onUpdate(element.id, { tweak: changes }));
  return (
    <>
      <div className="inspector-row">
        <label className="inspector-key" htmlFor="auto-layout">{t('auto_layout')}</label>
        <input id="auto-layout" type="checkbox" className="inspector-switch" checked={Boolean(element.auto)}
          onChange={e => onUpdate(element.id, { auto: e.target.checked ? { gap: now.spacing, pad: now.padding } : null })} />
      </div>
      {['spacing', 'padding'].map(key => (
        <div key={key} className="inspector-row">
          <label className="inspector-key" htmlFor={`tweak-${key}`}>{t(key)}</label>
          <input id={`tweak-${key}`} className="inspector-range" type="range" min="0" max="8" value={now[key]}
            onChange={e => tweak({ [key]: Number(e.target.value) })} />
          <span className="inspector-value">{now[key]}</span>
          {a && names.length > 0 && (
            <select className="inspector-select" aria-label={t('use_var', { name: t(key) })} value={typeof bound[key] === 'string' ? bound[key] : ''}
              onChange={e => tweak({ [key]: e.target.value || now[key] })}>
              <option value="">{t('own_value')}</option>
              {names.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          )}
        </div>
      ))}
      <div className="inspector-row">
        <label className="inspector-key" htmlFor="tweak-style">{t('every_box')}</label>
        <select id="tweak-style" className="inspector-select" value={element.style || 'single'} onChange={e => tweak({ style: e.target.value })}>
          {BOX_STYLES.map(s => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>
    </>
  );
}

function TableSize({ element, onUpdate }) {
  const cells = tableCells(element.template);
  const width = Math.max(...cells.map(r => r.length));
  const set = next => onUpdate(element.id, { cells: next });
  const stepper = (key, count, less, more) => (
    <div className="inspector-row">
      <span className="inspector-key">{t(key)}</span>
      <span className="inspector-stepper inspector-value">
        <button type="button" aria-label={t(`remove_${key.slice(0, -1)}`)} disabled={count < 2} onClick={less}>−</button>
        <span>{count}</span>
        <button type="button" aria-label={t(`add_${key.slice(0, -1)}`)} onClick={more}>+</button>
      </span>
    </div>
  );
  return <>
    {stepper('rows', cells.length, () => set(cells.slice(0, -1)), () => set(expandChanges(element).cells))}
    {stepper('columns', width, () => set(cells.map(r => r.slice(0, width - 1))),
      () => set(cells.map((r, i) => [...r, ...Array(width - r.length).fill(''), i ? '' : t('head')])))}
  </>;
}

export default function Inspector({
  cursor,
  cols,
  rows,
  selectedPreset,
  selectedElement,
  onDeleteElement,
  onDuplicate,
  onReorder,
  pickedCount = 0,
  onGroup,
  onUpdateElement,
  onSaveToPalette,
  elements = [],
  system = null,
  onClearSystem,
  onRemoveParts,
  onSizes,
  onSwap,
  onCanvas,
  onGrid,
  onFixFocus,
  more = false,
  onMore,
  onVariations,
  onKeep,
  onSelectElement,
  symbolCount = 0,
  onSymbol,
  historyPanel,
  copyPanel,
  isOpen,
  onClose,
}) {
  // A beginner sees the part, Duplicate and Delete. Everything else waits under More, remembered per viewer.
  const toggle = e => { if (e.currentTarget.open !== more) onMore?.(e.currentTarget.open); };
  const el = selectedElement;
  const [historyOpen, setHistoryOpen] = useState(false), [copyOpen, setCopyOpen] = useState(false); // closed, the step list is not worked out at all
  return (
    <aside className={`inspector${isOpen ? ' is-open' : ''}`}>
      <div className="inspector-header">
        <span className="inspector-label">{t('inspector')}</span>
      </div>

      {!selectedPreset && !el && <p className="inspector-empty">{t('inspector_empty')}</p>}

      {selectedPreset && (
        <section className="inspector-section">
          <div className="inspector-section-title">{t('placing')}</div>
          <div className="inspector-row">
            <span className="inspector-key">{t('name')}</span>
            <span className="inspector-value inspector-value--green">{partLabel(selectedPreset)}</span>
          </div>
          <div className="inspector-preview">
            {selectedPreset.template.map((line, i) => (
              <div key={i} className="inspector-preview-line">{line}</div>
            ))}
          </div>
          <div className="inspector-hint">{t({ brush: 'drag_to_paint', eraser: 'drag_to_erase', gradient: 'drag_to_ramp', adjust: 'drag_to_adjust', marquee: 'drag_to_pick', wand: 'tap_to_pick' }[selectedPreset.id] ?? 'click_to_place')}</div>
        </section>
      )}

      {el && (
        <section className="inspector-section">
          <div className="inspector-section-title">{t('selected')}</div>
          <div className="inspector-row">
            <span className="inspector-key">{t('name')}</span>
            <span className="inspector-value inspector-value--green">{partLabel({ id: el.presetId, label: el.label })}</span>
          </div>
          {el.presetId === 'table' && <TableSize element={el} onUpdate={onUpdateElement} />}
          {el.presetId === 'adjust' && (
            <div className="inspector-row">
              <label className="inspector-key" htmlFor="adjust">{t('part_adjust')}</label>
              <select id="adjust" className="inspector-select" value={el.adjust ?? 'invert'} onChange={e => onUpdateElement(el.id, { adjust: e.target.value })}>
                {ADJUSTMENTS.map(a => <option key={a} value={a}>{t(`adjust_${a}`)}</option>)}
              </select>
            </div>
          )}
          {el.presetId === 'fill' && (
            <div className="inspector-row">
              <label className="inspector-key" htmlFor="fill">{t('fill')}</label>
              <select id="fill" className="inspector-select" value={[...el.template[0]][0]}
                onChange={e => onUpdateElement(el.id, { fill: e.target.value })}>
                {FILLS.map((ch, i) => <option key={ch} value={ch}>{ch} {t(['fill_light', 'fill_medium', 'fill_dark', 'fill_solid'][i])}</option>)}
              </select>
            </div>
          )}
          {el.presetId === 'list' && (
            <button type="button" className="btn history-take" onClick={() => onUpdateElement(el.id, expandChanges(el))}>{t('add_item')}</button>
          )}
          <div className="inspector-actions">
            <button className="btn" onClick={() => onDuplicate(el.id)}>{t('duplicate')}</button>
            <button className="btn btn-danger" onClick={() => onDeleteElement(el.id)}>{t('delete')}</button>
          </div>
          <details className="inspector-more" open={more} onToggle={toggle}>
            <summary>{t('more')}</summary>
            <InspectPanel el={el} elements={elements} />
            <NoteField element={el} onUpdate={onUpdateElement} />
            {el.size && (
              <div className="inspector-row">
                <span className="inspector-key">{t('size_label')}</span>
                <span className="inspector-value">{t(`size_${el.size.toLowerCase()}`)}</span>
              </div>
            )}
            {el.presetId === 'screen' && <><Tweaks element={el} elements={elements} onUpdate={onUpdateElement} /><ScreenGrid element={el} onUpdate={onUpdateElement} onEverywhere={onGrid} /></>}
            {el.presetId === 'screen' && (
              <div className="inspector-actions">
                {onVariations && <button className="btn" onClick={() => onVariations(el.id)}>{t('show_variations')}</button>}
                {onSizes && !el.size && <button className="btn" onClick={() => onSizes(el.id)}>{t('make_sizes')}</button>}
                {onKeep && el.take && elements.some(x => x.take === el.take && x.id !== el.id) && <button className="btn" onClick={() => onKeep(el.id)}>{t('keep_this')}</button>}
              </div>
            )}
            {LINE_CHARS.test(el.template.join('')) && (
              <div className="inspector-row">
                <label className="inspector-key" htmlFor="box-style">{t('box_style')}</label>
                <select id="box-style" className="inspector-select" value={el.style || 'single'}
                  onChange={e => onUpdateElement(el.id, { style: e.target.value })}>
                  {BOX_STYLES.map(s => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
            )}
            {symbolCount > 0 && (
              <div className="inspector-row">
                <span className="inspector-key">{t('symbol')}</span>
                <span className="inspector-value">{t('symbol_uses', { n: symbolCount })}</span>
              </div>
            )}
            {/* Properties (shapes.js): a copy keeps its own words or box style, or swaps to another symbol. */}
            {symbolCount > 1 && ['text', 'style'].map(key => (
              <div key={key} className="inspector-row">
                <label className="inspector-key" htmlFor={`own-${key}`}>{t(`own_${key}`)}</label>
                <input id={`own-${key}`} type="checkbox" className="inspector-switch" checked={(el.own ?? []).includes(key)}
                  onChange={e => onUpdateElement(el.id, { own: e.target.checked ? [...(el.own ?? []), key] : (el.own ?? []).filter(k => k !== key) })} />
              </div>
            ))}
            {symbolCount > 0 && onSwap && (() => {
              const others = [...new Map(elements.filter(x => x.symbol && x.symbol !== el.symbol).map(x => [x.symbol, x])).values()];
              return others.length > 0 && (
                <div className="inspector-row">
                  <label className="inspector-key" htmlFor="swap">{t('swap_symbol')}</label>
                  <select id="swap" className="inspector-select" value="" onChange={e => e.target.value && onSwap(el.id, e.target.value)}>
                    <option value="">{t('swap_pick')}</option>
                    {others.map(x => <option key={x.symbol} value={x.symbol}>{x.text?.split('\n')[0] || x.template.join(' ').trim().slice(0, 24) || partLabel({ id: x.presetId, label: x.label })}</option>)}
                  </select>
                </div>
              );
            })()}
            {el.presetId !== 'adjust' && <>
            <div className="inspector-row">
              <label className="inspector-key" htmlFor="variant">{t('state')}</label>
              <select id="variant" className="inspector-select" value={el.variant || 'default'}
                onChange={e => onUpdateElement(el.id, { variant: e.target.value })}>
                {VARIANTS.map(v => <option key={v} value={v}>{t(`variant_${v}`)}</option>)}
              </select>
            </div>
            {['ink', 'paper'].map(key => (
              <div className="inspector-row" key={key}>
                <label className="inspector-key" htmlFor={key}>{t(`color_${key}`)}</label>
                <select id={key} className="inspector-select" value={el[key] ?? ''}
                  onChange={e => onUpdateElement(el.id, { [key]: e.target.value === '' ? null : Number(e.target.value) })}>
                  <option value="">{t('color_none')}</option>
                  {COLORS.map((c, i) => <option key={i} value={i}>{colorName(i)}</option>)}
                </select>
              </div>
            ))}
            <div className="inspector-row">
              <label className="inspector-key" htmlFor="blend">{t('blend')}</label>
              <select id="blend" className="inspector-select" value={el.blend ?? 'join'} onChange={e => onUpdateElement(el.id, { blend: e.target.value })}>
                {BLENDS.map(b => <option key={b} value={b}>{t(`blend_${b}`)}</option>)}
              </select>
            </div>
            {/* Constraints (layout.js): how a part on a screen follows it when the screen is resized. */}
            {el.presetId !== 'screen' && elements.some(s => s.presetId === 'screen' && partsInside([el], s).length) && ['x', 'y'].map(axis => (
              <div key={axis} className="inspector-row">
                <label className="inspector-key" htmlFor={`pin-${axis}`}>{t(`pin_${axis}`)}</label>
                <select id={`pin-${axis}`} className="inspector-select" value={el.pin?.[axis] ?? (axis === 'x' ? 'left' : 'top')}
                  onChange={e => onUpdateElement(el.id, { pin: { ...el.pin, [axis]: e.target.value } })}>
                  {(axis === 'x' ? PIN_X : PIN_Y).map(v => <option key={v} value={v}>{t(`pin_${v === 'both' ? `both_${axis}` : v}`)}</option>)}
                </select>
              </div>
            ))}
            {/* Masks (mask.js): crop cells off each edge, or show the part only inside another one. */}
            <div className="inspector-row">
              <span className="inspector-key">{t('mask_crop')}</span>
              <span className="inspector-mask">{['top', 'right', 'bottom', 'left'].map(k => (
                <input key={k} type="number" min="0" max="500" className="inspector-num" aria-label={t(`mask_${k}`)} title={t(`mask_${k}`)}
                  value={el.mask?.[k] ?? 0} onChange={e => onUpdateElement(el.id, { mask: { ...el.mask, [k]: e.target.value } })} />
              ))}</span>
            </div>
            <div className="inspector-row">
              <label className="inspector-key" htmlFor="clip">{t('clip_to')}</label>
              <select id="clip" className="inspector-select" value={el.clip ?? ''} onChange={e => onUpdateElement(el.id, { clip: e.target.value || null })}>
                <option value="">{t('color_none')}</option>
                {elements.filter(o => o.id !== el.id && o.presetId !== 'adjust').map(o => <option key={o.id} value={o.id}>{o.text?.split('\n')[0] || partLabel({ id: o.presetId, label: o.label })}</option>)}
              </select>
            </div>
            <div className="inspector-row">
              <label className="inspector-key" htmlFor="highlight">{t('highlight')}</label>
              <input id="highlight" type="checkbox" className="inspector-switch" checked={el.accent === true}
                onChange={e => onUpdateElement(el.id, { accent: e.target.checked })} />
            </div>
            </>}
            <div className="inspector-actions">
              {pickedCount >= 2 && <button className="btn" onClick={() => onGroup(false)}>{t('group_n', { n: pickedCount })}</button>}
              {el.group && <button className="btn" onClick={() => onGroup(true)}>{t('ungroup')}</button>}
              {onSymbol && <button className="btn" onClick={() => onSymbol(symbolCount > 0)}>{t(symbolCount > 0 ? 'detach' : 'make_symbol')}</button>}
              {onSaveToPalette && <button className="btn" onClick={() => onSaveToPalette(el)}>{t('save_to_palette')}</button>}
              <button className="btn" onClick={() => onReorder(el.id, 'front')}>{t('to_front')}</button>
              <button className="btn" onClick={() => onReorder(el.id, 'back')}>{t('to_back')}</button>
            </div>
            <div className="inspector-hint">{t('keys_hint')}</div>
          </details>
        </section>
      )}

      {historyPanel && (
        <section className="inspector-section">
          <details className="inspector-more" open={historyOpen} onToggle={e => setHistoryOpen(e.currentTarget.open)}>
            <summary>{t('history')}</summary>
            {historyOpen && historyPanel}
          </details>
        </section>
      )}

      {copyPanel && elements.length > 0 && (
        <section className="inspector-section">
          <details className="inspector-more" open={copyOpen} onToggle={e => setCopyOpen(e.currentTarget.open)}>
            <summary>{t('copy_deck')}</summary>
            {copyOpen && copyPanel}
          </details>
        </section>
      )}

      {elements.length > 0 && (
        <section className="inspector-section">
        <details className="inspector-more" open={more} onToggle={toggle}>
          <summary>{t('layers')}</summary>
          <LayerList elements={elements} selectedId={el?.id} onSelect={onSelectElement}
            onUpdate={onUpdateElement} onReorder={onReorder} />
          <ReviewList elements={elements} cols={cols} rows={rows} system={system} onClearSystem={onClearSystem} onSelect={onSelectElement} onRemove={onRemoveParts} onFixFocus={onFixFocus} />
          <CanvasPanel elements={elements} cursor={cursor} cols={cols} rows={rows} onCanvas={onCanvas} />
        </details>
        </section>
      )}

    </aside>
  );
}
