func runLayoutChecks() {
    func screen(_ w: Int, _ h: Int) -> Element {
        Element(id: "s", presetId: "screen", label: "Screen", template: screenFrame("Screen", width: w, height: h), width: w, height: h, col: 0, row: 0, text: "Screen")
    }
    let s = screen(40, 30)
    let a = createElement(presets.first { $0.id == "list" }!, col: 1, row: 1)
    let b = createElement(presets.first { $0.id == "button" }!, col: 1, row: 5), c = createElement(presets.first { $0.id == "button" }!, col: 1, row: 9)
    let plain = [s, a, b, c]
    let laid = autoLayout(plain, updateElement(plain, id: "s", auto: AutoLayout(gap: 1, pad: 1)))
    func at(_ els: [Element], _ id: String) -> Element { els.first { $0.id == id }! }
    check(at(laid, a.id).col == 2 && at(laid, a.id).row == 2 && at(laid, b.id).row == 2 + a.height + 1, "layout: parts stack with gap and padding")
    check(at(laid, "s").height == at(laid, c.id).row + c.height + 2, "layout: the frame hugs the stack")
    check(autoLayout(laid, laid) == laid && autoLayout(plain, plain) == plain, "layout: nothing to move, nothing moves")
    let grown = updateElement(laid, id: a.id, text: "• one\n• two\n• three\n• four\n• five\n• six")
    check(at(autoLayout(laid, grown), b.id).row == at(laid, b.id).row + 3, "layout: a part that grows pushes the rest down")
    check(at(autoLayout(laid, deleteElement(laid, id: b.id)), c.id).row == at(laid, b.id).row, "layout: a part that goes pulls the rest up")
    let reordered = autoLayout(laid, moveElement(laid, id: c.id, col: 2, row: 1))
    check(at(reordered, c.id).row == 2 && at(reordered, a.id).row > 2, "layout: dragging a part reorders the stack")
    check(at(autoLayout(laid, moveElement(laid, id: c.id, col: 60, row: 2)), c.id).col == 60, "layout: a part dragged out leaves the stack")
    var state = EditorState(cols: 80, rows: 40)
    state.elements = plain
    state.elements = updateElement(state.elements, id: "s", auto: AutoLayout(gap: 2, pad: 1))
    check(at(state.elements, b.id).row == 2 + a.height + 2, "layout: the editor restacks on every change")
    let open = parseProject(serializeProject(state))
    check(open?.elements.first?.auto == AutoLayout(gap: 2, pad: 1), "layout: auto survives a save")
    check(cleanAuto(["gap": 99, "pad": 2]) == AutoLayout(gap: 1, pad: 2) && cleanAuto("x") == nil, "layout: bad knobs are cleaned")
}
