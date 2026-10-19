// Tweaks: live knobs on a screen, a port of src/lib/tweaks.js. Spacing is the blank rows between bands of
// parts, padding the blank cells inside the frame's top and left, and one box style for every box in it.

import Foundation

private let tweakMax = 8
private let boxLineChars = Set("─│┌┐└┘├┤┬┴┼")

/// Parts that share rows form a band; bands stack top to bottom.
private func bands(_ parts: [Element]) -> [(top: Int, bottom: Int, parts: [Element])] {
    var out: [(top: Int, bottom: Int, parts: [Element])] = []
    for p in parts.sorted(by: { ($0.row, $0.col) < ($1.row, $1.col) }) {
        if let last = out.last, p.row < last.bottom {
            out[out.count - 1].parts.append(p)
            out[out.count - 1].bottom = max(last.bottom, p.row + p.height)
        } else {
            out.append((p.row, p.row + p.height, [p]))
        }
    }
    return out
}

// ponytail: loose lines inside stay put; pinned ones reroute with their parts.
private func movable(_ elements: [Element], _ screen: Element) -> [Element] {
    partsInside(elements, screen).filter { $0.presetId != "line" && !$0.locked }
}

/// What the knobs read now: the smallest gap between bands and the smallest margin inside the frame.
func screenTweaks(_ elements: [Element], _ screen: Element) -> (spacing: Int, padding: Int) {
    let parts = movable(elements, screen), b = bands(parts)
    guard let first = b.first else { return (1, 1) }
    let gaps = zip(b.dropFirst(), b).map { $0.top - $1.bottom }
    return (min(tweakMax, gaps.min() ?? 1),
            min(tweakMax, first.top - screen.row - 1, parts.map(\.col).min()! - screen.col - 1))
}

/// Restack the screen with the new knobs. The frame grows when the parts need more room, never shrinks.
func tweakScreen(_ elements: [Element], id: String, spacing: Int? = nil, padding: Int? = nil, style: String? = nil) -> [Element] {
    guard let screen = elements.first(where: { $0.id == id }), screen.presetId == "screen" else { return elements }
    let now = screenTweaks(elements, screen)
    let knob = { (v: Int?, d: Int) in v.map { max(0, min(tweakMax, $0)) } ?? d }
    let gap = knob(spacing, now.spacing), pad = knob(padding, now.padding)
    let parts = movable(elements, screen)
    var moved: [String: (col: Int, row: Int)] = [:]
    var right = 0, bottom = 0
    if let left = parts.map(\.col).min() {
        var row = screen.row + 1 + pad
        for band in bands(parts) {
            for p in band.parts {
                let at = (col: p.col - left + screen.col + 1 + pad, row: row + p.row - band.top)
                moved[p.id] = at
                right = max(right, at.col + p.width); bottom = max(bottom, at.row + p.height)
            }
            row += band.bottom - band.top + gap
        }
    }
    let width = max(screen.width, right + pad + 1 - screen.col), height = max(screen.height, bottom + pad + 1 - screen.row)
    let inside = Set(partsInside(elements, screen).map(\.id))
    let restyle = style.map(boxStyles.contains) ?? false
    return routeLines(elements.map { el in
        var out = el
        if let at = moved[el.id] { out.col = at.col; out.row = at.row }
        if el.id == id { out.width = width; out.height = height; out.template = screenFrame(el.text ?? "Screen", width: width, height: height) }
        if restyle, el.id == id || inside.contains(el.id), !el.locked, el.template.joined().contains(where: boxLineChars.contains) {
            out.style = style == "single" ? nil : style
        }
        return out
    })
}

/// Put parts at new cells and grow the frame to hold them (never shrink it).
private func place(_ elements: [Element], _ screen: Element, _ moved: [String: (col: Int, row: Int)], pad: Int) -> [Element] {
    var right = 0, bottom = 0
    for el in elements { if let at = moved[el.id] { right = max(right, at.col + el.width); bottom = max(bottom, at.row + el.height) } }
    let width = max(screen.width, right + pad + 1 - screen.col), height = max(screen.height, bottom + pad + 1 - screen.row)
    return routeLines(elements.map { el in
        var out = el
        if el.id == screen.id { out.width = width; out.height = height; out.template = screenFrame(el.text ?? "Screen", width: width, height: height) }
        if let at = moved[el.id] { out.col = at.col; out.row = at.row }
        return out
    })
}

/// Variations, a port of tweaks.js: stacked is one part a row, split is two columns (each part to the shorter
/// one), dense is no blank rows.
let variationModes = ["stacked", "split", "dense"]
func relayout(_ elements: [Element], id: String, mode: String) -> [Element] {
    guard let screen = elements.first(where: { $0.id == id }), screen.presetId == "screen" else { return elements }
    if mode == "dense" { return tweakScreen(elements, id: id, spacing: 0, padding: 1) }
    let parts = movable(elements, screen).sorted { ($0.row, $0.col) < ($1.row, $1.col) }
    let pad = 1, left = screen.col + 1 + pad, top = screen.row + 1 + pad
    var moved: [String: (col: Int, row: Int)] = [:]
    if mode == "stacked" {
        var row = top
        for p in parts { moved[p.id] = (left, row); row += p.height + 1 }
    } else if mode == "split" {
        let x = [left, left + (parts.map(\.width).max() ?? 0) + 3]
        var y = [top, top]
        for p in parts { let k = y[0] <= y[1] ? 0 : 1; moved[p.id] = (x[k], y[k]); y[k] += p.height + 1 }
    } else { return elements }
    return place(elements, screen, moved, pad: pad)
}

/// Three takes past the rightmost part on the canvas, named for their layout, sharing a take tag with the original.
func variations(_ elements: [Element], id: String, labels: [String] = variationModes) -> (elements: [Element], ids: [String]) {
    guard let src = elements.first(where: { $0.id == id }), src.presetId == "screen" else { return (elements, []) }
    let take = src.take ?? UUID().uuidString, name = src.text ?? "Screen"
    var els = elements.map { var el = $0; if el.id == id { el.take = take }; return el }
    var from = id, ids: [String] = []
    for (i, mode) in variationModes.enumerated() {
        let clear = (els.map { $0.col + $0.width }.max() ?? 0) + 4
        guard let at = els.first(where: { $0.id == from }) else { break }
        let copy = duplicateScreen(els, at, dCol: clear - at.col)
        guard let copyId = copy.id else { break }
        els = updateElement(copy.elements, id: copyId, text: "\(name) \(labels[i])").map { var el = $0; if el.id == copyId { el.take = take }; return el }
        els = relayout(els, id: copyId, mode: mode)
        ids.append(copyId); from = copyId
    }
    return (els, ids)
}

/// Keep one take: every other screen with its tag goes, with the parts inside it.
func keepVariation(_ elements: [Element], id: String) -> [Element] {
    guard let kept = elements.first(where: { $0.id == id }), let take = kept.take else { return elements }
    let drop = Set(elements.filter { $0.presetId == "screen" && $0.take == take && $0.id != id }
        .flatMap { s in [s.id] + partsInside(elements, s).map(\.id) })
    return routeLines(elements.filter { !drop.contains($0.id) }.map { var el = $0; if el.id == id { el.take = nil }; return el })
}
