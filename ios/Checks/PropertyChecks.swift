func runPropertyChecks() {
    func copy(_ col: Int, _ symbol: String) -> Element { var e = createElement(presets.first { $0.id == "button" }!, col: col, row: 0); e.symbol = symbol; return e }
    let a = copy(0, "s1"), b = copy(10, "s1"), c = copy(20, "s1")
    var card = createElement(presets.first { $0.id == "card" }!, col: 0, row: 5); card.symbol = "s2"
    let els = [a, b, c, card]
    func get(_ list: [Element], _ id: String) -> Element { list.first { $0.id == id }! }
    var out = updateElement(els, id: b.id, own: ["text"])
    out = updateElement(out, id: b.id, text: "Mine")
    check(get(out, b.id).template.joined().contains("Mine") && !get(out, a.id).template.joined().contains("Mine"), "properties: owned words stay on the copy")
    out = updateElement(out, id: a.id, text: "Shared")
    check(get(out, c.id).template.joined().contains("Shared") && get(out, b.id).template.joined().contains("Mine"), "properties: shared words skip the owner")
    out = updateElement(out, id: a.id, style: "double")
    check(get(out, b.id).style == "double", "properties: style still follows")
    out = updateElement(out, id: b.id, own: [])
    check(get(out, b.id).own.isEmpty && get(out, b.id).template == get(out, a.id).template, "properties: letting go pulls the shared words back")
    var st = updateElement(els, id: c.id, own: ["style", "junk"])
    check(get(st, c.id).own == ["style"], "properties: own keys are cleaned")
    st = updateElement(st, id: a.id, style: "heavy")
    check(get(st, c.id).style == nil && get(st, b.id).style == "heavy", "properties: owned style stays")
    let swapped = swapSymbol(els, id: b.id, symbol: "s2")
    check(get(swapped, b.id).symbol == "s2" && get(swapped, b.id).template == card.template && get(swapped, b.id).col == 10, "properties: swap takes the other symbol in place")
    let ownedSwap = get(swapSymbol(updateElement(els, id: b.id, own: ["text"]), id: b.id, symbol: "s2"), b.id)
    check(ownedSwap.template == card.template && ownedSwap.own.isEmpty && ownedSwap.presetId == "card", "properties: a swap is a full replace")
    check(swapSymbol(els, id: b.id, symbol: "nope") == els && swapSymbol(els, id: b.id, symbol: "s1") == els, "properties: bad swaps change nothing")
    var state = EditorState(cols: 60, rows: 20)
    state.elements = updateElement(els, id: b.id, own: ["text"])
    check(parseProject(serializeProject(state))?.elements[1].own == ["text"], "properties: own survives a save")
}
