func runHealChecks() {
    func box(_ id: String, _ col: Int, _ row: Int) -> Element {
        Element(id: id, presetId: "custom", label: id, template: ["[ \(id) ]"], width: 5, height: 1, col: col, row: row)
    }
    let a = box("a", 0, 0), x = box("x", 20, 0), b = box("b", 40, 0)
    var els = [a, x, b]
    els.append(createLine(els, start: (a.col + a.width - 1, 0), end: (x.col, 0)))
    els.append(createLine(els, start: (x.col + x.width - 1, 0), end: (b.col, 0)))
    let out = deleteElement(els, id: "x")
    let lines = out.filter { $0.presetId == "line" }
    check(!out.contains { $0.id == "x" } && lines.count == 1 && lines[0].from?.id == "a" && lines[0].to?.id == "b", "heal: arrows join across a deleted part")
    check(moveElement(out, id: "b", col: 50, row: 0).first { $0.presetId == "line" }?.to?.col == 50, "heal: the joined line stays pinned")

    let c = box("c", 0, 6), d = box("d", 40, 6)
    var fan = [a, c, x, b, d]
    for (f, t) in [(a, x), (c, x), (x, b), (x, d)] { fan.append(createLine(fan, start: (f.col + f.width - 1, f.row), end: (t.col, t.row))) }
    check(closeLines(fan, "x") == fan && closeLines([a, b], "nothing") == [a, b], "heal: many in and many out are left alone")

    check(nextValue(["Item 1", "Item 2"]) == "Item 3" && nextValue(["10", "20"]) == "30" && nextValue(["$40"]) == "$41", "expand: numbers keep their step")
    check(nextValue(["Item one", "Item two"]) == "Item three" && nextValue(["Sun"]) == "Mon" && nextValue(["december"]) == "january", "expand: words, days and months")
    check(nextValue(["Item twelve"]) == "Item 13" && nextValue(["Cell", "Cell"]) == "Cell" && nextValue(["Apples", "Pears"]) == "" && nextValue([]) == "", "expand: no pattern, nothing")
    check(nextLine(["• Item one", "• Item two", "• Item three"]) == "• Item four", "expand: a bullet list carries on")
    check(nextLine(["1. Wash", "2. Dry"]) == "3. " && nextLine(["  - a", "  - b"]) == "  - ", "expand: numbers and indents carry on")

    let list = createElement(presets.first { $0.id == "list" }!, col: 0, row: 0)
    let grown = expandElement([list], id: list.id, by: 2)?[0]
    check(grown?.template.suffix(2) == ["• Item four", "• Item five"], "expand: a list grows by items")
    let table = createElement(presets.first { $0.id == "table" }!, col: 0, row: 0)
    let bigger = expandElement([table], id: table.id)?[0]
    check(bigger.map { tableCells($0.template).last } == ["Cell", "Cell", "Cell"] && bigger?.height == table.height + 1, "expand: a table grows by a row")
    check(expandElement([a], id: "a") == nil && expandElement([], id: "none") == nil, "expand: other parts do not expand")
    check(expandElement([table], id: table.id, by: 999).map { tableCells($0[0].template).count } == 53, "expand: at most 50 at once")
}
