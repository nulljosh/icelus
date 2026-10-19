func runSelectChecks() {
    let text = { (els: [Element], cols: Int, rows: Int) in
        renderElements(els, cols: cols, rows: rows).map { String($0).replacingOccurrences(of: "\\s+$", with: "", options: .regularExpression) }
            .joined(separator: "\n").replacingOccurrences(of: "\\s+$", with: "", options: .regularExpression)
    }
    check(marquee((2, 1), (0, 0), cols: 10, rows: 10).count == 6 && marquee((-5, -5), (99, 0), cols: 4, rows: 3).count == 4, "select: marquee clips")
    let grid = renderElements(paint([], cells: [(0, 0), (1, 0), (2, 0), (4, 0)], char: "▒"), cols: 6, rows: 2)
    check(wand(grid, col: 1, row: 0).count == 3 && wand(grid, col: 3, row: 1).count == 8 && wand(grid, col: 9, row: 9).isEmpty, "select: the wand takes a run")
    let go = parseSketch("[Go]", startRow: 0, startCol: 0)
    check(cellText(renderElements(go, cols: 10, rows: 3), marquee((0, 0), (9, 2), cols: 10, rows: 3)) == "[ Go ]" && cellText([], []) == "", "select: copy trims blank edges")
    let two = parseSketch("[Go]  [Stop]", startRow: 0, startCol: 0)
    check(partsWithin(two, marquee((0, 0), (6, 0), cols: 20, rows: 1)).map { $0.template[0] } == ["[ Go ]"]
          && partsWithin(two, marquee((0, 0), (3, 0), cols: 20, rows: 1)).isEmpty, "select: whole parts only")
    let painted = paint(two, cells: [(0, 1), (10, 1)], char: "#")
    check(text(cutCells(painted, marquee((0, 0), (8, 1), cols: 20, rows: 2)), 20, 2) == "        [ Stop ]\n          #", "select: cut leaves a part it only touches")
    check(text(fillCells([], marquee((0, 0), (2, 1), cols: 5, rows: 2), char: "░"), 5, 2) == "░░░\n░░░", "select: fill")
    let moved = moveCells(paint(go, cells: [(0, 1), (1, 1)], char: "▓"), marquee((0, 0), (5, 1), cols: 20, rows: 4), dCol: 2, dRow: 2, cols: 20, rows: 4)
    check(text(moved, 20, 4) == "\n\n  [ Go ]\n  ▓▓", "select: move carries paint and parts")
    let screen = screenTemplate("Home", "[Go]", col: 0, row: 0)
    let carried = moveCells(screen, marquee((0, 0), (40, 20), cols: 60, rows: 30), dCol: 5, dRow: 3, cols: 60, rows: 30)
    check(zip(screen, carried).allSatisfy { $1.col - $0.col == 5 && $1.row - $0.row == 3 }, "select: a screen brings its parts once")
    check(shiftCells([(0, 0), (2, 0)], dCol: 1, dRow: 0, cols: 3, rows: 1).map { "\($0)" } == ["(1, 0)"], "select: the selection follows a move")
}
