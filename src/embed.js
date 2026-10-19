// The embed: a shared sketch, read only, as selectable text. It carries no editor and writes nothing,
// so it is safe to frame on any page. The sketch rides in the hash like a share link.
import { decodeShare } from './lib/share.js';
import { parseProject, renderElements, gridToText, trimText } from './lib/engine.js';

const code = window.location.hash.match(/^#p=([A-Za-z0-9_-]+)$/)?.[1];
const pre = document.getElementById('sketch');
const open = document.getElementById('open');
if (code) open.href = `./#p=${code}`;
(code ? decodeShare(code) : Promise.resolve(null)).then(json => {
  const project = json && parseProject(json);
  // textContent, never innerHTML: the sketch is whatever the link says.
  pre.textContent = project
    ? trimText(gridToText(renderElements(project.elements, project.cols, project.rows))).replace(/^\n+/, '')
    : 'This sketch link is empty or broken.';
});
