// Gradients, a port of src/lib/gradient.js: drag from a start cell to an end cell to lay a ramp of shade
// characters as one stroke of paint. Straight ramps across the box the drag spans, light where you start
// and solid where you stop. Round glows out from the start, solid in the middle and light at the edge,
// with rows counted twice as tall as columns so a circle looks round.

import Foundation

let ramp = ["░", "▒", "▓", "█"]
let gradientModes = ["straight", "round"]
private let aspect = 2.0
private let maxRadius = 250.0

private func level(_ t: Double) -> String { ramp[min(ramp.count - 1, max(0, Int((t * Double(ramp.count)).rounded(.down))))] }

/// The marks a gradient from a to b lays, clipped to the grid.
func gradientMarks(_ a: (Int, Int), _ b: (Int, Int), mode: String, cols: Int, rows: Int) -> [(Int, Int, String)] {
    let (ac, ar) = a, (bc, br) = b
    let inGrid = { (c: Int, r: Int) in c >= 0 && r >= 0 && c < cols && r < rows }
    var marks: [(Int, Int, String)] = []
    if mode == "round" {
        let radius = min(maxRadius, hypot(Double(bc - ac), Double(br - ar) * aspect))
        if radius < 1 { return inGrid(ac, ar) ? [(ac, ar, ramp.last!)] : [] }
        let reach = Int(radius.rounded(.up)), up = Int((radius / aspect).rounded(.up))
        for r in (ar - up)...(ar + up) {
            for c in (ac - reach)...(ac + reach) {
                let d = hypot(Double(c - ac), Double(r - ar) * aspect)
                if d <= radius && inGrid(c, r) { marks.append((c, r, level(1 - d / radius))) }
            }
        }
        return marks
    }
    let across = Double(abs(bc - ac)) >= Double(abs(br - ar)) * aspect
    let from = across ? ac : ar, to = across ? bc : br, span = to - from
    for r in min(ar, br)...max(ar, br) {
        for c in min(ac, bc)...max(ac, bc) where inGrid(c, r) {
            marks.append((c, r, level(span == 0 ? 1 : Double((across ? c : r) - from) / Double(span))))
        }
    }
    return marks
}
