import { describe, it, expect } from 'vitest';
import { systemFromCode, parseSystem, withSystem } from './system.js';
import { critique } from './critique.js';
import { createElement } from './engine.js';
import { getPreset } from './presets.js';

const files = [
  { path: 'src/Button.jsx', text: 'export function PrimaryButton({ children }) { return <button className="btn">{children}</button>; }' },
  { path: 'src/Card.tsx', text: 'export const ProfileCard = (props) => <div/>;\nconst ThemeProvider = () => null;' },
  { path: 'src/app.css', text: '.btn { border-radius: 12px; } .card { border-radius: 20px; }' },
  { path: 'ios/Views.swift', text: 'struct SearchField: View { var body: some View { Text("") } }' },
  { path: 'src/UserAvatar.vue', text: '<template></template>' },
];

describe('design system from code', () => {
  const sys = systemFromCode(files, 'Acme');
  it('finds components across frameworks and skips providers', () => {
    expect(sys.parts.map(p => p.label)).toEqual(['PrimaryButton', 'ProfileCard', 'SearchField', 'UserAvatar']);
  });
  it('draws each kind the way it looks in text, in the style the code uses', () => {
    expect(sys.style).toBe('rounded');
    const t = Object.fromEntries(sys.parts.map(p => [p.label, p.template]));
    expect(t.PrimaryButton).toEqual(['[ Primary ]']);
    expect(t.UserAvatar).toEqual(['(U )']);
    expect(t.SearchField[1]).toMatch(/^\[_+\]$/);
    expect(t.ProfileCard[0]).toMatch(/^╭─ Profile Card ─+╮$/);
  });
  it('reads a system file back and loads its parts into Mine once', () => {
    const back = parseSystem(JSON.stringify(sys));
    expect(back).toEqual(sys);
    expect(parseSystem('{"parts":[]}')).toBeNull();
    const once = withSystem([], back), twice = withSystem(once, back);
    expect(twice).toHaveLength(4);
    expect(twice[0]).toMatchObject({ category: 'Mine', label: 'PrimaryButton' });
  });
  it('lets Review check boxes against the system style', () => {
    const card = createElement(getPreset('card'), 0, 0);
    const issues = critique([card], 60, 30, { name: 'Acme', style: 'rounded' });
    expect(issues.find(i => i.rule === 'off_system')).toMatchObject({ style: 'rounded', system: 'Acme' });
    expect(critique([{ ...card, style: 'rounded' }], 60, 30, { name: 'Acme', style: 'rounded' }).some(i => i.rule === 'off_system')).toBe(false);
  });
});

describe('design system for agents', async () => {
  const { callTool } = await import('./tools.js');
  const { run } = await import('../../bin/icelus.js');
  it('is an API tool, and critique_project takes it', async () => {
    const sys = await callTool('system_from_code', { files, name: 'Acme' });
    expect(sys.parts).toHaveLength(4);
    const project = { blockprint: 1, cols: 60, rows: 30, elements: [createElement(getPreset('card'), 0, 0)] };
    const { issues } = await callTool('critique_project', { project, system: sys });
    expect(issues.some(i => i.rule === 'off_system')).toBe(true);
  });
  it('is a CLI command over a folder', () => {
    const read = p => files.find(f => f.path === p).text;
    const r = run(['system', 'acme'], read, () => files.map(f => f.path));
    expect(JSON.parse(r.out)).toMatchObject({ icelusSystem: 1, name: 'acme', style: 'rounded' });
  });
});
