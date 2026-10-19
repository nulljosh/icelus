// The typed syntax: write a screen as plain lines, get editable parts back.
// A line-for-line port of src/lib/syntax.js, which has the full grammar in its header.

import Foundation

private func part(_ id: String, _ label: String, _ template: [String]) -> Preset {
    Preset(id: id, label: label, category: "Typed", template: template)
}

private func padded(_ s: String, _ width: Int) -> String {
    s.count >= width ? s : s + String(repeating: " ", count: width - s.count)
}

private func chunk(_ src: String) -> Preset {
    func match(_ pattern: String) -> [String]? {
        guard let re = try? NSRegularExpression(pattern: pattern),
              let m = re.firstMatch(in: src, range: NSRange(src.startIndex..., in: src)) else { return nil }
        return (1..<m.numberOfRanges).map { Range(m.range(at: $0), in: src).map { String(src[$0]) } ?? "" }
    }
    if let m = match(#"^\[([ xX])\]\s+(.+)$"#) { return part("checkbox", "Checkbox", ["[\(m[0] == " " ? " " : "✓")] \(m[1])"]) }
    if let m = match(#"^\(([ oO])\)\s+(.+)$"#) { return part("radio", "Radio", ["(\(m[0] == " " ? " " : "●")) \(m[1])"]) }
    if let m = match(#"^\[v\s+(.+)\]$"#) { return part("select", "Select", ["[▾ \(padded(m[0], 12))]"]) }
    if let m = match(#"^"(.*)"$"#) {
        return part("input", "Input", ["[ \(m[0])\(String(repeating: "_", count: max(2, 14 - m[0].count))) ]"])
    }
    if let m = match(#"^\[(.+)\]$"#) { return part("button", "Button", ["[ \(m[0].trimmingCharacters(in: .whitespaces)) ]"]) }
    return part("text", "Text", [src])
}

private func table(_ lines: [String]) -> Preset { part("table", "Table", tableFrame(textCells(lines.joined(separator: "\n")))) }

private func flowSteps(_ line: String) -> [String]? {
    if isMessage(line) { return nil }
    let steps = line.replacingOccurrences(of: "→", with: "->").components(separatedBy: "->").map { $0.trimmingCharacters(in: .whitespaces) }
    return steps.count > 1 && steps.allSatisfy({ !$0.isEmpty }) ? steps : nil
}

/// `a -> b -> c` lines, one flow a line, become boxes and pinned arrows. Each node sits in the column of its
/// longest path from a start, so a flow reads left to right and branches stack under each other.
/// ponytail: longest-path layers, no crossing reduction; a back edge (a cycle) is drawn but may cross boxes.
/// The layout is recursive and quadratic, so a flowchart stops taking lines at 200 steps.
private let maxSteps = 200
func flowchart(_ lines: [String], startRow: Int = 1, startCol: Int = 2) -> [Element] {
    var names: [String] = [], edges: [(String, String)] = []
    for line in lines where names.count < maxSteps {
        guard let steps = flowSteps(line) else { continue }
        for s in steps where !names.contains(s) { names.append(s) }
        for i in 1..<steps.count where steps[i - 1] != steps[i] && !edges.contains(where: { $0 == (steps[i - 1], steps[i]) }) {
            edges.append((steps[i - 1], steps[i]))
        }
    }
    // An edge back to a step still on the walk is a loop; the rest decide the columns.
    var loops = Set<Int>(), seen: [String: Int] = [:]
    func walk(_ n: String) {
        seen[n] = 1
        for (i, e) in edges.enumerated() where e.0 == n {
            if seen[e.1] == 1 { loops.insert(i) } else if seen[e.1] == nil { walk(e.1) }
        }
        seen[n] = 2
    }
    for n in names where seen[n] == nil { walk(n) }
    var depth = Dictionary(uniqueKeysWithValues: names.map { ($0, 0) })
    for _ in names { for (i, e) in edges.enumerated() where !loops.contains(i) { depth[e.1] = max(depth[e.1]!, depth[e.0]! + 1) } }
    var nodes: [String: Element] = [:], order: [Element] = []
    var col = startCol
    for l in 0...(depth.values.max() ?? 0) {
        let layer = names.filter { depth[$0] == l }
        if layer.isEmpty { continue }
        // An arrow that skips this column runs along its source's middle row, so keep that row free here.
        let busy = Set(edges.filter { depth[$0.0]! < l && l < depth[$0.1]! }.compactMap { nodes[$0.0].map { $0.row + 1 } })
        var slot = 0, width = 0
        for n in layer {
            while busy.contains(startRow + slot * 5 + 1) { slot += 1 }
            let template = nodeFrame(n)
            var el = createElement(Preset(id: "node", label: "Node", category: "Draw", template: template), col: col, row: startRow + slot * 5)
            el.text = n
            nodes[n] = el; order.append(el)
            slot += 1; width = max(width, template[0].count)
        }
        col += width + 6
    }
    var arrows: [Element] = []
    for (i, e) in edges.enumerated() {
        let s = nodes[e.0]!, t = nodes[e.1]!
        func mid(_ el: Element) -> Int { el.row + el.height / 2 }
        func bottom(_ el: Element) -> (col: Int, row: Int) { (el.col + el.width / 2, el.row + el.height - 1) }
        arrows.append(loops.contains(i) ? createLine(order, start: bottom(s), end: bottom(t), edge: "below")
            : createLine(order, start: (s.col + s.width - 1, mid(s)), end: (t.col, mid(t)), edge: "left"))
    }
    return order + arrows
}

func parseSketch(_ source: String, startRow: Int = 1, startCol: Int = 2) -> [Element] {
    let raw = source.replacingOccurrences(of: "\r\n", with: "\n").replacingOccurrences(of: "\r", with: "\n")
        .split(separator: "\n", omittingEmptySubsequences: false).map(String.init)
    let lines = raw.map { $0.trimmingCharacters(in: .whitespaces) }
    let isRow = { (l: String) in l.count >= 2 && l.hasPrefix("|") && l.hasSuffix("|") }
    var elements: [Element] = []
    var row = startRow
    var i = 0
    while i < lines.count {
        let line = lines[i]
        defer { i += 1 }
        if line.isEmpty { if !elements.isEmpty { row += 1 }; continue }
        // An indented `- ` list, two lines or more with something nested, is a tree.
        var end = i
        while end + 1 < raw.count && isTreeLine(raw[end + 1]) { end += 1 }
        if isTreeLine(raw[i]) && end > i && raw[i...end].contains(where: { $0.first == " " || $0.first == "\t" }) {
            let text = raw[i...end].joined(separator: "\n")
            var el = createElement(Preset(id: "tree", label: "Tree", category: "Draw", template: treeFrame(text), text: text), col: startCol, row: row)
            el.text = text
            elements.append(el)
            row += el.height + 1
            i = end
            continue
        }
        if isMessage(line) {
            var msgs = [line]
            while i + 1 < lines.count && isMessage(lines[i + 1]) { i += 1; msgs.append(lines[i]) }
            let source = msgs.joined(separator: "\n")
            var el = createElement(Preset(id: "sequence", label: "Sequence", category: "Draw", template: sequenceFrame(source), text: source),
                                   col: startCol, row: row)
            el.text = source
            elements.append(el)
            row += el.height + 1
            continue
        }
        if flowSteps(line) != nil {
            var flow = [line]
            while i + 1 < lines.count && flowSteps(lines[i + 1]) != nil { i += 1; flow.append(lines[i]) }
            let els = flowchart(flow, startRow: row, startCol: startCol)
            elements += els
            row = (els.map { $0.row + $0.height }.max() ?? row) + 1
            continue
        }
        var parts: [Preset]
        var bannerWords: String?
        if line.count >= 3 && line.allSatisfy({ $0 == "-" }) {
            parts = [part("divider", "Divider", [String(repeating: "─", count: 40)])]
        } else if line.hasPrefix("# ") {
            let words = String(line.dropFirst(2)).trimmingCharacters(in: .whitespaces)
            bannerWords = words
            parts = [part("banner", "Banner", bannerText(words))]
        } else if isRow(line) {
            var rows = [line]
            while i + 1 < lines.count && isRow(lines[i + 1]) { i += 1; rows.append(lines[i]) }
            parts = [table(rows)]
        } else {
            parts = line.components(separatedBy: "  ").map { $0.trimmingCharacters(in: .whitespaces) }
                .filter { !$0.isEmpty }.map(chunk)
        }
        var col = startCol
        for p in parts {
            var el = createElement(p, col: col, row: row)
            el.text = bannerWords
            elements.append(el)
            col += p.width + 2
        }
        row += (parts.map(\.height).max() ?? 1) + 1
    }
    return elements
}

// The way back, a port of toSketch in src/lib/syntax.js: parts the syntax has no word for are skipped and named.
private func firstMatch(_ s: String, _ pattern: String) -> [String]? {
    guard let re = try? NSRegularExpression(pattern: pattern),
          let m = re.firstMatch(in: s, range: NSRange(s.startIndex..., in: s)) else { return nil }
    return (1..<m.numberOfRanges).map { Range(m.range(at: $0), in: s).map { String(s[$0]) } ?? "" }
}

private func back(_ el: Element) -> [String]? {
    let t = el.template.first ?? ""
    let or = { (s: String?, d: String) in (s ?? "").isEmpty ? d : s! }
    switch el.presetId {
    case "banner": return ["# \(el.text ?? el.label)"]
    case "sequence", "tree": return el.text.map { $0.components(separatedBy: "\n") }
    case "text": return [el.template.map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }.joined(separator: " ")]
    case "table": return tableCells(el.template).map { "| " + $0.joined(separator: " | ") + " |" }
    case "button": return ["[\(or(firstMatch(t, #"^\[\s*(.*?)\s*\]$"#)?[0], "OK"))]"]
    case "input": return ["\"\(firstMatch(t, #"^\[\s*(.*?)_*\s*\]$"#)?[0] ?? "")\""]
    case "select": return ["[v \(or(firstMatch(t, #"^\[▾\s*(.*?)\s*\]$"#)?[0], "Choose"))]"]
    case "checkbox":
        guard let m = firstMatch(t, #"^\[(.)\]\s*(.*)$"#) else { return nil }
        return ["[\(m[0] == " " ? " " : "x")] \(or(m[1], "Label"))"]
    case "radio":
        guard let m = firstMatch(t, #"^\((.)\)\s*(.*)$"#) else { return nil }
        return ["(\(m[0] == " " ? " " : "o")) \(or(m[1], "Option"))"]
    case "divider": return ["---"]
    default: return nil
    }
}

func toSketch(_ elements: [Element]) -> (source: String, skipped: [String]) {
    var skipped: [String] = []
    var rows: [(row: Int, inline: [String], blocks: [String], height: Int)] = []
    // A flowchart comes back as its flow lines, one arrow a line, where its top box was.
    let nodes = Dictionary(elements.filter { $0.presetId == "node" }.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
    func isFlowArrow(_ el: Element) -> Bool { el.presetId == "line" && nodes[el.from?.id ?? ""] != nil && nodes[el.to?.id ?? ""] != nil }
    let flow = elements.filter(isFlowArrow).map { "\(nodes[$0.from!.id!]!.text ?? "") -> \(nodes[$0.to!.id!]!.text ?? "")" }
    var flowBlock: (row: Int, inline: [String], blocks: [String], height: Int)?
    if !flow.isEmpty {
        let top = nodes.values.map(\.row).min()!, end = nodes.values.map { $0.row + $0.height }.max()!
        flowBlock = (top, [], flow, end - top)
    } else { skipped += nodes.values.map(\.label) }
    for el in elements.sorted(by: { ($0.row, $0.col) < ($1.row, $1.col) }) {
        if el.presetId == "node" || isFlowArrow(el) { continue }
        guard let lines = back(el) else { skipped.append(el.label); continue }
        if rows.last?.row != el.row { rows.append((el.row, [], [], 0)) }
        rows[rows.count - 1].height = max(rows[rows.count - 1].height, el.height)
        if ["table", "sequence", "tree"].contains(el.presetId) { rows[rows.count - 1].blocks += lines } else { rows[rows.count - 1].inline.append(lines[0]) }
    }
    if let flowBlock { rows.append(flowBlock); rows.sort { $0.row < $1.row } }
    var out: [String] = []
    var next: Int?
    for r in rows {
        if let next { out += Array(repeating: "", count: min(2, max(0, r.row - next))) }
        if !r.inline.isEmpty { out.append(r.inline.joined(separator: "  ")) }
        out += r.blocks
        next = r.row + r.height + 1
    }
    return (out.joined(separator: "\n"), skipped)
}

// Screen templates, a port of the end of src/lib/syntax.js: a named Screen frame with a typed screen inside it.
let screenTemplateSources: [(name: String, source: String)] = [
    ("Sign in", "# Sign in\n\"Email\"\n\"Password\"\n[x] Remember me\n[Sign in]  [Create account]"),
    ("Settings", "# Settings\n[x] Notifications\n[ ] Dark mode\n[v English]\n---\n[Sign out]"),
    ("List", "# Inbox\n\"Search\"\n| From | Subject |\n| Ada | Lunch? |\n| Grace | The build |\n| Alan | Notes |"),
    ("Detail", "# Lunch\nFrom Ada, 12:04\n---\nAre you free at one?\nThe usual place.\n[Reply]  [Archive]"),
    ("Empty state", "# Inbox\n\n\nNothing here yet.\nNew mail shows up here.\n\n[Compose]"),
]

func screenTemplate(_ name: String, _ source: String, col: Int = 0, row: Int = 0) -> [Element] {
    let parts = parseSketch(source, startRow: row + 2, startCol: col + 3)
    let width = max(32, (parts.map { $0.col + $0.width }.max() ?? 0) - col + 3)
    let height = (parts.map { $0.row + $0.height }.max() ?? row) - row + 2
    var frame = createElement(Preset(id: "screen", label: "Screen", category: "Draw", template: screenFrame(name, width: width, height: height)),
                              col: col, row: row)
    frame.text = name
    return [frame] + parts
}

/// Palette entries for the templates, previewed whole. Their id is "template-" plus the name.
let screenTemplates: [Preset] = screenTemplateSources.map { t in
    let els = screenTemplate(t.name, t.source)
    let lines = trimText(gridToText(renderElements(els, cols: els[0].width, rows: els[0].height)))
        .split(separator: "\n", omittingEmptySubsequences: false).map(String.init)
    return Preset(id: "template-" + t.name.lowercased().replacingOccurrences(of: " ", with: "-"), label: t.name,
                  category: "Screens", template: lines)
}

/// Typed lines straight to wireframe text, sized to fit. The Shortcuts action and the terminal use it.
func drawSketch(_ source: String) -> String {
    let elements = parseSketch(source, startRow: 0, startCol: 0)
    let cols = min(500, (elements.map { $0.col + $0.width }.max() ?? 0) + 1)
    let rows = min(500, (elements.map { $0.row + $0.height }.max() ?? 0) + 1)
    return trimText(gridToText(renderElements(elements, cols: cols, rows: rows)))
}
