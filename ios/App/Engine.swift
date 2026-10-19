// Canvas engine — manages a 2D character grid.
// Grid coordinate system: (col, row), 0-indexed.
//
// Ported function-for-function from src/lib/engine.js so the two stay diffable.
// ponytail: no cloneGrid() — Swift arrays are value types, so every `var next = grid`
// is already the deep copy the JS version had to write by hand.

import Foundation

typealias Grid = [[Character]]

let defaultCols = 100
let defaultRows = 50

func createGrid(cols: Int = defaultCols, rows: Int = defaultRows) -> Grid {
    Array(repeating: Array(repeating: " " as Character, count: cols), count: rows)
}

func gridToText(_ grid: Grid) -> String {
    grid.map { String($0) }.joined(separator: "\n")
}

func textToGrid(_ text: String, cols: Int = defaultCols, rows: Int = defaultRows) -> Grid {
    var grid = createGrid(cols: cols, rows: rows)
    for (r, line) in text.split(separator: "\n", omittingEmptySubsequences: false).enumerated() {
        if r >= rows { break }
        for (c, ch) in line.enumerated() {
            if c >= cols { break }
            grid[r][c] = ch
        }
    }
    return grid
}

/// Stamp a component template onto the grid at (col, row). Clips at every edge.
func stampComponent(_ grid: Grid, template: [String], col: Int, row: Int) -> Grid {
    var next = grid
    let rows = grid.count
    guard rows > 0 else { return next }
    let cols = grid[0].count

    for (dy, line) in template.enumerated() {
        let r = row + dy
        if r < 0 || r >= rows { continue }
        for (dx, ch) in line.enumerated() {
            let c = col + dx
            if c < 0 || c >= cols { continue }
            next[r][c] = ch
        }
    }
    return next
}

/// Set a single character. Out-of-bounds writes return the grid untouched.
func setChar(_ grid: Grid, col: Int, row: Int, char: Character?) -> Grid {
    guard row >= 0, row < grid.count else { return grid }
    guard col >= 0, col < grid[0].count else { return grid }
    var next = grid
    next[row][col] = char ?? " "
    return next
}

func eraseRegion(_ grid: Grid, col: Int, row: Int, width: Int, height: Int) -> Grid {
    var next = grid
    for dy in 0..<max(0, height) {
        let r = row + dy
        if r < 0 || r >= grid.count { continue }
        for dx in 0..<max(0, width) {
            let c = col + dx
            if c < 0 || c >= grid[0].count { continue }
            next[r][c] = " "
        }
    }
    return next
}

/// Pixel coordinate → grid cell, given character dimensions.
func pxToCell(px: Double, py: Double, charW: Double, charH: Double) -> (col: Int, row: Int) {
    guard charW > 0, charH > 0 else { return (0, 0) }
    return (Int(floor(px / charW)), Int(floor(py / charH)))
}

// MARK: - Editor state

/// The elements plus their undo/redo history. 50 steps each way, matching the web app.
/// `grid` is always the render output of `elements`, never edited directly.
struct EditorState {
    static let historyLimit = 50

    private(set) var cols: Int
    private(set) var rows: Int
    var elements: [Element] = [] {
        didSet { // restack auto-layout screens (Layout.swift); this assignment does not call didSet again
            let laid = autoLayout(oldValue, elements)
            if laid != elements { elements = laid }
            grid = renderElements(elements, cols: cols, rows: rows)
        }
    }
    private(set) var grid: Grid
    private(set) var history: [[Element]] = []
    private(set) var future: [[Element]] = []
    var snapshots: [CanvasSnapshot] = [] // History.swift; saved with the project
    var actions: [CanvasAction] = [] // Actions.swift; saved with the project
    var recording: Int? = nil // the history count when Record was pressed

    init(cols: Int = defaultCols, rows: Int = defaultRows) {
        self.cols = cols
        self.rows = rows
        self.grid = createGrid(cols: cols, rows: rows)
    }

    /// The canvas grows to hold whatever is on it (screens side by side), up to the 500 cell limit files allow.
    mutating func fitCanvas() {
        let right = elements.map { $0.col + $0.width }.max() ?? 0, bottom = elements.map { $0.row + $0.height }.max() ?? 0
        let c = min(500, max(cols, right + 2)), r = min(500, max(rows, bottom + 2))
        guard c != cols || r != rows else { return }
        cols = c
        rows = r
        grid = renderElements(elements, cols: cols, rows: rows)
    }

    var canUndo: Bool { !history.isEmpty }
    var canRedo: Bool { !future.isEmpty }

    /// Call immediately BEFORE mutating `elements`, so the pre-edit state is what gets restored.
    mutating func pushHistory() {
        history.append(elements)
        if history.count > Self.historyLimit { history.removeFirst(history.count - Self.historyLimit) }
        future.removeAll()
    }

