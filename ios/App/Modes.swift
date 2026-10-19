import Foundation

/// Variables and modes (v47), after Figma's. One canvas part (an adjustment with `canvas`) holds the project's
/// line mode, drawn over everything (renderElements), and its named spacing, which a screen's auto layout uses by
/// name: change `space` once and every screen bound to it restacks. src/lib/modes.js is the twin.
let modes = ["ascii", "single", "heavy", "double", "rounded"]
let varMax = 12

func isVarName(_ v: String) -> Bool { v.range(of: "^[a-z][a-z0-9-]{0,15}$", options: .regularExpression) != nil }

func cleanVars(_ value: Any?) -> [String: Int] {
    guard let v = value as? [String: Any] else { return [:] }
    var out: [String: Int] = [:]
    for (k, n) in v.sorted(by: { $0.key < $1.key }) where out.count < varMax && isVarName(k) {
        guard let n = n as? NSNumber, CFGetTypeID(n) != CFBooleanGetTypeID(), let i = Int(exactly: n.doubleValue), (0...autoMax).contains(i) else { continue }
        out[k] = i
    }
    return out
}

func canvasMode(_ elements: [Element]) -> String? { elements.first { $0.canvas }?.adjust }
func canvasVars(_ elements: [Element]) -> [String: Int] { elements.first { $0.canvas }?.vars ?? [:] }

/// Put the canvas part's mode and vars back; it goes away when it holds neither.
private func withCanvas(_ elements: [Element], _ mode: String?, _ vars: [String: Int]) -> [Element] {
    let part = elements.first { $0.canvas }, rest = elements.filter { !$0.canvas }
    guard mode != nil || !vars.isEmpty else { return part == nil ? elements : rest }
    var next = part ?? adjustLayer(col: 0, row: 0, width: 1, height: 1, adjust: "")
    next.label = "Canvas"; next.canvas = true; next.adjust = mode; next.vars = vars
    return rest + [next]
}

func setMode(_ elements: [Element], _ mode: String?) -> [Element] {
    withCanvas(elements, mode.flatMap { modes.contains($0) ? $0 : nil }, canvasVars(elements))
}

/// A value of nil removes the variable; screens bound to it keep its last value as a plain number.
func setVar(_ elements: [Element], _ name: String, _ value: Int?) -> [Element] {
    guard isVarName(name) else { return elements }
    var vars = canvasVars(elements)
    let last = vars[name]
    if let value { if vars[name] != nil || vars.count < varMax { vars[name] = max(0, min(autoMax, value)) } } else { vars[name] = nil }
    let next = withCanvas(elements, canvasMode(elements), vars)
    guard value == nil, let last else { return next }
    return next.map { el in
        guard var a = el.auto, a.gapVar == name || a.padVar == name else { return el }
        if a.gapVar == name { a.gapVar = nil; a.gap = last }
        if a.padVar == name { a.padVar = nil; a.pad = last }
        var out = el; out.auto = a; return out
    }
}

/// A gap or pad that names a variable reads its value; an unknown name reads 1.
func resolvedAuto(_ a: AutoLayout, _ vars: [String: Int]) -> AutoLayout {
    AutoLayout(gap: a.gapVar.map { vars[$0] ?? 1 } ?? a.gap, pad: a.padVar.map { vars[$0] ?? 1 } ?? a.pad)
}

/// The canvas mode goes over everything, whatever its place in the list.
func applyMode(_ grid: inout Grid, _ elements: [Element]) {
    guard let m = elements.first(where: { $0.canvas && !$0.hidden && $0.adjust != nil }) else { return }
    var whole = m
    whole.col = 0; whole.row = 0; whole.width = grid.first?.count ?? 0; whole.height = grid.count
    adjustGrid(&grid, whole)
}
