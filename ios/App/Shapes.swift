import Foundation

// Parts drawn from their content, a port of src/lib/shapes.js: tables from cells, charts from numbers,
// flowchart nodes from words.

/// A table is its cells. The frame is drawn from them: the first row is the header, and each column is as
/// wide as its longest cell, so cells grow with their text. Rows may be short; missing cells are blank.
func tableFrame(_ cells: [[String]]) -> [String] {
    let rows = cells.isEmpty ? [[""]] : cells
    let columns = max(1, rows.map(\.count).max() ?? 0)
    let widths = (0..<columns).map { i in max(1, rows.map { i < $0.count ? $0[i].count : 0 }.max() ?? 0) }
    func rule(_ l: String, _ m: String, _ r: String) -> String {
        l + widths.map { String(repeating: "─", count: $0 + 2) }.joined(separator: m) + r
    }
    func row(_ r: [String]) -> String {
        "│" + widths.enumerated().map { i, w in
            let cell = i < r.count ? r[i] : ""
            return " " + cell + String(repeating: " ", count: max(0, w - cell.count)) + " "
        }.joined(separator: "│") + "│"
    }
    var out = [rule("┌", "┬", "┐"), row(rows[0])]
    if rows.count > 1 { out += [rule("├", "┼", "┤")] + rows.dropFirst().map(row) }
    return out + [rule("└", "┴", "┘")]
}

/// A flowchart node: its words in a box, one cell of padding each side.
func nodeFrame(_ text: String) -> [String] {
    let lines = text.split(separator: "\n", omittingEmptySubsequences: false).map(String.init)
    let w = max(1, lines.map(\.count).max() ?? 0)
    return ["┌" + String(repeating: "─", count: w + 2) + "┐"]
        + lines.map { "│ " + $0 + String(repeating: " ", count: w - $0.count) + " │" }
        + ["└" + String(repeating: "─", count: w + 2) + "┘"]
}

/// The way back: a table's cells read off its template, and as typed rows (`a | b`, one row a line).
func tableCells(_ template: [String]) -> [[String]] {
    template.filter { $0.contains("│") }.map { line in
        line.split(separator: "│", omittingEmptySubsequences: false).dropFirst().dropLast()
            .map { $0.trimmingCharacters(in: .whitespaces) }
    }
}
func tableText(_ template: [String]) -> String { tableCells(template).map { $0.joined(separator: " | ") }.joined(separator: "\n") }
func textCells(_ text: String) -> [[String]] {
    text.replacingOccurrences(of: "\r\n", with: "\n").replacingOccurrences(of: "\r", with: "\n")
        .split(separator: "\n").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }.map { line in
            var inner = Substring(line)
            if inner.hasPrefix("|") { inner = inner.dropFirst() }
            if inner.hasSuffix("|") { inner = inner.dropLast() }
            return inner.split(separator: "|", omittingEmptySubsequences: false).map { $0.trimmingCharacters(in: .whitespaces) }
        }
}

/// Charts are drawn from a list of numbers, kept as the part's text: one `label number` a line, or bare
/// numbers split by spaces or commas. A bar chart lines up labels and scales bars to the largest value in
/// eighths of a cell; a sparkline spreads the values over eight block heights; progress fills to a percent.
let charts = ["chart", "sparkline", "progress"]
private let eighths = ["", "▏", "▎", "▍", "▌", "▋", "▊", "▉"]
private let sparks = Array("▁▂▃▄▅▆▇█")
private func fmt(_ n: Double) -> String {
    let r = (n * 100).rounded() / 100
    return r == r.rounded() ? String(Int(r)) : String(r)
}

