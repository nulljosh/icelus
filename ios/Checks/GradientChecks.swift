func runGradientChecks() {
    let text = { (els: [Element], cols: Int, rows: Int) in
        renderElements(els, cols: cols, rows: rows).map { String($0).replacingOccurrences(of: "\\s+$", with: "", options: .regularExpression) }
            .joined(separator: "\n").replacingOccurrences(of: "\\s+$", with: "", options: .regularExpression)
    }
    check(text(paintMarks([], gradientMarks((0, 0), (7, 1), mode: "straight", cols: 10, rows: 2)), 10, 2) == "░░▒▒▓▓██\n░░▒▒▓▓██", "gradient: straight ramps light to solid")
    check(text(paintMarks([], gradientMarks((7, 0), (0, 0), mode: "straight", cols: 10, rows: 1)), 10, 1) == "██▓▓▒▒░░", "gradient: a drag back reverses it")
    let down = text(paintMarks([], gradientMarks((0, 0), (1, 3), mode: "straight", cols: 4, rows: 4)), 4, 4).split(separator: "\n").map { String($0.first!) }
    check(down == ramp, "gradient: a downward drag ramps the rows")
    let marks = gradientMarks((10, 5), (16, 5), mode: "round", cols: 30, rows: 12)
    let at = { (c: Int, r: Int) in marks.first { $0.0 == c && $0.1 == r }?.2 }
    check(at(10, 5) == "█" && at(16, 5) == "░" && at(10, 8) == "░" && at(10, 9) == nil, "gradient: round glows from the middle and looks round")
    check(gradientMarks((3, 3), (3, 3), mode: "round", cols: 9, rows: 9).map { "\($0)" } == ["(3, 3, \"█\")"], "gradient: a tap is one solid cell")
    check(gradientMarks((-5, -5), (2, 2), mode: "straight", cols: 3, rows: 3).count == 9 && gradientMarks((600, 600), (700, 700), mode: "straight", cols: 500, rows: 500).isEmpty
          && gradientMarks((0, 0), (1_000_000, 0), mode: "round", cols: 500, rows: 500).count <= 250_000, "gradient: clips and stays bounded")
}
