import Foundation

/// Play mode (v54): click through linked screens like a real app. One screen is shown on its own, moved to the
/// top left, and a press on a hotspot (Hotspots.swift) opens the screen it names. src/lib/play.js is the twin.
struct Spot: Equatable { let id: String; let col, row, width, height: Int; let to: String; let label: String; var move: String? = nil }
struct PlayScreen { let id: String; let title: String; let cols, rows: Int; let spots: [Spot]; let elements: [Element] }

func playScreens(_ elements: [Element]) -> [Element] {
    elements.filter { $0.presetId == "screen" && !$0.hidden }.sorted { ($0.row, $0.col) < ($1.row, $1.col) }
}

/// Where play starts: the picked screen, or the screen holding the picked part, else the first screen.
func startScreen(_ elements: [Element], selectedId: String? = nil) -> Element? {
    let screens = playScreens(elements)
    if let sel = elements.first(where: { $0.id == selectedId }),
       let s = screens.first(where: { $0.id == sel.id || !partsInside([sel], $0).isEmpty }) { return s }
    return screens.first
}

/// One screen to play: it and what sits inside it, shifted so the screen is at 0,0 (the canvas part comes too,
/// so its line mode still applies), plus its hotspots with the words to read out.
func playView(_ elements: [Element], _ screenId: String) -> PlayScreen? {
    guard let screen = elements.first(where: { $0.id == screenId && $0.presetId == "screen" && !$0.hidden }) else { return nil }
    let inside = partsInside(elements, screen).filter { !$0.hidden }.map { carry($0, dCol: -screen.col, dRow: -screen.row) }
    let spots = inside.compactMap { el -> Spot? in
        guard canOpen(el), let to = opensScreen(elements, el), !to.hidden, to.id != screen.id else { return nil }
        return Spot(id: el.id, col: el.col, row: el.row, width: el.width, height: el.height, to: to.id, label: partWords(el), move: cleanMove(el.move))
    }
    return PlayScreen(id: screen.id, title: (screen.text ?? "").isEmpty ? "Screen" : screen.text!, cols: screen.width, rows: screen.height,
                      spots: spots, elements: [carry(screen, dCol: -screen.col, dRow: -screen.row)] + inside + elements.filter(\.canvas))
}

/// The hotspot under a cell of the shown screen, topmost first, or nil.
func spotAt(_ view: PlayScreen?, col: Int, row: Int) -> Spot? {
    view?.spots.last { col >= $0.col && col < $0.col + $0.width && row >= $0.row && row < $0.row + $0.height }
}

/// An agent or a check plays a flow: press hotspots by part id in turn. The screens visited, and the step where
/// a press was not a hotspot on the screen shown at the time.
func playPath(_ elements: [Element], start: String, presses: [String]) -> (path: [PlayScreen], error: String?) {
    guard var view = playView(elements, start) else { return ([], "start must be a screen that is shown") }
    var path = [view]
    for (i, id) in presses.enumerated() {
        guard let spot = view.spots.first(where: { $0.id == id }), let next = playView(elements, spot.to) else {
            return (path, "press \(i) is not a hotspot on \(view.title)")
        }
        view = next
        path.append(view)
    }
    return (path, nil)
}

// MARK: Live parts (v55)

/// While playing, controls work. Their state lives in the play session only, never in the project.
enum LiveValue: Equatable { case on(Bool), at(Int), words(String) }
private let liveKinds = ["checkbox": "tick", "radio": "pick", "toggle": "flip", "segmented": "choose", "tabs": "choose", "rating": "rate",
                         "slider": "slide", "input": "type", "search": "type", "textarea": "type"]
let typeMax = 500

/// A hotspot is pressed, not played.
func liveKind(_ el: Element?) -> String? {
    guard let el, el.opens == nil else { return nil }
    return liveKinds[el.presetId]
}

private func starRun(_ t: String) -> (start: Int, count: Int)? {
    guard let r = t.range(of: "[★☆]+", options: .regularExpression) else { return nil }
    return (t.distance(from: t.startIndex, to: r.lowerBound), t[r].count)
}

