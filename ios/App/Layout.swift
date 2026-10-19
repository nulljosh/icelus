import Foundation

/// Auto layout (v43), the twin of src/lib/layout.js. A screen with `auto` keeps its parts stacked: bands of parts
/// that share rows run top to bottom, `gap` rows apart and `pad` cells inside the frame, and the frame hugs them.
/// EditorState restacks after every change, so a part whose text grows pushes the rest down.
let autoMax = 8

struct AutoLayout: Equatable {
    var gap = 1
    var pad = 1
    var gapVar: String? = nil, padVar: String? = nil // bound to a canvas variable by name (Modes.swift)
}

func cleanAuto(_ value: Any?) -> AutoLayout? {
    guard let a = value as? [String: Any] else { return nil }
    func knob(_ k: String) -> Int {
        guard let n = a[k] as? NSNumber, CFGetTypeID(n) != CFBooleanGetTypeID(), let i = Int(exactly: n.doubleValue), (0...autoMax).contains(i) else { return 1 }
        return i
    }
    func bound(_ k: String) -> String? { (a[k] as? String).flatMap { isVarName($0) ? $0 : nil } }
    return AutoLayout(gap: knob("gap"), pad: knob("pad"), gapVar: bound("gap"), padVar: bound("pad"))
}

private func inner(_ elements: [Element], _ screen: Element) -> [Element] {
    partsInside(elements, screen).filter { $0.presetId != "line" && !$0.locked }
}

/// keyHeight is how tall a part was before the edit, so one that grew pushes the next band down instead of joining it.
private func stack(_ elements: [Element], _ screen: Element, _ parts: [Element], _ auto: AutoLayout, _ keyHeight: (Element) -> Int) -> [Element] {
    var bands: [(top: Int, key: Int, parts: [Element])] = []
    for p in parts.sorted(by: { ($0.row, $0.col) < ($1.row, $1.col) }) {
        if let last = bands.last, p.row < last.key {
            bands[bands.count - 1].parts.append(p)
            bands[bands.count - 1].key = max(last.key, p.row + keyHeight(p))
        } else { bands.append((p.row, p.row + keyHeight(p), [p])) }
    }
    let left = parts.map(\.col).min() ?? 0
    var moved: [String: (col: Int, row: Int)] = [:]
    var row = screen.row + 1 + auto.pad, right = 0, bottom = row
    for band in bands {
        var tall = 0
        for p in band.parts {
            let at = (col: p.col - left + screen.col + 1 + auto.pad, row: row + p.row - band.top)
            moved[p.id] = at
            tall = max(tall, at.row + p.height - row)
            right = max(right, at.col + p.width)
        }
        bottom = row + tall
        row = bottom + auto.gap
    }
    let width = max(screen.width, right + auto.pad + 1 - screen.col), height = max(3, bottom + auto.pad + 1 - screen.row)
    return routeLines(elements.map { el in
        if let at = moved[el.id] { var next = el; next.col = at.col; next.row = at.row; return next }
        guard el.id == screen.id, width != el.width || height != el.height else { return el }
        var next = el
        next.width = width; next.height = height; next.template = screenFrame(el.text ?? "Screen", width: width, height: height)
        return next
    })
}

