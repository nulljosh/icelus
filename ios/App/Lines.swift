// Lines, connectors, see-through text and banners. Split out of Engine.swift to keep each file small;
// still a line-for-line port of the matching parts of src/lib/engine.js.

import Foundation

/// One end of a line: pinned to a part, so it follows it, or loose on the canvas.
struct Anchor: Equatable {
    var col: Int
    var row: Int
    var id: String? = nil
    var dCol = 0
    var dRow = 0
    /// A flowchart arrow: it starts as a half stroke on its box (`edge`) and comes into the next box's
    /// left side, or under both boxes for a loop back (`side`: left or below).
    var edge = false
    var side: String? = nil
}
/// Box-drawing joins: each light line character as the sides it reaches (up 8, right 4, down 2, left 1).
private let links: [Character: Int] = ["─": 5, "│": 10, "┌": 6, "┐": 3, "└": 12, "┘": 9, "├": 14, "┤": 11, "┬": 7, "┴": 13, "┼": 15,
                                              "╶": 4, "╴": 1, "╷": 2, "╵": 8]
private let joins: [Int: Character] = Dictionary(uniqueKeysWithValues: links.map { ($1, $0) })

/// A color index from a project file: a whole number 0 to 15, never a Bool or a fraction.
func colorIndex(_ v: Any?) -> Int? {
    guard let n = v as? NSNumber, CFGetTypeID(n) != CFBooleanGetTypeID(), n.doubleValue == Double(n.intValue), (0...15).contains(n.intValue) else { return nil }
    return n.intValue
}

let seeThroughParts: Set<String> = ["line", "text", "banner", "screen", "paint", "adjust"]
private var seeThrough: Set<String> { seeThroughParts }


/// A 3 by 5 pixel font. Each glyph is five rows of three bits, top to bottom.
private let font: [Character: String] = [
    "A": "010101111101101", "B": "110101110101110", "C": "011100100100011", "D": "110101101101110", "E": "111100110100111",
    "F": "111100110100100", "G": "011100101101011", "H": "101101111101101", "I": "111010010010111", "J": "001001001101010",
    "K": "101101110101101", "L": "100100100100111", "M": "101111111101101", "N": "110101101101101", "O": "010101101101010",
    "P": "110101110100100", "Q": "010101101110011", "R": "110101110101101", "S": "011100010001110", "T": "111010010010010",
    "U": "101101101101111", "V": "101101101101010", "W": "101101111111101", "X": "101101010101101", "Y": "101101010010010",
    "Z": "111001010100111", "0": "111101101101111", "1": "010110010010111", "2": "110001010100111", "3": "110001010001110",
    "4": "101101111001001", "5": "111100110001110", "6": "011100111101111", "7": "111001010010010", "8": "111101111101111",
    "9": "111101111001110", " ": "000000000000000", "!": "010010010000010", "?": "110001010000010", ".": "000000000000010",
    "-": "000000111000000",
]

/// Big text for titles: two pixel rows per text row with half blocks, so a banner is 3 rows tall.
func bannerText(_ text: String) -> [String] {
    let words = text.split(whereSeparator: \.isWhitespace).joined(separator: " ").uppercased()
    let glyphs = words.map { Array(font[$0] ?? font[" "]!) }
    func on(_ g: [Character], _ x: Int, _ y: Int) -> Bool { y < 5 && g[y * 3 + x] == "1" }
    return [0, 2, 4].map { y in
        glyphs.map { g in
            String((0..<3).map { x -> Character in
                let top = on(g, x, y), bottom = on(g, x, y + 1)
                return top && bottom ? "█" : top ? "▀" : bottom ? "▄" : " "
            })
        }.joined(separator: " ")
    }
}

/// Where two strokes cross, draw the character that joins them.
func joinChar(_ under: Character, _ over: Character) -> Character {
    guard let a = links[under], let b = links[over] else { return over }
    return joins[a | b]!
}

