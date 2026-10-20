// Hand it to Claude Code: a project as one Markdown brief an agent can build from, Claude Design's handoff for
// a text grid. Each screen comes drawn, as typed lines and as a parts list, then the flow between screens, the
// states, the open notes and what Review still flags. The project file rides at the end, so the agent can keep
// editing it over MCP. Ported in ios/App/Handoff.swift.
import { renderElements, gridToText, trimText, serializeProject } from './engine.js';
import { partsInside } from './lines.js';
import { flowLines } from './hotspots.js';
import { toSketch } from './syntax.js';
import { critique, critiqueMessage } from './critique.js';

const cell = s => String(s ?? '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
const words = el => cell(el.text ?? el.template.join(' ').replace(/[─│┌┐└┘├┤┬┴┼╭╮╰╯━┃┏┓┗┛═║╔╗╚╝\[\]()]+|_{2,}/g, ' '));

export function handoff(elements, cols, rows, name = 'Icelus project') {
  const shown = elements.filter(el => !el.hidden);
  const grid = renderElements(shown, cols, rows);
  const screens = shown.filter(el => el.presetId === 'screen').sort((a, b) => a.row - b.row || a.col - b.col);
  const groups = screens.length ? screens.map(s => ({ title: s.text || 'Screen', frame: s, parts: partsInside(shown, s) }))
    : [{ title: name, frame: null, parts: shown }];
  const out = [`# ${name}: build brief`, '',
    'Build these screens as a working app. Each screen is drawn in plain text below: match its layout, its order and its words. ' +
    'The parts list gives each part\'s kind and where it sits on the character grid (column, row, width by height). ' +
    'Arrows in the Flow section are navigation; the part in parentheses is what you press. States are how a part looks pressed, disabled or in error. ' +
    'Notes are open requests from the designer; do them. Use the project file at the end with the Icelus MCP server ' +
    '(https://icelus.jaybulb.com/mcp) if you need to change the design.', ''];
  const flow = flowLines(shown);
  if (flow.length) out.push('## Flow', '', ...flow, '');
  for (const g of groups) {
    const f = g.frame;
    const text = f ? grid.slice(f.row, f.row + f.height).map(r => r.slice(f.col, f.col + f.width).join('')).join('\n') : gridToText(grid);
    const parts = g.parts.filter(el => el.presetId !== 'line').sort((a, b) => a.row - b.row || a.col - b.col);
    out.push(`## ${g.title}`, '', '```', trimText(text), '```', '');
    const { source } = toSketch(parts);
    if (source.trim()) out.push('Typed lines (the Icelus syntax):', '', '```', source.trim(), '```', '');
    if (parts.length) {
      out.push('| Part | Words | Where | State |', '|---|---|---|---|');
      for (const el of parts) out.push(`| ${cell(el.label)} | ${words(el) || ' '} | ${el.col - (f?.col ?? 0)}, ${el.row - (f?.row ?? 0)}, ${el.width}×${el.height} | ${el.variant ?? 'default'} |`);
      out.push('');
    }
    const notes = parts.filter(el => el.note);
    if (notes.length) out.push('Notes:', '', ...notes.map(el => `- ${cell(el.label)} "${words(el)}": ${cell(el.note)}`), '');
  }
  const issues = critique(shown, cols, rows).filter(i => i.rule !== 'open_note');
  if (issues.length) out.push('## Before you build', '', ...issues.map(i => `- ${critiqueMessage(i)}`), '');
  out.push('## Project file', '', '```json', serializeProject({ cols, rows, elements }), '```', '');
  return out.join('\n');
}
