func runGroupChecks() {
    func box(_ col: Int) -> Element { createElement(Preset(id: "card", label: "Card", category: "Layout", template: ["┌┐", "└┘"]), col: col, row: 0) }
    let a = box(0), b = box(5), c = box(10)
    let els = groupElements([a, b, c], ids: [a.id, b.id])
    check(els.map { $0.group != nil } == [true, true, false] && groupElements(els, ids: [c.id]) == els,
          "groups: two parts or more share a group")
    check(moveElement(els, id: a.id, col: 3, row: 2).map { [$0.col, $0.row] } == [[3, 2], [8, 2], [10, 0]],
          "groups: moving one moves them all")
    check(!ungroupElements(els, id: b.id).contains { $0.group != nil }, "groups: ungroup clears the group")
    let copy = duplicateElement(els, id: a.id)
    check(copy.elements.first { $0.id == copy.id }?.group == nil, "groups: a copy stands alone")
    var state = EditorState(); state.elements = els
    let reopened = parseProject(serializeProject(state))?.elements ?? []
    check(reopened.count == 3 && reopened[0].group != nil && reopened[0].group == reopened[1].group, "groups: the group survives the project file")
}
