func runHistoryChecks() {
    func part(_ id: String, col: Int = 0) -> Element {
        Element(id: id, presetId: "custom", label: id, template: ["[\(id)]"], width: id.count + 2, height: 1, col: col, row: 0)
    }
    let a = part("a"), b = part("b", col: 5)
    check(stepName([], [a]) == Step(kind: "add", element: a, count: 1), "history: an added part names the step")
    check(stepName([a, b], [a]).kind == "delete", "history: delete")
    check(stepName([a], moveElement([a], id: "a", col: 3, row: 2)).kind == "move", "history: move")
    var styled = a; styled.style = "double"
    check(stepName([a], [styled]).kind == "edit", "history: edit")
    check(stepName([a, b], [b, a]).kind == "reorder", "history: reorder")
    check(stepName([a, b], []).kind == "clear", "history: clear")
    check(stepName([a], [b]).kind == "replace", "history: replace")

    var state = EditorState()
    state.pushHistory(); state.elements = [a]
    state.pushHistory(); state.elements = [a, b]
    state.pushHistory(); state.elements = [b]
    check(state.timeline.map(\.kind) == ["start", "add", "add", "delete"], "history: every kept step is listed")
    state.goToStep(1)
    check(state.elements == [a] && state.timeline.count == 4, "history: a jump back keeps later steps redoable")
    state.goToStep(99)
    check(state.elements == [b], "history: past the end stops at the newest step")
    state.goToStep(-5)
    check(state.elements.isEmpty, "history: before the start stops at the oldest step")

    var snaps = takeSnapshot([], [a], name: "  Before review ")
    check(snaps == [CanvasSnapshot(name: "Before review", elements: [a])], "history: snapshot names are trimmed")
    check(takeSnapshot(snaps, [], name: "")[1].name == "Snapshot 2", "history: a blank name is numbered")
    for i in 0..<(snapshotLimit + 3) { snaps = takeSnapshot(snaps, [], name: "s\(i)") }
    check(snaps.count == snapshotLimit && snaps[0].name == "s3", "history: snapshots stop at the limit")

    var saved = EditorState()
    saved.elements = [a]
    saved.snapshots = takeSnapshot([], [b], name: "First")
    let open = parseProject(serializeProject(saved))
    check(open?.snapshots.first?.name == "First" && open?.snapshots.first?.elements.first?.label == "b", "history: snapshots survive a save")
    check(!serializeProject(EditorState()).contains("snapshots"), "history: no snapshots, no key")
    let bad = parseProject(#"{"elements":[],"snapshots":[null,{"name":7,"elements":[{"template":"x"}]},"junk"]}"#)
    check(bad?.snapshots.map(\.name) == ["Snapshot 1"] && bad?.snapshots.first?.elements.isEmpty == true, "history: bad snapshots are cleaned")
}
