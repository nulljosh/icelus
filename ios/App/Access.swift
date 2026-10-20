import Foundation

/// Access check (v51): Review also checks that a screen works for everyone. Focus moves through controls in
/// the order they appear in the project, so it must match reading order; a field needs words that name it; a
/// control needs room to be tapped. src/lib/access.js is the twin.
let accessControls: Set<String> = ["button", "input", "select", "checkbox", "radio", "toggle", "search", "segmented", "slider",
                                   "textarea", "stepper", "datepicker", "rating", "ios-switch", "md-fab", "email-button"]
private let fields: Set<String> = ["input", "select", "search", "textarea", "datepicker"]
let minTarget = 5 // cells: about 44 points at the default size

private func hasWords(_ el: Element) -> Bool { el.template.joined().contains { ($0.isLetter || $0.isNumber) && $0 != "▾" } }
private func reading(_ a: Element, _ b: Element) -> Int { a.row != b.row ? a.row - b.row : a.col - b.col }
private func rowsMeet(_ a: Element, _ b: Element) -> Bool { a.row < b.row + b.height && b.row < a.row + a.height }
private func colsMeet(_ a: Element, _ b: Element) -> Bool { a.col < b.col + b.width && b.col < a.col + a.width }

/// Reading order screen by screen: the screens left to right and top to bottom, then within each screen.
private func byScreen(_ elements: [Element]) -> (Element, Element) -> Int {
    let screens = elements.filter { $0.presetId == "screen" }.sorted { reading($0, $1) < 0 }
    func rank(_ el: Element) -> Int {
        screens.firstIndex { s in el.col >= s.col && el.row >= s.row && el.col + el.width <= s.col + s.width && el.row + el.height <= s.row + s.height } ?? -1
    }
    return { a, b in rank(a) != rank(b) ? rank(a) - rank(b) : reading(a, b) }
}

/// A field is named by its own words, or by words just left of it on its rows or in the row above it.
private func named(_ el: Element, _ shown: [Element]) -> Bool {
    hasWords(el) || shown.contains { o in
        !accessControls.contains(o.presetId) && o.presetId != "screen" && hasWords(o)
            && ((rowsMeet(o, el) && o.col + o.width <= el.col && el.col - (o.col + o.width) <= 4)
                || (colsMeet(o, el) && o.row + o.height <= el.row && el.row - (o.row + o.height) <= 1))
    }
}

func accessIssues(_ shown: [Element]) -> [(rule: String, el: Element, kind: String?)] {
    let controls = shown.filter { accessControls.contains($0.presetId) }, order = byScreen(shown)
    var issues: [(rule: String, el: Element, kind: String?)] = []
    if let out = controls.indices.dropFirst().first(where: { order(controls[$0 - 1], controls[$0]) > 0 }) { issues.append(("focus_order", controls[out], nil)) }
    for el in controls {
        if fields.contains(el.presetId) && !named(el, shown) { issues.append(("no_label", el, nil)) }
        if el.width < minTarget { issues.append(("small_target", el, "narrow")) }
        else if controls.contains(where: { o in o.id != el.id && reading(o, el) < 0
            && ((rowsMeet(o, el) && (el.col == o.col + o.width || o.col == el.col + el.width)) || (colsMeet(o, el) && el.row == o.row + o.height)) }) {
            issues.append(("small_target", el, "crowded"))
        }
    }
    return issues
}

/// One tap puts the controls in reading order. Everything else keeps its place in the list.
func fixFocusOrder(_ elements: [Element]) -> [Element] {
    let at = elements.indices.filter { accessControls.contains(elements[$0].presetId) }
    let order = byScreen(elements)
    let sorted = at.map { elements[$0] }.sorted { order($0, $1) < 0 }
    var out = elements
    for (k, i) in at.enumerated() { out[i] = sorted[k] }
    return out
}
