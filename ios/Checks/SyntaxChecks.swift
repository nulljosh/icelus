// Typed-syntax checks, ported from src/lib/syntax.test.js. Called from main.swift.

func runSyntaxChecks() {
    check(drawSketch("[OK]  \"Email\"") == "[ OK ]  [ Email_________ ]", "shortcuts: typed lines draw to fitted text")
    check(drawSketch("") == "", "shortcuts: nothing in, nothing out")

    let tpl = screenTemplate("Sign in", "\"Email\"\n[Go]", col: 10, row: 4)
    check(tpl[0].presetId == "screen" && tpl[0].text == "Sign in" && (tpl[0].col, tpl[0].row) == (10, 4), "templates: a named frame")
    check(tpl.dropFirst().map { "\($0.presetId) \($0.col),\($0.row)" } == ["input 13,6", "button 13,8"], "templates: typed parts inside it")
    check(screenTemplates.map(\.label) == ["Sign in", "Settings", "List", "Detail", "Empty state"]
          && screenTemplates.allSatisfy { $0.template[0].hasPrefix("┌─ " + $0.label) }, "templates: five, each previewed whole")

    let typed = "# Hi\n\"Email\"  [x] Remember me  ( ) Work\n\n[v Country]  [Sign in]\n---\n| Name | Plan |\n| Ada | Pro |\nPlain words"
    check(toSketch(parseSketch(typed)).source == typed, "typed syntax: a wireframe writes back as the lines that drew it")
    var card = createElement(presets[0], col: 0, row: 30); card.presetId = "card"; card.label = "Card"
    check(toSketch(parseSketch("[OK]") + [card]).skipped == ["Card"], "typed syntax: parts with no word are skipped and named")

    func draw(_ src: String) -> String { trimText(gridToText(renderElements(parseSketch(src, startRow: 0), cols: 60, rows: 20))) }

    let els = parseSketch("\"Email\"\n[x] Remember me  ( ) Work  (o) Home\n[v Country]\n[Sign in]  [Cancel]\n---\nHello there")
    check(els.map(\.presetId) == ["input", "checkbox", "radio", "radio", "select", "button", "button", "divider", "text"],
          "typed syntax: each kind of line becomes its part")
    check(els[0].template == ["[ Email_________ ]"] && els[1].template == ["[✓] Remember me"], "typed syntax: input and checkbox")
    check(els[2].template == ["( ) Work"] && els[3].template == ["(●) Home"], "typed syntax: radios off and on")
    check(els[4].template == ["[▾ Country     ]"] && els[5].template == ["[ Sign in ]"], "typed syntax: select and button")
    check(draw("[OK]  [Cancel]\nDone") == "  [ OK ]  [ Cancel ]\n\n  Done", "typed syntax: side by side, a blank row apart")
    let spaced = parseSketch("one\n\ntwo", startRow: 0)
    check(spaced[1].row - spaced[0].row == 3, "typed syntax: a blank line adds a row")
    check(draw("| Name | Plan |\n| Ada | Pro |") == [
        "  ┌──────┬──────┐", "  │ Name │ Plan │", "  ├──────┼──────┤", "  │ Ada  │ Pro  │", "  └──────┴──────┘",
    ].joined(separator: "\n"), "typed syntax: tables with a header rule")
    let banner = parseSketch("# Hi")[0]
    check(banner.presetId == "banner" && banner.text == "Hi" && banner.height == 3, "typed syntax: # makes a banner")
    check(parseSketch("").isEmpty && parseSketch("\n  \n").isEmpty, "typed syntax: an empty sketch is empty")
}
