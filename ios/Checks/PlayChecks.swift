func runPlayChecks() {
    func screen(_ col: Int, _ row: Int, _ name: String) -> Element {
        Element(id: "s\(col)-\(row)", presetId: "screen", label: "Screen", template: screenFrame(name, width: 30, height: 12), width: 30, height: 12, col: col, row: row, text: name)
    }
    func button(_ col: Int, _ row: Int, _ opens: String?) -> Element {
        var b = createElement(presets.first { $0.id == "button" }!, col: col, row: row)
        b.opens = opens
        return b
    }
    let login = screen(40, 0, "Login"), home = screen(0, 20, "Home")
    var hidden = screen(80, 0, "Old"); hidden.hidden = true
    let go = button(42, 4, home.id), back = button(2, 24, login.id), plain = button(42, 8, nil)
    let els = [login, home, hidden, go, back, plain]
    check(playScreens(els).map(\.text) == ["Login", "Home"], "play: screens top first, hidden left out")
    check(startScreen(els)?.id == login.id && startScreen(els, selectedId: back.id)?.id == home.id && startScreen([go]) == nil, "play: starts on the picked part's screen")
    let v = playView(els, login.id)!
    check(v.cols == 30 && v.elements[0].col == 0 && v.elements.map(\.id) == [login.id, go.id, plain.id], "play: one screen at the top left")
    check(v.spots.map(\.id) == [go.id] && v.spots[0].col == 2 && v.spots[0].row == 4, "play: hotspots shifted with the screen")
    check(spotAt(v, col: 3, row: 4)?.to == home.id && spotAt(v, col: 3, row: 8) == nil, "play: a tap finds its hotspot")
    check(playView(els, hidden.id) == nil && playView(els, go.id) == nil, "play: only shown screens play")
    var toHidden = go; toHidden.opens = hidden.id
    check(playView([login, hidden, toHidden], login.id)?.spots.isEmpty == true, "play: a link to a hidden screen is not a hotspot")
    let path = playPath(els, start: login.id, presses: [go.id, back.id])
    check(path.path.map(\.title) == ["Login", "Home", "Login"] && path.error == nil, "play: a path through the flow")
    let bad = playPath(els, start: login.id, presses: [back.id])
    check(bad.path.count == 1 && bad.error == "press 0 is not a hotspot on Login", "play: stops at a wrong press")
}