/// Restack every auto screen after an edit from prev to next. A part that was inside stays in its stack even when
/// it grew past the frame; one dragged out leaves it.
func autoLayout(_ prev: [Element], _ next: [Element]) -> [Element] {
    guard next.contains(where: { $0.presetId == "screen" && $0.auto != nil }) else { return next }
    let was = Dictionary(prev.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
    var out = next
    let vars = canvasVars(next)
    for id in next.filter({ $0.presetId == "screen" && $0.auto != nil }).map(\.id) {
        guard let now = out.first(where: { $0.id == id }), let auto = now.auto else { continue }
        let stayed = was[id].map { before in inner(prev, before).filter { p in
            out.first { $0.id == p.id }.map { $0.presetId != "line" && !$0.locked && $0.col == p.col && $0.row == p.row } ?? false
        } } ?? []
        let ids = Set((stayed + inner(out, now)).map(\.id))
        out = stack(out, now, out.filter { ids.contains($0.id) }, resolvedAuto(auto, vars)) { was[$0.id]?.height ?? $0.height }
    }
    return out
}

func updateElement(_ elements: [Element], id: String, auto: AutoLayout?) -> [Element] {
    elements.map { el in
        guard el.id == id, el.presetId == "screen" else { return el }
        var next = el
        next.auto = auto.map { AutoLayout(gap: max(0, min(autoMax, $0.gap)), pad: max(0, min(autoMax, $0.pad)), gapVar: $0.gapVar, padVar: $0.padVar) }
        return next
    }
}

/// Constraints (v44): a part on a screen is pinned left (the default), right, to both sides (it stretches) or to
/// the center, and top, bottom, both or center the same way. When the screen is resized, pinned parts follow.
let pinX = ["left", "right", "both", "center"]
let pinY = ["top", "bottom", "both", "center"]

struct Pin: Equatable {
    var x: String? = nil
    var y: String? = nil
}

func cleanPin(_ value: Any?) -> Pin? {
    guard let p = value as? [String: Any] else { return nil }
    return cleanPin(Pin(x: p["x"] as? String, y: p["y"] as? String))
}

func cleanPin(_ p: Pin?) -> Pin? {
    let x = p?.x.flatMap { pinX.contains($0) && $0 != "left" ? $0 : nil }, y = p?.y.flatMap { pinY.contains($0) && $0 != "top" ? $0 : nil }
    return x == nil && y == nil ? nil : Pin(x: x, y: y)
}

func updateElement(_ elements: [Element], id: String, pin: Pin?) -> [Element] {
    elements.map { el in
        guard el.id == id else { return el }
        var next = el
        next.pin = cleanPin(pin)
        return next
    }
}

func constrain(_ prev: [Element], _ next: [Element]) -> [Element] {
    let was = Dictionary(prev.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
    func shift(_ mode: String?, _ d: Int) -> Int { mode == "right" || mode == "bottom" ? d : mode == "center" ? Int((Double(d) / 2 + 0.5).rounded(.down)) : 0 } // center rounds like Math.round
    var out = next, changed = false
    for screen in next where screen.presetId == "screen" {
        guard let before = was[screen.id], before.col == screen.col, before.row == screen.row else { continue }
        let dx = screen.width - before.width, dy = screen.height - before.height
        guard dx != 0 || dy != 0 else { continue }
        for p in partsInside(prev, before) {
            guard let now = out.first(where: { $0.id == p.id }), let pin = now.pin, now.presetId != "line", !now.locked else { continue }
            let width = now.width + (pin.x == "both" ? dx : 0), height = now.height + (pin.y == "both" ? dy : 0)
            if width != now.width || height != now.height { out = updateElement(out, id: p.id, width: max(1, width), height: max(1, height)); changed = true }
            let col = now.col + shift(pin.x, dx), row = now.row + shift(pin.y, dy)
            if col != now.col || row != now.row {
                out = out.map { var e = $0; if e.id == p.id { e.col = col; e.row = row }; return e }
                changed = true
            }
        }
    }
    return changed ? routeLines(out) : next
}

/// Sizes (v45): one screen at phone, tablet and desktop widths, kept in step. The copies are laid out to the
/// right, resized so pins apply, and every part shares a `twin` tag with its copies: change the words, style or
/// color of one and its twins follow. Where each copy sits stays its own.
let screenSizes: [(name: String, width: Int)] = [("Phone", 40), ("Tablet", 64), ("Desktop", 100)]

func makeSizes(_ elements: [Element], id: String) -> (elements: [Element], ids: [String]) {
    guard let src = elements.first(where: { $0.id == id }), src.presetId == "screen", src.size == nil else { return (elements, []) }
    let mine = screenSizes.min { abs($0.width - src.width) < abs($1.width - src.width) }!.name
    let tags = Dictionary(([src] + partsInside(elements, src)).map { ($0.id, $0.twin ?? UUID().uuidString) }, uniquingKeysWith: { a, _ in a })
    var out = elements.map { el -> Element in
        guard let tag = tags[el.id] else { return el }
        var next = el
        next.twin = tag
        if el.id == id { next.size = mine }
        return next
    }
    var col = src.col + src.width + 4, ids: [String] = []
    for size in screenSizes where size.name != mine {
        guard let from = out.first(where: { $0.id == id }) else { break }
        let copied = duplicateScreen(out, from, dCol: col - src.col)
        guard let copy = copied.id else { break }
        let named = copied.elements.map { el -> Element in var e = el; if e.id == copy { e.size = size.name }; return e }
        out = constrain(named, updateElement(named, id: copy, width: size.width, height: src.height))
        ids.append(copy)
        col += size.width + 4
    }
    return (out, ids)
}

/// After an edit from prev to next: what changed on a part with a twin is copied to its twins that did not change.
func syncTwins(_ prev: [Element], _ next: [Element]) -> [Element] {
    let was = Dictionary(prev.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
    let changed = next.filter { el in el.twin != nil && was[el.id].map { $0 != el } == true }
    guard !changed.isEmpty else { return next }
    var out = next
    for src in changed {
        guard let old = was[src.id] else { continue }
        for twin in next where twin.twin == src.twin && twin.id != src.id && was[twin.id] == twin {
            if src.text != old.text { out = updateElement(out, id: twin.id, text: src.text ?? "") }
            if src.style != old.style { out = updateElement(out, id: twin.id, style: src.style ?? "single") }
            if src.variant != old.variant { out = updateElement(out, id: twin.id, variant: src.variant ?? "default") }
            if src.accent != old.accent { out = updateElement(out, id: twin.id, accent: src.accent) }
            if src.blend != old.blend { out = updateElement(out, id: twin.id, blend: src.blend ?? "") }
            out = out.map { el in
                guard el.id == twin.id else { return el }
                var e = el
                if src.ink != old.ink { e.ink = src.ink }
                if src.paper != old.paper { e.paper = src.paper }
                // A part whose words live only in its characters: copy them when the twin is the size the part was.
                if src.text == nil, src.presetId != "screen", src.template != old.template, twin.width == old.width {
                    e.template = src.template; e.width = src.width; e.height = src.height
                }
                return e
            }
        }
    }
    return out
}
