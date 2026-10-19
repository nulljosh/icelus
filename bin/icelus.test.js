import { describe, it, expect } from 'vitest';
import { run } from './icelus.js';

const io = files => f => files[f ?? '-'];

describe('icelus command line', () => {
  it('draws typed lines and round-trips them through a project', () => {
    const typed = { '-': '"Email"  [Go]' };
    expect(run(['draw'], io(typed)).out).toBe('  [ Email_________ ]  [ Go ]');
    const project = run(['project'], io(typed)).out;
    expect(run(['lines', 'p.json'], io({ 'p.json': project })).out).toBe('"Email"  [Go]');
    expect(run(['text', 'p.json', '--markdown'], io({ 'p.json': project })).out).toMatch(/^```/);
  });

  it('lints overlaps and parts off the grid', () => {
    const el = (col, row) => ({ presetId: 'button', label: 'Button', template: ['[ OK ]'], col, row });
    const p = JSON.stringify({ blockprint: 1, cols: 20, rows: 5, elements: [el(0, 0), el(2, 0), el(18, 4)] });
    const r = run(['lint', 'p.json'], io({ 'p.json': p }));
    expect(r.code).toBe(1);
    expect(r.out.split('\n')).toHaveLength(2);
    expect(run(['nope'], io({})).code).toBe(2);
  });

  it('writes a deck named after the file', () => {
    const p = run(['project'], io({ '-': '[Go]' })).out;
    expect(run(['deck', 'pitch.json'], io({ 'pitch.json': p })).out).toContain('<title>pitch</title>');
  });

  it('exports React and SwiftUI named after the file', () => {
    const p = run(['project'], io({ '-': '[Go]' })).out;
    expect(run(['react', 'sign-in.json'], io({ 'sign-in.json': p })).out).toContain('export default function SignIn()');
    expect(run(['swiftui', 'sign-in.json'], io({ 'sign-in.json': p })).out).toContain('struct SignInView: View');
  });
});

describe('check README wireframes', () => {
  it('passes closed boxes and reports one that does not close, with its line', () => {
    const md = '# App\n\n```\n┌────┐\n│ OK │\n└────┘\n```\n\ntext\n\n```text\n┌────┐\n│ OK\n└────┘\n```\n';
    const r = run(['check', 'README.md'], f => ({ 'README.md': md })[f]);
    expect(r.code).toBe(1);
    expect(r.out).toBe('README.md:12:1 box does not close');
    expect(run(['check', 'a.md'], () => '```\n┌─┐\n└─┘\n```').out).toBe('ok, 1 file');
  });
});
