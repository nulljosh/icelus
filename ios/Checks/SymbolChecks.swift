func runSymbolChecks() {
    let btn = createElement(Preset(id: "button", label: "Button", category: "Input", template: ["[ OK ]"]), col: 0, row: 0)
    let copied = duplicateElement(makeSymbol([btn], id: btn.id, symbol: "s1"), id: btn.id)
    let edited = updateElement(copied.elements, id: copied.id!, text: "[ Save ]")
    check(edited.map { $0.template[0] } == ["[ Save ]", "[ Save ]"] && edited.map(\.col) == [0, 2],
          "symbols: an edit to one copy edits them all, not their places")
    check(symbolUses(edited, edited[0]) == 2 && !updateElement(edited, id: btn.id, accent: true)[1].accent,
          "symbols: highlight stays each copy's own")
    check(updateElement(edited, id: btn.id, style: "double")[1].style == "double", "symbols: box style follows")
    let loose = detachSymbol(copied.elements, id: btn.id)
    check(updateElement(loose, id: btn.id, text: "x")[1].template == ["[ OK ]"], "symbols: a detached copy edits alone")
    var state = EditorState(); state.elements = copied.elements
    let back = parseProject(serializeProject(state))?.elements ?? []
    check(back.count == 2 && back[0].symbol != nil && back[0].symbol == back[1].symbol, "symbols: the link survives the project file")
}