    mutating func undo() {
        guard let previous = history.popLast() else { return }
        future.insert(elements, at: 0)
        if future.count > Self.historyLimit { future.removeLast(future.count - Self.historyLimit) }
        elements = previous
    }

    mutating func redo() {
        guard !future.isEmpty else { return }
        let next = future.removeFirst()
        history.append(elements)
        if history.count > Self.historyLimit { history.removeFirst(history.count - Self.historyLimit) }
        elements = next
    }

    var text: String { gridToText(grid) }
}

// MARK: - Elements

/// A placed, selectable, movable object. Later elements paint over earlier ones.
struct Element: Equatable, Identifiable {
    let id: String
    var presetId: String
    var label: String
    var template: [String]
    var width: Int
    var height: Int
    var col: Int
    var row: Int
    /// A line's two ends. Nil for everything but lines.
    var from: Anchor? = nil
    var to: Anchor? = nil
    /// A banner's words. Its template is the big letters drawn from them.
    var text: String? = nil
    /// Box style: double, rounded, heavy or ascii. Nil is the light single line.
    var style: String? = nil
    /// Drawn in the accent on the canvas. Copied text never carries it.
    var accent = false
    /// Parts sharing a group move as one.
    var group: String? = nil
    /// A hidden layer is not drawn or copied; a locked one cannot be picked or moved on the canvas.
    var hidden = false
    var locked = false
    /// Copies of one symbol share this id and share their content.
    var symbol: String? = nil
    /// Pressed, disabled or error, drawn in the characters (Shapes.swift). Nil is the default state.
    var variant: String? = nil
    /// A note for a person or an agent to act on (Shapes.swift). Never in copied text.
    var note: String? = nil
    /// Takes of one screen share this tag (Tweaks.swift), so Keep this one can clear the rest.
    var take: String? = nil
    /// Ink and paper, terminal color indexes 0 to 15 (Color.swift). Never in copied text.
    var ink: Int? = nil
    var paper: Int? = nil
    /// An adjustment layer's kind (Shapes.swift): it changes what is drawn under it, in its area.
    var adjust: String? = nil
    /// A crop and a clip to another part (Mask.swift), applied when drawn. The template keeps every character.
    var mask: Inset? = nil
    var clip: String? = nil
    /// How the part meets what is under it (Lines.swift blends): over, under or knockout; nil joins lines.
    var blend: String? = nil
    var auto: AutoLayout? = nil // a screen's auto layout (Layout.swift)
}

private var nextElementId = 1

func newElementId() -> String {
    defer { nextElementId += 1 }
    return "el-\(nextElementId)"
}

func createElement(_ preset: Preset, col: Int, row: Int) -> Element {
    Element(id: newElementId(), presetId: preset.id, label: preset.label, template: preset.template,
            width: preset.width, height: preset.height, col: col, row: row, text: preset.text)
}

/// Topmost element whose bounding box contains (col, row), or nil.
func elementAt(_ elements: [Element], col: Int, row: Int) -> Element? {
    elements.last { el in
        guard el.presetId != "adjust", !el.hidden && !el.locked && col >= el.col && col < el.col + el.width && row >= el.row && row < el.row + el.height else { return false }
        if el.presetId == "paint", row - el.row < el.template.count { // only its marks
            let line = Array(el.template[row - el.row])
            return col - el.col < line.count && line[col - el.col] != " "
        }
        return true
    }
}

func moveElement(_ elements: [Element], id: String, col: Int, row: Int) -> [Element] {
    let target = elements.first { $0.id == id }
    if target?.locked == true { return elements }
    // A screen carries the parts inside it, and a grouped part its group.
    let carried = Set((target.map { $0.presetId == "screen" ? partsInside(elements, $0) : [] } ?? []).map(\.id)
                      + groupMates(elements, target).map(\.id))
    return routeLines(elements.map { el in
        if carried.contains(el.id), let target { return carry(el, dCol: col - target.col, dRow: row - target.row) }
        guard el.id == id else { return el }
        if el.presetId == "line", el.from != nil { return shiftLine(el, dCol: col - el.col, dRow: row - el.row) }
        var moved = el
        moved.col = col
        moved.row = row
        return moved
    })
}

/// Arrows that ran through the part join up across the gap (Heal.swift).
func deleteElement(_ elements: [Element], id: String) -> [Element] {
    closeLines(elements, id).filter { $0.id != id }
}

