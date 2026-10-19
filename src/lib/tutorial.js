// The first-run tutorial: five small steps that wait for you to do each one, then move on by themselves.
// Pick Button, place it, change its words, drag it, copy the screen. stepDone compares the canvas now with
// where it stood when the step began.
export const TUTORIAL = ['pick', 'place', 'edit', 'move', 'copy', 'done'];

export const lessonSnapshot = (elements, copies = 0) => ({
  copies,
  buttons: elements.filter(el => el.presetId === 'button').map(({ id, col, row, template }) => ({ id, col, row, text: template.join('\n') })),
});

export function stepDone(step, { selectedPreset, elements, copies = 0 }, start) {
  const now = lessonSnapshot(elements, copies).buttons;
  const was = b => start.buttons.find(s => s.id === b.id);
  switch (step) {
    case 'pick': return selectedPreset?.id === 'button';
    case 'place': return now.length > start.buttons.length;
    case 'edit': return now.some(b => was(b) && was(b).text !== b.text);
    case 'move': return now.some(b => was(b) && (was(b).col !== b.col || was(b).row !== b.row));
    case 'copy': return copies > start.copies;
    default: return false;
  }
}

// The button just placed, so the next step can select it for you.
export const newestButton = (elements, start) =>
  elements.filter(el => el.presetId === 'button' && !start.buttons.some(b => b.id === el.id)).at(-1)?.id ?? null;
