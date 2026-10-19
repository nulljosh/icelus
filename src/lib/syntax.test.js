import { describe, it, expect } from 'vitest';
import { parseSketch, toSketch, screenTemplate, SCREEN_TEMPLATES } from './syntax.js';
import { renderElements, gridToText, trimText, updateElement, parseProject, serializeProject } from './engine.js';

const draw = src => trimText(gridToText(renderElements(parseSketch(src, 0), 60, 20)));

describe('typed syntax', () => {
  it('turns each kind of line into its part', () => {
    const els = parseSketch('"Email"\n[x] Remember me  ( ) Work  (o) Home\n[v Country]\n[Sign in]  [Cancel]\n---\nHello there');
    expect(els.map(e => e.presetId)).toEqual(['input', 'checkbox', 'radio', 'radio', 'select', 'button', 'button', 'divider', 'text']);
    expect(els[0].template).toEqual(['[ Email_________ ]']);
    expect(els[1].template).toEqual(['[✓] Remember me']);
    expect(els[2].template).toEqual(['( ) Work']);
    expect(els[3].template).toEqual(['(●) Home']);
    expect(els[4].template).toEqual(['[▾ Country     ]']);
    expect(els[5].template).toEqual(['[ Sign in ]']);
  });

  it('lays parts side by side, rows a blank row apart', () => {
    expect(draw('[OK]  [Cancel]\nDone')).toBe('  [ OK ]  [ Cancel ]\n\n  Done');
    const [a, b] = parseSketch('one\n\ntwo', 0);
    expect(b.row - a.row).toBe(3);
  });

  it('draws tables with a header rule', () => {
    expect(draw('| Name | Plan |\n| Ada | Pro |')).toBe([
      '  ┌──────┬──────┐', '  │ Name │ Plan │', '  ├──────┼──────┤', '  │ Ada  │ Pro  │', '  └──────┴──────┘',
    ].join('\n'));
  });

  it('makes a banner from a # title that edits its words', () => {
    const [banner] = parseSketch('# Hi');
    expect(banner.presetId).toBe('banner');
    expect(banner.text).toBe('Hi');
    expect(banner.height).toBe(3);
  });

  it('ignores an empty sketch', () => {
    expect(parseSketch('')).toEqual([]);
    expect(parseSketch('\n  \n')).toEqual([]);
  });
});

describe('toSketch', () => {
  it('round-trips a typed screen', () => {
    const source = '# Hi\n"Email"  [x] Remember me  ( ) Work\n\n[v Country]  [Sign in]\n---\n| Name | Plan |\n| Ada | Pro |\nPlain words';
    expect(toSketch(parseSketch(source)).source).toBe(source);
  });

  it('names the parts it cannot write', () => {
    const r = toSketch([...parseSketch('[OK]'), { presetId: 'card', label: 'Card', template: ['┌┐', '└┘'], col: 0, row: 9, width: 2, height: 2 }]);
    expect(r).toEqual({ source: '[OK]', skipped: ['Card'] });
  });
});

describe('screen templates', () => {
  it('drops a named frame with its typed parts inside it', () => {
    const [frame, ...parts] = screenTemplate('Sign in', '"Email"\n[Go]', 10, 4);
    expect([frame.presetId, frame.text, frame.col, frame.row]).toEqual(['screen', 'Sign in', 10, 4]);
    expect(parts.map(p => [p.presetId, p.col, p.row])).toEqual([['input', 13, 6], ['button', 13, 8]]);
    expect(parts.every(p => p.col + p.width <= frame.col + frame.width && p.row + p.height <= frame.row + frame.height)).toBe(true);
  });

  it('ships the five templates, each previewed whole', () => {
    expect(SCREEN_TEMPLATES.map(t => t.label)).toEqual(['Sign in', 'Settings', 'List', 'Detail', 'Empty state']);
    expect(SCREEN_TEMPLATES.every(t => t.template[0].startsWith('┌─ ' + t.label))).toBe(true);
  });
});

