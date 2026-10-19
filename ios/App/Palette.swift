// Your own parts, a port of src/lib/palette.js: save one from the canvas and it joins the palette under
// Mine, on this device only (UserDefaults key glyphic-palette, the same JSON shape as the web's localStorage).

import Foundation

let mineCategory = "Mine"
private let paletteLimit = 100

/// A palette part from a placed one. Its box style is baked into the characters, so it stamps as it looks.
func toPalettePart(_ el: Element, existing: [Preset] = []) -> Preset {
    let taken = Set(existing.map(\.label))
    var label = el.label, n = 2
    while taken.contains(label) { label = "\(el.label) \(n)"; n += 1 }
    let template = el.style.map { style in el.template.map { String($0.map { styleChar($0, style) }) } } ?? el.template
    return Preset(id: "mine-\(Int(Date().timeIntervalSince1970 * 1000))-\(existing.count)", label: label,
                  category: mineCategory, template: template)
}

/// Read the saved palette back, keeping only well-formed parts.
func parsePalette(_ raw: String) -> [Preset] {
    guard let data = raw.data(using: .utf8), let list = try? JSONSerialization.jsonObject(with: data) as? [Any] else { return [] }
    return list.compactMap { item -> Preset? in
        guard let p = item as? [String: Any], let id = p["id"] as? String, id.hasPrefix("mine-"),
              let label = p["label"] as? String, label.count <= 40,
              let template = p["template"] as? [String], !template.isEmpty, template.count <= 60,
              template.allSatisfy({ $0.count <= 200 }) else { return nil }
        return Preset(id: id, label: label, category: mineCategory, template: template,
                      symbol: (p["symbol"] as? String).flatMap { $0.count <= 64 ? $0 : nil })
    }.prefix(paletteLimit).map { $0 }
}

func serializePalette(_ palette: [Preset]) -> String {
    let list = palette.map { p -> [String: Any] in
        var d: [String: Any] = ["id": p.id, "label": p.label, "category": mineCategory, "template": p.template]
        if let symbol = p.symbol { d["symbol"] = symbol }
        return d
    }
    guard let data = try? JSONSerialization.data(withJSONObject: list) else { return "[]" }
    return String(decoding: data, as: UTF8.self)
}

func addToPalette(_ palette: [Preset], _ el: Element) -> [Preset] {
    Array((palette + [toPalettePart(el, existing: palette)]).suffix(paletteLimit))
}

/// A design system file (src/lib/system.js, made by `icelus system`): its parts join Mine, and Review checks
/// boxes against its style. Kept in UserDefaults under glyphbox-system, without its parts.
struct DesignSystem: Equatable {
    let name: String
    let style: String
    let parts: [(label: String, template: [String])]
    static func == (a: DesignSystem, b: DesignSystem) -> Bool {
        a.name == b.name && a.style == b.style && a.parts.map(\.label) == b.parts.map(\.label) && a.parts.map(\.template) == b.parts.map(\.template)
    }
}

func parseSystem(_ raw: String) -> DesignSystem? {
    guard let data = raw.data(using: .utf8), let d = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
          d["icelusSystem"] as? Int == 1, let list = d["parts"] as? [Any] else { return nil }
    let parts = list.compactMap { item -> (label: String, template: [String])? in
        guard let p = item as? [String: Any], let label = p["label"] as? String, label.count <= 40,
              let template = p["template"] as? [String], !template.isEmpty, template.count <= 60,
              template.allSatisfy({ $0.count <= 200 }) else { return nil }
        return (label, template)
    }.prefix(60)
    let style = d["style"] as? String
    return DesignSystem(name: String((d["name"] as? String ?? "Design system").prefix(40)),
                        style: style == "rounded" ? "rounded" : "single", parts: Array(parts))
}

func serializeSystem(_ system: DesignSystem) -> String {
    let d: [String: Any] = ["icelusSystem": 1, "name": system.name, "style": system.style, "parts": [Any]()]
    guard let data = try? JSONSerialization.data(withJSONObject: d) else { return "" }
    return String(decoding: data, as: UTF8.self)
}

/// Add a system's parts to the palette, replacing parts of the same name, so loading it twice changes nothing.
func withSystem(_ palette: [Preset], _ system: DesignSystem) -> [Preset] {
    let names = Set(system.parts.map(\.label))
    let parts = system.parts.map { Preset(id: "mine-sys-\($0.label)", label: $0.label, category: mineCategory, template: $0.template) }
    return Array((palette.filter { !names.contains($0.label) } + parts).suffix(paletteLimit))
}
