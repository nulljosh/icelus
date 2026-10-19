func runCritiqueChecks() {
    func place(_ id: String, _ col: Int, _ row: Int) -> Element { createElement(presets.first { $0.id == id }!, col: col, row: row) }
    func rules(_ els: [Element]) -> [String] { critique(els, cols: 60, rows: 30).map(\.rule) }
    let card = place("card", 0, 0)
    check(rules([card, place("button", card.width - 2, 1)]).contains("overlap"), "critique: parts that partly cover each other")
    check(rules([place("button", 58, 0)]).contains("off_grid"), "critique: a part off the grid")
    var save = place("button", 1, 1); save.template = ["[ Save ]"]; save.width = 8
    check(!rules([card, save]).contains("overlap"), "critique: a part wholly inside a card is fine")
    let cover = Element(id: "x", presetId: "image", label: "Image", template: ["XX"], width: 2, height: 1, col: card.width - 1, row: 0)
    check(rules([card, cover]).contains("broken_box"), "critique: a box cut open by a part on top")
    check(critique([place("checkbox", 0, 0)], cols: 60, rows: 30).first { $0.rule == "vague_label" }?.word == "Label", "critique: placeholder labels")
    check(!rules([card, save]).contains("vague_label"), "critique: real labels pass")
    let list = place("list", 0, 0), input = place("input", 0, 10)
    check(rules([list, input]).contains("no_empty_state") && rules([list, input]).contains("no_error_state"), "critique: asks for empty and error states")
    let nothing = Element(id: "t", presetId: "text", label: "Text", template: ["Nothing here yet"], width: 16, height: 1, col: 0, row: 20, text: "Nothing here yet")
    let fixed = rules([list, input, nothing, place("alert", 20, 20)])
    check(!fixed.contains("no_empty_state") && !fixed.contains("no_error_state"), "critique: states found")
    var hidden = place("checkbox", 0, 0); hidden.hidden = true
    check(rules([hidden]).isEmpty, "critique: hidden parts are skipped")
    check(brokenBoxes("┌──┐\n│  │\n└──┘").isEmpty && brokenBoxes("┌──┐\n│  \n└──┘").count == 1, "critique: brokenBoxes finds an open box")
}
