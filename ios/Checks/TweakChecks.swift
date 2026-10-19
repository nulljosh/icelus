func runTweakChecks() {
    func el(_ id: String, _ preset: String, _ col: Int, _ row: Int, _ template: [String], text: String? = nil) -> Element {
        Element(id: id, presetId: preset, label: preset, template: template, width: template.map(\.count).max() ?? 0,
                height: template.count, col: col, row: row, text: text)
    }
    let screen = el("s", "screen", 0, 0, screenFrame("Home", width: 20, height: 12), text: "Home")
    let card = el("c", "card", 2, 6, ["┌──┐", "└──┘"])
    let els = [screen, el("a", "button", 3, 2, ["[ OK ]"]), el("b", "button", 11, 2, ["[ OK ]"]), card, el("o", "card", 30, 0, ["┌──┐", "└──┘"])]
    let now = screenTweaks(els, screen)
    check(now.spacing == 3 && now.padding == 1, "tweaks: read spacing between bands and padding inside the frame")
    let tight = tweakScreen(els, id: "s", spacing: 0)
    check(tight.first { $0.id == "c" }?.row == 3 && tight.first { $0.id == "b" }.map { ($0.col, $0.row) == (11, 2) } == true,
          "tweaks: spacing restacks bands and keeps columns")
    let padded = tweakScreen(els, id: "s", padding: 3)
    check(padded.first { $0.id == "a" }.map { ($0.col, $0.row) == (5, 4) } == true && padded.first { $0.id == "c" }.map { ($0.col, $0.row) == (4, 8) } == true,
          "tweaks: padding moves everything in")
    let grown = tweakScreen(els, id: "s", spacing: 8).first { $0.id == "s" }!
    check(grown.height == 15 && grown.template.count == 15, "tweaks: the frame grows when the parts need room")
    let styled = tweakScreen(els, id: "s", style: "double")
    check(styled.first { $0.id == "c" }?.style == "double" && styled.first { $0.id == "s" }?.style == "double"
          && styled.first { $0.id == "o" }?.style == nil && styled.first { $0.id == "a" }?.style == nil,
          "tweaks: one style for every box in the screen, nothing outside")
    check(tweakScreen(styled, id: "s", style: "single").first { $0.id == "c" }?.style == nil, "tweaks: single clears the style")
    var locked = els; locked[3].locked = true
    check(tweakScreen(locked, id: "s", spacing: 0).first { $0.id == "c" }?.row == 6 && tweakScreen(els, id: "a", spacing: 0) == els,
          "tweaks: locked parts and non-screens stay put")
    let stacked = relayout(els, id: "s", mode: "stacked")
    check(["a", "b", "c"].compactMap { id in stacked.first { $0.id == id } }.map { [$0.col, $0.row] } == [[2, 2], [2, 4], [2, 6]], "variations: stacked is one part a row")
    let split = relayout(els, id: "s", mode: "split")
    let sa = split.first { $0.id == "a" }!, sb = split.first { $0.id == "b" }!
    check(sa.col == 2 && sb.col > sa.col + sa.width, "variations: split makes two columns")
    let made = variations(els, id: "s")
    let screens = made.ids.compactMap { id in made.elements.first { $0.id == id } }
    check(screens.map { $0.text ?? "" } == ["Home stacked", "Home split", "Home dense"] && screens[0].col > 34, "variations: three named takes past the rightmost part")
    check(screens.allSatisfy { s in partsInside(made.elements, s).count == 3 }, "variations: each take holds every part")
    let kept = keepVariation(made.elements, id: made.ids[1])
    check(kept.filter { $0.presetId == "screen" }.map(\.id) == [made.ids[1]] && kept.contains { $0.id == "o" } && kept.count == 5
          && kept.first { $0.id == made.ids[1] }?.take == nil, "variations: keep one clears the rest, parts and all")
    var state = EditorState(); state.elements = made.elements
    check(parseProject(serializeProject(state))?.elements.filter { $0.take != nil }.count == 4, "variations: the tag rides in the project file")
}
