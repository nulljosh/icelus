import Foundation

/// Heal and expand (v42), the twin of src/lib/heal.js. Heal: delete a part in the middle of a flow and the
/// arrows on either side join up. Expand: a table or list grows by a row and carries its pattern on.

/// The lines pinned to a part that is going away, joined across it: one way in, any number out, or the other way round.
func closeLines(_ elements: [Element], _ gone: String) -> [Element] {
    let ins = elements.filter { $0.presetId == "line" && $0.to?.id == gone && $0.from?.id != gone }
    let outs = elements.filter { $0.presetId == "line" && $0.from?.id == gone && $0.to?.id != gone }
    guard !ins.isEmpty, !outs.isEmpty, ins.count == 1 || outs.count == 1 else { return elements }
    let joined = ins.flatMap { a in outs.map { b -> Element in
        var end = b.to!
        end.side = a.to?.side
        let from = a.from!, shape = lineShape(from: (from.col, from.row), to: (end.col, end.row), edge: from.edge, side: end.side)
        var line = Element(id: newElementId(), presetId: "line", label: a.label, template: shape.template,
                           width: shape.width, height: shape.height, col: shape.col, row: shape.row, from: from, to: end)
        line.style = a.style; line.accent = a.accent; line.ink = a.ink; line.paper = a.paper // the way in sets the look
        return line
    } }
    let used = Set((ins + outs).map(\.id))
    return elements.filter { !used.contains($0.id) } + joined
}

private let seriesWords: [[String]] = [
    ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"],
    ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
]

/// The capture groups of a whole-string match, or nil.
private func groups(_ pattern: String, _ s: String) -> [String]? {
    guard let re = try? NSRegularExpression(pattern: "^" + pattern + "$"),
          let m = re.firstMatch(in: s, range: NSRange(s.startIndex..., in: s)) else { return nil }
    return (1..<m.numberOfRanges).map { Range(m.range(at: $0), in: s).map { String(s[$0]) } ?? "" }
}

/// What comes after a run of values: a number keeps its step, a counting word, day or month the next one,
/// the same value again when they were all the same, otherwise nothing.
func nextValue(_ values: [String]) -> String {
    let last = values.last ?? "", num = "(.*?)(-?\\d+)(\\D*)"
    if let m = groups(num, last), let n = Int(m[1]) {
        var step = 1
        if values.count > 1, let p = groups(num, values[values.count - 2]), p[0] == m[0], p[2] == m[2], let pn = Int(p[1]), n != pn { step = n - pn }
        return "\(m[0])\(n + step)\(m[2])"
    }
    if let w = groups("(.*?)([A-Za-z]+)", last) {
        for (k, list) in seriesWords.enumerated() {
            guard let i = list.firstIndex(where: { $0.lowercased() == w[1].lowercased() }) else { continue }
            if k == 0 && i == list.count - 1 { return w[0] + "13" } // past twelve, count in digits
            let word = list[(i + 1) % list.count]
            let upper = w[1].first?.isUppercase == true
            return w[0] + (upper ? word.prefix(1).uppercased() + word.dropFirst() : word.lowercased())
        }
    }
    return values.count > 1 && values.allSatisfy { $0 == last } ? last : ""
}

/// The next line of a list: its bullet or number carries on, and so does the text after it.
func nextLine(_ lines: [String]) -> String {
    let parts = lines.map { groups("(\\s*(?:[•\\-*·▸›]|\\d+[.)]|[a-z][.)])\\s+)(.*)", $0) ?? ["", $0] }
    let lead = parts.last?[0] ?? ""
    let indent = String(lead.prefix { $0.isWhitespace }), trailing = String(lead.reversed().prefix { $0.isWhitespace }.reversed())
    let trim = { (s: String) in s.trimmingCharacters(in: .whitespaces) }
    let mark = lead.isEmpty ? "" : { let v = nextValue(parts.map { trim($0[0]) }); return v.isEmpty ? trim(lead) : v }()
    let body = nextValue(parts.map { String($0[1].reversed().drop { $0.isWhitespace }.reversed()) })
    return (mark.isEmpty ? "" : indent + mark + (trailing.isEmpty ? " " : trailing)) + body
}

let expandLimit = 50

func canExpand(_ el: Element?) -> Bool { el?.presetId == "table" || el?.presetId == "list" }

/// A table grown by rows or a list by items, each carrying its pattern on; nil when the part does not expand.
func expandElement(_ elements: [Element], id: String, by: Int = 1) -> [Element]? {
    guard let el = elements.first(where: { $0.id == id }), canExpand(el) else { return nil }
    let n = max(1, min(expandLimit, by))
    if el.presetId == "table" {
        var cells = tableCells(el.template)
        guard cells.count + n <= 200 else { return nil }
        for _ in 0..<n {
            let body = Array(cells.dropFirst()), width = cells.map(\.count).max() ?? 1
            cells.append((0..<width).map { j in nextValue(body.map { j < $0.count ? $0[j] : "" }) })
        }
        return updateElement(elements, id: id, cells: cells)
    }
    var lines = el.template.map { String($0.reversed().drop { $0 == " " }.reversed()) }.filter { !$0.isEmpty }
    guard lines.count + n <= 200 else { return nil }
    for _ in 0..<n { lines.append(nextLine(lines)) }
    return updateElement(elements, id: id, text: lines.joined(separator: "\n"))
}
