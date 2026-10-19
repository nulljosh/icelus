// Hand it to Claude Code, a port of src/lib/handoff.js: a project as one Markdown brief an agent can build from.
// Each screen drawn, as typed lines and as a parts list, then the flow, the open notes, what Review still flags,
// and the project file.

import Foundation

private func cell(_ s: String) -> String {
    s.replacingOccurrences(of: "|", with: "\\|").split(whereSeparator: \.isWhitespace).joined(separator: " ")
}
private func words(_ el: Element) -> String {
    if let text = el.text { return cell(text) }
    let marks = Set("─│┌┐└┘├┤┬┴┼╭╮╰╯━┃┏┓┗┛═║╔╗╚╝[]()")
    let plain = String(el.template.joined(separator: " ").map { marks.contains($0) ? " " : $0 })
    return cell(plain.replacingOccurrences(of: #"_{2,}"#, with: " ", options: .regularExpression))
}

func handoff(_ elements: [Element], cols: Int, rows: Int, name: String = "Icelus project") -> String {
    let shown = elements.filter { !$0.hidden }
    let grid = renderElements(shown, cols: cols, rows: rows)
    let screens = shown.filter { $0.presetId == "screen" }.sorted { ($0.row, $0.col) < ($1.row, $1.col) }
    let groups: [(title: String, frame: Element?, parts: [Element])] = screens.isEmpty ? [(name, nil, shown)]
        : screens.map { ((($0.text ?? "").isEmpty ? "Screen" : $0.text!), $0, partsInside(shown, $0)) }
    var out = ["# \(name): build brief", "",
               "Build these screens as a working app. Each screen is drawn in plain text below: match its layout, its order and its words. " +
               "The parts list gives each part's kind and where it sits on the character grid (column, row, width by height). " +
               "Arrows in the Flow section are navigation. States are how a part looks pressed, disabled or in error. " +
               "Notes are open requests from the designer; do them. Use the project file at the end with the Icelus MCP server " +
               "(https://icelus.jaybulb.com/mcp) if you need to change the design.", ""]
    let holding = { (a: Anchor) in screens.first { a.col >= $0.col && a.col < $0.col + $0.width && a.row >= $0.row && a.row < $0.row + $0.height } }
    var flow: [String] = []
    for el in shown where el.presetId == "line" {
        guard let f = el.from, let t = el.to, let a = holding(f), let b = holding(t), a.id != b.id else { continue }
        let item = "- \(a.text ?? "Screen") → \(b.text ?? "Screen")"
        if !flow.contains(item) { flow.append(item) }
    }
    if !flow.isEmpty { out += ["## Flow", ""] + flow + [""] }
    for g in groups {
        let text: String
        if let f = g.frame {
            text = grid[max(0, f.row)..<min(grid.count, f.row + f.height)].map { r in
                String(r[min(r.count, max(0, f.col))..<min(r.count, f.col + f.width)])
            }.joined(separator: "\n")
        } else { text = gridToText(grid) }
        let parts = g.parts.filter { $0.presetId != "line" }.sorted { ($0.row, $0.col) < ($1.row, $1.col) }
        out += ["## \(g.title)", "", "```", trimText(text), "```", ""]
        let source = toSketch(parts).source.trimmingCharacters(in: .whitespacesAndNewlines)
        if !source.isEmpty { out += ["Typed lines (the Icelus syntax):", "", "```", source, "```", ""] }
        if !parts.isEmpty {
            out += ["| Part | Words | Where | State |", "|---|---|---|---|"]
            let dx = g.frame?.col ?? 0, dy = g.frame?.row ?? 0
            for el in parts {
                let w = words(el)
                out.append("| \(cell(el.label)) | \(w.isEmpty ? " " : w) | \(el.col - dx), \(el.row - dy), \(el.width)×\(el.height) | \(el.variant ?? "default") |")
            }
            out.append("")
        }
        let notes = parts.filter { $0.note != nil }
        if !notes.isEmpty { out += ["Notes:", ""] + notes.map { "- \(cell($0.label)) \"\(words($0))\": \(cell($0.note ?? ""))" } + [""] }
    }
    let issues = critique(shown, cols: cols, rows: rows).filter { $0.rule != "open_note" }
    if !issues.isEmpty {
        out += ["## Before you build", ""] + issues.map { i in
            "- " + critiqueMessage(i, other: shown.first { $0.id == i.otherId }?.label)
        } + [""]
    }
    var state = EditorState(cols: cols, rows: rows); state.elements = elements
    out += ["## Project file", "", "```json", serializeProject(state), "```", ""]
    return out.joined(separator: "\n")
}
