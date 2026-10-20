// The layout as code that compiles, a port of src/lib/code.js: a React component with plain CSS, or a
// SwiftUI view. Each part becomes the control it stands for, placed on the character grid. Every string goes
// in as a quoted literal, never as markup or interpolation, so nothing a person typed can break the file.

import Foundation

enum CodePart: Equatable {
    case screen(String), button(String), input(String), checkbox(Bool, String), radio(Bool, String), select(String)
    case divider, heading(String), text([String]), table([String], [[String]]), pre([String])
}

private func match(_ s: String, _ pattern: String) -> [String]? {
    guard let re = try? NSRegularExpression(pattern: pattern),
          let m = re.firstMatch(in: s, range: NSRange(s.startIndex..., in: s)) else { return nil }
    return (1..<m.numberOfRanges).map { Range(m.range(at: $0), in: s).map { String(s[$0]) } ?? "" }
}

/// What a part is, read from its characters. Unknown parts are .pre with their lines.
func readPart(_ el: Element) -> CodePart {
    let t = el.template.first ?? ""
    switch el.presetId {
    case "screen": return .screen(el.text ?? "Screen")
    case "button": return .button(match(t, #"^\[\s*(.*?)\s*\]$"#)?[0] ?? t)
    case "input": return .input(match(t, #"^\[\s*(.*?)_*\s*\]$"#)?[0] ?? "")
    case "checkbox": if let m = match(t, #"^\[(.)\]\s*(.*)$"#) { return .checkbox(m[0] != " ", m[1]) }
    case "radio": if let m = match(t, #"^\((.)\)\s*(.*)$"#) { return .radio(m[0] != " ", m[1]) }
    case "select": return .select(match(t, #"^\[▾\s*(.*?)\s*\]$"#)?[0] ?? "")
    case "divider": return .divider
    case "banner": return .heading(el.text ?? el.label)
    case "text": return .text(el.template)
    case "table":
        let rows = el.template.filter { $0.contains("│") }.map {
            $0.split(separator: "│", omittingEmptySubsequences: false).dropFirst().dropLast().map { $0.trimmingCharacters(in: .whitespaces) }
        }
        if let head = rows.first { return .table(head, Array(rows.dropFirst())) }
    default: break
    }
    return .pre(el.template)
}

/// A component name from a project name: PascalCase letters and digits, never starting with a digit.
func componentName(_ name: String) -> String {
    let kept = name.decomposedStringWithCompatibilityMapping.unicodeScalars.map {
        $0.isASCII && CharacterSet.alphanumerics.contains($0) ? Character($0) : " "
    }
    let words = String(kept).split(separator: " ")
    let id = String(words.map { $0.prefix(1).uppercased() + $0.dropFirst() }.joined().prefix(60))
    return id.isEmpty ? "Layout" : id.first!.isNumber ? "Layout\(id)" : id
}

private func js(_ s: String) -> String {
    let data = (try? JSONSerialization.data(withJSONObject: s, options: [.fragmentsAllowed, .withoutEscapingSlashes])) ?? Data()
    return String(decoding: data, as: UTF8.self)
}
private func n(_ v: Int) -> Int { max(0, v) }

private func jsx(_ p: CodePart) -> String {
    switch p {
    case .button(let label): return "<button type=\"button\">{\(js(label))}</button>"
    case .input(let placeholder): return "<input placeholder={\(js(placeholder))} />"
    case .checkbox(let on, let label): return "<label><input type=\"checkbox\" defaultChecked={\(on)} /> {\(js(label))}</label>"
    case .radio(let on, let label): return "<label><input type=\"radio\" defaultChecked={\(on)} /> {\(js(label))}</label>"
    case .select(let value): return "<select><option>{\(js(value))}</option></select>"
    case .divider: return "<hr />"
    case .heading(let text): return "<h1>{\(js(text))}</h1>"
    case .text(let lines): return "<p>{\(js(lines.joined(separator: "\n")))}</p>"
    case .table(let head, let body):
        return "<table><thead><tr>" + head.map { "<th>{\(js($0))}</th>" }.joined() + "</tr></thead>"
            + "<tbody>" + body.map { "<tr>" + $0.map { "<td>{\(js($0))}</td>" }.joined() + "</tr>" }.joined() + "</tbody></table>"
    case .pre(let lines): return "<pre>{\(js(lines.joined(separator: "\n")))}</pre>"
    case .screen: return ""
    }
}

private func css(_ cols: Int) -> String {
    """
    .icelus { --row: 1.5em; position: relative; font: 14px/1.5 ui-monospace, "SF Mono", Menlo, monospace; width: \(cols)ch; }
    .icelus .part, .icelus .screen { position: absolute; box-sizing: border-box; }
    .icelus .accent { color: #1D4ED8; }
    .icelus .screen { border: 1px solid currentColor; border-radius: 8px; }
    .icelus .screen h2 { margin: 0; padding: 0 1ch; font-size: inherit; }
    .icelus pre, .icelus p, .icelus h1 { margin: 0; font: inherit; white-space: pre; }
    .icelus h1 { font-weight: 700; font-size: 2em; line-height: calc(3 * var(--row) / 2); }
    .icelus input, .icelus select, .icelus button { font: inherit; width: 100%; box-sizing: border-box; }
    .icelus label input { width: auto; }
    .icelus hr { margin: calc(var(--row) / 2) 0 0; }
    .icelus table { border-collapse: collapse; width: 100%; }
    .icelus th, .icelus td { border: 1px solid currentColor; padding: 0 1ch; text-align: left; }
    """
}

/// One .jsx file: a React component that renders the layout, its plain CSS in a <style> beside it.
/// One part on its own, for Inspect (Inspect.swift): the JSX or SwiftUI that toReact and toSwiftUI place.
func partSnippet(_ el: Element, format: String = "react") -> String {
    let p = readPart(el)
    if format == "swiftui" {
        if case .screen(let title) = p { return "RoundedRectangle(cornerRadius: 8).stroke() // \(title)" }
        return swiftUI(p)
    }
    if case .screen(let title) = p { return "<section className=\"screen\" aria-label={\(js(title))}><h2>{\(js(title))}</h2></section>" }
    return jsx(p)
}

func toReact(_ elements: [Element], cols: Int, rows: Int, name: String = "Layout") -> String {
    let id = componentName(name)
    let parts = elements.map { el -> String in
        let p = readPart(el)
        let box = "style={{ left: '\(n(el.col))ch', top: 'calc(\(n(el.row)) * var(--row))', width: '\(n(el.width))ch', height: 'calc(\(n(el.height)) * var(--row))' }}"
        if case .screen(let title) = p { return "      <section className=\"screen\" aria-label={\(js(title))} \(box)><h2>{\(js(title))}</h2></section>" }
        return "      <div className={\(js("part part-\(el.presetId)\(el.accent ? " accent" : "")"))} \(box)>\(jsx(p))</div>"
    }
    return """
    // \(id), drawn in Icelus. A React component with plain CSS; restyle it as you build.
    const css = \(js(css(n(cols))));

    export default function \(id)() {
      return (
        <main className="icelus" style={{ height: 'calc(\(n(rows)) * var(--row))' }}>
          <style>{css}</style>
    \(parts.joined(separator: "\n"))
        </main>
      );
    }

    """
}

private func sw(_ s: String) -> String {
    "\"" + s.replacingOccurrences(of: "\\", with: "\\\\").replacingOccurrences(of: "\"", with: "\\\"")
        .replacingOccurrences(of: "\n", with: "\\n").replacingOccurrences(of: "\r", with: "\\r")
        .replacingOccurrences(of: "\t", with: "\\t") + "\""
}

private func swiftUI(_ p: CodePart) -> String {
    switch p {
    case .button(let label): return "Button {} label: { Text(verbatim: \(sw(label))) }"
    case .input(let placeholder): return "TextField(\(sw(placeholder)) as String, text: .constant(\"\"))"
    case .checkbox(let on, let label): return "Toggle(isOn: .constant(\(on))) { Text(verbatim: \(sw(label))) }"
    case .radio(let on, let label): return "Label { Text(verbatim: \(sw(label))) } icon: { Image(systemName: \"\(on ? "largecircle.fill.circle" : "circle")\") }"
    case .select(let value): return "Menu(\(sw(value)) as String) {}"
    case .divider: return "Divider()"
    case .heading(let text): return "Text(verbatim: \(sw(text))).font(.largeTitle.bold())"
    case .table(let head, let body):
        let rows = ([head] + body).enumerated().map { i, r in
            "GridRow { " + r.map { "Text(verbatim: \(sw($0)))\(i == 0 ? ".bold()" : "")" }.joined(separator: "; ") + " }"
        }
        return "Grid(alignment: .leading) { " + rows.joined(separator: "; ") + " }"
    case .text(let lines), .pre(let lines): return "Text(verbatim: \(sw(lines.joined(separator: "\n"))))"
    case .screen: return ""
    }
}

/// One .swift file: a SwiftUI view that places every part on the grid. Needs iOS 16 or macOS 13 (Grid).
func toSwiftUI(_ elements: [Element], cols: Int, rows: Int, name: String = "Layout") -> String {
    let id = "\(componentName(name))View"
    let parts = elements.map { el -> String in
        let p = readPart(el)
        var view: String
        if case .screen(let title) = p {
            view = "RoundedRectangle(cornerRadius: 8).stroke().overlay(alignment: .topLeading) { Text(verbatim: \(sw(title))).padding(.horizontal, ch) }"
        } else {
            view = swiftUI(p) + (el.accent ? ".foregroundStyle(Color(red: 0.11, green: 0.31, blue: 0.85))" : "")
        }
        return "            \(view)\n                .frame(width: \(n(el.width)) * ch, height: \(n(el.height)) * row, alignment: .topLeading)\n                .offset(x: \(n(el.col)) * ch, y: \(n(el.row)) * row)"
    }
    return """
    // \(id), drawn in Icelus. A SwiftUI view on the character grid; restyle it as you build.
    import SwiftUI

    struct \(id): View {
        let ch: CGFloat = 8.4
        let row: CGFloat = 21

        var body: some View {
            ZStack(alignment: .topLeading) {
    \(parts.joined(separator: "\n"))
            }
            .font(.system(size: 14, design: .monospaced))
            .frame(width: \(n(cols)) * ch, height: \(n(rows)) * row, alignment: .topLeading)
        }
    }

    """
}
