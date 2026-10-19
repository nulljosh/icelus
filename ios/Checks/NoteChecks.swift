func runNoteChecks() {
    let btn = createElement(Preset(id: "button", label: "Button", category: "Input", template: ["[ OK ]"]), col: 2, row: 1)
    let noted = updateElement([btn], id: btn.id, note: "  make it bigger ")
    check(noted[0].note == "make it bigger", "notes: a note is pinned, trimmed")
    check(updateElement(noted, id: btn.id, note: " ")[0].note == nil, "notes: an empty note resolves it")
    check(updateElement([btn], id: btn.id, note: String(repeating: "x", count: 900))[0].note?.count == 500, "notes: capped at 500")
    var state = EditorState(); state.elements = noted
    check(parseProject(serializeProject(state))?.elements.first?.note == "make it bigger", "notes: a note rides in the project file")
    check(duplicateElement(noted, id: btn.id).elements[1].note == nil, "notes: a copy leaves the note behind")
    check(!gridToText(renderElements(noted, cols: 10, rows: 3)).contains("bigger"), "notes: never in the drawn text")
}
