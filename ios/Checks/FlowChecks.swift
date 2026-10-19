func runFlowChecks() {
    func draw(_ els: [Element]) -> String { trimText(gridToText(renderElements(els, cols: 80, rows: 30))) }
    check(draw(parseSketch("Idea -> Sketch -> Ship\nIdea -> Talk -> Ship", startRow: 0, startCol: 0)) == [
        "┌──────┐      ┌────────┐      ┌──────┐",
        "│ Idea ├───┬──▶ Sketch ├───┬──▶ Ship │",
        "└──────┘   │  └────────┘   │  └──────┘",
        "           │               │",
        "           │               │",
        "           │  ┌──────┐     │",
        "           └──▶ Talk ├─────┘",
        "              └──────┘",
    ].joined(separator: "\n"), "flowcharts: left to right, branches stacked, arrows in the gaps")
    let skip = draw(parseSketch("a -> b -> c\na -> c", startRow: 0, startCol: 0)).components(separatedBy: "\n")
    check(skip[1] == "│ a ├───┬──────────┬──▶ c │" && skip[6] == "        └──▶ b ├───┘",
          "flowcharts: an arrow that skips a column keeps its row free")
    let loop = draw(parseSketch("Start -> Check -> Start", startRow: 0, startCol: 0)).components(separatedBy: "\n")
    check(loop[2] == "└───▲───┘      └───┬───┘" && loop.last == "    └──────────────┘", "flowcharts: a loop goes under the boxes")
    let els = parseSketch("Cart -> Pay", startRow: 0, startCol: 0)
    check(els[2].from?.id == els[0].id && els[2].to?.id == els[1].id && els[2].from?.edge == true && els[2].to?.side == "left",
          "flowcharts: arrows are pinned to their boxes")
    check(toSketch(els).source == "Cart -> Pay", "flowcharts: the flow comes back as typed lines")
    check(updateElement([els[0]], id: els[0].id, text: "Basket")[0].template == ["┌────────┐", "│ Basket │", "└────────┘"],
          "flowcharts: editing a node redraws its box")
    var state = EditorState(); state.elements = els
    let reopened = parseProject(serializeProject(state))?.elements ?? []
    check(reopened.count == 3 && reopened[2].from?.edge == true && reopened[2].to?.side == "left", "flowcharts: arrow kinds survive the project file")
}
