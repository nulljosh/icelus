// Critique: a review of the screens, a port of src/lib/critique.js. Each issue names its rule, where it is and
// the part, if any. ReviewSheet shows them; the web, CLI and API say them in English for agents.

private let seeThrough: Set<String> = ["line", "text", "banner", "screen", "fill", "paint", "adjust"]
private let vague: Set<String> = ["click", "here", "button", "label", "text", "title", "option", "lorem", "ipsum", "todo", "tbd", "xxx", "untitled", "placeholder"]
private let lists: Set<String> = ["list", "table", "ios-list"]
private let inputs: Set<String> = ["input", "textarea", "select", "search", "datepicker"]

struct CritiqueIssue: Equatable {
    let rule: String
    let col: Int, row: Int
    var id: String? = nil, part: String? = nil, otherId: String? = nil, word: String? = nil, note: String? = nil, style: String? = nil, kind: String? = nil
    var severity: String { ["off_grid", "broken_box"].contains(rule) ? "error" : rule == "open_note" ? "info" : "warn" }
}

private func tokens(_ el: Element) -> [String] {
    (el.text ?? el.template.joined(separator: " ")).split(whereSeparator: { !($0.isLetter || $0.isNumber || $0 == "'") }).map(String.init)
}

/// The box style a part shows: set on it, or baked into its characters (a saved or system part).
private func shownStyle(_ el: Element) -> String? {
    let chars = el.template.joined()
    guard chars.contains(where: { "┌╭┏╔".contains($0) }) else { return nil }
    if let style = el.style { return style }
    return chars.contains(where: { "╭╮╰╯".contains($0) }) ? "rounded" : chars.contains(where: { "╔═".contains($0) }) ? "double"
        : chars.contains(where: { "┏━".contains($0) }) ? "heavy" : "single"
}

/// system: an optional design system; boxes in another style are off it.
func critique(_ elements: [Element], cols: Int, rows: Int, system: DesignSystem? = nil) -> [CritiqueIssue] {
    let shown = elements.filter { !$0.hidden }
    func at(_ rule: String, _ el: Element) -> CritiqueIssue { CritiqueIssue(rule: rule, col: el.col, row: el.row, id: el.id, part: el.label) }
    func holds(_ a: Element, _ b: Element) -> Bool {
        b.col >= a.col && b.row >= a.row && b.col + b.width <= a.col + a.width && b.row + b.height <= a.row + a.height
    }
    func meets(_ a: Element, _ b: Element) -> Bool {
        a.col < b.col + b.width && b.col < a.col + a.width && a.row < b.row + b.height && b.row < a.row + a.height
    }
    var issues: [CritiqueIssue] = []
    for el in shown where el.col < 0 || el.row < 0 || el.col + el.width > cols || el.row + el.height > rows { issues.append(at("off_grid", el)) }
    // Two solid parts that partly cover each other. One wholly inside another is a part in a card, on purpose.
    let solid = shown.filter { !seeThrough.contains($0.presetId) }
    for (i, a) in solid.enumerated() {
        for b in solid.dropFirst(i + 1) where meets(a, b) && !holds(a, b) && !holds(b, a) && !(a.group != nil && a.group == b.group) {
            var issue = at("overlap", a); issue.otherId = b.id; issues.append(issue)
        }
    }
    // A box that closes in its own part but is cut open on the canvas, by whatever sits on top of it.
    let own = Set(shown.flatMap { el in brokenBoxes(el.template.joined(separator: "\n")).map { "\(el.row + $0.row),\(el.col + $0.col)" } })
    for b in brokenBoxes(gridToText(renderElements(shown, cols: cols, rows: rows))) where !own.contains("\(b.row),\(b.col)") {
        issues.append(CritiqueIssue(rule: "broken_box", col: b.col, row: b.row))
    }
    for el in shown where el.presetId != "screen" {
        let t = tokens(el)
        if !t.isEmpty && t.allSatisfy({ vague.contains($0.lowercased()) }) { var issue = at("vague_label", el); issue.word = t.joined(separator: " "); issues.append(issue) }
    }
    // States: a list needs a screen for when it is empty, a form needs one for a wrong entry.
    let all = Set(shown.flatMap(tokens).map { $0.lowercased() })
    func said(_ ws: String...) -> Bool { ws.contains(where: all.contains) }
    if let list = shown.first(where: { lists.contains($0.presetId) }), !said("empty", "nothing", "results") { issues.append(at("no_empty_state", list)) }
    if let input = shown.first(where: { inputs.contains($0.presetId) }), !said("error", "invalid", "required", "wrong"),
       !shown.contains(where: { $0.variant == "error" || $0.presetId == "alert" }) { issues.append(at("no_error_state", input)) }
    if let system {
        for el in shown where el.presetId != "line" {
            if let style = shownStyle(el), style != system.style { var issue = at("off_system", el); issue.style = system.style; issues.append(issue) }
        }
    }
    for el in shown { if let note = el.note { var issue = at("open_note", el); issue.note = note; issues.append(issue) } }
    for a in accessIssues(shown) { var issue = at(a.rule, a.el); issue.kind = a.kind; issues.append(issue) } // access check (Access.swift)
    // Distractions, the way Photoshop finds them: a few stray painted marks or paint off every screen, and parts with nothing to show.
    let screens = shown.filter { $0.presetId == "screen" }
    for el in shown where !el.locked {
        let stray = el.presetId == "paint" && (marks(el) <= 3 || (!screens.isEmpty && !screens.contains { meets($0, el) }))
        if stray || (!["screen", "line", "adjust", "paint"].contains(el.presetId) && marks(el) == 0) {
            var issue = at("distraction", el); issue.kind = stray ? "stray" : "empty"; issues.append(issue)
        }
    }
    return issues
}

private func marks(_ el: Element) -> Int { el.template.joined().filter { !$0.isWhitespace }.count }

/// One tap clears them. Deleting heals any arrows through a removed part.
func removeDistractions(_ elements: [Element], cols: Int, rows: Int) -> [Element] {
    critique(elements, cols: cols, rows: rows).filter { $0.rule == "distraction" }.compactMap(\.id).reduce(elements) { deleteElement($0, id: $1) }
}

/// The issue in English, for agents and the build brief (Handoff.swift). The Review sheet translates its own.
func critiqueMessage(_ i: CritiqueIssue, part: String? = nil, other: String? = nil) -> String {
    let p = part ?? i.part ?? "A part", at = "at \(i.col),\(i.row)"
    switch i.rule {
    case "off_grid": return "\(p) \(at) runs off the grid"
    case "overlap": return "\(p) \(at) overlaps \(other ?? "another part")"
    case "broken_box": return "A box \(at) is cut open by a part on top of it"
    case "vague_label": return "\(p) \(at) says \"\(i.word ?? "")\", which is placeholder text"
    case "no_empty_state": return "\(p) \(at) has no empty state: add a screen for when it has nothing in it"
    case "no_error_state": return "\(p) \(at) has no error state: show what a wrong entry looks like"
    case "off_system": return "\(p) \(at) is off the \(i.style ?? "") style"
    case "focus_order": return "\(p) \(at) comes out of reading order, so keyboard and screen reader focus jumps"
    case "no_label": return "\(p) \(at) has no label: put words in it or just before it"
    case "small_target": return "\(p) \(at) is \(i.kind == "narrow" ? "too narrow to tap: make it at least 5 cells wide" : "touching another control: leave a gap between them")"
    case "distraction": return "\(p) \(at) is a distraction: \(i.kind == "stray" ? "a few stray marks" : "it shows nothing")"
    default: return "Note on \(p) \(at): \(i.note ?? "")"
    }
}
