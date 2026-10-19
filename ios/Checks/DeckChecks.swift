func runDeckChecks() {
    let screen = { (name: String, col: Int, row: Int) in
        Element(id: name, presetId: "screen", label: "Screen", template: screenFrame(name, width: 20, height: 6), width: 20, height: 6, col: col, row: row, text: name)
    }
    let list = slides([screen("Two", 30, 0), screen("Three", 0, 10), screen("One", 0, 0)] + parseSketch("[Go]", startRow: 2, startCol: 1), cols: 60, rows: 20)
    check(list.map(\.title) == ["One", "Two", "Three"], "deck: slides in reading order")
    check(list[0].text.hasPrefix("┌─ One") && list[0].text.contains("[ Go ]") && !list[1].text.contains("Go"), "deck: each slide cropped to its screen")
    check(slides(parseSketch("[Go]", startRow: 1, startCol: 1), cols: 20, rows: 5) == [Slide(title: "Icelus", text: "\n [ Go ]")], "deck: no screens is one slide")
    check(slides([], cols: 20, rows: 5).isEmpty, "deck: empty canvas, no slides")
    var gone = screen("Gone", 0, 0); gone.hidden = true
    check(slides([gone, screen("Here", 0, 8)], cols: 30, rows: 20).map(\.title) == ["Here"], "deck: hidden screens skipped")
    check(slideSize("ab\nabcd\n") == (4, 3), "deck: slide size")
    var off = screen("Off", 0, 0); off.col = 500; off.row = -40
    check(slides([off], cols: 30, rows: 20).count == 1, "deck: a screen off the grid does not crash")
    let html = toDeck([screen("<script>alert(1)</script>", 0, 0)], cols: 30, rows: 10, title: "<b>")
    check(!html.contains("<script>alert") && html.contains("&lt;script&gt;") && html.contains("<title>&lt;b&gt;</title>")
          && html.contains("break-after: page"), "deck: escaped, prints a page a slide")
    check(toDeck([], cols: 10, rows: 5).contains("No screens yet."), "deck: empty deck says so")
}
