import { memo } from 'react';
import { realPart } from '../lib/real.js';
import { COLORS } from '../lib/color.js';
import { shownBox } from '../lib/mask.js';
import { createElement } from '../lib/engine.js';
import { gridColumns } from '../lib/grids.js';
import { opensScreen } from '../lib/hotspots.js';
import './RealLayer.css';

// "New here? [Create account]": a bracketed action inside a line of words reads as a link, not brackets.
const linked = text => text.split(/\[([^[\]]{2,})\]/).map((s, i) => (i % 2 ? <span key={i} className="real-link">{s.trim()}</span> : s));

// The real look: every part with a real twin drawn as an actual control, placed on the same grid the
// canvas uses, so selecting, dragging and resizing work unchanged (this layer never takes a click).
function Part({ el, charW, rowH, byId }) {
  const p = realPart(el);
  if (!p) return null;
  const b = shownBox(el, byId); // a mask or clip crops the control, it never changes it
  const at = (col, row) => ({ left: col * charW, top: row * rowH });
  const style = {
    left: el.col * charW, top: el.row * rowH, width: el.width * charW, height: el.height * rowH,
    ...(b && { clipPath: `inset(${Math.max(0, b.r0 - el.row) * rowH}px ${Math.max(0, el.col + el.width - b.c1) * charW}px ${Math.max(0, el.row + el.height - b.r1) * rowH}px ${Math.max(0, b.c0 - el.col) * charW}px)` }),
    ...(el.ink !== undefined && { '--ink': COLORS[el.ink]?.hex }), ...(el.paper !== undefined && { '--paper': COLORS[el.paper]?.hex }),
  };
  // A one-row control stands a little taller than its row, the way a real field or button does.
  const cls = `real real-${p.kind}${el.accent ? ' is-accent' : ''}${el.variant ? ` is-${el.variant}` : ''}${el.height === 1 ? ' is-row' : ''}`;
  const lines = rows => rows.map(r => <span key={r.row} className={`real-line${r.button ? ' is-button' : ''}`} style={at(r.col, r.row)}>{r.button ? r.text : linked(r.text)}</span>);
  switch (p.kind) {
    case 'screen': return ( // with its column grid (grids.js) as faint bands on the artboard
      <div className={cls} style={style}><span className="real-frame-name">{p.title}</span>
        {gridColumns(el).map(g => <span key={g.col} className="real-band" style={{ left: (g.col - el.col) * charW, top: rowH, width: g.width * charW, height: (el.height - 2) * rowH }} />)}
      </div>
    );
    case 'button': return <div className={cls} style={style}>{p.label}</div>;
    case 'input': return <div className={cls} style={style}>{p.search && <span className="real-glass" aria-hidden="true" />}<span>{p.placeholder}</span></div>;
    case 'select': return <div className={cls} style={style}><span>{p.value}</span><span className="real-chevron" aria-hidden="true" /></div>;
    case 'checkbox': case 'radio': return <div className={cls} style={style}><span className={`real-mark${p.on ? ' is-on' : ''}`} />{p.label}</div>;
    case 'toggle': return <div className={cls} style={style}><span className={`real-switch${p.on ? ' is-on' : ''}`} /></div>;
    case 'slider': case 'progress': return <div className={cls} style={style}><span className="real-track"><span style={{ width: `${p.value * 100}%` }} /></span></div>;
    case 'divider': return <div className={cls} style={style}><hr /></div>;
    case 'heading': return <div className={cls} style={style}>{p.text}</div>;
    case 'text': return <div className={cls} style={style}>{p.lines.map((l, i) => <span key={i} className="real-line" style={at(0, i)}>{linked(l)}</span>)}</div>;
    case 'avatar': return <div className={cls} style={style}><span>{p.initials}</span></div>;
    case 'image': return <div className={cls} style={style}><span className="real-photo" aria-hidden="true" /></div>;
    case 'skeleton': return <div className={cls} style={style} />;
    case 'segmented': case 'tags': return <div className={cls} style={style}>{p.items.map((s, i) => <span key={i} className={i === p.at ? 'is-on' : undefined}>{s}</span>)}</div>;
    case 'tabs': return ( // a tab strip on the first two rows, the open tab's content in a card under it
      <div className={cls} style={style}>
        <div className="real-tabstrip" style={{ height: 2 * rowH }}>{p.items.map((s, i) => <span key={i} className={i === p.at ? 'is-on' : undefined}>{s}</span>)}</div>
        <div className="real-tabbody" style={{ top: 2 * rowH }} />{lines(p.rows)}
      </div>
    );
    case 'table': return (
      <div className={cls} style={{ ...style, gridTemplateColumns: `repeat(${p.head.length}, 1fr)` }}>
        {p.head.map((c, i) => <b key={`h${i}`}>{c}</b>)}
        {p.body.flatMap((r, j) => r.map((c, i) => <span key={`${j}-${i}`}>{c}</span>))}
      </div>
    );
    case 'box': return <div className={cls} style={style}>{lines(p.rows)}</div>;
    default: return <div className={cls} style={style}>{lines(p.rows)}</div>;
  }
}

