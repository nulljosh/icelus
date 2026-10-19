// Selections pick cells, not parts, a port of src/lib/select.js: a marquee picks a rectangle, the magic
// wand the run of matching characters around a cell. What a selection holds is its painted cells and every
// whole part inside it, so cut, move and fill never cut a box open. Copy takes the characters as they show.

import Foundation

private let maxWand = 250_000

/// The cells of the rectangle with corners a and b, clipped to the grid.
func marquee(_ a: (Int, Int), _ b: (Int, Int), cols: Int, rows: Int) -> [(Int, Int)] {
    let c0 = max(0, min(a.0, b.0)), c1 = min(cols - 1, max(a.0, b.0))
    let r0 = max(0, min(a.1, b.1)), r1 = min(rows - 1, max(a.1, b.1))
    guard c0 <= c1, r0 <= r1 else { return [] }
    return (r0...r1).flatMap { r in (c0...c1).map { c in (c, r) } }
}

/// The magic wand: every cell joined to (col, row) by sides that shows the same character.
func wand(_ grid: Grid, col: Int, row: Int) -> [(Int, Int)] {
    let rows = grid.count, cols = grid.first?.count ?? 0
    guard col >= 0, row >= 0, col < cols, row < rows else { return [] }
    let ch = grid[row][col]
    var seen: Set<Int> = [row * cols + col], out: [(Int, Int)] = [], todo = [(col, row)]
    while let (c, r) = todo.popLast(), out.count < maxWand {
        out.append((c, r))
        for (nc, nr) in [(c + 1, r), (c - 1, r), (c, r + 1), (c, r - 1)] {
            guard nc >= 0, nr >= 0, nc < cols, nr < rows, grid[nr][nc] == ch, seen.insert(nr * cols + nc).inserted else { continue }
            todo.append((nc, nr))
        }
    }
    return out
}

/// The characters under the selection as text: its bounding box, cells outside it blank, blank edges trimmed.
func cellText(_ grid: Grid, _ cells: [(Int, Int)]) -> String {
    guard !cells.isEmpty else { return "" }
    let c0 = cells.map(\.0).min()!, r0 = cells.map(\.1).min()!
    let w = cells.map(\.0).max()! - c0 + 1, h = cells.map(\.1).max()! - r0 + 1
    var g = Array(repeating: Array(repeating: Character(" "), count: w), count: h)
    for (c, r) in cells where r < grid.count && c < grid[r].count { g[r - r0][c - c0] = grid[r][c] }
    var lines = g.map { String($0).replacingOccurrences(of: "\\s+$", with: "", options: .regularExpression) }
    while lines.first == "" { lines.removeFirst() }
    while lines.last == "" { lines.removeLast() }
    let indent = lines.filter { !$0.isEmpty }.map { $0.prefix { $0 == " " }.count }.min() ?? 0
    return lines.map { String($0.dropFirst(min(indent, $0.count))) }.joined(separator: "\n")
}

/// The parts (not paint) whose every cell is selected. Locked and hidden parts are never taken.
func partsWithin(_ elements: [Element], _ cells: [(Int, Int)]) -> [Element] {
    let set = Set(cells.map { "\($0.0),\($0.1)" })
    return elements.filter { el in
        guard el.presetId != "paint", !el.locked, !el.hidden else { return false }
        for r in el.row..<(el.row + el.height) { for c in el.col..<(el.col + el.width) where !set.contains("\(c),\(r)") { return false } }
        return true
    }
}

/// The painted characters under the selection, topmost first.
private func paintedAt(_ elements: [Element], _ cells: [(Int, Int)]) -> [(Int, Int, Character)] {
    let set = Set(cells.map { "\($0.0),\($0.1)" })
    var got: [String: (Int, Int, Character)] = [:], order: [String] = []
    for el in elements.reversed() where el.presetId == "paint" && !el.hidden && !el.locked {
        for (dy, line) in el.template.enumerated() {
            for (dx, ch) in line.enumerated() {
                let k = "\(el.col + dx),\(el.row + dy)"
                guard ch != " ", set.contains(k), got[k] == nil else { continue }
                got[k] = (el.col + dx, el.row + dy, ch); order.append(k)
            }
        }
    }
    return order.compactMap { got[$0] }
}

/// Cut: the painted cells and the whole parts inside the selection are taken away.
func cutCells(_ elements: [Element], _ cells: [(Int, Int)]) -> [Element] {
    let gone = Set(partsWithin(elements, cells).map(\.id))
    return erase(elements.filter { !gone.contains($0.id) }, cells: cells)
}

/// Fill the selection with one character, as one new stroke of paint.
func fillCells(_ elements: [Element], _ cells: [(Int, Int)], char: String) -> [Element] { paint(elements, cells: cells, char: char) }

/// Move what the selection holds: its paint as new strokes, its whole parts as parts (screens first).
func moveCells(_ elements: [Element], _ cells: [(Int, Int)], dCol: Int, dRow: Int, cols: Int, rows: Int) -> [Element] {
    guard dCol != 0 || dRow != 0 else { return elements }
    let marks = paintedAt(elements, cells).map { ($0.0 + dCol, $0.1 + dRow, $0.2) }.filter { $0.0 >= 0 && $0.1 >= 0 && $0.0 < cols && $0.1 < rows }
    var out = erase(elements, cells: cells)
    let parts = partsWithin(elements, cells).sorted { ($0.presetId == "screen" ? 0 : 1) < ($1.presetId == "screen" ? 0 : 1) }
    for el in parts { out = moveElement(out, id: el.id, col: el.col + dCol, row: el.row + dRow) }
    return paintMarks(out, marks.map { ($0.0, $0.1, String($0.2)) })
}

/// The selection moved, clipped to the grid: where it sits after a move.
func shiftCells(_ cells: [(Int, Int)], dCol: Int, dRow: Int, cols: Int, rows: Int) -> [(Int, Int)] {
    cells.map { ($0.0 + dCol, $0.1 + dRow) }.filter { $0.0 >= 0 && $0.1 >= 0 && $0.0 < cols && $0.1 < rows }
}
