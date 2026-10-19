func runBrushChecks() {
    let text = { (els: [Element], cols: Int, rows: Int) in
        renderElements(els, cols: cols, rows: rows).map { String($0).replacingOccurrences(of: "\\s+$", with: "", options: .regularExpression) }
            .joined(separator: "\n").replacingOccurrences(of: "\\s+$", with: "", options: .regularExpression)
    }
    check(tip(5, 5).count == 1 && tip(5, 5, size: 3).count == 9 && tip(5, 5, size: 3)[0] == (4, 4) && tip(5, 5, size: 2)[0] == (5, 5)
          && tip(0, 0, size: 99).count == 25, "brush: tips are size cells across, centred")
    let line = run((0, 0), (7, -3))
    check(line.first! == (0, 0) && line.last! == (7, -3) && line.count == 8
          && zip(line, line.dropFirst()).allSatisfy { max(abs($1.0 - $0.0), abs($1.1 - $0.1)) == 1 }, "brush: runs have no gaps")
    let cells = strokeCells([(0, 0), (9, 0), (0, 0)], size: 3, cols: 10, rows: 4)
    check(Set(cells.map { "\($0)" }).count == cells.count && cells.allSatisfy { $0.0 >= 0 && $0.1 >= 0 && $0.0 < 10 && $0.1 < 4 }, "brush: a stroke clips and has no repeats")
    check(strokeCells([(0, 0), (999, 999)], size: 5, cols: 1000, rows: 1000).count <= 20_000, "brush: a stroke has a ceiling")
    let painted = paint(parseSketch("[Go]", startRow: 0, startCol: 0), cells: strokeCells([(0, 1), (6, 1)], size: 1, cols: 10, rows: 3), char: "░")
    check(painted.last?.presetId == "paint" && painted.last?.width == 7 && text(painted, 10, 3) == "[ Go ]\n░░░░░░░", "brush: paints one see-through part")
    check(text(paint(parseSketch("[Go]", startRow: 0, startCol: 0), cells: [(0, 0), (5, 0)], char: "#"), 10, 1) == "# Go #", "brush: paints over a button without cutting it")
    let dots = paint([], cells: [(0, 0), (2, 2)], char: "•")
    check(elementAt(dots, col: 0, row: 0)?.presetId == "paint" && elementAt(dots, col: 1, row: 1) == nil, "brush: only its marks are hit")
    let base = parseSketch("[Go]", startRow: 0, startCol: 0)
    var els = erase(paint(base, cells: [(0, 1), (1, 1), (2, 1)], char: "█"), cells: tip(1, 1) + tip(0, 0))
    check(text(els, 10, 2) == "[ Go ]\n█ █", "brush: the eraser clears paint only")
    els = erase(els, cells: strokeCells([(0, 1), (2, 1)], size: 1, cols: 10, rows: 2))
    check(els.count == base.count, "brush: an empty stroke is removed")
    var locked = paint([], cells: [(0, 0)], char: "█"); locked[0].locked = true
    check(erase(locked, cells: [(0, 0)]).count == 1, "brush: a locked stroke is kept")
    check(brushChar("▒x") == "▒" && brushChar("") == "█" && brushChar(" ") == "█" && brushChar("\u{7}") == "█" && brushChar(nil) == "█", "brush: one printable mark")
}
