// Masks: hide part of a part without cutting it. A mask crops a part to an inset box ({ top, right, bottom,
// left } in cells); a clip shows a part only where another part's box covers it. Both apply at draw time, so the
// part keeps every character and clearing the mask brings them all back. ios/App/Mask.swift is the twin.

// A masked-out cell. renderElements skips it, so whatever is underneath shows through.
export const HOLE = '\0';
const SIDES = ['top', 'right', 'bottom', 'left'];

/** A mask from untrusted input: four whole insets 0 to 500, or undefined when there is nothing to hide. */
export function cleanMask(m) {
  if (!m || typeof m !== 'object') return undefined;
  const out = Object.fromEntries(SIDES.map(k => [k, Math.max(0, Math.min(500, Math.floor(Number(m[k]) || 0)))]));
  return SIDES.some(k => out[k]) ? out : undefined;
}

/** The cells of a part that still show, as an absolute box { c0, r0, c1, r1 } (ends exclusive), or null. */
export function shownBox(el, byId) {
  const m = el.mask, o = el.clip ? byId.get(el.clip) : null;
  if (!m && !o) return null;
  let c0 = el.col + (m?.left ?? 0), r0 = el.row + (m?.top ?? 0);
  let c1 = el.col + el.width - (m?.right ?? 0), r1 = el.row + el.height - (m?.bottom ?? 0);
  // A clip uses the other part's box, drawn or hidden, so the shape can be hidden and still clip.
  if (o && o.id !== el.id) {
    c0 = Math.max(c0, o.col); r0 = Math.max(r0, o.row);
    c1 = Math.min(c1, o.col + o.width); r1 = Math.min(r1, o.row + o.height);
  }
  return { c0, r0, c1, r1 };
}

/** The elements as drawn: every masked-out cell becomes a HOLE. Unmasked parts come back as they are. */
export function withMasks(elements) {
  if (!elements.some(el => el.mask || el.clip)) return elements;
  const byId = new Map(elements.map(el => [el.id, el]));
  return elements.map(el => {
    const b = shownBox(el, byId);
    if (!b) return el;
    const template = el.template.map((line, dy) => {
      const r = el.row + dy;
      return [...line].map((ch, dx) => {
        const c = el.col + dx;
        return c >= b.c0 && c < b.c1 && r >= b.r0 && r < b.r1 ? ch : HOLE;
      }).join('');
    });
    return { ...el, template };
  });
}
