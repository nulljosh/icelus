// Draw one grid cell. Block characters and box lines are painted as shapes that reach the cell's edges,
// because a font's █ ▀ ▄ and │ stop short of a 20 px line: banners came out striped and boxes gapped.
const BLOCKS = { '█': [0, 1], '▀': [0, 0.5], '▄': [0.5, 1] };
// Shades fill the whole cell at a strength, so a ramp or a shaded photo reads as tone, not stripes.
const SHADES = { '░': 0.25, '▒': 0.5, '▓': 0.75 };

// Sides each line reaches (up 8, right 4, down 2, left 1) and its stroke width. Double lines stay text.
const LINES = {};
[['─│┌┐└┘├┤┬┴┼╶╴╷╵', 1], ['━┃┏┓┗┛┣┫┳┻╋', 2]].forEach(([chars, width]) =>
  [...chars].forEach((ch, i) => { LINES[ch] = [[5, 10, 6, 3, 12, 9, 14, 11, 7, 13, 15, 4, 1, 2, 8][i], width]; }));
const ROUND = { '╭': [1, 1], '╮': [-1, 1], '╰': [1, -1], '╯': [-1, -1] }; // direction of the two arms

export function drawCell(ctx, ch, x, y, w, h, baseline) {
  const shade = SHADES[ch];
  if (shade) {
    const was = ctx.globalAlpha;
    ctx.globalAlpha = was * shade;
    // Edges rounded to the pixel, so neighbours meet without a gap or a darker overlap.
    const x0 = Math.round(x), y0 = Math.round(y);
    ctx.fillRect(x0, y0, Math.round(x + w) - x0, Math.round(y + h) - y0);
    ctx.globalAlpha = was;
    return;
  }
  const block = BLOCKS[ch];
  if (block) {
    const top = Math.round(y + block[0] * h), bottom = Math.round(y + block[1] * h);
    ctx.fillRect(Math.floor(x), top, Math.ceil(w), bottom - top);
    return;
  }
  const left = Math.floor(x), right = Math.ceil(x + w), bottom = y + h;
  const cx = Math.round(x + w / 2), cy = Math.round(y + h / 2);
  const line = LINES[ch];
  if (line) {
    const [sides, t] = line;
    if (sides & 8) ctx.fillRect(cx, y, t, cy - y + t);
    if (sides & 2) ctx.fillRect(cx, cy, t, bottom - cy);
    if (sides & 1) ctx.fillRect(left, cy, cx - left + t, t);
    if (sides & 4) ctx.fillRect(cx, cy, right - cx, t);
    return;
  }
  const round = ROUND[ch];
  if (round) {
    const [dx, dy] = round;
    ctx.save();
    ctx.strokeStyle = ctx.fillStyle;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(dx > 0 ? right : left, cy + 0.5);
    ctx.quadraticCurveTo(cx + 0.5, cy + 0.5, cx + 0.5, dy > 0 ? bottom : y);
    ctx.stroke();
    ctx.restore();
    return;
  }
  ctx.fillText(ch, x, y + baseline);
}