func chartItems(_ text: String) -> [(label: String, value: Double)] {
    var items: [(label: String, value: Double)] = []
    let lines = text.replacingOccurrences(of: "\r\n", with: "\n").replacingOccurrences(of: "\r", with: "\n")
        .split(separator: "\n").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
    for line in lines {
        if line.allSatisfy({ "-0123456789.,% ".contains($0) }) {
            for token in line.split(whereSeparator: { $0 == " " || $0 == "," }) {
                if let n = Double(token.replacingOccurrences(of: "%", with: "")) { items.append(("", n)) }
            }
            continue
        }
        guard let m = line.range(of: #"\s*-?\d+(\.\d+)?%?$"#, options: .regularExpression) else { continue }
        let number = line[m].trimmingCharacters(in: .whitespaces).replacingOccurrences(of: "%", with: "")
        if let n = Double(number) { items.append((String(line[..<m.lowerBound]).trimmingCharacters(in: .whitespaces), n)) }
    }
    return items
}

func chartFrame(_ kind: String, _ text: String) -> [String] {
    let items = chartItems(text)
    if items.isEmpty { return [kind == "sparkline" ? "▁" : "0"] }
    if kind == "sparkline" {
        let values = items.map(\.value), lo = values.min()!, hi = values.max()!
        return [String(values.map { sparks[hi == lo ? 3 : Int((($0 - lo) / (hi - lo) * 7).rounded())] })]
    }
    if kind == "progress" {
        let pct = max(0, min(100, items[0].value)), filled = Int((pct / 100 * 14).rounded())
        let label = items[0].label.isEmpty ? "" : items[0].label + " "
        return [label + String(repeating: "▓", count: filled) + String(repeating: "░", count: 14 - filled) + " \(fmt(pct))%"]
    }
    let top = max(items.map(\.value).max() ?? 0, 0), scale = top == 0 ? 1 : top
    let pad = items.map(\.label.count).max() ?? 0
    // A blank row between bars keeps them apart; blocks are painted edge to edge.
    return items.enumerated().flatMap { i, item -> [String] in
        let e = Int((max(0, item.value) / scale * 20 * 8).rounded())
        let bar = String(repeating: "█", count: e / 8) + eighths[e % 8]
        let label = pad > 0 ? item.label + String(repeating: " ", count: pad - item.label.count) + " " : ""
        return (i > 0 ? [""] : []) + [label + bar + String(repeating: " ", count: max(0, 20 - bar.count)) + " " + fmt(item.value)]
    }
}

/// Parts sized by what is in them (cells, numbers, messages): a drag moves them and never stretches them.
let sized = ["table", "sequence", "tree"] + charts

/// A sequence diagram from `A -> B: message` lines (`-->` for a reply, drawn dashed). Each participant is a box
/// with a lifeline under it, in the order they first appear; each message is a label over an arrow, one after
/// the next. Lifelines are spaced so every label fits between its two ends.
private let messagePattern = #"^(.+?)\s*(-->|->)\s*(.+?)\s*:\s*(.*)$"#
func isMessage(_ line: String) -> Bool {
    line.trimmingCharacters(in: .whitespaces).range(of: messagePattern, options: .regularExpression) != nil
}

private func message(_ line: String) -> (from: String, to: String, label: String, reply: Bool)? {
    let l = line.trimmingCharacters(in: .whitespaces)
    guard isMessage(l), let colon = l.firstIndex(of: ":") else { return nil }
    let head = String(l[..<colon]), label = String(l[l.index(after: colon)...]).trimmingCharacters(in: .whitespaces)
    let reply = head.contains("-->")
    let sides = head.components(separatedBy: reply ? "-->" : "->").map { $0.trimmingCharacters(in: .whitespaces) }
    guard sides.count == 2, !sides[0].isEmpty, !sides[1].isEmpty else { return nil }
    return (sides[0], sides[1], label, reply)
}

func sequenceFrame(_ text: String) -> [String] {
    let msgs = text.replacingOccurrences(of: "\r\n", with: "\n").replacingOccurrences(of: "\r", with: "\n")
        .split(separator: "\n").compactMap { message(String($0)) }
    if msgs.isEmpty { return ["┌───┐", "│ ? │", "└───┘"] }
    var names: [String] = []
    for m in msgs { for n in [m.from, m.to] where !names.contains(n) { names.append(n) } }
    func at(_ n: String) -> Int { names.firstIndex(of: n)! }
    var centers: [Int] = []
    for (i, n) in names.enumerated() {
        let half = (n.count + 4) / 2
        centers.append(i > 0 ? centers[i - 1] + (names[i - 1].count + 4) / 2 + half + 4 : half)
    }
    for m in msgs.sorted(by: { abs(at($0.from) - at($0.to)) < abs(at($1.from) - at($1.to)) }) {
        let lo = min(at(m.from), at(m.to)), hi = max(at(m.from), at(m.to))
        let need = lo == hi ? 0 : m.label.count + 4 - (centers[hi] - centers[lo])
        if need > 0 { for i in hi..<centers.count { centers[i] += need } }
    }
    let last = names.count - 1
    let width = max(centers[last] + (names[last].count + 4 + 1) / 2,
                    msgs.filter { $0.from == $0.to }.map { centers[at($0.from)] + $0.label.count + 6 }.max() ?? 0)
    func blank() -> [Character] { Array(repeating: " ", count: width) }
    var rows = [blank(), blank(), blank()]
    func put(_ r: inout [Character], _ x: Int, _ s: String) { for (i, ch) in s.enumerated() { r[x + i] = ch } }
    for (i, n) in names.enumerated() {
        let w = n.count + 4, x = centers[i] - w / 2
        put(&rows[0], x, "┌" + String(repeating: "─", count: w - 2) + "┐")
        put(&rows[1], x, "│ \(n) │")
        put(&rows[2], x, "└" + String(repeating: "─", count: w - 2) + "┘")
        rows[2][centers[i]] = "┬"
    }
    func line() -> [Character] { var r = blank(); for c in centers { r[c] = "│" }; return r }
    for m in msgs {
        let a = centers[at(m.from)], b = centers[at(m.to)]
        if a == b {
            var label = line(), out = line(), back = line()
            put(&label, a + 2, m.label); put(&out, a, "├──┐"); put(&back, a, "◀──┘")
            rows += [label, out, back]
            continue
        }
        var label = line(), arrow = line()
        let lo = min(a, b)
        put(&label, lo + 2, m.label)
        for c in (lo + 1)..<max(a, b) { arrow[c] = m.reply ? "╌" : "─" }
        arrow[a] = b > a ? "├" : "┤"
        arrow[b] = b > a ? "▶" : "◀"
        rows += [label, arrow]
    }
    rows.append(line())
    return rows.map { r in
        let s = String(r).replacingOccurrences(of: #"\s+$"#, with: "", options: .regularExpression)
        return s + String(repeating: " ", count: width - s.count)
    }
}

/// A tree from an indented `- ` list: file trees, sitemaps, org charts as an outline. Each level is two spaces
/// (or a tab) deeper than its parent; children hang off ├── and └── under it.
func isTreeLine(_ line: String) -> Bool { line.range(of: #"^\s*-\s+\S"#, options: .regularExpression) != nil }

func treeFrame(_ text: String) -> [String] {
    let items: [(depth: Int, label: String)] = text.replacingOccurrences(of: "\r\n", with: "\n").replacingOccurrences(of: "\r", with: "\n")
        .split(separator: "\n", omittingEmptySubsequences: false).map(String.init).filter(isTreeLine).map { line in
            let l = line.replacingOccurrences(of: "\t", with: "  ")
            let lead = l.prefix { $0 == " " }.count
            let label = l.drop { $0 == " " }.dropFirst().trimmingCharacters(in: .whitespaces)
            return (lead, label)
        }
    if items.isEmpty { return ["?"] }
    // Each item's parent is the nearest earlier item that sits less deep.
    var kids = Array(repeating: [Int](), count: items.count), roots: [Int] = []
    for (i, it) in items.enumerated() {
        var p = i - 1
        while p >= 0 && items[p].depth >= it.depth { p -= 1 }
        if p < 0 { roots.append(i) } else { kids[p].append(i) }
    }
    var out: [String] = []
    func draw(_ i: Int, _ prefix: String) {
        for (n, k) in kids[i].enumerated() {
            let last = n == kids[i].count - 1
            out.append(prefix + (last ? "└── " : "├── ") + items[k].label)
            draw(k, prefix + (last ? "    " : "│   "))
        }
    }
    for r in roots { out.append(items[r].label); draw(r, "") }
    let width = out.map(\.count).max() ?? 0
    return out.map { $0 + String(repeating: " ", count: width - $0.count) }
}

/// The parts drawn from their text alone: a chart, a sequence diagram, a tree. Nil for any other part.
func contentFrame(_ id: String, _ text: String) -> [String]? {
    if charts.contains(id) { return chartFrame(id, text) }
    if id == "sequence" { return sequenceFrame(text) }
    if id == "tree" { return treeFrame(text) }
    return nil
}

/// A table edits its cells and redraws its frame to fit them (adding a row or column is new cells).
func updateElement(_ elements: [Element], id: String, cells: [[String]]) -> [Element] {
    syncSymbol(routeLines(elements.map { $0.id == id && $0.presetId == "table" ? withCells($0, cells) : $0 }), id: id)
}
func withCells(_ el: Element, _ cells: [[String]]) -> Element {
    var next = el
    next.template = tableFrame(cells)
    next.width = next.template[0].count
    next.height = next.template.count
    return next
}

/// A part's state, drawn in its characters so it shows in pasted text too: pressed is heavy lines and solid
/// brackets, disabled is dashed lines and soft brackets, error is double lines and bangs. Each copy has its own.
let variants = ["default", "pressed", "disabled", "error"]
private let variantChars: [String: (from: [Character], to: [Character])] = [
    "pressed": (Array("─│┌┐└┘├┤┬┴┼[]"), Array("━┃┏┓┗┛┣┫┳┻╋▐▌")),
    "disabled": (Array("─│[]"), Array("┄┆‹›")),
    "error": (Array("─│┌┐└┘├┤┬┴┼[]"), Array("═║╔╗╚╝╠╣╦╩╬!!")),
]
func variantChar(_ ch: Character, _ variant: String) -> Character {
    guard let map = variantChars[variant], let i = map.from.firstIndex(of: ch) else { return ch }
    return map.to[i]
}
func updateElement(_ elements: [Element], id: String, variant: String) -> [Element] {
    elements.map { var el = $0; if el.id == id { el.variant = variants.contains(variant) && variant != "default" ? variant : nil }; return el }
}

/// The four shades a Shade fill can take, light to solid. A fill is one character at any size.
let fills: [Character] = ["░", "▒", "▓", "█"]
func fillTemplate(_ ch: Character, width: Int, height: Int) -> [String] {
    Array(repeating: String(repeating: ch, count: width), count: height)
}
func updateElement(_ elements: [Element], id: String, fill: Character) -> [Element] {
    guard fills.contains(fill) else { return elements }
    return syncSymbol(elements.map { var el = $0; if el.id == id && el.presetId == "fill" { el.template = fillTemplate(fill, width: el.width, height: el.height) }; return el }, id: id)
}

/// Notes: a short note pinned to a part, for a person or an agent to act on. An empty note is a resolved one.
let noteMax = 500
func cleanNote(_ note: String) -> String { String(note.trimmingCharacters(in: .whitespacesAndNewlines).prefix(noteMax)) }
func updateElement(_ elements: [Element], id: String, note: String) -> [Element] {
    let next = cleanNote(note)
    return elements.map { var el = $0; if el.id == id { el.note = next.isEmpty ? nil : next }; return el }
}

/// Plain-ASCII export for places that cannot draw box characters (READMEs on old terminals, email, code comments).
let asciiMap: [Character: String] = {
    var map: [Character: String] = [:]
    for c in "─━═╌╍┄┅┈┉" { map[c] = "-" }
    for c in "│┃║╎╏┆┇┊┋" { map[c] = "|" }
    for c in "┌┐└┘├┤┬┴┼╭╮╰╯┏┓┗┛┣┫┳┻╋╔╗╚╝╠╣╦╩╬" { map[c] = "+" }
    let pairs: [(Character, String)] = [
        ("▀", "\""), ("▄", "_"), ("◡", "u"), ("▌", "|"), ("‹", "<"), ("›", ">"), ("●", "*"), ("○", "o"), ("■", "#"), ("□", "#"), ("▪", "#"), ("▫", "#"), ("█", "#"), ("░", "."), ("▒", ":"), ("▓", "#"),
        ("▸", ">"), ("▶", ">"), ("◂", "<"), ("◀", "<"), ("▾", "v"), ("▼", "v"), ("▴", "^"), ("▲", "^"),
        ("✓", "x"), ("✔", "x"), ("★", "*"), ("☆", "*"), ("…", "..."), ("—", "-"), ("–", "-"), ("·", "."), ("•", "*"),
    ]
    for (c, s) in pairs { map[c] = s }
    return map
}()

func toAscii(_ text: String) -> String {
    text.map { c in asciiMap[c] ?? (c.unicodeScalars.first!.value > 126 ? "?" : String(c)) }.joined()
}

/// One character in plain ASCII, always one character wide (… becomes .).
func asciiChar(_ c: Character) -> Character { (asciiMap[c] ?? (c.unicodeScalars.first!.value > 126 ? "?" : String(c))).first! }

// Adjustment layers, a port of the ones in src/lib/lines.js: they change what is drawn under them, in their
// area, without touching the parts, and act in layer order so a part above is left alone.
let adjustments = ["invert", "dim", "ascii", "single", "double", "rounded", "heavy"]
private let invertMap: [Character: Character] = [" ": "█", "█": " ", "░": "▓", "▓": "░", "▀": "▄", "▄": "▀"]
private let dimMap: [Character: Character] = ["█": "▓", "▓": "▒", "▒": "░", "░": " ", "▀": "░", "▄": "░"]
/// Any box line back to the light set, so a style swap works on doubled, heavy and rounded boxes too.
private let toLightMap: [Character: Character] = {
    var map: [Character: Character] = [:]
    for style in ["double", "rounded", "heavy"] { for (ch, light) in zip(Array(styledLines(style)), Array(lightLines)) { map[ch] = light } }
    return map
}()

func adjustChar(_ ch: Character, _ kind: String) -> Character {
    switch kind {
    case "invert": return invertMap[ch] ?? ch
    case "dim": return dimMap[ch] ?? toLightMap[ch] ?? ch
    case "ascii": return asciiChar(ch)
    default: return boxStyles.contains(kind) ? styleChar(toLightMap[ch] ?? ch, kind) : ch
    }
}

func adjustGrid(_ grid: inout Grid, _ el: Element) {
    for r in max(0, el.row)..<max(max(0, el.row), min(grid.count, el.row + el.height)) {
        for c in max(0, el.col)..<max(max(0, el.col), min(grid[r].count, el.col + el.width)) { grid[r][c] = adjustChar(grid[r][c], el.adjust ?? "") }
    }
}

/// A new adjustment layer over an area: no marks of its own, just a kind.
func adjustLayer(col: Int, row: Int, width: Int, height: Int, adjust: String) -> Element {
    Element(id: newElementId(), presetId: "adjust", label: "Adjustment", template: Array(repeating: String(repeating: " ", count: width), count: height),
            width: width, height: height, col: col, row: row, adjust: adjust)
}


/// Change an adjustment layer's kind. Anything else is left as it is.
func updateElement(_ elements: [Element], id: String, adjust: String) -> [Element] {
    elements.map { el in
        guard el.id == id, el.presetId == "adjust", adjustments.contains(adjust) else { return el }
        var next = el
        next.adjust = adjust
        return next
    }
}
