import Foundation

// Symbols, split from Shapes.swift (the twin of the symbol code in src/lib/shapes.js and engine.js).

/// A symbol is a part made once and reused: its copies share a `symbol` id, and editing one copy's content
/// (words, cells, size, box style) edits them all. Position, highlight and layer flags stay each copy's own.
/// Properties (v46): a copy can own its words or its box style; the rest still follows the symbol.
let ownKeys = ["text", "style"]
func cleanOwn(_ value: Any?) -> [String] { (value as? [Any]).map { v in ownKeys.filter { k in v.contains { $0 as? String == k } } } ?? [] }

/// Copy a symbol's content from src onto el, leaving out what either of them owns.
func takeSymbol(_ el: inout Element, from src: Element, owners: [Element]) {
    let owned = Set(owners.flatMap(\.own))
    if !owned.contains("text") { el.template = src.template; el.width = src.width; el.height = src.height; el.text = src.text }
    if !owned.contains("style") { el.style = src.style }
}

func syncSymbol(_ elements: [Element], id: String) -> [Element] {
    guard let src = elements.first(where: { $0.id == id }), let symbol = src.symbol else { return elements }
    return elements.map { el in
        guard el.symbol == symbol, el.id != id else { return el }
        var next = el
        takeSymbol(&next, from: src, owners: [src, el])
        return next
    }
}

/// Owning words or style on a copy; letting go pulls the shared ones back in from another copy.
func updateElement(_ elements: [Element], id: String, own: [String]) -> [Element] {
    let out = elements.map { el -> Element in var e = el; if e.id == id { e.own = ownKeys.filter(own.contains) }; return e }
    guard let me = out.first(where: { $0.id == id }), let sib = out.first(where: { $0.symbol != nil && $0.symbol == me.symbol && $0.id != id }) else { return out }
    return syncSymbol(out, id: sib.id)
}

/// Swap a copy for another symbol: it takes that symbol's content, keeps its place and what it owns.
func swapSymbol(_ elements: [Element], id: String, symbol: String) -> [Element] {
    guard let el = elements.first(where: { $0.id == id }), el.symbol != symbol,
          let rep = elements.first(where: { $0.symbol == symbol && $0.id != id }) else { return elements }
    var next = el
    next.symbol = symbol
    next.own = []; next.presetId = rep.presetId; next.label = rep.label // a swap is a full replace
    takeSymbol(&next, from: rep, owners: [])
    return routeLines(elements.map { $0.id == id ? next : $0 })
}
func makeSymbol(_ elements: [Element], id: String, symbol: String) -> [Element] {
    elements.map { var el = $0; if el.id == id { el.symbol = symbol }; return el }
}
func detachSymbol(_ elements: [Element], id: String) -> [Element] {
    elements.map { var el = $0; if el.id == id { el.symbol = nil }; return el }
}
func symbolUses(_ elements: [Element], _ el: Element?) -> Int {
    guard let symbol = el?.symbol else { return 0 }
    return elements.filter { $0.symbol == symbol }.count
}
