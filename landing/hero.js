// Hero: Icelus' canvas drawing on its own. Real presets from src/lib/presets.js are stamped onto the character grid,
// a few characters a frame, the way the app places them; the oldest is wiped when the grid fills. Decoration only.
(function () {
  var pre = document.getElementById('cgrid'); if (!pre) return;
  var P = [["┌──────┬──────┬──────┐", "│ Head │ Head │ Head │", "├──────┼──────┼──────┤", "│ Cell │ Cell │ Cell │", "│ Cell │ Cell │ Cell │", "└──────┴──────┴──────┘"], ["┌─────────────────────────────┐", "│ ◄ ► ⟳  [___________________]│", "├─────────────────────────────┤", "│                             │", "│                             │", "│                             │", "└─────────────────────────────┘"], ["┌──────────────────┐", "│ Card Title       │", "│                  │", "│ Card content     │", "│ goes here.       │", "│                  │", "│ [ Action ]       │", "└──────────────────┘"], ["╔══════════════╗", "║              ║", "║   </> live   ║", "║              ║", "╚══════════════╝"], ["╔══════════════╗", "║              ║", "║   [ img ]    ║", "║              ║", "╚══════════════╝"], ["┌──────────────────────────┐", "│ ⚠  Warning message here  │", "└──────────────────────────┘"], ["┌────────────────────┐", "│ Write something... │", "│                    │", "│                    │", "└────────────────────┘"], ["┌─ October ────────────┐", "│ Mo Tu We Th Fr Sa Su │", "│           1  2  3  4 │", "│  5  6  7  8  9 10 11 │", "│ 12 13 14 15 16 17 18 │", "└──────────────────────┘"], ["┌───────────┐", "│ ▸ Inbox   │", "│   Drafts  │", "│   Sent    │", "│   Archive │", "└───────────┘"], ["▾ Section one       ", "  Content goes here.", "▸ Section two       ", "▸ Section three     "], ["┌─────────────────────────┐", "│ ✓ Saved to your project │", "└─────────────────────────┘"], ["┌─────────────┐", "│ Helpful tip │", "└──────┬──────┘", "       ▼       "], ["┌─ code ───────────────────┐", "│ const screen = sketch(); │", "│ paste(screen);           │", "└──────────────────────────┘"]];
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cols, rows, g, placed = [], job = null;
  function size() {
    var probe = document.createElement('span'); probe.textContent = 'MMMMMMMMMM'; pre.appendChild(probe);
    var cw = probe.getBoundingClientRect().width / 10, lh = parseFloat(getComputedStyle(pre).lineHeight); probe.remove();
    cols = Math.floor(pre.clientWidth / cw); rows = Math.floor(pre.clientHeight / lh);
    g = []; for (var r = 0; r < rows; r++) g.push(new Array(cols).fill(' '));
    placed = []; job = null;
  }
  function free(x, y, w, h) {
    return placed.every(function (b) { return x + w + 2 < b.x || b.x + b.w + 2 < x || y + h + 1 < b.y || b.y + b.h + 1 < y; });
  }
  function next() {
    var t = P[Math.floor(Math.random() * P.length)], w = [...t[0]].length, h = t.length;
    for (var tries = 0; tries < 40; tries++) {
      var x = Math.floor(Math.random() * Math.max(1, cols - w)), y = Math.floor(Math.random() * Math.max(1, rows - h));
      if (free(x, y, w, h)) { var b = { x: x, y: y, w: w, h: h, t: t.map(function (l) { return [...l]; }) }; placed.push(b); return b; }
    }
    var old = placed.shift(); if (old) for (var r = 0; r < old.h; r++) for (var c = 0; c < old.w; c++) if (g[old.y + r]) g[old.y + r][old.x + c] = ' ';
    return null;
  }
  function paint() { pre.textContent = g.map(function (r) { return r.join(''); }).join('\n'); }
  size();
  if (still) { for (var i = 0; i < 30; i++) { var b = next(); if (b) b.t.forEach(function (l, r) { l.forEach(function (ch, c) { g[b.y + r][b.x + c] = ch; }); }); } paint(); return; }
  setInterval(function () {
    if (!job) { var b = next(); if (b) job = { b: b, i: 0 }; return paint(); }
    var b = job.b;
    for (var n = 0; n < 6 && job.i < b.w * b.h; n++, job.i++) {
      var r = Math.floor(job.i / b.w), c = job.i % b.w;
      if (g[b.y + r] && b.x + c < cols) g[b.y + r][b.x + c] = b.t[r][c] || ' ';
    }
    if (job.i >= b.w * b.h) job = null;
    paint();
  }, 40);
  var rt; addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(size, 200); });

  // Parallax: the canvas drifts at 0.45, the copy lifts at 0.2 and fades.
  var bg = document.querySelector('.hero .hero-bg'), copy = document.querySelector('.hero .hero-copy'), q = 0;
  addEventListener('scroll', function () {
    if (q) return;
    q = requestAnimationFrame(function () {
      q = 0; var y = scrollY, h = innerHeight; if (y > h * 1.2) return;
      bg.style.setProperty('--py', (y * .45) + 'px');
      copy.style.transform = 'translate3d(0,' + (y * .2) + 'px,0)'; copy.style.opacity = Math.max(0, 1 - y / (h * .7));
    });
  }, { passive: true });
})();
