// The real look, a port of src/lib/real.js: what each part draws as when it is shown as a real interface
// instead of characters. Nil keeps a part's characters.

import Foundation

private let boxChars = Set("─│┌┐└┘├┤┬┴┼╭╮╰╯═║╔╗╚╝╠╣╦╩╬━┃┏┓┗┛┣┫┳┻╋╷╵╶╴")
private let characterParts: Set<String> = ["line", "paint", "adjust", "chart", "sparkline", "fill", "photo", "boxy", "flow", "node", "sequence", "tree"]

enum RealPart: Equatable {
    case control(CodePart)
    case toggle(Bool), slider(Double), progress(Double), search(String), avatar(String), image, skeleton
    case segmented([String]), tags([String])
    case box([TextRow]), words([TextRow])
}

struct TextRow: Equatable { let row: Int; let col: Int; let text: String; var button = false }

// A row that is only "[ Action ]" is a button inside a card or modal (two characters or more, so "[x]" stays).
private let buttonRow = try? NSRegularExpression(pattern: #"^\[\s*([^\[\]\s][^\[\]]*?[^\[\]\s])\s*\]$"#)

/// The words on each row of a part, with where they start. Box lines are dropped.
func rowsOfText(_ template: [String]) -> [TextRow] {
    template.enumerated().compactMap { row, line in
        let plain = String(line.map { boxChars.contains($0) ? " " : $0 })
        guard let start = plain.firstIndex(where: { $0 != " " }) else { return nil }
        let text = String(plain[start...]).replacingOccurrences(of: "\\s+$", with: "", options: .regularExpression)
        let col = plain.distance(from: plain.startIndex, to: start)
        if let m = buttonRow?.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)), let r = Range(m.range(at: 1), in: text), !text[r].hasPrefix("v ") {
            return TextRow(row: row, col: col, text: String(text[r]), button: true)
        }
        return TextRow(row: row, col: col, text: text)
    }
}

private func boxed(_ el: Element) -> Bool {
    el.height > 1 && (el.template.first?.first).map { "┌╔╭┏".contains($0) } == true && (el.template.last?.last).map { "┘╝╯┛".contains($0) } == true
}

/// How a part draws in the real look, or nil to keep its characters.
func realPart(_ el: Element) -> RealPart? {
    if characterParts.contains(el.presetId) || el.presetId.hasPrefix("photo") { return nil }
    let p = readPart(el)
    if case .pre = p {} else { return .control(p) }
    let t = el.template.first ?? "", chars = Array(t)
    switch el.presetId {
    case "toggle":
        let dot = chars.firstIndex(of: "●") ?? 0
        return .toggle(Double(dot) > Double(chars.count) / 2 || t.range(of: "━+●", options: .regularExpression) != nil)
    case "slider": return .slider(min(1, max(0, Double(chars.firstIndex(of: "●") ?? 0) / Double(max(1, chars.count - 1)))))
    case "progress":
        let marks = chars.filter { "▓░●─━".contains($0) }
        return .progress(Double(marks.filter { $0 == "▓" }.count) / Double(max(1, marks.count)))
    case "search": return .search(t.replacingOccurrences(of: "[()⌕]", with: "", options: .regularExpression).trimmingCharacters(in: .whitespaces))
    case "avatar": return .avatar(String(rowsOfText(el.template).map(\.text).joined().filter { $0.isLetter || $0.isNumber }.prefix(2)).uppercased())
    case "image": return .image
    case "skeleton": return .skeleton
    case "segmented": return .segmented(t.trimmingCharacters(in: CharacterSet(charactersIn: "[]")).split(separator: "|").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty })
    case "tags":
        let re = try? NSRegularExpression(pattern: #"\(([^)]+)\)"#)
        return .tags(re?.matches(in: t, range: NSRange(t.startIndex..., in: t)).compactMap { Range($0.range(at: 1), in: t).map { t[$0].trimmingCharacters(in: .whitespaces) } } ?? [])
    default: break
    }
    return boxed(el) ? .box(rowsOfText(el.template)) : .words(rowsOfText(el.template))
}
