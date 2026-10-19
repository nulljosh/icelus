import Foundation

// Masks: hide part of a part without cutting it. A mask crops a part to an inset box (cells off each edge);
// a clip shows a part only where another part's box covers it. Both apply at draw time, so the part keeps
// every character and clearing the mask brings them all back. Twin of src/lib/mask.js.

struct Inset: Equatable { var top = 0, right = 0, bottom = 0, left = 0 }

/// A masked-out cell. renderElements skips it, so whatever is underneath shows through.
let hole: Character = "\u{0}"

/// A mask from untrusted input: four whole insets 0 to 500, or nil when there is nothing to hide.
func cleanMask(_ value: Any?) -> Inset? {
    guard let m = value as? [String: Any] else { return nil }
    func n(_ k: String) -> Int {
        let v = (m[k] as? NSNumber)?.doubleValue ?? (m[k] as? String).flatMap(Double.init) ?? 0
        return v.isFinite ? max(0, min(500, Int(v.rounded(.down)))) : 0
    }
    let out = Inset(top: n("top"), right: n("right"), bottom: n("bottom"), left: n("left"))
    return out == Inset() ? nil : out
}

/// The cells of a part that still show, as an absolute box (ends exclusive), or nil when nothing masks it.
func shownBox(_ el: Element, _ byId: [String: Element]) -> (c0: Int, r0: Int, c1: Int, r1: Int)? {
    let o = el.clip.flatMap { byId[$0] }
    guard el.mask != nil || o != nil else { return nil }
    let m = el.mask ?? Inset()
    var b = (c0: el.col + m.left, r0: el.row + m.top, c1: el.col + el.width - m.right, r1: el.row + el.height - m.bottom)
    // A clip uses the other part's box, drawn or hidden, so the shape can be hidden and still clip.
    if let o, o.id != el.id {
        b = (max(b.c0, o.col), max(b.r0, o.row), min(b.c1, o.col + o.width), min(b.r1, o.row + o.height))
    }
    return b
}

/// The elements as drawn: every masked-out cell becomes a hole. Unmasked parts come back as they are.
func withMasks(_ elements: [Element]) -> [Element] {
    guard elements.contains(where: { $0.mask != nil || $0.clip != nil }) else { return elements }
    let byId = Dictionary(elements.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
    return elements.map { el in
        guard let b = shownBox(el, byId) else { return el }
        var out = el
        out.template = el.template.enumerated().map { dy, line in
            let r = el.row + dy
            return String(line.enumerated().map { dx, ch in
                let c = el.col + dx
                return c >= b.c0 && c < b.c1 && r >= b.r0 && r < b.r1 ? ch : hole
            })
        }
        return out
    }
}

/// Set or clear a part's crop and clip. Nil leaves that one as it is; an empty inset or "" clears it.
func updateElement(_ elements: [Element], id: String, mask: Inset? = nil, clip: String? = nil) -> [Element] {
    elements.map { el in
        guard el.id == id else { return el }
        var out = el
        if let mask { out.mask = mask == Inset() ? nil : Inset(top: max(0, min(500, mask.top)), right: max(0, min(500, mask.right)),
                                                               bottom: max(0, min(500, mask.bottom)), left: max(0, min(500, mask.left))) }
        if let clip { out.clip = clip.isEmpty || clip == el.id ? nil : clip }
        return out
    }
}

/// Blend modes, a port of BLENDS and lands() in lines.js (kept here so Lines.swift stays small; every target builds Mask.swift): join (the default) merges light box lines, over replaces without joining,
/// under only fills empty cells, knockout clears its whole box, spaces too.
let blends = ["join", "over", "under", "knockout"]
func cleanBlend(_ value: Any?) -> String? {
    guard let b = value as? String, blends.contains(b), b != "join" else { return nil }
    return b
}

/// Whether a part's character lands on a cell that holds `under`. Drawing, accent and color all ask this.
func lands(_ el: Element, _ ch: Character, _ under: Character) -> Bool {
    if ch == hole { return false }
    if el.blend == "knockout" { return true }
    if ch == " " && seeThroughParts.contains(el.presetId) { return false }
    return el.blend != "under" || under == " "
}

func updateElement(_ elements: [Element], id: String, blend: String) -> [Element] {
    elements.map { el in
        guard el.id == id else { return el }
        var next = el
        next.blend = cleanBlend(blend)
        return next
    }
}
