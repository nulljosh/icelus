func runImportChecks() {
    func redraw(_ els: [Element]) -> String { trimText(gridToText(renderElements(els, cols: 80, rows: 30))) }
    let text = [
        "┌─ Home ─────────────────┐",
        "│ Welcome back           │",
        "│ ┌──────────┐           │",
        "│ │ [ Save ] │  [ Quit ] │",
        "│ └──────────┘           │",
        "└────────────────────────┘",
        "  Footer text   ───▶ next",
    ].joined(separator: "\n")
    let els = importText(text)
    check(els.filter { $0.presetId == "box" }.count == 2, "import: finds a box inside a box")
    check(els.filter { $0.presetId == "text" }.map { $0.template[0] } == ["Welcome back", "Footer text", "───▶ next"], "import: loose text")
    check(els.filter { $0.presetId == "button" }.map { $0.template[0] } == ["[ Save ]", "[ Quit ]"], "import: buttons")
    check(redraw(els) == text, "import: draws back the same text")
    for t in screenTemplateSources {
        let drawn = redraw(screenTemplate(t.name, t.source))
        check(redraw(importText(drawn)) == drawn, "import: round-trips the \(t.name) template")
    }
    let table = "┌──────┬──────┐\n│ Name │ Plan │\n├──────┼──────┤\n│ Ada  │ Pro  │\n└──────┴──────┘"
    check(importText(table).map(\.presetId) == ["box"] && redraw(importText(table)) == table, "import: a table stays whole")
    check(importText("┌───\n│ hi").allSatisfy { $0.presetId == "text" }, "import: an unclosed box stays text")

    let flow = "+--------+     +--------+\n|  Home  +---->|  Cart  |\n+--------+     +--------+"
    check(importText(flow).filter { $0.presetId == "box" }.count == 2 && redraw(importText(flow)) == flow, "import: ASCIIFlow ASCII boxes")
    let mono = "╭──────────╮\n│  Search  │░\n╰──────────╯░\n ░░░░░░░░░░░░"
    check(importText(mono).first?.presetId == "box" && redraw(importText(mono)) == mono, "import: Monodraw rounded box with shadow")
}
