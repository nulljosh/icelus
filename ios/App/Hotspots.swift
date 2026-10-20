import Foundation

/// Hotspots (v53): a part can open a screen. `opens` holds that screen's id, so a press in play mode (v54) knows
/// where to go. Screens, lines, paint and adjustments never open anything. src/lib/hotspots.js is the twin.
func canOpen(_ el: Element?) -> Bool {
    guard let el else { return false }
    return !["screen", "line", "paint", "adjust"].contains(el.presetId)
}

/// The screen a part opens, or nil when it opens none or that screen is gone.
func opensScreen(_ elements: [Element], _ el: Element) -> Element? {
    guard let id = el.opens else { return nil }
    return elements.first { $0.id == id && $0.presetId == "screen" }
}

/// Point a part at a screen, or nil to take the link off. Anything but a part and a screen is refused.
func updateElement(_ elements: [Element], id: String, opens screenId: String?) -> [Element] {
    guard let el = elements.first(where: { $0.id == id }), canOpen(el), el.opens != screenId else { return elements }
    if let screenId, !elements.contains(where: { $0.id == screenId && $0.presetId == "screen" }) { return elements }
    return elements.map { x in
        guard x.id == id else { return x }
        var next = x
        next.opens = screenId
        return next
    }
}

/// Every way from one screen to another, as Markdown list lines: arrows drawn between screens, then hotspots,
/// which name the part you press. Used by Copy all screens and the build brief.
func flowLines(_ elements: [Element]) -> [String] {
    let screens = elements.filter { $0.presetId == "screen" }
    let at = { (col: Int, row: Int) in screens.first { col >= $0.col && col < $0.col + $0.width && row >= $0.row && row < $0.row + $0.height } }
    let name = { (s: Element) in (s.text ?? "").isEmpty ? "Screen" : s.text! }
    let words = { (el: Element) -> String in
        let w = (el.text ?? el.template.joined(separator: " "))
            .replacingOccurrences(of: "[^\\p{L}\\p{N}' ]+", with: " ", options: .regularExpression)
            .replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression).trimmingCharacters(in: .whitespaces)
        return w.isEmpty ? el.label : w
    }
    var out: [String] = []
    func add(_ item: String) { if !out.contains(item) { out.append(item) } }
    for el in elements where el.presetId == "line" {
        guard let f = el.from, let t = el.to, let a = at(f.col, f.row), let b = at(t.col, t.row), a.id != b.id else { continue }
        add("- \(name(a)) → \(name(b))")
    }
    for el in elements where canOpen(el) {
        guard let a = at(el.col, el.row), let b = opensScreen(elements, el), a.id != b.id else { continue }
        add("- \(name(a)) → \(name(b)) (\(words(el)))")
    }
    return out
}