func renderElements(_ elements: [Element], cols: Int, rows: Int) -> Grid {
    var grid = createGrid(cols: cols, rows: rows)
    for el in withMasks(elements) where !el.hidden {
        if el.presetId == "adjust" { adjustGrid(&grid, el); continue }
        // Lines, text and banners are see-through: only their marks land on what is underneath (lands()).
        let plain = el.blend == "over" || el.blend == "knockout"
        for (dy, line) in el.template.enumerated() {
            let r = el.row + dy
            guard r >= 0 && r < rows else { continue }
            for (dx, ch) in line.enumerated() {
                let c = el.col + dx
                guard c >= 0 && c < cols, lands(el, ch, grid[r][c]) else { continue }
                // A styled box draws its own line set; joins only form between light strokes.
                grid[r][c] = el.variant.map { variantChar(ch, $0) } ?? el.style.map { styleChar(ch, $0) } ?? (plain ? ch : joinChar(grid[r][c], ch))
            }
        }
    }
    return grid
}

/// An elbow line from one cell to another: across first, then up or down, with an arrowhead at the end.
func lineShape(from: (col: Int, row: Int), to: (col: Int, row: Int), arrow: Bool = true, edge: Bool = false, side: String? = nil)
    -> (template: [String], width: Int, height: Int, col: Int, row: Int) {
    // A loop back in a flowchart goes under both boxes: down, across, up into the bottom of the earlier one.
    let lane: Int? = side == "below" ? max(from.row, to.row) + 2 : nil
    let col = min(from.col, to.col), row = min(from.row, to.row)
    let width = abs(to.col - from.col) + 1, height = (lane ?? max(from.row, to.row)) - row + 1
    let fc = from.col - col, fr = from.row - row, tc = to.col - col, tr = to.row - row
    var g = createGrid(cols: width, rows: height)
    if let lane {
        let lr = lane - row, left = tc < fc
        for r in fr...lr { g[r][fc] = "│" }
        for c in min(fc, tc)...max(fc, tc) { g[lr][c] = "─" }
        for r in tr...lr { g[r][tc] = "│" }
        g[lr][fc] = joins[8 | (left ? 1 : 4)]!
        g[lr][tc] = joins[8 | (left ? 4 : 1)]!
        if edge { g[fr][fc] = "╷" }
        if arrow { g[tr][tc] = "▲" }
        return (g.map { String($0) }, width, height, col, row)
    }
    // Into a box's left side from another row: across, down or up in the gap before the box, then across into it.
    if side == "left" && fr != tr {
        let mc = tc - 3 > fc ? tc - 3 : (fc + tc) / 2, down = tr > fr
        for c in min(fc, mc)...max(fc, mc) { g[fr][c] = "─" }
        for r in min(fr, tr)...max(fr, tr) { g[r][mc] = "│" }
        for c in min(mc, tc)...max(mc, tc) { g[tr][c] = "─" }
        g[fr][mc] = joins[(mc > fc ? 1 : 4) | (down ? 2 : 8)]!
        g[tr][mc] = joins[(down ? 8 : 2) | (tc > mc ? 4 : 1)]!
        if edge { g[fr][fc] = mc > fc ? "╶" : "╴" }
        if arrow { g[tr][tc] = tc < mc ? "◀" : "▶" }
        return (g.map { String($0) }, width, height, col, row)
    }
    for c in min(fc, tc)...max(fc, tc) { g[fr][c] = "─" }
    if fr != tr { for r in min(fr, tr)...max(fr, tr) { g[r][tc] = "│" } }
    if fc != tc && fr != tr { g[fr][tc] = joins[(tc > fc ? 1 : 4) | (tr > fr ? 2 : 8)]! }
    // A line that leaves a box's edge starts as a half stroke, so it joins the edge as ├ rather than crossing it.
    if edge && (fc != tc || fr != tr) { g[fr][fc] = fc != tc ? (tc > fc ? "╶" : "╴") : (tr > fr ? "╷" : "╵") }
    if arrow { g[tr][tc] = fr != tr ? (tr > fr ? "▼" : "▲") : (tc < fc ? "◀" : "▶") }
    return (g.map { String($0) }, width, height, col, row)
}

private func anchorAt(_ elements: [Element], col: Int, row: Int) -> Anchor {
    guard let el = elementAt(elements.filter { $0.presetId != "line" }, col: col, row: row) else {
        return Anchor(col: col, row: row)
    }
    return Anchor(col: col, row: row, id: el.id, dCol: col - el.col, dRow: row - el.row)
}

