import Foundation

/// Auto layout (v43), the twin of src/lib/layout.js. A screen with `auto` keeps its parts stacked: bands of parts
/// that share rows run top to bottom, `gap` rows apart and `pad` cells inside the frame, and the frame hugs them.
/// EditorState restacks after every change, so a part whose text grows pushes the rest down.
let autoMax = 8

struct AutoLayout: Equatable {
    var gap = 1
    var pad = 1
}

func cleanAuto(_ value: Any?) -> AutoLayout? {
    guard let a = value as? [String: Any] else { return nil }
    func knob(_ k: String) -> Int {
        guard let n = a[k] as? NSNumber, CFGetTypeID(n) != CFBooleanGetTypeID(), let i = Int(exactly: n.doubleValue), (0...autoMax).contains(i) else { return 1 }
        return i
    }
    return AutoLayout(gap: knob("gap"), pad: knob("pad"))
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
    for id in next.filter({ $0.presetId == "screen" && $0.auto != nil }).map(\.id) {
        guard let now = out.first(where: { $0.id == id }), let auto = now.auto else { continue }
        let stayed = was[id].map { before in inner(prev, before).filter { p in
            out.first { $0.id == p.id }.map { $0.presetId != "line" && !$0.locked && $0.col == p.col && $0.row == p.row } ?? false
        } } ?? []
        let ids = Set((stayed + inner(out, now)).map(\.id))
        out = stack(out, now, out.filter { ids.contains($0.id) }, auto) { was[$0.id]?.height ?? $0.height }
    }
    return out
}

func updateElement(_ elements: [Element], id: String, auto: AutoLayout?) -> [Element] {
    elements.map { el in
        guard el.id == id, el.presetId == "screen" else { return el }
        var next = el
        next.auto = auto.map { AutoLayout(gap: max(0, min(autoMax, $0.gap)), pad: max(0, min(autoMax, $0.pad))) }
        return next
    }
}
