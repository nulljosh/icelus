func runModeChecks() {
    func part(_ id: String, _ col: Int, _ row: Int) -> Element { createElement(presets.first { $0.id == id }!, col: col, row: row) }
    var box = part("card", 2, 2); box.style = "double"
    func text(_ els: [Element]) -> String { gridToText(renderElements(els, cols: 30, rows: 10)) }
    let before = text([box])
    let ascii = setMode([box], "ascii")
    check(canvasMode(ascii) == "ascii" && text(ascii).contains("+") && !text(ascii).contains("╔"), "modes: ascii draws the whole canvas in ascii")
    check(!text(ascii + [part("card", 15, 2)]).contains("┌"), "modes: the mode wins over a part added after it")
    check(text(setMode(ascii, "heavy")).contains("┏"), "modes: heavy")
    check(text(setMode(ascii, nil)) == before && setMode(ascii, nil).count == 1, "modes: clearing goes back")
    check(setMode([box], "invert") == [box], "modes: only line sets are modes")
    let screen = Element(id: "s", presetId: "screen", label: "Screen", template: screenFrame("Screen", width: 40, height: 30), width: 40, height: 30, col: 0, row: 0, text: "Screen")
    let withScreen = setMode([screen, box], "heavy")
    check(!partsInside(withScreen, screen).contains { $0.canvas }, "modes: the canvas part is never inside a screen")
    check(!critique(withScreen, cols: 60, rows: 30).contains { $0.id == withScreen.last!.id }, "modes: review skips the canvas part")
    let a = part("button", 1, 1), b = part("button", 1, 5)
    var els = setVar([screen, a, b], "space", 3)
    els = autoLayout(els, updateElement(els, id: "s", auto: AutoLayout(gap: 1, pad: 1, gapVar: "space")))
    func gapOf(_ list: [Element]) -> Int { list.first { $0.id == b.id }!.row - (list.first { $0.id == a.id }!.row + a.height) }
    check(gapOf(els) == 3, "modes: a screen bound to a variable uses its value")
    els = autoLayout(els, setVar(els, "space", 0))
    check(gapOf(els) == 0, "modes: changing the variable restacks the screen")
    els = setVar(els, "space", nil)
    check(els.first { $0.id == "s" }!.auto == AutoLayout(gap: 0, pad: 1) && !els.contains { $0.canvas }, "modes: removing a variable leaves its last value")
    check(cleanVars(["ok": 2, "Bad Name": 1, "big": 99, "neg": -1, "str": "2", "flag": true]) == ["ok": 2], "modes: vars are cleaned")
    let many = Dictionary(uniqueKeysWithValues: (0..<40).map { ("v\($0)", 1 as Any) })
    check(cleanVars(many).count == varMax && setVar([box], "Not OK", 1) == [box], "modes: vars are capped and names checked")
    var state = EditorState(cols: 30, rows: 10)
    state.elements = setVar(setMode([box], "rounded"), "gutter", 2)
    let back = parseProject(serializeProject(state))?.elements ?? []
    check(canvasMode(back) == "rounded" && canvasVars(back) == ["gutter": 2], "modes: mode and vars survive a save")
    state.elements = updateElement([screen], id: "s", auto: AutoLayout(gap: 1, pad: 2, gapVar: "gutter"))
    check(parseProject(serializeProject(state))?.elements[0].auto == AutoLayout(gap: 1, pad: 2, gapVar: "gutter"), "modes: a bound gap survives a save")
}