/// A screen is a frame with its name in the top border. It is see-through, so the parts inside it show.
func screenFrame(_ name: String, width: Int, height: Int) -> [String] {
    let w = max(6, width), h = max(3, height)
    let title = String(" \(name) ".prefix(w - 4))
    let top = "┌─" + title + String(repeating: "─", count: w - 3 - title.count) + "┐"
    return [top] + Array(repeating: "│" + String(repeating: " ", count: w - 2) + "│", count: h - 2)
        + ["└" + String(repeating: "─", count: w - 2) + "┘"]
}

/// The parts wholly inside a screen travel with it. A part across its edge stays where it is.
func partsInside(_ elements: [Element], _ frame: Element) -> [Element] {
    elements.filter {
        $0.id != frame.id && $0.presetId != "screen" && $0.col >= frame.col && $0.row >= frame.row
            && $0.col + $0.width <= frame.col + frame.width && $0.row + $0.height <= frame.row + frame.height
    }
}

/// Every screen as one Markdown document: a Flow list of the arrows that run from one screen to another,
/// then each screen under its name, cropped to its frame. Nil when there are no screens. Port of screensDocument.
func screensDocument(_ elements: [Element], cols: Int, rows: Int) -> String? {
    let screens = elements.filter { $0.presetId == "screen" }.sorted { ($0.row, $0.col) < ($1.row, $1.col) }
    guard !screens.isEmpty else { return nil }
    let grid = renderElements(elements, cols: cols, rows: rows)
    let name = { (s: Element) in (s.text ?? "").isEmpty ? "Screen" : s.text! }
    let holding = { (a: Anchor) in
        screens.first { a.col >= $0.col && a.col < $0.col + $0.width && a.row >= $0.row && a.row < $0.row + $0.height }
    }
    var flow: [String] = []
    for el in elements where el.presetId == "line" {
        guard let f = el.from, let t = el.to, let a = holding(f), let b = holding(t), a.id != b.id else { continue }
        let item = "- \(name(a)) → \(name(b))"
        if !flow.contains(item) { flow.append(item) }
    }
    var out = flow.isEmpty ? [] : ["## Flow", ""] + flow + [""]
    for s in screens {
        let crop = grid[max(0, s.row)..<min(grid.count, s.row + s.height)].map { r in
            String(r[min(r.count, max(0, s.col))..<min(r.count, s.col + s.width)])
        }.joined(separator: "\n")
        out += ["## \(name(s))", "", "```", trimText(crop), "```", ""]
    }
    return out.joined(separator: "\n").trimmingCharacters(in: .whitespacesAndNewlines) + "\n"
}

/// Shift a part carried by its screen. A carried line keeps its pins; only its loose ends move.
func carry(_ el: Element, dCol: Int, dRow: Int) -> Element {
    var next = el
    next.col += dCol
    next.row += dRow
    let shift = { (a: Anchor) in a.id != nil ? a : Anchor(col: a.col + dCol, row: a.row + dRow) }
    if el.presetId == "line" { next.from = el.from.map(shift); next.to = el.to.map(shift) }
    return next
}

/// Moving or copying a line by hand cuts it loose from what it was pinned to.
func shiftLine(_ el: Element, dCol: Int, dRow: Int) -> Element {
    var next = el
    next.col += dCol
    next.row += dRow
    next.from = el.from.map { Anchor(col: $0.col + dCol, row: $0.row + dRow) }
    next.to = el.to.map { Anchor(col: $0.col + dCol, row: $0.row + dRow) }
    return next
}

/// A flowchart arrow (`edge` "left" or "below") starts as a half stroke on its box; see Anchor.
func createLine(_ elements: [Element], start: (col: Int, row: Int), end: (col: Int, row: Int), edge: String? = nil) -> Element {
    var from = anchorAt(elements, col: start.col, row: start.row), to = anchorAt(elements, col: end.col, row: end.row)
    if let edge { from.edge = true; to.side = edge }
    let shape = lineShape(from: (from.col, from.row), to: (to.col, to.row), edge: from.edge, side: to.side)
    return Element(id: newElementId(), presetId: "line", label: "Arrow", template: shape.template,
                   width: shape.width, height: shape.height, col: shape.col, row: shape.row, from: from, to: to)
}

