import { describe, it, expect } from 'vitest';
import { handoff } from './handoff.js';
import { parseSketch } from './syntax.js';
import { screenFrame } from './lines.js';
import { parseProject } from './engine.js';

describe('hand it to Claude Code', () => {
  const screen = { id: 's', presetId: 'screen', label: 'Screen', text: 'Sign in', col: 0, row: 0, width: 30, height: 12, template: screenFrame('Sign in', 30, 12) };
  const parts = parseSketch('"Email"\n[Sign in]', 2, 2).map((el, i) => (i === 1 ? { ...el, note: 'make it the main button', variant: 'pressed' } : el));
  const md = handoff([screen, ...parts], 60, 20, 'Acme');
  it('opens with a build instruction', () => {
    expect(md.startsWith('# Acme: build brief\n\nBuild these screens')).toBe(true);
  });
  it('draws each screen, its typed lines and its parts', () => {
    expect(md).toContain('## Sign in');
    expect(md).toMatch(/```\n┌─ Sign in/);
    expect(md).toContain('[Sign in]');
    expect(md).toMatch(/\| Button \| Sign in \| \d+, \d+, \d+×1 \| pressed \|/);
  });
  it('carries notes and a project file that opens again', () => {
    expect(md).toContain('make it the main button');
    const json = md.split('```json\n')[1].split('\n```')[0];
    expect(parseProject(json).elements).toHaveLength(3);
  });
  it('works with no screens and escapes table pipes', () => {
    const out = handoff([{ id: 't', presetId: 'text', label: 'Text', text: 'a | b', template: ['a | b'], col: 0, row: 0, width: 5, height: 1 }], 20, 5);
    expect(out).toContain('## Icelus project');
    expect(out).toContain('a \\| b');
  });
});

describe('handoff for agents', async () => {
  const { callTool } = await import('./tools.js');
  const { run } = await import('../../bin/icelus.js');
  const project = { blockprint: 1, cols: 40, rows: 10, elements: parseSketch('[Go]', 0) };
  it('is an API tool and a CLI command', async () => {
    expect((await callTool('wireframe_to_handoff', { project, name: 'Demo' })).markdown).toMatch(/^# Demo: build brief/);
    expect(run(['handoff', 'demo.json'], () => JSON.stringify(project)).out).toMatch(/^# demo: build brief/);
  });
});
