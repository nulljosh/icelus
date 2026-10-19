func runColorChecks() {
    check(terminalColors.count == 16 && cleanColor(0) == 0 && cleanColor(15) == 15 && cleanColor(16) == nil && cleanColor(-1) == nil, "color: sixteen colors, indexes only")
    let b = parseSketch("[Go]", startRow: 0, startCol: 0)[0]
    var els = updateElement([b], id: b.id, ink: 1, paper: 4)
    check(els[0].ink == 1 && els[0].paper == 4, "color: sets ink and paper")
    els = updateElement(els, id: b.id, ink: nil, paper: -1)
    check(els[0].ink == 1 && els[0].paper == nil, "color: -1 clears, nil leaves alone")
    let back = parseProject(#"{"blockprint":1,"cols":10,"rows":2,"elements":[{"presetId":"button","label":"Button","template":["[ Go ]"],"col":0,"row":0,"ink":9,"paper":"red"},{"presetId":"button","label":"Button","template":["[ Go ]"],"col":0,"row":1,"ink":true,"paper":2.5}]}"#)
    check(back?.elements[0].ink == 9 && back?.elements[0].paper == nil && back?.elements[1].ink == nil && back?.elements[1].paper == nil, "color: a project keeps only real indexes")
    var red = b; red.ink = 1; red.paper = 7
    let dots = paint([red], cells: [(1, 0)], char: "•")
    let m = colorMask(dots, cols: 10, rows: 1)
    check(Array(m.ink[0][0..<6]) == [1, -1, 1, 1, 1, 1] && m.paper[0][0] == 7 && m.paper[0][6] == -1 && hasColor(dots), "color: a part on top clears the color under it")
    var bright = b; bright.ink = 9; bright.paper = 4
    check(toAnsi(renderElements([bright], cols: 10, rows: 3), colorMask([bright], cols: 10, rows: 3)) == "\u{1B}[91;44m[ Go ]\u{1B}[0m", "color: ANSI keeps the color")
    check(toAnsi(renderElements([b], cols: 10, rows: 1), colorMask([b], cols: 10, rows: 1)) == "[ Go ]" && !hasColor([b]), "color: no color, plain ANSI")
    var saved = EditorState(cols: 10, rows: 2); saved.elements = [bright]
    let evil = Element(id: "e", presetId: "text", label: "Text", template: ["a\u{1B}[2Jb"], width: 6, height: 1, col: 0, row: 0)
    check(!toAnsi(renderElements([evil], cols: 10, rows: 1), colorMask([evil], cols: 10, rows: 1)).contains("\u{1B}"), "color: a raw escape never reaches the terminal")
    let round = parseProject(serializeProject(saved))
    check(round?.elements[0].ink == 9 && round?.elements[0].paper == 4, "color: survives a save")
}
