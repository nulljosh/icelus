func runRealChecks() {
    let parts = parseSketch("\"Email\"\n[x] Remember me\n[Sign in]", startRow: 0, startCol: 0)
    check(realPart(parts[0]) == .control(.input("Email")) && realPart(parts[1]) == .control(.checkbox(true, "Remember me"))
          && realPart(parts[2]) == .control(.button("Sign in")), "real: controls read as controls")
    check(realPart(screenTemplate("Home", "[Go]", col: 0, row: 0)[0]) == .control(.screen("Home")), "real: a screen is an artboard")
    for p in presets {
        let r = realPart(createElement(p, col: 0, row: 0))
        check(["chart", "sparkline"].contains(p.id) ? r == nil : r != nil, "real: \(p.id) has a real look or keeps its characters on purpose")
    }
    check(rowsOfText(["┌─ Hi ─┐", "│ there │", "└──────┘"]) == [TextRow(row: 0, col: 3, text: "Hi"), TextRow(row: 1, col: 2, text: "there")], "real: words without the lines")
    check(rowsOfText(["│ [ Action ] │", "[x]", "[v Language]", "[a] and [b]"]) == [TextRow(row: 0, col: 2, text: "Action", button: true),
        TextRow(row: 1, col: 0, text: "[x]"), TextRow(row: 2, col: 0, text: "[v Language]"), TextRow(row: 3, col: 0, text: "[a] and [b]")], "real: a bracketed row is a button")
    check(realPart(paint([], cells: [(0, 0)], char: "█")[0]) == nil, "real: paint keeps its characters")
}
