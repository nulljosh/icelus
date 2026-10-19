import Foundation

// The project file, the twin of src/lib/project.js.

/// The shared project file: the same JSON the web app saves, opens and exports.
func serializeProject(_ state: EditorState) -> String {
    var project: [String: Any] = ["blockprint": 1, "cols": state.cols, "rows": state.rows, "elements": state.elements.map(elementJSON)]
    if !state.snapshots.isEmpty {
        project["snapshots"] = state.snapshots.map { ["name": $0.name, "elements": $0.elements.map(elementJSON)] as [String: Any] }
    }
    guard let data = try? JSONSerialization.data(withJSONObject: project, options: [.sortedKeys]) else { return "" }
    return String(data: data, encoding: .utf8) ?? ""
}

/// One element as the project file writes it.
private func elementJSON(_ e: Element) -> [String: Any] {
    func anchor(_ a: Anchor) -> [String: Any] {
        var out: [String: Any] = ["col": a.col, "row": a.row]
        if let id = a.id { out["id"] = id; out["dCol"] = a.dCol; out["dRow"] = a.dRow }
        if a.edge { out["edge"] = true }
        if let side = a.side { out["side"] = side }
        return out
    }
    var el: [String: Any] = ["id": e.id, "presetId": e.presetId, "label": e.label, "template": e.template,
                             "width": e.width, "height": e.height, "col": e.col, "row": e.row]
    if let from = e.from, let to = e.to { el["from"] = anchor(from); el["to"] = anchor(to) }
    if let text = e.text { el["text"] = text }
    if let style = e.style { el["style"] = style }
    if e.accent { el["accent"] = true }
    if let group = e.group { el["group"] = group }
    if e.hidden { el["hidden"] = true }
    if e.locked { el["locked"] = true }
    if let symbol = e.symbol { el["symbol"] = symbol }
    if let variant = e.variant { el["variant"] = variant }
    if let note = e.note { el["note"] = note }
    if let take = e.take { el["take"] = take }
    if let ink = e.ink { el["ink"] = ink }
    if let paper = e.paper { el["paper"] = paper }
    if let adjust = e.adjust { el["adjust"] = adjust }
    if let m = e.mask { el["mask"] = ["top": m.top, "right": m.right, "bottom": m.bottom, "left": m.left] }
    if let clip = e.clip { el["clip"] = clip }
    if let blend = e.blend { el["blend"] = blend }
    return el
}

/// Lenient, like the web: broken elements are dropped, a bad size falls back to the default, ids are fresh.
func parseProject(_ json: String) -> EditorState? {
    guard let data = json.data(using: .utf8),
          let project = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
          let raw = project["elements"] as? [Any] else { return nil }
    func size(_ value: Any?, _ fallback: Int) -> Int {
        guard let n = value as? Int, n > 0, n <= 500 else { return fallback }
        return n
    }
    var state = EditorState(cols: size(project["cols"], defaultCols), rows: size(project["rows"], defaultRows))
    let valid = raw.compactMap { $0 as? [String: Any] }.filter { $0["template"] is [String] }
    // Ids are fresh on open, so pinned line ends are re-pointed at the new ids.
    let fresh = valid.map { _ in newElementId() }
    var ids: [String: String] = [:]
    for (i, el) in valid.enumerated() {
        if let old = el["id"] as? String, ids[old] == nil { ids[old] = fresh[i] }
    }
    func anchor(_ value: Any?) -> Anchor? {
        guard let a = value as? [String: Any] else { return nil }
        var out = Anchor(col: a["col"] as? Int ?? 0, row: a["row"] as? Int ?? 0)
        if let old = a["id"] as? String, let id = ids[old] {
            out.id = id
            out.dCol = a["dCol"] as? Int ?? 0
            out.dRow = a["dRow"] as? Int ?? 0
        }
        out.edge = a["edge"] as? Bool ?? false
        if let side = a["side"] as? String, ["left", "below"].contains(side) { out.side = side }
        return out
    }
    state.elements = valid.enumerated().map { i, el in
        let template = el["template"] as? [String] ?? []
        let from = anchor(el["from"]), to = anchor(el["to"])
        let pinned = from != nil && to != nil
        return Element(id: fresh[i], presetId: el["presetId"] as? String ?? "custom",
                       label: el["label"] as? String ?? "Element", template: template,
                       width: max(1, template.map(\.count).max() ?? 0), height: template.count,
                       col: el["col"] as? Int ?? 0, row: el["row"] as? Int ?? 0,
                       from: pinned ? from : nil, to: pinned ? to : nil, text: el["text"] as? String,
                       style: (el["style"] as? String).flatMap { boxStyles.contains($0) && $0 != "single" ? $0 : nil },
                       accent: el["accent"] as? Bool == true, group: el["group"] as? String,
                       hidden: el["hidden"] as? Bool == true, locked: el["locked"] as? Bool == true, symbol: el["symbol"] as? String,
                       variant: (el["variant"] as? String).flatMap { variants.contains($0) && $0 != "default" ? $0 : nil },
                       note: (el["note"] as? String).map(cleanNote).flatMap { $0.isEmpty ? nil : $0 },
                       take: (el["take"] as? String).flatMap { $0.count <= 64 ? $0 : nil },
                       ink: colorIndex(el["ink"]), paper: colorIndex(el["paper"]),
                       adjust: (el["adjust"] as? String).flatMap { el["presetId"] as? String == "adjust" && adjustments.contains($0) ? $0 : nil })
    }
    for (i, el) in valid.enumerated() { // masks keep pointing at the clip part's new id
        state.elements[i].mask = cleanMask(el["mask"])
        state.elements[i].blend = cleanBlend(el["blend"])
        if let old = el["clip"] as? String, let id = ids[old], id != fresh[i] { state.elements[i].clip = id }
    }
    state.snapshots = parseSnapshots(project["snapshots"])
    return state
}