/// Redraw every pinned line from where its parts are now. A part that is gone leaves the end where it was.
/// Grouped parts move as one: they share a `group` id. A group needs two parts or more.
func groupMates(_ elements: [Element], _ el: Element?) -> [Element] {
    guard let group = el?.group else { return [] }
    return elements.filter { $0.group == group && $0.id != el?.id }
}
func groupElements(_ elements: [Element], ids: [String]) -> [Element] {
    guard Set(ids).count >= 2 else { return elements }
    let group = UUID().uuidString // outlives the session in the project file, unlike counted element ids
    return elements.map { var el = $0; if ids.contains(el.id) { el.group = group }; return el }
}
func ungroupElements(_ elements: [Element], id: String) -> [Element] {
    guard let group = elements.first(where: { $0.id == id })?.group else { return elements }
    return elements.map { var el = $0; if el.group == group { el.group = nil }; return el }
}

func routeLines(_ elements: [Element]) -> [Element] {
    let byId = Dictionary(elements.map { ($0.id, $0) }, uniquingKeysWith: { first, _ in first })
    func follow(_ a: Anchor) -> Anchor {
        guard let id = a.id, let el = byId[id] else { return a }
        var next = a
        next.col = el.col + a.dCol
        next.row = el.row + a.dRow
        return next
    }
    return elements.map { el in
        guard el.presetId == "line", let f = el.from, let t = el.to else { return el }
        let from = follow(f), to = follow(t)
        guard from != f || to != t else { return el }
        let shape = lineShape(from: (from.col, from.row), to: (to.col, to.row), edge: from.edge, side: to.side)
        var next = el
        next.template = shape.template
        next.width = shape.width
        next.height = shape.height
        next.col = shape.col
        next.row = shape.row
        next.from = from
        next.to = to
        return next
    }
}

/// Box styles swap the light line set for another, character for character.
let lightLines = "─│┌┐└┘├┤┬┴┼"
private let light = Array(lightLines)
private let styles: [String: [Character]] = [
    "double": Array("═║╔╗╚╝╠╣╦╩╬"), "rounded": Array("─│╭╮╰╯├┤┬┴┼"),
    "heavy": Array("━┃┏┓┗┛┣┫┳┻╋"), "ascii": Array("-|+++++++++"),
]
let boxStyles = ["single", "double", "rounded", "heavy", "ascii"]

func styledLines(_ style: String) -> [Character] { styles[style] ?? [] }

func styleChar(_ ch: Character, _ style: String) -> Character {
    guard let set = styles[style], let i = light.firstIndex(of: ch) else { return ch }
    return set[i]
}

/// Turn a part's accent highlight on or off.
func updateElement(_ elements: [Element], id: String, accent: Bool) -> [Element] {
    elements.map { el in
        guard el.id == id else { return el }
        var next = el
        next.accent = accent
        return next
    }
}

/// Which cells an accented part paints, in drawing order, so a part on top clears the accent under it.
/// Port of accentMask in src/lib/lines.js. Only the canvas uses it; copied text stays plain.
/// A layer hidden (not drawn or copied) or locked (the canvas cannot pick or move it).
func updateElement(_ elements: [Element], id: String, hidden: Bool? = nil, locked: Bool? = nil) -> [Element] {
    elements.map { el in
        guard el.id == id else { return el }
        var next = el
        if let hidden { next.hidden = hidden }
        if let locked { next.locked = locked }
        return next
    }
}

/// One step up (toward the front) or down the layer list.
func stepElement(_ elements: [Element], id: String, up: Bool) -> [Element] {
    guard let i = elements.firstIndex(where: { $0.id == id }) else { return elements }
    var rest = elements
    let el = rest.remove(at: i)
    rest.insert(el, at: max(0, min(rest.count, i + (up ? 1 : -1))))
    return rest
}