describe('flowcharts', () => {
  const draw = els => trimText(gridToText(renderElements(els, 80, 30)));

  it('lays a flow out left to right, branches stacked, arrows in the gaps', () => {
    expect(draw(parseSketch('Idea -> Sketch -> Ship\nIdea -> Talk -> Ship', 0, 0))).toBe([
      '┌──────┐      ┌────────┐      ┌──────┐',
      '│ Idea ├───┬──▶ Sketch ├───┬──▶ Ship │',
      '└──────┘   │  └────────┘   │  └──────┘',
      '           │               │',
      '           │               │',
      '           │  ┌──────┐     │',
      '           └──▶ Talk ├─────┘',
      '              └──────┘',
    ].join('\n'));
  });

  it('keeps the row of an arrow that skips a column free, and draws a loop under the boxes', () => {
    const skip = draw(parseSketch('a -> b -> c\na -> c', 0, 0)).split('\n');
    expect([skip[1], skip[6]]).toEqual(['│ a ├───┬──────────┬──▶ c │', '        └──▶ b ├───┘']);
    const loop = draw(parseSketch('Start -> Check -> Start', 0, 0)).split('\n');
    expect(loop[2]).toBe('└───▲───┘      └───┬───┘');
    expect(loop.at(-1)).toBe('    └──────────────┘');
  });

  it('pins arrows to the boxes, writes the flow back as typed lines, and edits a node box', () => {
    const els = parseSketch('Cart -> Pay', 0, 0);
    const [cart, pay, arrow] = els;
    expect([arrow.from.id, arrow.to.id, arrow.from.edge, arrow.to.side]).toEqual([cart.id, pay.id, true, 'left']);
    expect(toSketch(els).source).toBe('Cart -> Pay');
    const [renamed] = updateElement([cart], cart.id, { text: 'Basket' });
    expect(renamed.template).toEqual(['┌────────┐', '│ Basket │', '└────────┘']);
    const reopened = parseProject(serializeProject({ cols: 80, rows: 30, elements: els }));
    expect([reopened.elements[2].from.edge, reopened.elements[2].to.side]).toEqual([true, 'left']);
  });
});

describe('sequence diagrams', () => {
  const src = 'User -> App: Sign in\nApp -> API: Check\nAPI --> App: OK\nApp -> App: Save';

  it('draws boxes, lifelines and labelled arrows, replies dashed and a self message looping back', () => {
    const [seq] = parseSketch(src, 0, 0);
    expect(seq.presetId).toBe('sequence');
    expect(seq.template.map(l => l.trimEnd())).toEqual([
      '┌──────┐    ┌─────┐   ┌─────┐',
      '│ User │    │ App │   │ API │',
      '└───┬──┘    └──┬──┘   └──┬──┘',
      '    │ Sign in  │         │',
      '    ├──────────▶         │',
      '    │          │ Check   │',
      '    │          ├─────────▶',
      '    │          │ OK      │',
      '    │          ◀╌╌╌╌╌╌╌╌╌┤',
      '    │          │ Save    │',
      '    │          ├──┐      │',
      '    │          ◀──┘      │',
      '    │          │         │',
    ]);
  });

  it('keeps its messages as text: edits redraw it and it writes back as typed lines', () => {
    const els = parseSketch(src, 0, 0);
    expect(toSketch(els).source).toBe(src);
    const [edited] = updateElement(els, els[0].id, { text: 'A -> B: hi' });
    expect(edited.template.map(l => l.trimEnd())).toEqual(['┌───┐   ┌───┐', '│ A │   │ B │', '└─┬─┘   └─┬─┘', '  │ hi    │', '  ├───────▶', '  │       │']);
    expect(parseSketch('a -> b\nA -> B: hi').map(e => e.presetId)).toEqual(['node', 'node', 'line', 'sequence']);
  });
});

describe('trees', () => {
  const src = '- App\n  - Sign in\n    - Reset\n  - Home\n- Help';

  it('draws an indented list as a tree, several roots and all', () => {
    const [tree] = parseSketch(src, 0, 0);
    expect(tree.presetId).toBe('tree');
    expect(tree.template.map(l => l.trimEnd())).toEqual(['App', '├── Sign in', '│   └── Reset', '└── Home', 'Help']);
  });

  it('keeps its list as text, redraws on edit, writes back, and leaves a flat list alone', () => {
    const els = parseSketch(src, 0, 0);
    expect(toSketch(els).source).toBe(src);
    const [edited] = updateElement(els, els[0].id, { text: '- Docs\n\t- API' });
    expect(edited.template.map(l => l.trimEnd())).toEqual(['Docs', '└── API']);
    expect(parseSketch('- Milk\n- Eggs').map(e => e.presetId)).toEqual(['text', 'text']);
  });
});
