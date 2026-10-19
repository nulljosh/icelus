import { describe, it, expect } from 'vitest';
import { buildTools } from './webmcp.js';

const setup = () => {
  const sent = [];
  const state = { elements: [{ id: 'el-1', presetId: 'card', col: 2, row: 1, width: 10, height: 4 }] };
  const tools = Object.fromEntries(buildTools(() => ({ state, dispatch: a => sent.push(a) })).map(t => [t.name, t]));
  return { tools, sent };
};

describe('WebMCP element tools', () => {
  it('lists parts with ids', async () => {
    const { tools } = setup();
    expect((await tools.list_elements.execute()).elements[0]).toEqual({ id: 'el-1', part: 'card', col: 2, row: 1, width: 10, height: 4 });
  });

  it('dispatches the reducer action for a known part', async () => {
    const { tools, sent } = setup();
    await tools.move_element.execute({ id: 'el-1', col: 5, row: 6 });
    await tools.style_element.execute({ id: 'el-1', style: 'rounded' });
    expect(sent).toEqual([
      { type: 'MOVE_ELEMENT', id: 'el-1', col: 5, row: 6 },
      { type: 'UPDATE_ELEMENT', id: 'el-1', changes: { style: 'rounded' } },
    ]);
  });

  it('refuses an unknown id without dispatching', async () => {
    const { tools, sent } = setup();
    expect((await tools.delete_element.execute({ id: 'nope' })).error).toMatch(/nope/);
    expect(sent).toEqual([]);
  });

  it('types a screen and draws arrows', async () => {
    const { tools, sent } = setup();
    expect((await tools.type_screen.execute({ source: '"Email"\n[Sign in]' })).added).toBe(2);
    await tools.draw_arrow.execute({ fromCol: 1, fromRow: 1, toCol: 9, toRow: 9 });
    expect(sent.map(a => a.type)).toEqual(['PLACE_SKETCH', 'PLACE_LINE']);
  });
});
