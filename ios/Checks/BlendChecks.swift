func runBlendChecks() {
    func part(_ id: String, _ presetId: String, _ template: [String], col: Int = 0, row: Int = 0) -> Element {
        Element(id: id, presetId: presetId, label: id, template: template, width: template.map(\.count).max() ?? 0, height: template.count, col: col, row: row)
    }
    func line(_ g: Grid, _ r: Int) -> String { String(g[r]) }
    let across = part("h", "line", ["───"], row: 1), down = part("v", "line", ["│", "│", "│"], col: 1)
    let back = part("b", "custom", ["XYZ"])
    check(renderElements([across, down], cols: 3, rows: 3)[1][1] == "┼", "blend: light lines join by default")
    var over = down; over.blend = "over"
    check(renderElements([across, over], cols: 3, rows: 3)[1][1] == "│", "blend: over replaces without joining")
    var under = back; under.blend = "under"
    check(line(renderElements([part("a", "custom", ["AB"]), under], cols: 3, rows: 1), 0) == "ABZ", "blend: under fills only empty cells")
    let word = part("t", "text", ["A B"])
    var knock = word; knock.blend = "knockout"
    check(line(renderElements([back, word], cols: 3, rows: 1), 0) == "AYB", "blend: see-through text lets the gap show")
    check(line(renderElements([back, knock], cols: 3, rows: 1), 0) == "A B", "blend: knockout clears spaces too")
    var lit = part("u", "custom", ["QQQ"]); lit.blend = "under"; lit.accent = true; lit.ink = 1
    let els = [part("a", "custom", ["AB"]), lit]
    check(accentMask(els, cols: 3, rows: 1)[0] == [false, false, true], "blend: accent follows drawing")
    check(colorMask(els, cols: 3, rows: 1).ink[0] == [-1, -1, 1], "blend: color follows drawing")
    check(blends == ["join", "over", "under", "knockout"] && cleanBlend("nope") == nil && cleanBlend("join") == nil && cleanBlend(3) == nil, "blend: only real modes")
    let set = updateElement([back], id: "b", blend: "under")
    check(set[0].blend == "under" && updateElement(set, id: "b", blend: "join")[0].blend == nil, "blend: join clears the field")
    var saved = EditorState(cols: 3, rows: 1); saved.elements = [part("b", "custom", ["XYZ"])]
    saved.elements[0].blend = "knockout"
    check(parseProject(serializeProject(saved))?.elements[0].blend == "knockout", "blend: survives a save")
    let js = #"{"elements":[{"id":"a","template":["abc"],"blend":"under"},{"id":"z","template":["x"],"blend":{"evil":1}}]}"#
    let fromWeb = parseProject(js)
    check(fromWeb?.elements[0].blend == "under" && fromWeb?.elements[1].blend == nil, "blend: opens a web file, drops a bad mode")
}
