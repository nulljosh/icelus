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
func canvasGrids(_ elements: [Element]) -> [String: ColumnGrid] { elements.first { $0.canvas }?.grids ?? [:] }

/// Named grid styles: a screen's grid saved by name on the canvas part, picked for any screen later. At most 12.
func cleanGrids(_ value: Any?) -> [String: ColumnGrid] {
    guard let d = value as? [String: Any] else { return [:] }
    var out: [String: ColumnGrid] = [:]
    for k in d.keys.sorted() where isVarName(k) && out.count < varMax { if let g = cleanGrid(d[k]) { out[k] = g } }
    return out
}

/// Put the canvas part's mode and vars back; it goes away when it holds nothing at all.
private func withCanvas(_ elements: [Element], _ mode: String?, _ vars: [String: Int], _ grids: [String: ColumnGrid]? = nil) -> [Element] {
    patchCanvas(elements) { $0.adjust = mode; $0.vars = vars; if let grids { $0.grids = grids } }
}

/// Change the canvas part, making it on first use and dropping it once it holds nothing.
private func patchCanvas(_ elements: [Element], _ change: (inout Element) -> Void) -> [Element] {
    let part = elements.first { $0.canvas }, rest = elements.filter { !$0.canvas }
    var next = part ?? adjustLayer(col: 0, row: 0, width: 1, height: 1, adjust: "")
    if part == nil { next.adjust = nil }
    next.label = "Canvas"; next.canvas = true
    change(&next)
    let empty = next.adjust == nil && next.vars.isEmpty && next.grids.isEmpty && next.colors.isEmpty && next.widths.isEmpty && next.colorMode == nil
    if empty { return part == nil ? elements : rest }
    return rest + [next]
}

/// Save a grid under a name, or nil to remove the name. Screens that picked it keep their own copy.
func setGridStyle(_ elements: [Element], _ name: String, _ grid: ColumnGrid?) -> [Element] {
    guard isVarName(name) else { return elements }
    var grids = canvasGrids(elements)
    if let grid { guard grids[name] != nil || grids.count < varMax else { return elements }; grids[name] = grid } else { grids[name] = nil }
    return withCanvas(elements, canvasMode(elements), canvasVars(elements), grids)
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
    AutoLayout(gap: a.gapVar.map { vars[$0] ?? 1 } ?? a.gap, pad: a.padVar.map { vars[$0] ?? 1 } ?? a.pad, across: a.across, align: a.align, wrap: a.wrap)
}

/// The canvas mode goes over everything, whatever its place in the list.
func applyMode(_ grid: inout Grid, _ elements: [Element]) {
    guard let m = elements.first(where: { $0.canvas && !$0.hidden && $0.adjust != nil }) else { return }
    var whole = m
    whole.col = 0; whole.row = 0; whole.width = grid.first?.count ?? 0; whole.height = grid.count
    adjustGrid(&grid, whole)
}

// Color and width variables, after Figma's color variables and modes. A named color holds a light and a dark
// index into the terminal colors; a named width is a column count. A part binds its ink, paper or width to a
// name (inkVar, paperVar, widthVar). Changing a variable or the color mode writes the value into every bound
// part, so drawing and export never look a variable up. Removing a variable unbinds its parts; they keep the value.
let widthMax = 500

func canvasColors(_ elements: [Element]) -> [String: [Int]] { elements.first { $0.canvas }?.colors ?? [:] }
func canvasWidths(_ elements: [Element]) -> [String: Int] { elements.first { $0.canvas }?.widths ?? [:] }
func colorMode(_ elements: [Element]) -> String { elements.first { $0.canvas }?.colorMode == "dark" ? "dark" : "light" }

private func wholeNumber(_ x: Any?) -> Int? {
    guard let n = x as? NSNumber, CFGetTypeID(n) != CFBooleanGetTypeID() else { return nil }
    return Int(exactly: n.doubleValue)
}