/// Resize character art without stretching its text. Keep line endings and box borders.
func resizeTemplate(_ template: [String], width: Int, height: Int) -> [String] {
    let lines = template.map(Array.init)
    let boxed = lines.count > 1 && "┌╭┏".contains(lines[0].first ?? " ") && "└╰┗".contains(lines[lines.count - 1].first ?? " ")
    func fit(_ chars: [Character]) -> String {
        let end = chars.last
        let bordered = end.map { "┐┤┘╮╯┓┫┛│┃]".contains($0) } ?? false
        let body = bordered ? Array(chars.dropLast()) : chars
        let rest = body.dropFirst()
        let fill: Character = !rest.isEmpty && rest.allSatisfy({ "─━_".contains($0) }) ? body[1] : " "
        let size = max(0, width - (bordered ? 1 : 0))
        var out = Array(body.prefix(size))
        if size > body.count { out += Array(repeating: fill, count: size - body.count) }
        if bordered, let end { out.append(end) }
        return String(out)
    }
    return (0..<max(0, height)).map { row in
        if boxed && row == height - 1 { return fit(lines[lines.count - 1]) }
        if boxed && row >= lines.count - 1 {
            let mid = lines[1]
            return fit([mid.first ?? " "] + Array(repeating: " ", count: max(0, mid.count - 2)) + [mid.last ?? " "])
        }
        return fit(row < lines.count ? lines[row] : [])
    }
}

/// Resize an element. Width is at least 2 and height at least 1, as on the web.
func updateElement(_ elements: [Element], id: String, width: Int, height: Int) -> [Element] {
    syncSymbol(routeLines(elements.map { el in
        guard el.id == id else { return el }
        var next = el
        if sized.contains(el.presetId) { return el } // cells, numbers and messages size these
        if el.presetId == "fill" { // a resize refills it with its one shade
            next.width = max(1, width); next.height = max(1, height)
            next.template = fillTemplate(el.template.first?.first ?? "▒", width: next.width, height: next.height)
            return next
        }
        if el.presetId == "screen" {
            next.width = max(6, width)
            next.height = max(3, height)
            next.template = screenFrame(el.text ?? "Screen", width: next.width, height: next.height)
            return next
        }
        next.width = max(2, width)
        next.height = max(1, height)
        next.template = resizeTemplate(el.template, width: next.width, height: next.height)
        return next
    }), id: id)
}

/// Replace an element's text. Its size follows the text.
func updateElement(_ elements: [Element], id: String, text: String) -> [Element] {
    syncSymbol(routeLines(elements.map { el in
        guard el.id == id else { return el }
        var next = el
        if el.presetId == "screen" {
            next.text = text
            next.template = screenFrame(text, width: el.width, height: el.height)
            return next
        }
        if el.presetId == "table" { return withCells(el, textCells(text)) }
        if el.presetId == "node" {
            next.text = text
            next.template = nodeFrame(text)
            next.width = next.template[0].count
            next.height = next.template.count
            return next
        }
        if let drawn = contentFrame(el.presetId, text) { // a chart, sequence diagram or tree, kept as its text
            next.text = text
            next.template = drawn
            next.width = next.template.map(\.count).max() ?? 1
            next.height = next.template.count
            return next
        }
        if el.presetId == "banner" {
            next.text = text
            next.template = bannerText(text)
            next.width = max(1, next.template[0].count)
            next.height = next.template.count
            return next
        }
        next.template = text.replacingOccurrences(of: "\r\n", with: "\n").replacingOccurrences(of: "\r", with: "\n")
            .split(separator: "\n", omittingEmptySubsequences: false).map(String.init)
        next.width = max(1, next.template.map(\.count).max() ?? 0)
        next.height = next.template.count
        return next
    }), id: id)
}

/// Keep a moved element on the canvas.
func nudgeElement(_ elements: [Element], id: String, dCol: Int, dRow: Int,
                  cols: Int = defaultCols, rows: Int = defaultRows) -> [Element] {
    guard let el = elements.first(where: { $0.id == id }) else { return elements }
    let col = max(0, min(cols - el.width, el.col + dCol))
    let row = max(0, min(rows - el.height, el.row + dRow))
    return moveElement(elements, id: id, col: col, row: row)
}

/// Later elements paint over earlier ones, so order is the z-index.
func reorderElement(_ elements: [Element], id: String, toBack: Bool) -> [Element] {
    guard let el = elements.first(where: { $0.id == id }) else { return elements }
    let rest = elements.filter { $0.id != id }
    return toBack ? [el] + rest : rest + [el]
}

/// Drop trailing spaces and blank rows so exports are not a 100x50 block of padding.
func trimText(_ text: String) -> String {
    var lines = text.split(separator: "\n", omittingEmptySubsequences: false)
        .map { String($0.reversed().drop(while: \.isWhitespace).reversed()) }
    while lines.last?.isEmpty == true { lines.removeLast() }
    return lines.joined(separator: "\n")
}

func toMarkdown(_ text: String) -> String {
    "```\n" + trimText(text) + "\n```"
}
