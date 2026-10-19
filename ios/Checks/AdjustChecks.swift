func runAdjustChecks() {
    let text = { (els: [Element], cols: Int, rows: Int) in trimText(gridToText(renderElements(els, cols: cols, rows: rows))) }
    check(adjustments == ["invert", "dim", "ascii", "single", "double", "rounded", "heavy"], "adjust: one of each kind")
    let box = screenTemplate("Home", "[Go]", col: 0, row: 0)
    check(text(box + [adjustLayer(col: 0, row: 0, width: 40, height: 10, adjust: "double")], 40, 10).hasPrefix("╔═ Home ═")
          && box[0].template[0].hasPrefix("┌─ Home"), "adjust: changes what is under it and leaves the parts alone")
    check(text(box + [adjustLayer(col: 0, row: 0, width: 3, height: 1, adjust: "double")], 40, 10).hasPrefix("╔═ Home ─"), "adjust: only in its area")
    let b = parseSketch("[Go]", startRow: 0, startCol: 0)[0]
    check(text([adjustLayer(col: 0, row: 0, width: 10, height: 1, adjust: "ascii"), b], 10, 1) == "[ Go ]"
          && text(paint([], cells: [(7, 0)], char: "█") + [adjustLayer(col: 0, row: 0, width: 10, height: 1, adjust: "ascii")], 10, 1) == "       #", "adjust: a part above is left alone")
    check(String("█░▒ ▀a".map { adjustChar($0, "invert") }) == " ▓▒█▄a" && String("█▓▒░━║a".map { adjustChar($0, "dim") }) == "▓▒░ ─│a"
          && String("┌─…é".map { adjustChar($0, "ascii") }) == "+-.?" && adjustChar("╔", "heavy") == "┏" && adjustChar("x", "nope") == "x", "adjust: invert, dim, ascii, styles")
    var red = b; red.ink = 1
    let els = [red, adjustLayer(col: 0, row: 0, width: 10, height: 1, adjust: "invert")]
    check(elementAt(els, col: 2, row: 0)?.presetId == "button" && colorMask(els, cols: 10, rows: 1).ink[0][0] == 1, "adjust: never picked by a click, keeps colors")
    var saved = EditorState(cols: 10, rows: 1); saved.elements = els
    let back = parseProject(serializeProject(saved))?.elements[1]
    check(back?.presetId == "adjust" && back?.adjust == "invert" && back?.width == 10, "adjust: survives a save")
    let bad = parseProject(#"{"blockprint":1,"cols":10,"rows":1,"elements":[{"presetId":"adjust","label":"A","template":["   "],"col":0,"row":0,"adjust":"explode"}]}"#)?.elements[0]
    check(bad?.adjust == nil && updateElement(els, id: els[1].id, adjust: "dim")[1].adjust == "dim" && updateElement(els, id: els[1].id, adjust: "boom")[1].adjust == "invert", "adjust: only real kinds")
}
