import Foundation

/// Hotspots (v53): a part can open a screen. `opens` holds that screen's id, so a press in play mode (v54) knows
/// where to go. Screens, lines, paint and adjustments never open anything. src/lib/hotspots.js is the twin.
func canOpen(_ el: Element?) -> Bool {
    guard let el else { return false }
    return !["screen", "line", "paint", "adjust"].contains(el.presetId)
}

/// Transitions (v56): how the screen a hotspot opens arrives. Nothing set means a plain cut. src/lib/hotspots.js is the twin.
let moves = ["push", "sheet", "fade", "overlay"] // overlay: drawn over the screen before, dimmed underneath
func cleanMove(_ m: String?) -> String? { m.flatMap { moves.contains($0) ? $0 : nil } }

/// The screen a part opens, or nil when it opens none or that screen is gone.
func opensScreen(_ elements: [Element], _ el: Element) -> Element? {
    guard let id = el.opens else { return nil }
    return elements.first { $0.id == id && $0.presetId == "screen" }
}

/// Back (prototype actions): `opens == backTarget` returns to the screen before. src/lib/hotspots.js is the twin.
let backTarget = "back"
func opensBack(_ el: Element) -> Bool { canOpen(el) && el.opens == backTarget }
/// Web link: `opens` may be an https address, opened in the browser while playing.
func isLink(_ v: String?) -> Bool {
    guard let v, v.count <= 500, v.hasPrefix("https://"), v.count > 8 else { return false }
    return !v.contains(where: { $0.isWhitespace || "<>\"'".contains($0) })
}
func opensLink(_ el: Element) -> String? { canOpen(el) && isLink(el.opens) ? el.opens : nil }

/// Point a part at a screen, at backTarget, or nil to take the link off. Anything but a part and a screen is refused.
func updateElement(_ elements: [Element], id: String, opens screenId: String?) -> [Element] {
    guard let el = elements.first(where: { $0.id == id }), canOpen(el), el.opens != screenId else { return elements }
    if let screenId, screenId != backTarget, !isLink(screenId), !elements.contains(where: { $0.id == screenId && $0.presetId == "screen" }) { return elements }
    return elements.map { x in
        guard x.id == id else { return x }
        var next = x
        next.opens = screenId
        if screenId == nil || screenId == backTarget || isLink(screenId) { next.move = nil }
        return next
    }
}

/// Set how a hotspot's screen arrives, or nil for a cut. Refused on a part that opens nothing.
func updateElement(_ elements: [Element], id: String, move: String?) -> [Element] {
    guard let el = elements.first(where: { $0.id == id }), opensScreen(elements, el) != nil else { return elements }
    let next = cleanMove(move)
    guard (move == nil || next != nil), el.move != next else { return elements }
    return elements.map { x in
        guard x.id == id else { return x }
        var n = x
        n.move = next
        return n
    }
}

/// The words on a part, for a flow line or a spoken hotspot: letters, digits and spaces, or its kind.
func partWords(_ el: Element) -> String {
    let w = (el.text ?? el.template.joined(separator: " "))
        .replacingOccurrences(of: "[^\\p{L}\\p{N}' ]+", with: " ", options: .regularExpression)
        .replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression).trimmingCharacters(in: .whitespaces)
    return w.isEmpty ? el.label : w
}

/// Every way from one screen to another, as Markdown list lines: arrows drawn between screens, then hotspots,
/// which name the part you press. Used by Copy all screens and the build brief.
func flowLines(_ elements: [Element]) -> [String] {
    let screens = elements.filter { $0.presetId == "screen" }
    let at = { (col: Int, row: Int) in screens.first { col >= $0.col && col < $0.col + $0.width && row >= $0.row && row < $0.row + $0.height } }
    let name = { (s: Element) in (s.text ?? "").isEmpty ? "Screen" : s.text! }
    var out: [String] = []
    func add(_ item: String) { if !out.contains(item) { out.append(item) } }
    for el in elements where el.presetId == "line" {
        guard let f = el.from, let t = el.to, let a = at(f.col, f.row), let b = at(t.col, t.row), a.id != b.id else { continue }
        add("- \(name(a)) → \(name(b))")
    }
    for el in elements where canOpen(el) {
        guard let a = at(el.col, el.row), let b = opensScreen(elements, el), a.id != b.id else { continue }
        add("- \(name(a)) → \(name(b)) (\(partWords(el)))")
    }
    return out
}
