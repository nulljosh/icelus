func runCopyChecks() {
    func part(_ id: String, _ col: Int, _ row: Int) -> Element { createElement(presets.first { $0.id == id }!, col: col, row: row) }
    var btn = part("button", 2, 2); btn.template = ["[ Sign in ]"]; btn.width = 11
    let screen = Element(id: "s", presetId: "screen", label: "Screen", template: screenFrame("Screen", width: 30, height: 10), width: 30, height: 10, col: 0, row: 0, text: "Screen")
    let tick = part("checkbox", 2, 4), table = part("table", 2, 6)
    check(copyEntries([screen, btn, tick, part("input", 2, 8)]).map(\.text) == ["Screen", "Sign in", "Label"], "copy: one entry per run of words")
    check(copyEntries([table]).count > 2, "copy: each table cell")
    let e = copyEntries([screen, btn])
    check(e.map(\.key) == ["0:0:0", "1:0:2"], "copy: keys match the web")
    let out = applyCopy([screen, btn], [e[0].key: "Log in", e[1].key: "Continue"])
    check(out[0].text == "Log in" && out[0].template[0].contains("Log in") && out[1].template == ["[ Continue ]"] && out[1].width == 12, "copy: edits swap just the words")
    let cell = copyEntries([table])[0]
    let t2 = applyCopy([table], [cell.key: "Who"])[0]
    check(t2.template.joined(separator: "\n").contains("Who") && t2.template[0].hasPrefix("┌"), "copy: a table stays a table")
    var row = btn; row.template = ["Name  Email"]; row.width = 11
    let r = copyEntries([row])
    check(applyCopy([row], [r[0].key: "Nom", r[1].key: "Courriel"])[0].template == ["Nom  Courriel"], "copy: two edits on one line")
    check(applyCopy([btn], [:]) == [btn] && applyCopy([btn], [copyEntries([btn])[0].key: "Two\nlines"])[0].template == ["[ Two lines ]"], "copy: no edits, no new lines")
    check(copyEntries((0..<300).map { i -> Element in var b = btn; b.id = "b\(i)"; return b }).count == copyMax, "copy: capped")
}
