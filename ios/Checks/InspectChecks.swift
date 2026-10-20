func runInspectChecks() {
    let screen = Element(id: "s", presetId: "screen", label: "Screen", template: screenFrame("Screen", width: 40, height: 20), width: 40, height: 20, col: 0, row: 0, text: "Screen")
    let btn = createElement(presets.first { $0.id == "button" }!, col: 5, row: 4)
    let input = createElement(presets.first { $0.id == "input" }!, col: 20, row: 4)
    let below = createElement(presets.first { $0.id == "button" }!, col: 5, row: 10)
    let els = [screen, btn, input, below]
    check(partSpacing(els, id: btn.id) == Spacing(left: 4, right: 9, top: 3, bottom: 5), "inspect: gaps to the nearest part or screen edge")
    check(partSpacing(els, id: input.id)?.left == 9 && partSpacing([btn], id: btn.id) == Spacing() && partSpacing(els, id: "nope") == nil, "inspect: nothing around, no part")
    check(partSnippet(btn) == "<button type=\"button\">{\"OK\"}</button>" && partSnippet(btn, format: "swiftui").contains("Button {} label: { Text(verbatim: \"OK\") }"), "inspect: one part's code")
    check(partSnippet(screen).contains("<section"), "inspect: a screen's code")
    let evil = updateElement([btn], id: btn.id, text: "\"}</button><script>")[0]
    check(partSnippet(evil).hasPrefix("<button type=\"button\">{\"\\\"}") && partSnippet(evil, format: "swiftui").contains("\\\""), "inspect: words stay escaped")
}
