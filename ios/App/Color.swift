// Color, a port of src/lib/color.js: a part may carry an ink and a paper from the 16 terminal colors, by
// index. Plain copy never carries color; ANSI and images keep it.

import Foundation

/// The xterm palette: the eight colors, then their bright twins. Index n is SGR 30+n (90+n-8 bright).
let terminalColors: [(name: String, hex: String)] = [
    ("Black", "#000000"), ("Red", "#CD0000"), ("Green", "#00CD00"), ("Yellow", "#CDCD00"),
    ("Blue", "#0000EE"), ("Magenta", "#CD00CD"), ("Cyan", "#00CDCD"), ("White", "#E5E5E5"),
    ("Bright black", "#7F7F7F"), ("Bright red", "#FF0000"), ("Bright green", "#00FF00"), ("Bright yellow", "#FFFF00"),
    ("Bright blue", "#5C5CFF"), ("Bright magenta", "#FF00FF"), ("Bright cyan", "#00FFFF"), ("Bright white", "#FFFFFF"),
]

/// A color index 0 to 15, or nil for none.
func cleanColor(_ v: Int?) -> Int? { v.flatMap { (0..<terminalColors.count).contains($0) ? $0 : nil } }

func hasColor(_ elements: [Element]) -> Bool { elements.contains { !$0.hidden && ($0.ink != nil || $0.paper != nil) } }

/// Set or clear a part's ink and paper. Nil leaves one alone; -1 clears it.
func updateElement(_ elements: [Element], id: String, ink: Int?, paper: Int?) -> [Element] {
    elements.map { el in
        guard el.id == id else { return el }
        var next = el
        if let ink { next.ink = cleanColor(ink) }
        if let paper { next.paper = cleanColor(paper) }
        return next
    }
}

struct ColorMask { var ink: [[Int]]; var paper: [[Int]] }

/// The ink and paper of every cell, -1 for none, in drawing order so a part on top clears the color under it.
func colorMask(_ elements: [Element], cols: Int, rows: Int) -> ColorMask {
    var mask = ColorMask(ink: Array(repeating: Array(repeating: -1, count: cols), count: rows),
                         paper: Array(repeating: Array(repeating: -1, count: cols), count: rows))
    var drawn = createGrid(cols: cols, rows: rows) // what is under each cell so far, for the under blend
    for el in withMasks(elements) where !el.hidden {
        for dy in 0..<el.height {
            let r = el.row + dy
            guard r >= 0, r < rows else { continue }
            let line = dy < el.template.count ? Array(el.template[dy]) : []
            for dx in 0..<el.width {
                let c = el.col + dx, ch = dx < line.count ? line[dx] : " "
                guard c >= 0, c < cols, lands(el, ch, drawn[r][c]) else { continue }
                drawn[r][c] = ch
                mask.ink[r][c] = el.ink ?? -1
                mask.paper[r][c] = el.paper ?? -1
            }
        }
    }
    return mask
}

private func sgr(_ i: Int, _ base: Int) -> Int { i < 8 ? base + i : base + 60 + i - 8 }

/// The grid as ANSI text: SGR colors on runs that carry them, reset at the end of each run.
func toAnsi(_ grid: Grid, _ mask: ColorMask) -> String {
    var lines = grid.enumerated().map { r, row -> String in
        var out = "", on = ""
        var end = row.count
        while end > 0 && row[end - 1] == " " && mask.paper[r][end - 1] < 0 { end -= 1 }
        for c in 0..<end {
            let i = mask.ink[r][c], p = mask.paper[r][c]
            let want = [i >= 0 ? "\(sgr(i, 30))" : nil, p >= 0 ? "\(sgr(p, 40))" : nil].compactMap { $0 }.joined(separator: ";")
            if want != on { if !on.isEmpty { out += "\u{1B}[0m" }; if !want.isEmpty { out += "\u{1B}[\(want)m" }; on = want }
            out.append(row[c].unicodeScalars.contains { $0.properties.generalCategory == .control } ? " " : row[c]) // never a raw escape
        }
        return out + (on.isEmpty ? "" : "\u{1B}[0m")
    }
    while lines.last == "" { lines.removeLast() }
    return lines.joined(separator: "\n")
}
