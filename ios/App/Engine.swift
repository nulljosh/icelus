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
        didSet { grid = renderElements(elements, cols: cols, rows: rows) }
    }
    private(set) var grid: Grid
    private(set) var history: [[Element]] = []
    private(set) var future: [[Element]] = []

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

func deleteElement(_ elements: [Element], id: String) -> [Element] {
    elements.filter { $0.id != id }
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

// MARK: - Project files

/// The shared project file: the same JSON the web app saves, opens and exports.
func serializeProject(_ state: EditorState) -> String {
    func anchor(_ a: Anchor) -> [String: Any] {
        var out: [String: Any] = ["col": a.col, "row": a.row]
        if let id = a.id { out["id"] = id; out["dCol"] = a.dCol; out["dRow"] = a.dRow }
        if a.edge { out["edge"] = true }
        if let side = a.side { out["side"] = side }
        return out
    }
    let elements: [[String: Any]] = state.elements.map {
        var el: [String: Any] = ["id": $0.id, "presetId": $0.presetId, "label": $0.label, "template": $0.template,
                                 "width": $0.width, "height": $0.height, "col": $0.col, "row": $0.row]
        if let from = $0.from, let to = $0.to { el["from"] = anchor(from); el["to"] = anchor(to) }
        if let text = $0.text { el["text"] = text }
        if let style = $0.style { el["style"] = style }
        if $0.accent { el["accent"] = true }
        if let group = $0.group { el["group"] = group }
        if $0.hidden { el["hidden"] = true }
        if $0.locked { el["locked"] = true }
        if let symbol = $0.symbol { el["symbol"] = symbol }
        if let variant = $0.variant { el["variant"] = variant }
        if let note = $0.note { el["note"] = note }
        if let take = $0.take { el["take"] = take }
        if let ink = $0.ink { el["ink"] = ink }
        if let paper = $0.paper { el["paper"] = paper }
        if let adjust = $0.adjust { el["adjust"] = adjust }
        if let m = $0.mask { el["mask"] = ["top": m.top, "right": m.right, "bottom": m.bottom, "left": m.left] }
        if let clip = $0.clip { el["clip"] = clip }
        if let blend = $0.blend { el["blend"] = blend }
        return el
    }
    let project: [String: Any] = ["blockprint": 1, "cols": state.cols, "rows": state.rows, "elements": elements]
    guard let data = try? JSONSerialization.data(withJSONObject: project, options: [.sortedKeys]) else { return "" }
    return String(data: data, encoding: .utf8) ?? ""
}

/// Lenient, like the web: broken elements are dropped, a bad size falls back to the default, ids are fresh.
func parseProject(_ json: String) -> EditorState? {
    guard let data = json.data(using: .utf8),
          let project = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
          let raw = project["elements"] as? [Any] else { return nil }
    func size(_ value: Any?, _ fallback: Int) -> Int {
        guard let n = value as? Int, n > 0, n <= 500 else { return fallback }
        return n
    }
    var state = EditorState(cols: size(project["cols"], defaultCols), rows: size(project["rows"], defaultRows))
    let valid = raw.compactMap { $0 as? [String: Any] }.filter { $0["template"] is [String] }
    // Ids are fresh on open, so pinned line ends are re-pointed at the new ids.
    let fresh = valid.map { _ in newElementId() }
    var ids: [String: String] = [:]
    for (i, el) in valid.enumerated() {
        if let old = el["id"] as? String, ids[old] == nil { ids[old] = fresh[i] }
    }
    func anchor(_ value: Any?) -> Anchor? {
        guard let a = value as? [String: Any] else { return nil }
        var out = Anchor(col: a["col"] as? Int ?? 0, row: a["row"] as? Int ?? 0)
        if let old = a["id"] as? String, let id = ids[old] {
            out.id = id
            out.dCol = a["dCol"] as? Int ?? 0
            out.dRow = a["dRow"] as? Int ?? 0
        }
        out.edge = a["edge"] as? Bool ?? false
        if let side = a["side"] as? String, ["left", "below"].contains(side) { out.side = side }
        return out
    }
    state.elements = valid.enumerated().map { i, el in
        let template = el["template"] as? [String] ?? []
        let from = anchor(el["from"]), to = anchor(el["to"])
        let pinned = from != nil && to != nil
        return Element(id: fresh[i], presetId: el["presetId"] as? String ?? "custom",
                       label: el["label"] as? String ?? "Element", template: template,
                       width: max(1, template.map(\.count).max() ?? 0), height: template.count,
                       col: el["col"] as? Int ?? 0, row: el["row"] as? Int ?? 0,
                       from: pinned ? from : nil, to: pinned ? to : nil, text: el["text"] as? String,
                       style: (el["style"] as? String).flatMap { boxStyles.contains($0) && $0 != "single" ? $0 : nil },
                       accent: el["accent"] as? Bool == true, group: el["group"] as? String,
                       hidden: el["hidden"] as? Bool == true, locked: el["locked"] as? Bool == true, symbol: el["symbol"] as? String,
                       variant: (el["variant"] as? String).flatMap { variants.contains($0) && $0 != "default" ? $0 : nil },
                       note: (el["note"] as? String).map(cleanNote).flatMap { $0.isEmpty ? nil : $0 },
                       take: (el["take"] as? String).flatMap { $0.count <= 64 ? $0 : nil },
                       ink: colorIndex(el["ink"]), paper: colorIndex(el["paper"]),
                       adjust: (el["adjust"] as? String).flatMap { el["presetId"] as? String == "adjust" && adjustments.contains($0) ? $0 : nil })
    }
    for (i, el) in valid.enumerated() { // masks keep pointing at the clip part's new id
        state.elements[i].mask = cleanMask(el["mask"])
        state.elements[i].blend = cleanBlend(el["blend"])
        if let old = el["clip"] as? String, let id = ids[old], id != fresh[i] { state.elements[i].clip = id }
    }
    return state
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