// What sits over the artboards, so it is never hidden under one: note dots, outlines round picked parts, and
// hotspots (hotspots.js), a ring on each one's bottom right and a dashed link to its screen when picked.
function Marks({ elements, picked, charW, rowH }) {
  const shown = elements.filter(el => !el.hidden);
  const spots = shown.flatMap(el => { const to = opensScreen(elements, el); return to ? [[el, to]] : []; });
  const notes = shown.filter(el => el.note), boxes = shown.filter(el => picked.includes(el.id) && el.presetId !== 'screen');
  if (!spots.length && !notes.length && !boxes.length) return null;
  return (
    <svg className="real-links">
      {boxes.map(el => <rect key={`b${el.id}`} className="real-pick" x={el.col * charW - 2} y={el.row * rowH - 2} width={el.width * charW + 4} height={el.height * rowH + 4} rx="4" />)}
      {notes.map(el => <circle key={`n${el.id}`} className="real-note" cx={(el.col + el.width) * charW} cy={el.row * rowH} r="4" />)}
      {spots.map(([el, to]) => {
        const x = (el.col + el.width) * charW, y = (el.row + el.height) * rowH;
        return (
          <g key={el.id}>
            {picked.includes(el.id) && <line x1={x} y1={y} x2={to.col * charW} y2={(to.row + 0.5) * rowH} strokeDasharray="4 3" />}
            <circle cx={x} cy={y} r="3.5" />
          </g>
        );
      })}
    </svg>
  );
}

export default memo(function RealLayer({ elements, charW, rowH, fontSize, picked = [] }) {
  const byId = new Map(elements.map(el => [el.id, el]));
  return (
    <div className="real-layer" style={{ '--real-size': `${Math.round(fontSize * 0.93)}px`, '--row': `${rowH}px` }} aria-hidden="true">
      {elements.map(el => (el.hidden ? null : <Part key={el.id} el={el} charW={charW} rowH={rowH} byId={byId} />))}
      <Marks elements={elements} picked={picked} charW={charW} rowH={rowH} />
    </div>
  );
});

// The parts list shows each part as its real control, drawn small on the same grid and scaled to fit the row.
const THUMB_W = 96, THUMB_H = 28, CHAR_W = 6, ROW_H = 14;
/** A preset drawn as its real control for the parts list, or null when it keeps its characters. */
export function RealThumb({ preset }) {
  const el = createElement(preset, 0, 0);
  if (!el.template?.length || !realPart(el)) return null;
  const w = el.width * CHAR_W, h = el.height * ROW_H, scale = Math.min(1, THUMB_W / w, THUMB_H / h);
  return (
    <span className="real-thumb" aria-hidden="true">
      <span className="real-layer" style={{ '--real-size': '11px', '--row': `${ROW_H}px`, width: w, height: h, top: (THUMB_H - h * scale) / 2, transform: `scale(${scale})` }}>
        <Part el={el} charW={CHAR_W} rowH={ROW_H} byId={new Map()} />
      </span>
    </span>
  );
}
