// Decks, a port of src/lib/deck.js: every screen as a slide, in reading order (top to bottom, then left to
// right). A canvas with no screens is one slide of everything on it. toDeck writes one self-contained HTML
// file that presents with the arrow keys and prints one slide per page.

import Foundation

struct Slide: Equatable { let title: String; let text: String }

/// Each screen, cropped to its frame. Empty when the canvas is empty.
func slides(_ elements: [Element], cols: Int, rows: Int) -> [Slide] {
    let grid = renderElements(elements, cols: cols, rows: rows)
    let screens = elements.filter { $0.presetId == "screen" && !$0.hidden }.sorted { ($0.row, $0.col) < ($1.row, $1.col) }
    let crop = { (s: Element) in
        trimText(grid[max(0, s.row)..<min(grid.count, max(max(0, s.row), s.row + s.height))].map { r in
            String(r[min(r.count, max(0, s.col))..<min(r.count, max(min(r.count, max(0, s.col)), s.col + s.width))])
        }.joined(separator: "\n"))
    }
    if !screens.isEmpty { return screens.map { Slide(title: ($0.text ?? "").isEmpty ? "Screen" : $0.text!, text: crop($0)) } }
    let all = trimText(grid.map { String($0) }.joined(separator: "\n"))
    return all.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? [] : [Slide(title: "Icelus", text: all)]
}

/// How big a slide's text can be: its widest line and its line count.
func slideSize(_ text: String) -> (w: Int, h: Int) {
    let lines = text.components(separatedBy: "\n")
    return (max(1, lines.map { $0.unicodeScalars.count }.max() ?? 1), lines.count)
}

private func esc(_ s: String) -> String {
    s.replacingOccurrences(of: "&", with: "&amp;").replacingOccurrences(of: "<", with: "&lt;")
        .replacingOccurrences(of: ">", with: "&gt;").replacingOccurrences(of: "\"", with: "&quot;")
        .replacingOccurrences(of: "'", with: "&#39;")
}

func toDeck(_ elements: [Element], cols: Int, rows: Int, title: String = "Icelus deck") -> String {
    let list = slides(elements, cols: cols, rows: rows)
    let sections = list.enumerated().map { i, s -> String in
        let (w, h) = slideSize(s.text)
        return "<section\(i == 0 ? " class=\"on\"" : "") style=\"--w:\(w);--h:\(h)\" aria-label=\"\(esc(s.title))\"><pre>\(esc(s.text))</pre><p>\(i + 1) / \(list.count)</p></section>"
    }
    return """
    <!doctype html>
    <html lang="en">
    <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>\(esc(title))</title>
    <style>
      html, body { margin: 0; height: 100%; background: #F5F5F7; color: #1D1D1F; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif; }
      section { display: none; box-sizing: border-box; height: 100vh; padding: 32px 48px; flex-direction: column; align-items: center; justify-content: center; gap: 24px; }
      section.on { display: flex; }
      pre { margin: 0; font-family: ui-monospace, "SF Mono", Menlo, monospace; line-height: 1.2; font-size: min(calc(88vw / var(--w) / 0.6), calc(80vh / var(--h) / 1.2), 28px); }
      p { margin: 0; font-size: 13px; color: rgba(29, 29, 31, 0.6); }
      @media (prefers-color-scheme: dark) { html, body { background: #000; color: #F5F5F7; } p { color: rgba(245, 245, 247, 0.6); } }
      @page { size: landscape; margin: 0; }
      @media print { html, body { background: #fff; color: #000; } section { display: flex; break-after: page; } }
    </style>
    </head>
    <body>
    \(sections.isEmpty ? "<section class=\"on\"><p>No screens yet.</p></section>" : sections.joined(separator: "\n"))
    <script>
      const all = [...document.querySelectorAll('section')];
      let at = 0;
      const go = d => { all[at].classList.remove('on'); at = Math.max(0, Math.min(all.length - 1, at + d)); all[at].classList.add('on'); };
      addEventListener('keydown', e => { if (['ArrowRight', 'ArrowDown', ' ', 'PageDown'].includes(e.key)) go(1); if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) go(-1); });
      addEventListener('click', e => go(e.clientX < innerWidth / 3 ? -1 : 1));
    </script>
    </body>
    </html>

    """
}
