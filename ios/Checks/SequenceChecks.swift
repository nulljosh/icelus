func runSequenceChecks() {
    let src = "User -> App: Sign in\nApp -> API: Check\nAPI --> App: OK\nApp -> App: Save"
    let els = parseSketch(src, startRow: 0, startCol: 0)
    check(els.count == 1 && els[0].presetId == "sequence", "sequences: message lines make one diagram")
    check(els[0].template.map { $0.replacingOccurrences(of: #"\s+$"#, with: "", options: .regularExpression) } == [
        "┌──────┐    ┌─────┐   ┌─────┐",
        "│ User │    │ App │   │ API │",
        "└───┬──┘    └──┬──┘   └──┬──┘",
        "    │ Sign in  │         │",
        "    ├──────────▶         │",
        "    │          │ Check   │",
        "    │          ├─────────▶",
        "    │          │ OK      │",
        "    │          ◀╌╌╌╌╌╌╌╌╌┤",
        "    │          │ Save    │",
        "    │          ├──┐      │",
        "    │          ◀──┘      │",
        "    │          │         │",
    ], "sequences: boxes, lifelines, labelled arrows, dashed replies, a self message")
    check(toSketch(els).source == src, "sequences: written back as typed lines")
    let edited = updateElement(els, id: els[0].id, text: "A -> B: hi")[0]
    check(edited.template.map { $0.replacingOccurrences(of: #"\s+$"#, with: "", options: .regularExpression) }
          == ["┌───┐   ┌───┐", "│ A │   │ B │", "└─┬─┘   └─┬─┘", "  │ hi    │", "  ├───────▶", "  │       │"],
          "sequences: an edit redraws it")
    check(parseSketch("a -> b\nA -> B: hi").map(\.presetId) == ["node", "node", "line", "sequence"],
          "sequences: a flow line and a message line stay apart")
}
