func runLayerChecks() {
    func box(_ col: Int) -> Element { createElement(Preset(id: "card", label: "Card", category: "Layout", template: ["██"]), col: col, row: 0) }
    var hidden = box(0); hidden.hidden = true
    check(trimText(gridToText(renderElements([hidden, box(3)], cols: 6, rows: 1))) == "   ██", "layers: a hidden layer is not drawn")
    let under = box(0)
    check(elementAt([under, hidden], col: 0, row: 0)?.id == under.id, "layers: clicks pass through a hidden layer")
    var locked = box(0); locked.locked = true
    check(elementAt([locked], col: 0, row: 0) == nil && moveElement([locked], id: locked.id, col: 5, row: 0)[0].col == 0,
          "layers: a locked layer cannot be picked or moved")
    check(updateElement([locked], id: locked.id, locked: false)[0].locked == false
          && updateElement([under], id: under.id, hidden: true)[0].hidden, "layers: flags toggle per part")
    let els = [box(0), box(1), box(2)]
    check(stepElement(els, id: els[0].id, up: true).map(\.id) == [els[1].id, els[0].id, els[2].id]
          && stepElement(els, id: els[2].id, up: true).map(\.id) == els.map(\.id), "layers: one step up the list, never past the top")
    var state = EditorState(); state.elements = [hidden, locked]
    let back = parseProject(serializeProject(state))?.elements ?? []
    check(back.count == 2 && back[0].hidden && back[1].locked, "layers: both flags survive the project file")
}
