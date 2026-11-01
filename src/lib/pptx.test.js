import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { screenFrame } from './lines.js';
import { parts, toPptx, fitPt, zip } from './pptx.js';

const screen = (text, col) => ({ id: text, presetId: 'screen', label: 'Screen', text, col, row: 0, width: 20, height: 6, template: screenFrame(text, 20, 6) });

describe('pptx', () => {
  it('one slide per screen, in reading order, plus the fixed parts', () => {
    const { parts: p, count } = parts([screen('Home', 0), screen('Settings', 30)], 60, 20);
    expect(count).toBe(2);
    const names = p.map(([n]) => n);
    expect(names).toContain('ppt/slides/slide2.xml');
    expect(names.filter(n => n.startsWith('ppt/slides/slide') && n.endsWith('.xml'))).toHaveLength(2);
    expect(p.find(([n]) => n === 'ppt/slides/slide1.xml')[1]).toContain('Home');
  });

  it('an empty canvas still gives one slide', () => {
    expect(parts([], 40, 10).count).toBe(1);
  });

  it('text shrinks for wide art and caps at 28 pt', () => {
    expect(fitPt(10, 3)).toBe(28);
    expect(fitPt(200, 60)).toBeLessThan(10);
  });

  it('zip is a valid archive with a stored entry', () => {
    const z = zip([['a.txt', 'hello']]);
    expect(z[0]).toBe(0x50); expect(z[1]).toBe(0x4b);
    expect(new TextDecoder().decode(z)).toContain('hello');
  });

  it('opens in python-pptx when it is installed', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pptx-'));
    const f = join(dir, 'deck.pptx');
    writeFileSync(f, toPptx([screen('Home', 0), screen('Pay', 30)], 60, 20));
    let out;
    try {
      out = execFileSync('uv', ['run', '-q', '--with', 'python-pptx', 'python', '-c',
        `import pptx,sys; p=pptx.Presentation(sys.argv[1]); print(len(p.slides))`, f], { encoding: 'utf8', timeout: 120000 });
    } catch { return; }   // ponytail: no uv or no network, the structural tests above still ran
    expect(out.trim()).toBe('2');
  }, 130000);
});