func cleanColorVars(_ value: Any?) -> [String: [Int]] {
    guard let d = value as? [String: Any] else { return [:] }
    var out: [String: [Int]] = [:]
    for k in d.keys.sorted() where isVarName(k) && out.count < varMax {
        guard let a = d[k] as? [Any], a.count == 2 else { continue }
        let pair = a.compactMap { colorIndex($0) }
        if pair.count == 2 { out[k] = pair }
    }
    return out
}

func cleanWidthVars(_ value: Any?) -> [String: Int] {
    guard let d = value as? [String: Any] else { return [:] }
    var out: [String: Int] = [:]
    for k in d.keys.sorted() where isVarName(k) && out.count < varMax {
        if let w = wholeNumber(d[k]), (1...widthMax).contains(w) { out[k] = w }
    }
    return out
}

/// Write every variable's current value into the parts bound to it.
func applyVars(_ elements: [Element]) -> [Element] {
    let colors = canvasColors(elements), widths = canvasWidths(elements), m = colorMode(elements) == "dark" ? 1 : 0
    var out = elements
    for el in elements {
        let ink = el.inkVar.flatMap { colors[$0]?[m] }, paper = el.paperVar.flatMap { colors[$0]?[m] }
        if (ink != nil && ink != el.ink) || (paper != nil && paper != el.paper) {
            out = out.map { x in
                guard x.id == el.id else { return x }
                var y = x; if let ink { y.ink = ink }; if let paper { y.paper = paper }; return y
            }
        }
        if let w = el.widthVar.flatMap({ widths[$0] }), w != el.width { out = updateElement(out, id: el.id, width: w, height: el.height) }
    }
    return out
}

private func unbindAll(_ elements: [Element], _ key: String, _ name: String) -> [Element] {
    elements.map { el in
        var out = el
        if key == "ink", el.inkVar == name { out.inkVar = nil }
        if key == "paper", el.paperVar == name { out.paperVar = nil }
        if key == "width", el.widthVar == name { out.widthVar = nil }
        return out
    }
}

/// A color as [light, dark], or nil to remove it.
func setColorVar(_ elements: [Element], _ name: String, _ pair: [Int]?) -> [Element] {
    guard isVarName(name) else { return elements }
    var colors = canvasColors(elements)
    guard let pair else {
        guard colors[name] != nil else { return elements }
        colors[name] = nil
        return unbindAll(unbindAll(patchCanvas(elements) { $0.colors = colors }, "ink", name), "paper", name)
    }
    guard pair.count == 2, pair.allSatisfy({ (0...15).contains($0) }), colors[name] != nil || colors.count < varMax else { return elements }
    colors[name] = pair
    return applyVars(patchCanvas(elements) { $0.colors = colors })
}

func setWidthVar(_ elements: [Element], _ name: String, _ width: Int?) -> [Element] {
    guard isVarName(name) else { return elements }
    var widths = canvasWidths(elements)
    guard let width else {
        guard widths[name] != nil else { return elements }
        widths[name] = nil
        return unbindAll(patchCanvas(elements) { $0.widths = widths }, "width", name)
    }
    guard widths[name] != nil || widths.count < varMax else { return elements }
    widths[name] = max(1, min(widthMax, width))
    return applyVars(patchCanvas(elements) { $0.widths = widths })
}

func setColorMode(_ elements: [Element], _ mode: String) -> [Element] {
    applyVars(patchCanvas(elements) { $0.colorMode = mode == "dark" ? "dark" : nil })
}

/// Bind a part's ink, paper or width to a variable by name, or nil to let go (it keeps the value it has).
func bindVar(_ elements: [Element], id: String, key: String, name: String?) -> [Element] {
    guard ["ink", "paper", "width"].contains(key) else { return elements }
    let known = key == "width" ? Set(canvasWidths(elements).keys) : Set(canvasColors(elements).keys)
    if let name, !known.contains(name) { return elements }
    return applyVars(elements.map { el in
        guard el.id == id else { return el }
        var out = el
        if key == "ink" { out.inkVar = name } else if key == "paper" { out.paperVar = name } else { out.widthVar = name }
        return out
    })
}
