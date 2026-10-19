import Foundation

/// Grids (v49), after Figma's layout grids. A screen with a column grid shows that many bands inside its frame,
/// `gutter` cells apart and from the edges, and a dragged part snaps its left or right edge to a band. The grid
/// is never drawn into the text. src/lib/grids.js is the twin.
let gridMax = 24

struct ColumnGrid: Equatable {
    var cols = 4
    var gutter = 1
}

func cleanGrid(_ value: Any?) -> ColumnGrid? {
    guard let g = value as? [String: Any] else { return nil }
    func n(_ k: String, _ range: ClosedRange<Int>, _ d: Int) -> Int {
        guard let v = g[k] as? NSNumber, CFGetTypeID(v) != CFBooleanGetTypeID(), let i = Int(exactly: v.doubleValue), range.contains(i) else { return d }
        return i
    }
    return ColumnGrid(cols: n("cols", 1...gridMax, 4), gutter: n("gutter", 0...8, 1))
}

/// The column bands of a screen, in canvas cells. Empty when the bands would not fit.
func gridColumns(_ screen: Element) -> [(col: Int, width: Int)] {
    guard let g = screen.grid else { return [] }
    let width = (screen.width - 2 - g.gutter * (g.cols + 1)) / g.cols
    guard width >= 1 else { return [] }
    let start = screen.col + 1 + g.gutter + (screen.width - 2 - width * g.cols - g.gutter * (g.cols + 1)) / 2 // centred
    return (0..<g.cols).map { (start + $0 * (width + g.gutter), width) }
}

/// After snapPosition: a part whose left or right edge comes within reach of a band edge on its screen moves onto it.
func snapToGrid(_ elements: [Element], id: String, _ snap: (col: Int, row: Int, guideCols: [Int], guideRows: [Int]), reach: Int = 2)
    -> (col: Int, row: Int, guideCols: [Int], guideRows: [Int]) {
    guard let el = elements.first(where: { $0.id == id }),
          let screen = elements.first(where: { s in s.presetId == "screen" && s.grid != nil && s.id != id && snap.col >= s.col && snap.row >= s.row
              && snap.col + el.width <= s.col + s.width && snap.row + el.height <= s.row + s.height }) else { return snap }
    var best: (d: Int, col: Int, guide: Int)?
    for band in gridColumns(screen) {
        // the part's left edge on the band's left edge, or its right edge on the band's right edge
        for (col, guide) in [(band.col, band.col), (band.col + band.width - el.width, band.col + band.width - 1)] {
            let d = abs(snap.col - col)
            if d <= reach && (best == nil || d < best!.d) { best = (d, col, guide) }
        }
    }
    guard let best else { return snap }
    return (best.col, snap.row, snap.guideCols + [best.guide], snap.guideRows)
}

func updateElement(_ elements: [Element], id: String, grid: ColumnGrid?) -> [Element] {
    elements.map { el in
        guard el.id == id, el.presetId == "screen" else { return el }
        var next = el
        next.grid = grid.map { ColumnGrid(cols: max(1, min(gridMax, $0.cols)), gutter: max(0, min(8, $0.gutter))) }
        return next
    }
}

/// Every screen takes this screen's grid, or loses its own when it has none.
func gridEverywhere(_ elements: [Element], id: String) -> [Element] {
    let grid = elements.first { $0.id == id }?.grid
    return elements.map { el in
        guard el.presetId == "screen", el.id != id else { return el }
        var next = el; next.grid = grid; return next
    }
}