func accentMask(_ elements: [Element], cols: Int, rows: Int) -> [[Bool]] {
    var mask = Array(repeating: Array(repeating: false, count: cols), count: rows)
    var drawn = createGrid(cols: cols, rows: rows) // what is under each cell so far, for under
    for el in withMasks(elements) where !el.hidden {
        for (dy, line) in el.template.enumerated() {
            let r = el.row + dy
            guard r >= 0 && r < rows else { continue }
            for (dx, ch) in line.enumerated() {
                let c = el.col + dx
                if c < 0 || c >= cols || !lands(el, ch, drawn[r][c]) { continue }
                drawn[r][c] = ch
                mask[r][c] = el.accent
            }
        }
    }
    return mask
}

func updateElement(_ elements: [Element], id: String, style: String) -> [Element] {
    syncSymbol(elements.map { el in
        guard el.id == id else { return el }
        var next = el
        next.style = boxStyles.contains(style) && style != "single" ? style : nil
        return next
    }, id: id)
}

/// Snap a dragged part to the left edge, centre or right edge of another when it comes within `reach`
/// cells. Returns the snapped spot and the guide lines to draw.
func snapPosition(_ elements: [Element], id: String, col: Int, row: Int, reach: Int = 2)
    -> (col: Int, row: Int, guideCols: [Int], guideRows: [Int]) {
    guard let el = elements.first(where: { $0.id == id }) else { return (col, row, [], []) }
    let others = elements.filter { $0.id != id && $0.presetId != "line" }
    func edges(_ start: Int, _ size: Int) -> [Int] { [start, start + (size - 1) / 2, start + size - 1] }
    func snap(_ pos: Int, _ size: Int, _ span: (Element) -> (Int, Int)) -> (Int, [Int]) {
        var best: (d: Int, e: Int)?
        for o in others {
            let (start, len) = span(o)
            for e in edges(start, len) {
                for m in edges(pos, size) where abs(e - m) <= reach && (best == nil || abs(e - m) < abs(best!.d)) {
                    best = (e - m, e)
                }
            }
        }
        return best.map { (pos + $0.d, [$0.e]) } ?? (pos, [])
    }
    let (c, guideCols) = snap(col, el.width) { ($0.col, $0.width) }
    let (r, guideRows) = snap(row, el.height) { ($0.row, $0.height) }
    return (c, r, guideCols, guideRows)
}

/// Copy an element one cell down and right so the duplicate is visible. Returns the new list and id.
/// (On the web this lives in engine.js; here it sits with the other copy helpers to keep Engine.swift small.)
func duplicateElement(_ elements: [Element], id: String,
                      cols: Int = defaultCols, rows: Int = defaultRows) -> (elements: [Element], id: String?) {
    guard let src = elements.first(where: { $0.id == id }) else { return (elements, nil) }
    if src.presetId == "screen" { return duplicateScreen(elements, src) }
    let col = min(src.col + 2, max(0, cols - src.width))
    let row = min(src.row + 1, max(0, rows - src.height))
    let moved = src.presetId == "line" && src.from != nil ? shiftLine(src, dCol: col - src.col, dRow: row - src.row) : src
    var copy = Element(id: newElementId(), presetId: src.presetId, label: src.label, template: src.template,
                       width: src.width, height: src.height, col: col, row: row, from: moved.from, to: moved.to,
                       text: src.text, style: src.style, accent: src.accent)
    copy.symbol = src.symbol // a copy of a symbol stays linked
    return (elements + [copy], copy.id)
}

/// A screen copies with everything inside it, placed to its right. Lines between copied parts pin to the copies.
func duplicateScreen(_ elements: [Element], _ src: Element, dCol: Int? = nil) -> (elements: [Element], id: String?) {
    let group = [src] + partsInside(elements, src)
    let ids = Dictionary(uniqueKeysWithValues: group.map { ($0.id, newElementId()) })
    let pin = { (a: Anchor?) -> Anchor? in
        guard var a else { return nil }
        if let id = a.id, let fresh = ids[id] { a.id = fresh }
        return a
    }
    let copies = group.map { el -> Element in
        var c = carry(el, dCol: dCol ?? src.width + 4, dRow: 0) // every field comes along, as on the web
        c.id = ids[el.id]!
        c.from = pin(c.from)
        c.to = pin(c.to)
        return c
    }
    return (routeLines([copies[0]] + elements + Array(copies.dropFirst())), copies[0].id)
}
