import { describe, it, expect } from 'vitest';
import { EXAMPLES, exampleProject, exampleText, RESOURCES, readResource, PROMPTS, getPrompt } from './agentkit.js';
import { parseProject } from './engine.js';
import { critique, critiqueMessage } from './critique.js';

describe('agent kit', () => {
  it('every worked example is a project that opens and passes review', () => {
    for (const { slug, screens } of EXAMPLES) {
      const p = parseProject(JSON.stringify(exampleProject(slug)));
      expect(p.elements.filter(e => e.presetId === 'screen')).toHaveLength(screens.length);
      const issues = critique(p.elements, p.cols, p.rows).filter(i => i.rule !== 'open_note');
      expect(issues.map(critiqueMessage), slug).toEqual([]);
      expect(exampleText(p)).toContain(`┌─ ${screens[0][0]}`);
    }
    expect(exampleProject('nope')).toBeNull();
  });
  it('reads every listed resource, and nothing else', () => {
    for (const r of RESOURCES) expect(readResource(r.uri), r.uri).toBeTruthy();
    expect(JSON.parse(readResource('icelus://parts')).length).toBeGreaterThan(30);
    expect(readResource('icelus://syntax')).toContain('[Sign in] is a button');
    for (const bad of ['icelus://examples/../parts', 'file:///etc/passwd', '', null, 42]) expect(readResource(bad)).toBeNull();
  });
  it('fills each prompt and refuses missing arguments', () => {
    expect(PROMPTS.map(p => p.name)).toEqual(['sketch_screen', 'review_project', 'build_from_design']);
    expect(getPrompt('sketch_screen', { description: 'a checkout' }).messages[0].content.text).toContain('a checkout');
    expect(getPrompt('build_from_design', { project: '{}', stack: 'swiftui' }).messages[0].content.text).toContain('format swiftui');
    expect(getPrompt('build_from_design', { project: '{}', stack: 'cobol' }).messages[0].content.text).toContain('format react');
    expect(getPrompt('review_project', {}).error).toBeTruthy();
    expect(getPrompt('sketch_screen', { description: 7 }).error).toBeTruthy();
    expect(getPrompt('sketch_screen', { description: 'x'.repeat(50_000) }).messages[0].content.text.length).toBeLessThan(21_000);
    expect(getPrompt('nope', {})).toBeNull();
  });
});
