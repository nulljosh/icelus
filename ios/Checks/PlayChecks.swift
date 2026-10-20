/// Era 6, prototype: hotspots, play mode and live parts.
func runPrototypeChecks() { runHotspotChecks(); runPlayChecks(); runLiveChecks() }

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

func runLiveChecks() {
    let screen = Element(id: "form", presetId: "screen", label: "Screen", template: screenFrame("Form", width: 50, height: 30), width: 50, height: 30, col: 0, row: 0, text: "Form")
    func at(_ id: String, _ col: Int, _ row: Int) -> Element { createElement(presets.first { $0.id == id }!, col: col, row: row) }
    let box = at("checkbox", 2, 2), r1 = at("radio", 2, 4), sw = at("toggle", 2, 7), seg = at("segmented", 2, 9), tabs = at("tabs", 2, 11)
    let rate = at("rating", 2, 17), slide = at("slider", 2, 19), field = at("input", 2, 21), area = at("textarea", 20, 2)
    var r2 = at("radio", 2, 5); r2.template = ["( ) Other"]
    var link = at("checkbox", 2, 24); link.opens = screen.id
    let view = playView([screen, box, r1, r2, sw, seg, tabs, rate, slide, field, area, link], screen.id)!
    let draw = { (st: [String: LiveValue], el: Element) in liveElement(view.elements.first { $0.id == el.id }!, st) }
    check([box, r1, sw, seg, tabs, rate, slide, field, area].map { liveKind($0) ?? "" } == ["tick", "pick", "flip", "choose", "choose", "rate", "slide", "type", "type"]
          && liveKind(link) == nil && liveKind(screen) == nil, "live: which parts work while playing")
    check(liveStart(box) == .on(true) && liveStart(r2) == .on(false) && liveStart(sw) == .on(false) && liveStart(rate) == .at(3) && liveStart(slide) == .at(6), "live: starting values read from the characters")
    var st = pressLive(view, [:], id: box.id, dCol: 1)
    check(draw(st, box).template[0] == "[ ] Label", "live: a box unticks")
    st = pressLive(view, st, id: r2.id, dCol: 0)
    check(st[r1.id] == .on(false) && st[r2.id] == .on(true) && draw(st, r1).template[0] == "( ) Option", "live: one radio at a time")
    st = pressLive(view, st, id: sw.id, dCol: 3)
    check(realPart(draw(st, sw)) == .toggle(true) && draw(st, sw).template[0].count == sw.template[0].count, "live: a switch flips")
    st = pressLive(view, st, id: seg.id, dCol: seg.width - 1)
    if case .segmented(_, let i) = realPart(draw(st, seg)) { check(i == 2, "live: a segment by where you press") } else { check(false, "live: a segment by where you press") }
    check(pressLive(view, st, id: seg.id, dCol: nil)[seg.id] == .at(0), "live: the keyboard steps and wraps")
    st = pressLive(view, st, id: tabs.id, dCol: tabs.width / 2)
    if case .tabs(let items, let i, _) = realPart(draw(st, tabs)) { check(items == ["Tab1", "Tab 2", "Tab 3"] && i == 1, "live: tabs switch") } else { check(false, "live: tabs switch") }
    st = pressLive(view, st, id: rate.id, dCol: 4)
    check(draw(st, rate).template[0] == "★★★★★" && draw(pressLive(view, st, id: rate.id, dCol: -9), rate).template[0] == "★☆☆☆☆", "live: rating, never below one")
    st = pressLive(view, st, id: slide.id, dCol: 99)
    check(Array(draw(st, slide).template[0]).lastIndex(of: "●") == slide.template[0].count - 1 && draw(st, slide).template[0].filter { $0 == "●" }.count == 1, "live: slider")
    st = typeLive(st, id: field.id, words: String(repeating: "x", count: 9999))
    check(st[field.id] == .words(String(repeating: "x", count: typeMax)), "live: typing is capped")
    st = typeLive(st, id: area.id, words: "Hello")
    check(draw(st, area).template.dropFirst().dropLast().allSatisfy { $0.range(of: #"^│\s+│$"#, options: .regularExpression) != nil }, "live: a typed field draws empty")
    check(view.elements.first { $0.id == box.id }!.template[0] == "[✓] Label" && pressLive(view, st, id: screen.id, dCol: 0) == st, "live: the project is never touched")
}
