// Brush and eraser, a port of src/lib/brush.js. A stroke is the cells the finger crossed, joined with
// straight runs and widened to a square tip one to five cells across. Painting adds one see-through
// `paint` part per stroke; the eraser clears painted cells only, so a part is never cut open.

import Foundation

let brushSizes = [1, 2, 3, 4, 5]
let brushChars = ["█", "▓", "▒", "░", "•", "*", "#", "."]
private let maxCells = 20_000

/// The square tip at a cell: size cells across, centred, the extra cell going right and down.
func tip(_ col: Int, _ row: Int, size: Int = 1) -> [(Int, Int)] {
    let s = max(1, min(5, size)), lo = -((s - 1) / 2)
    var cells: [(Int, Int)] = []
    for dr in lo..<(lo + s) { for dc in lo..<(lo + s) { cells.append((col + dc, row + dr)) } }
    return cells
}

/// Every cell on a straight run from a to b, ends included (Bresenham).
func run(_ a: (Int, Int), _ b: (Int, Int)) -> [(Int, Int)] {
    var cells: [(Int, Int)] = []
    var (c, r) = a
    let (c1, r1) = b, dc = abs(c1 - c), dr = -abs(r1 - r), sc = c < c1 ? 1 : -1, sr = r < r1 ? 1 : -1
    var err = dc + dr
    while true {
        cells.append((c, r))
        if c == c1 && r == r1 { return cells }
        let e2 = 2 * err
        if e2 >= dr { err += dr; c += sc }
        if e2 <= dc { err += dc; r += sr }
    }
}

/// The cells a stroke covers on the grid: the points joined, widened to the tip, no repeats.
func strokeCells(_ points: [(Int, Int)], size: Int, cols: Int, rows: Int) -> [(Int, Int)] {
    var seen = Set<Int>(), out: [(Int, Int)] = []
    for (i, p) in points.enumerated() {
        for (c, r) in i == 0 ? [p] : run(points[i - 1], p) {
            for (tc, tr) in tip(c, r, size: size) {
                guard tc >= 0, tr >= 0, tc < cols, tr < rows, out.count < maxCells, seen.insert(tr * cols + tc).inserted else { continue }
                out.append((tc, tr))
            }
        }
    }
    return out
}

/// One printable character, or the full block.
func brushChar(_ ch: String?) -> String {
    guard let first = ch?.first, !first.isWhitespace,
          !first.unicodeScalars.contains(where: { $0.properties.generalCategory == .control }) else { return "█" }
    return String(first)
}

/// Paint marks (col, row, character): one new see-through part over their bounding box.
func paintMarks(_ elements: [Element], _ marks: [(Int, Int, String)]) -> [Element] {
    guard !marks.isEmpty else { return elements }
    let c0 = marks.map(\.0).min()!, r0 = marks.map(\.1).min()!
    let width = marks.map(\.0).max()! - c0 + 1, height = marks.map(\.1).max()! - r0 + 1
    var g = Array(repeating: Array(repeating: Character(" "), count: width), count: height)
    for (c, r, ch) in marks { g[r - r0][c - c0] = Character(brushChar(ch)) }
    return elements + [Element(id: newElementId(), presetId: "paint", label: "Paint", template: g.map { String($0) },
                               width: width, height: height, col: c0, row: r0)]
}

/// Paint cells with one character.
func paint(_ elements: [Element], cells: [(Int, Int)], char: String) -> [Element] { paintMarks(elements, cells.map { ($0.0, $0.1, char) }) }

/// Clear painted cells under the eraser. A paint part left empty is removed; other parts are untouched.
func erase(_ elements: [Element], cells: [(Int, Int)]) -> [Element] {
    guard !cells.isEmpty else { return elements }
    let hit = Set(cells.map { "\($0.0),\($0.1)" })
    return elements.compactMap { el in
        guard el.presetId == "paint", !el.locked, !el.hidden else { return el }
        var changed = false
        let template = el.template.enumerated().map { dy, line in
            String(line.enumerated().map { dx, ch -> Character in
                guard ch != " ", hit.contains("\(el.col + dx),\(el.row + dy)") else { return ch }
                changed = true
                return " "
            })
        }
        guard changed else { return el }
        guard template.contains(where: { !$0.trimmingCharacters(in: .whitespaces).isEmpty }) else { return nil }
        var out = el
        out.template = template
        return out
    }
}
