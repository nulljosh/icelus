func runHotspotChecks() {
    func screen(_ col: Int, _ name: String) -> Element {
        Element(id: "s\(col)", presetId: "screen", label: "Screen", template: screenFrame(name, width: 30, height: 12), width: 30, height: 12, col: col, row: 0, text: name)
    }
    let login = screen(0, "Login"), home = screen(40, "Home")
    var btn = createElement(presets.first { $0.id == "button" }!, col: 2, row: 4)
    btn.text = "Sign in"
    let els = [login, home, btn]
    let linked = updateElement(els, id: btn.id, opens: home.id)
    check(linked[2].opens == home.id && opensScreen(linked, linked[2])?.id == home.id, "hotspots: a part opens a screen")
    check(updateElement(linked, id: btn.id, opens: nil)[2].opens == nil, "hotspots: the link comes off")
    check(updateElement(els, id: btn.id, opens: btn.id)[2].opens == nil && updateElement(els, id: btn.id, opens: "nope")[2].opens == nil, "hotspots: only a screen can be opened")
    check(updateElement(els, id: login.id, opens: home.id)[0].opens == nil && !canOpen(nil), "hotspots: screens open nothing")
    check(gridToText(renderElements(linked, cols: 80, rows: 14)) == gridToText(renderElements(els, cols: 80, rows: 14)), "hotspots: never in the text")
    let gone = deleteElement(linked, id: home.id)
    check(opensScreen(gone, gone[1]) == nil, "hotspots: a deleted screen opens nothing")
    var state = EditorState(cols: 80, rows: 14)
    state.elements = linked
    let back = parseProject(serializeProject(state))!.elements
    check(back[2].opens == back[1].id, "hotspots: saved, re-pointed at the fresh ids")
    state.elements = gone
    check(parseProject(serializeProject(state))!.elements[1].opens == nil, "hotspots: a link to a deleted screen is dropped on open")
    var forged = linked
    forged[0].opens = home.id; forged[2].opens = btn.id
    state.elements = forged
    let f = parseProject(serializeProject(state))!.elements
    check(f[0].opens == nil && f[2].opens == nil, "hotspots: forged links refused")
    check(flowLines(linked) == ["- Login → Home (Sign in)"] && flowLines(els).isEmpty, "hotspots: in the flow, named by the part")
    check(screensDocument(linked, cols: 80, rows: 14)?.contains("## Flow\n\n- Login → Home (Sign in)\n") == true, "hotspots: in Copy all screens")
    check(handoff(linked, cols: 80, rows: 14).contains("- Login → Home (Sign in)"), "hotspots: in the build brief")
}
