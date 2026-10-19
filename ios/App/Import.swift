// Any text wireframe back into parts, a port of src/lib/importer.js: boxes are found by their corners and
// edges, a box with dividers (a table) keeps its contents, every other run of text becomes a text part or,
// in [ brackets ], a button. Drawing the parts gives back the same text.

import Foundation

private let tl: Set<Character> = Set("┌╭┏╔+"), tr: Set<Character> = Set("┐╮┓╗+")
private let bl: Set<Character> = Set("└╰┗╚+"), br: Set<Character> = Set("┘╯┛╝+")
private let hEdge: Set<Character> = Set("─━═-+┬┴┼┳┻╋╦╩╬╤╧")
private let vEdge: Set<Character> = Set("│┃║|+├┤┼┣┫╋╠╣╬╟╢")

private struct Box: Equatable { let r: Int, c: Int, r2: Int, c2: Int }

private func findBoxes(_ g: [[Character]]) -> [Box] {
    func at(_ r: Int, _ c: Int) -> Character { r >= 0 && r < g.count && c >= 0 && c < g[r].count ? g[r][c] : " " }
    var boxes: [Box] = []
    for r in 0..<g.count {
        for c in 0..<g[r].count {
            guard tl.contains(at(r, c)), hEdge.contains(at(r, c + 1)), vEdge.contains(at(r + 1, c)) || bl.contains(at(r + 1, c)) else { continue }
            var c2 = c + 1
            while c2 < g[r].count && !tr.contains(at(r, c2)) && !vEdge.contains(at(r, c2)) && !tl.contains(at(r, c2)) { c2 += 1 }
            guard tr.contains(at(r, c2)) else { continue }
            var r2 = r + 1
            while vEdge.contains(at(r2, c)) && !bl.contains(at(r2, c)) { r2 += 1 }
            guard bl.contains(at(r2, c)), br.contains(at(r2, c2)) else { continue }
            let closed = (c + 1..<max(c + 1, c2)).allSatisfy { hEdge.contains(at(r2, $0)) }
                && (r + 1..<max(r + 1, r2)).allSatisfy { vEdge.contains(at($0, c2)) }
            if closed { boxes.append(Box(r: r, c: c, r2: r2, c2: c2)) }
        }
    }
    return boxes
}

func importText(_ text: String, startRow: Int = 0, startCol: Int = 0) -> [Element] {
    var lines = text.replacingOccurrences(of: "\r\n", with: "\n").replacingOccurrences(of: "\r", with: "\n")
        .replacingOccurrences(of: "\t", with: "    ").components(separatedBy: "\n")
    while let last = lines.last, last.trimmingCharacters(in: .whitespaces).isEmpty { lines.removeLast() }
    let g = lines.map(Array.init)
    func at(_ r: Int, _ c: Int) -> Character { r >= 0 && r < g.count && c >= 0 && c < g[r].count ? g[r][c] : " " }
    let boxes = findBoxes(g).sorted { ($0.r2 - $0.r) * ($0.c2 - $0.c) > ($1.r2 - $1.r) * ($1.c2 - $1.c) }
    func inside(_ b: Box, _ r: Int, _ c: Int) -> Bool { r >= b.r && r <= b.r2 && c >= b.c && c <= b.c2 }
    func border(_ b: Box, _ r: Int, _ c: Int) -> Bool { inside(b, r, c) && (r == b.r || r == b.r2 || c == b.c || c == b.c2) }
    let junctions = Set("┬┴┼┳┻╋╦╩╬╤╧"), tees = Set("├┣╠╟")
    let whole = boxes.filter { b in
        [b.r, b.r2].contains { r in (b.c + 1..<max(b.c + 1, b.c2)).contains { junctions.contains(at(r, $0)) } }
            || (b.r + 1..<max(b.r + 1, b.r2)).contains { tees.contains(at($0, b.c)) }
    }
    func held(_ r: Int, _ c: Int) -> Bool { boxes.contains { border($0, r, c) } || whole.contains { inside($0, r, c) } }
    var elements: [Element] = boxes.enumerated().map { i, b in
        let template = (b.r...b.r2).map { r in
            String((b.c...b.c2).map { c -> Character in
                let keep = border(b, r, c) || (whole.contains(b) && !boxes[(i + 1)...].contains { inside($0, r, c) })
                return keep ? at(r, c) : " "
            })
        }
        return createElement(Preset(id: "box", label: "Box", category: "Imported", template: template),
                             col: startCol + b.c, row: startRow + b.r)
    }
    for (r, chars) in g.enumerated() {
        var c = 0
        while c < chars.count {
            if chars[c] == " " || held(r, c) { c += 1; continue }
            var end = c
            while end < chars.count && !held(r, end) && !(chars[end] == " " && at(r, end + 1) == " ") { end += 1 }
            var run = String(chars[c..<end])
            while run.hasSuffix(" ") { run.removeLast() }
            let checkbox = run.count > 4 && ["[ ] ", "[x] ", "[✓] "].contains(String(run.prefix(4)))
            let inner = run.dropFirst().dropLast()
            let button = !checkbox && run.count > 2 && run.hasPrefix("[") && run.hasSuffix("]")
                && !inner.contains("]") && inner.contains { !" x✓".contains($0) }
            elements.append(createElement(Preset(id: button ? "button" : "text", label: button ? "Button" : "Text",
                                                 category: "Imported", template: [run]), col: startCol + c, row: startRow + r))
            c = end
        }
    }
    return elements
}

/// Box corners that open a box that never closes: the usual damage when a wireframe is edited by hand or a part
/// covers a box. 0-based. ASCII + is left out, since it is also an ordinary character.
func brokenBoxes(_ text: String) -> [(row: Int, col: Int)] {
    let g = text.replacingOccurrences(of: "\r\n", with: "\n").replacingOccurrences(of: "\r", with: "\n")
        .replacingOccurrences(of: "\t", with: "    ").components(separatedBy: "\n").map(Array.init)
    let boxes = findBoxes(g)
    var out: [(row: Int, col: Int)] = []
    for (r, chars) in g.enumerated() {
        for (c, ch) in chars.enumerated() where tl.contains(ch) && ch != "+" && !boxes.contains(where: { $0.r == r && $0.c == c }) {
            out.append((r, c))
        }
    }
    return out
}
