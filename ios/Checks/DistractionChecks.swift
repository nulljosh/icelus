func runDistractionChecks() {
    let screen = Element(id: "s", presetId: "screen", label: "Screen", template: screenFrame("Screen", width: 40, height: 22), width: 40, height: 22, col: 0, row: 0, text: "Screen")
    let button = createElement(presets.first { $0.id == "button" }!, col: 2, row: 2)
    var empty = createElement(presets.first { $0.id == "card" }!, col: 4, row: 6)
    empty.template = ["   "]; empty.width = 3; empty.height = 1
    let stray = paint([], cells: [(30, 2), (31, 2)], char: "█")[0]
    let inside = paint([], cells: [(2, 4), (3, 4), (4, 4), (5, 4)], char: "█")[0]
    let found = critique([screen, button, empty, stray, inside], cols: 80, rows: 30).filter { $0.rule == "distraction" }
    check(found.map { $0.id } == [empty.id, stray.id] && found.map { $0.kind } == ["empty", "stray"], "distractions: stray marks and empty parts are found")
    check(critiqueMessage(found[1]).contains("a few stray marks"), "distractions: said in English")
    var locked = stray; locked.locked = true
    check(!critique([locked], cols: 80, rows: 30).contains { $0.rule == "distraction" }, "distractions: a locked part is kept")

    let a = createElement(presets.first { $0.id == "button" }!, col: 0, row: 10), b = createElement(presets.first { $0.id == "button" }!, col: 40, row: 10)
    var hole = createElement(presets.first { $0.id == "card" }!, col: 20, row: 10)
    hole.template = ["   ", "   "]; hole.width = 3; hole.height = 2
    var els = [a, hole, b]
    els.append(createLine(els, start: (a.width - 1, 10), end: (20, 10)))
    els.append(createLine(els, start: (22, 10), end: (40, 10)))
    let out = removeDistractions(els, cols: 80, rows: 30)
    check(!out.contains { $0.id == hole.id } && out.filter { $0.presetId == "line" }.map { [$0.from?.id, $0.to?.id] } == [[a.id, b.id]], "distractions: removed in one go, arrows heal")
    check(removeDistractions([screen, button], cols: 80, rows: 30) == [screen, button], "distractions: a clean canvas is left alone")
}
