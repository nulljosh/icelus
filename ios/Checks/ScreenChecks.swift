func runScreenChecks() {
    func screen(_ col: Int, _ row: Int, _ w: Int = 20, _ h: Int = 8) -> Element {
        var el = createElement(Preset(id: "screen", label: "Screen", category: "Draw", template: screenFrame("Home", width: w, height: h)), col: col, row: row)
        el.text = "Home"
        return el
    }
    func button(_ col: Int, _ row: Int) -> Element {
        createElement(Preset(id: "button", label: "Button", category: "Input", template: ["[ OK ]"]), col: col, row: row)
    }
    check(screenFrame("Home", width: 12, height: 3) == ["┌─ Home ───┐", "│          │", "└──────────┘"], "screens: the name sits in the top border")

    let s = screen(0, 0), inside = button(2, 2), across = button(17, 3), outside = button(30, 2)
    let moved = moveElement([s, inside, across, outside], id: s.id, col: 40, row: 5)
    let at = { (id: String) in moved.first { $0.id == id }! }
    check((at(inside.id).col, at(inside.id).row) == (42, 7), "screens: a part inside travels with its screen")
    check(at(across.id).col == 17 && at(outside.id).col == 30, "screens: a part across the edge stays put")

    let big = screen(0, 0, 30, 10), a = button(2, 2), b = button(20, 6)
    let line = createLine([big, a, b], start: (3, 2), end: (21, 6))
    check(moveElement([big, a, b, line], id: big.id, col: 1, row: 1).first { $0.id == line.id }?.to?.id == b.id,
          "screens: a carried arrow keeps its pins")
    check(trimText(gridToText(renderElements([big, a], cols: 30, rows: 10))).contains("│ [ OK ]"), "screens: parts show through")

    let dup = duplicateElement([big, a, b, line], id: big.id, cols: 100, rows: 50)
    let copies = Array(dup.elements.suffix(3))
    let lineCopy = copies.first { $0.presetId == "line" }
    check(dup.elements.count == 8 && dup.elements[0].id == dup.id, "screens: a copy goes to the back with its parts")
    check(copies.first { $0.id == lineCopy?.to?.id }?.col == 54, "screens: the copied arrow pins to the copied part")

    var renamed = screen(0, 0, 12, 3); renamed = updateElement([renamed], id: renamed.id, text: "Cart")[0]
    check(renamed.template[0] == "┌─ Cart ───┐", "screens: renaming redraws the frame")

    var home = screen(0, 0, 12, 4); home.text = "Home"; home.template = screenFrame("Home", width: 12, height: 4)
    var cart = screen(20, 0, 12, 4); cart.text = "Cart"; cart.template = screenFrame("Cart", width: 12, height: 4)
    let go = button(2, 1)
    let arrow = createLine([home, cart, go], start: (7, 1), end: (21, 2))
    let doc = screensDocument([home, cart, go, arrow], cols: 40, rows: 6) ?? ""
    check(doc.hasPrefix("## Flow\n\n- Home → Cart\n\n## Home\n\n```\n┌─ Home ───┐\n│ [ OK"), "screens: one document with the flow, then each screen")
    check(doc.contains("## Cart\n\n```\n┌─ Cart ───┐"), "screens: each screen is cropped to its frame")
    check(screensDocument([go], cols: 10, rows: 2) == nil, "screens: no document without screens")

    var lit = button(0, 0); lit.accent = true
    let over = button(3, 0)
    check(Array(accentMask([lit, over], cols: 10, rows: 1)[0].prefix(4)) == [true, true, true, false], "accent: marks its cells, cleared by a part on top")
    check(trimText(gridToText(renderElements([lit], cols: 10, rows: 1))) == "[ OK ]", "accent: copied text stays plain")
    check(updateElement([lit], id: lit.id, accent: false)[0].accent == false, "accent: turns off")
    var saved = EditorState(); saved.elements = [lit]
    check(parseProject(serializeProject(saved))?.elements.first?.accent == true, "accent: survives a save")
}