/// What a live part shows before anyone touches it, read from its characters.
func liveStart(_ el: Element) -> LiveValue? {
    let t = el.template.first ?? ""
    switch (liveKind(el), realPart(el)) {
    case ("tick", .control(.checkbox(let on, _))), ("pick", .control(.radio(let on, _))), ("flip", .toggle(let on)): return .on(on)
    case ("tick", _), ("pick", _), ("flip", _): return .on(false)
    case ("choose", .segmented(_, let at)), ("choose", .tabs(_, let at, _)): return .at(at)
    case ("choose", _): return .at(0)
    case ("rate", _): return .at(t.filter { $0 == "★" }.count)
    case ("slide", _): return .at(Array(t).firstIndex(of: "●") ?? 0)
    case ("type", _): return .words("")
    default: return nil
    }
}

/// A press on a live part, dCol cells from its left edge (nil from the keyboard, which steps to the next value).
/// Picking a radio clears the other radios on the screen.
func pressLive(_ view: PlayScreen, _ state: [String: LiveValue], id: String, dCol: Int?) -> [String: LiveValue] {
    guard let el = view.elements.first(where: { $0.id == id }), let kind = liveKind(el), let v = state[id] ?? liveStart(el) else { return state }
    var next = state
    let clamp = { (n: Int, lo: Int, hi: Int) in max(lo, min(hi, n)) }
    switch (kind, v) {
    case ("tick", .on(let on)), ("flip", .on(let on)): next[id] = .on(!on)
    case ("pick", _):
        for r in view.elements where r.presetId == "radio" { next[r.id] = .on(false) }
        next[id] = .on(true)
    case ("choose", .at(let i)):
        var n = 1
        if case .segmented(let items, _) = realPart(el) { n = max(1, items.count) }
        if case .tabs(let items, _, _) = realPart(el) { n = max(1, items.count) }
        next[id] = .at(dCol.map { clamp(Int(Double($0) / (Double(el.width) / Double(n))), 0, n - 1) } ?? (i + 1) % n)
    case ("rate", .at(let i)):
        guard let run = starRun(el.template.first ?? ""), run.count > 0 else { return state }
        next[id] = .at(dCol.map { clamp($0 - run.start + 1, 1, run.count) } ?? i % run.count + 1)
    case ("slide", .at(let i)):
        let len = max(1, (el.template.first ?? "").count)
        next[id] = .at(dCol.map { clamp($0, 0, len - 1) } ?? (i + Int((Double(len) / 10).rounded(.up))) % len)
    default: return state
    }
    return next
}

func typeLive(_ state: [String: LiveValue], id: String, words: String) -> [String: LiveValue] {
    var next = state
    next[id] = .words(String(words.prefix(typeMax)))
    return next
}

/// A live part drawn in its state: the characters rewritten the way the part itself would show it. A typed field
/// is drawn empty; the words are typed over it.
func liveElement(_ el: Element, _ state: [String: LiveValue]) -> Element {
    guard let kind = liveKind(el), let v = state[el.id] else { return el }
    var out = el
    let t = el.template.first ?? ""
    func line(_ l: String) -> Element { out.template = [l] + el.template.dropFirst(); return out }
    switch (kind, v) {
    case ("tick", .on(let on)): return line(t.replacingOccurrences(of: #"^\[.\]"#, with: on ? "[✓]" : "[ ]", options: .regularExpression))
    case ("pick", .on(let on)): return line(t.replacingOccurrences(of: #"^\(.\)"#, with: on ? "(●)" : "( )", options: .regularExpression))
    case ("flip", .on(let on)):
        let chars = Array(t)
        guard chars.count >= 3 else { return el }
        let n = chars.count - 2, bar = String(repeating: "━", count: n - 1)
        return line(String(chars[0]) + (on ? bar + "●" : "●" + bar) + String(chars[chars.count - 1]))
    case ("choose", .at(let i)): out.live = i; return out
    case ("rate", .at(let i)):
        guard let run = starRun(t) else { return el }
        let chars = Array(t), stars = String(repeating: "★", count: i) + String(repeating: "☆", count: run.count - i)
        return line(String(chars[..<run.start]) + stars + String(chars[(run.start + run.count)...]))
    case ("slide", .at(let i)):
        return line(String(Array(t).enumerated().map { $0.offset == i ? "●" : $0.element == "●" ? "─" : $0.element }))
    case ("type", .words(let w)):
        guard !w.isEmpty else { return el }
        out.template = el.template.map { $0.replacingOccurrences(of: #"[^\s─│┌┐└┘\[\]()_]"#, with: " ", options: .regularExpression) }
        return out
    default: return el
    }
}
