// The agent kit: what an MCP client can read (resources) and start from (prompts), next to the tools in
// tools.js. Resources are the syntax, the parts and worked examples as projects. Prompts are the three jobs
// agents do with Icelus: sketch a screen, review and fix one, build from one. All of it is static, so
// /mcp stays stateless.

import { createElement, serializeProject, renderElements, gridToText, trimText } from './engine.js';
import { PRESETS, PACKS } from './presets.js';
import { SYNTAX_HELP, screenTemplate } from './syntax.js';
import { maxOf } from './extent.js';

// Worked examples: a few screens of one flow, typed in the same syntax agents write.
export const EXAMPLES = [
  { slug: 'sign-in', title: 'Sign in flow', screens: [
    ['Sign in', '# Sign in\n"Email"\n"Password"\n[x] Remember me\n[Sign in]  [Create account]\nForgot password?'],
    ['Create account', '# Join\n"Name"\n"Email"\n"Password"\n[ ] Send me product news\n[Create account]'],
    ['Reset password', '# Reset\nWe will mail you a link.\n"Email"\n[Send link]  [Back]'],
    ['Wrong password', '# Sign in\n"Email"\n"Password"\nThat password is wrong.\n[Try again]  [Reset it]'],
  ] },
  { slug: 'onboarding', title: 'Onboarding', screens: [
    ['Welcome', '# Hello\nSketch a screen in plain text.\n[Get started]'],
    ['Pick topics', '# Topics\n[x] Design\n[ ] Code\n[x] Writing\n[Next]  [Skip]'],
    ['All set', '# Done\nYour first screen is waiting.\n[Open the canvas]'],
  ] },
  { slug: 'settings', title: 'Settings', screens: [
    ['Settings', '# Settings\n[x] Notifications\n[ ] Dark mode\n[v English]\n---\n[Sign out]'],
    ['Profile', '# Profile\n"Name"\n"Email"\nA name is required.\n[Save]  [Delete account]'],
  ] },
  { slug: 'inbox', title: 'Inbox with empty and error states', screens: [
    ['Inbox', '# Inbox\n"Search"\n| From | Subject |\n| Ada | Lunch? |\n| Grace | The build |\n[Compose]'],
    ['Empty inbox', '# Inbox\n\nNothing here yet.\nNew mail shows up here.\n\n[Compose]'],
    ['Offline', '# Inbox\nSomething went wrong loading mail.\nThe error is on our side.\n[Try again]'],
  ] },
];

/** An example as a project: its screens side by side, four columns apart. */
export function exampleProject(slug) {
  const ex = EXAMPLES.find(e => e.slug === slug);
  if (!ex) return null;
  let col = 0;
  const elements = ex.screens.flatMap(([name, source]) => {
    const els = screenTemplate(name, source, col, 0);
    col += els[0].width + 4;
    return els;
  });
  const rows = Math.max(maxOf(elements.map(e => e.row + e.height))) + 1;
  return JSON.parse(serializeProject({ cols: col, rows, elements }));
}

/** An example drawn as text, the way it pastes. */
export const exampleText = p => trimText(gridToText(renderElements(p.elements, p.cols, p.rows)));

export const RESOURCES = [
  { uri: 'icelus://syntax', name: 'Typed syntax', mimeType: 'text/markdown', description: 'How to type a screen in lines: the input for sketch_to_wireframe.' },
  { uri: 'icelus://parts', name: 'Parts', mimeType: 'application/json', description: 'Every part and pack part: id, label, category and how it draws.' },
  ...EXAMPLES.map(e => ({
    uri: `icelus://examples/${e.slug}`, name: e.title, mimeType: 'application/json',
    description: `A worked example project, ${e.screens.length} screens: ${e.screens.map(s => s[0]).join(', ')}. Pass it to any tool that takes a project.`,
  })),
];

export function readResource(uri) {
  if (uri === 'icelus://syntax') {
    return `# Icelus typed syntax\n\n${SYNTAX_HELP}\n\n## Example\n\n\`\`\`\n${EXAMPLES[0].screens[0][1]}\n\`\`\`\n`;
  }
  if (uri === 'icelus://parts') {
    return JSON.stringify([...PRESETS, ...PACKS].map(p => ({ id: p.id, label: p.label, category: p.category, template: createElement(p, 0, 0).template })));
  }
  const slug = typeof uri === 'string' && uri.startsWith('icelus://examples/') ? uri.slice('icelus://examples/'.length) : null;
  const project = slug && exampleProject(slug);
  return project ? JSON.stringify(project) : null;
}

const arg = (name, description, required = false) => ({ name, description, required });

export const PROMPTS = [
  { name: 'sketch_screen', description: 'Sketch a screen from a description, then review it until it is clean.',
    arguments: [arg('description', 'What the screen is for, in a sentence or two.', true)] },
  { name: 'review_project', description: 'Run a design review on a project and fix what it finds.',
    arguments: [arg('project', 'A Icelus project as JSON.', true)] },
  { name: 'build_from_design', description: 'Build an app from a Icelus project: the brief, the code, then the work.',
    arguments: [arg('project', 'A Icelus project as JSON.', true), arg('stack', 'react or swiftui. Default react.')] },
];

const MAX_ARG = 20_000;
const user = text => ({ description: text.split('\n')[0], messages: [{ role: 'user', content: { type: 'text', text } }] });

export function getPrompt(name, args = {}) {
  const value = key => {
    const v = args?.[key];
    if (typeof v !== 'string' || !v.trim()) return null;
    return v.slice(0, MAX_ARG);
  };
  switch (name) {
    case 'sketch_screen': {
      const d = value('description');
      if (!d) return { error: 'description is required' };
      return user(`Sketch this screen in Icelus: ${d}\n\n` +
        'Write it in typed lines (read icelus://syntax), then call sketch_to_wireframe with { source }. ' +
        'Run critique_project on the project it returns and fix every issue with edit_project, again until it comes back clean. ' +
        'Finish with the drawn text in a code block and the project file.');
    }
    case 'review_project': {
      const p = value('project');
      if (!p) return { error: 'project is required' };
      return user('Review this Icelus project and fix what you find.\n\n' +
        'Call critique_project. For each issue, fix the part it names with edit_project (or add the missing empty or error state), ' +
        'then run critique_project again until it is clean. Resolve open notes with list_notes. Return the fixed project.\n\n' +
        `\`\`\`json\n${p}\n\`\`\``);
    }
    case 'build_from_design': {
      const p = value('project');
      if (!p) return { error: 'project is required' };
      const stack = value('stack') === 'swiftui' ? 'swiftui' : 'react';
      return user(`Build this design as a ${stack === 'react' ? 'React' : 'SwiftUI'} app.\n\n` +
        'Call wireframe_to_handoff for the build brief: every screen, its parts, flow, states and notes. ' +
        `Call wireframe_to_code with format ${stack} for a starting layout that compiles. ` +
        'Build every screen in the brief, wire the flow, and fix what "Before you build" lists. Check your screens against the drawings.\n\n' +
        `\`\`\`json\n${p}\n\`\`\``);
    }
  }
  return null;
}
