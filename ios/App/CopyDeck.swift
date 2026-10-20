import Foundation

/// Copy deck (v52): every piece of words on the canvas in one list. An entry is one run of words on one line of a
/// part (the OK in [ OK ]), so editing it swaps just those characters. Screens, banners and nodes are read from
/// their words. Keys and offsets match src/lib/copydeck.js (UTF-16, like JavaScript).
let copyMax = 200
private let copySkip: Set<String> = Set(["line", "paint", "adjust", "fill", "photo", "boxy"] + charts)
private let run = try! NSRegularExpression(pattern: "[\\p{L}\\p{N}](?:[\\p{L}\\p{N}'’.,!?:;&@%$/+-]| (?=[\\p{L}\\p{N}]))*")

struct CopyEntry: Equatable {
    let key: String, id: String, part: Int, row: Int, start: Int, text: String, label: String
}

private func ownWords(_ el: Element) -> Bool { el.text != nil && el.presetId != "table" }
private func linesOf(_ el: Element) -> [String] { ownWords(el) ? el.text!.components(separatedBy: "\n") : el.template }

func copyEntries(_ elements: [Element]) -> [CopyEntry] {
    var out: [CopyEntry] = []
    for (part, el) in elements.enumerated() where !copySkip.contains(el.presetId) && !el.hidden && !el.canvas {
        for (row, line) in linesOf(el).enumerated() {
            let ns = line as NSString
            for m in run.matches(in: line, range: NSRange(location: 0, length: ns.length)) where out.count < copyMax {
                out.append(CopyEntry(key: "\(part):\(row):\(m.range.location)", id: el.id, part: part, row: row,
                                     start: m.range.location, text: ns.substring(with: m.range), label: el.label))
            }
        }
    }
    return out
}

/// edits: key to new words. Each part is rewritten once, its edits applied right to left so earlier starts stay true.
func applyCopy(_ elements: [Element], _ edits: [String: String]) -> [Element] {
    let entries = copyEntries(elements).filter { edits[$0.key] != nil && edits[$0.key] != $0.text }
    var out = elements
    var seen = Set<String>()
    for id in entries.map(\.id) where !seen.contains(id) {
        seen.insert(id)
        guard let el = out.first(where: { $0.id == id }) else { continue }
        var lines = linesOf(el)
        for e in entries.filter({ $0.id == id }).sorted(by: { $0.row != $1.row ? $0.row > $1.row : $0.start > $1.start }) {
            let words = String(edits[e.key]!.replacingOccurrences(of: "\r", with: " ").replacingOccurrences(of: "\n", with: " ").prefix(200))
            lines[e.row] = (lines[e.row] as NSString).replacingCharacters(in: NSRange(location: e.start, length: (e.text as NSString).length), with: words)
        }
        out = el.presetId == "table" ? updateElement(out, id: id, cells: tableCells(lines)) : updateElement(out, id: id, text: lines.joined(separator: "\n"))
    }
    return out
}
