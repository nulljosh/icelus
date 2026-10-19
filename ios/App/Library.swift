import Foundation

/// Libraries (v48), after Figma's. Publish turns each symbol in a project into a library part; a project that
/// places one keeps its symbol id, so opening a newer copy of the library updates every copy in place, minus what
/// a copy owns (v46). The file is plain JSON. src/lib/library.js is the twin.
let libraryMax = 100

struct LibraryPart: Equatable {
    var symbol: String, label: String, presetId: String, template: [String]
    var text: String? = nil, style: String? = nil
}

struct PartLibrary: Equatable {
    var name: String
    var parts: [LibraryPart]
}

private func okSymbol(_ s: String?) -> Bool { s.map { !$0.isEmpty && $0.count <= 64 } ?? false }

func makeLibrary(_ elements: [Element], name: String = "Library") -> PartLibrary {
    var seen = Set<String>(), parts: [LibraryPart] = []
    for el in elements where okSymbol(el.symbol) && !seen.contains(el.symbol!) && parts.count < libraryMax {
        seen.insert(el.symbol!)
        parts.append(LibraryPart(symbol: el.symbol!, label: el.label, presetId: el.presetId, template: el.template, text: el.text, style: el.style))
    }
    let trimmed = String(name.trimmingCharacters(in: .whitespaces).prefix(40))
    return PartLibrary(name: trimmed.isEmpty ? "Library" : trimmed, parts: parts)
}

func serializeLibrary(_ library: PartLibrary) -> String {
    let parts = library.parts.map { p -> [String: Any] in
        var d: [String: Any] = ["symbol": p.symbol, "label": p.label, "presetId": p.presetId, "template": p.template]
        if let text = p.text { d["text"] = text }
        if let style = p.style { d["style"] = style }
        return d
    }
    let d: [String: Any] = ["icelusLibrary": 1, "name": library.name, "parts": parts]
    guard let data = try? JSONSerialization.data(withJSONObject: d, options: [.prettyPrinted, .sortedKeys]) else { return "" }
    return String(decoding: data, as: UTF8.self)
}

/// A library file read back, kept only if well formed. Untrusted: it may come from anyone.
func parseLibrary(_ raw: String) -> PartLibrary? {
    guard let data = raw.data(using: .utf8), let d = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
          let version = d["icelusLibrary"] as? NSNumber, CFGetTypeID(version) != CFBooleanGetTypeID(), version == 1,
          let list = d["parts"] as? [Any] else { return nil }
    var seen = Set<String>(), parts: [LibraryPart] = []
    for item in list {
        guard let p = item as? [String: Any], let symbol = p["symbol"] as? String, okSymbol(symbol), !seen.contains(symbol) else { continue }
        seen.insert(symbol)
        guard parts.count < libraryMax, let label = p["label"] as? String, label.count <= 40,
              let template = p["template"] as? [String], !template.isEmpty, template.count <= 60, template.allSatisfy({ $0.count <= 200 }) else { continue }
        parts.append(LibraryPart(symbol: symbol, label: label, presetId: String((p["presetId"] as? String ?? "custom").prefix(40)), template: template,
                                 text: (p["text"] as? String).flatMap { $0.count <= 2000 ? $0 : nil },
                                 style: (p["style"] as? String).flatMap { boxStyles.contains($0) && $0 != "single" ? $0 : nil }))
    }
    let name = (d["name"] as? String)?.trimmingCharacters(in: .whitespaces) ?? ""
    return PartLibrary(name: name.isEmpty ? "Library" : String(name.prefix(40)), parts: parts)
}

/// Every copy of a library symbol takes the library's version of it. Returns the list and how many copies changed.
func pullLibrary(_ elements: [Element], _ library: PartLibrary) -> (elements: [Element], changed: Int) {
    let bySymbol = Dictionary(library.parts.map { ($0.symbol, $0) }, uniquingKeysWith: { a, _ in a })
    var changed = 0
    let out = elements.map { el -> Element in
        guard let symbol = el.symbol, let p = bySymbol[symbol] else { return el }
        let src = Element(id: "", presetId: p.presetId, label: p.label, template: p.template, width: max(1, p.template.map(\.count).max() ?? 0),
                          height: p.template.count, col: 0, row: 0, text: p.text, style: p.style)
        var next = el
        takeSymbol(&next, from: src, owners: [el])
        if next != el { changed += 1 }
        return next
    }
    return (changed > 0 ? routeLines(out) : elements, changed)
}

/// Library parts for the palette (under Mine), style baked in like any Mine part, carrying their symbol.
func libraryPalette(_ library: PartLibrary) -> [Preset] {
    library.parts.map { p in
        Preset(id: "mine-lib-\(p.symbol)", label: p.label, category: mineCategory,
               template: p.style.map { s in p.template.map { String($0.map { styleChar($0, s) }) } } ?? p.template, symbol: p.symbol)
    }
}

func withLibrary(_ palette: [Preset], _ library: PartLibrary) -> [Preset] {
    let ids = Set(library.parts.map { "mine-lib-\($0.symbol)" })
    return Array((palette.filter { !ids.contains($0.id) } + libraryPalette(library)).suffix(100))
}
