// The layout as HTML for a developer, a port of src/lib/html.js: each part becomes the real element it
// stands for, placed on the same character grid. Anything without an HTML twin stays a <pre>. All escaped.

import Foundation

private func esc(_ s: String) -> String {
    s.replacingOccurrences(of: "&", with: "&amp;").replacingOccurrences(of: "<", with: "&lt;")
        .replacingOccurrences(of: ">", with: "&gt;").replacingOccurrences(of: "\"", with: "&quot;")
        .replacingOccurrences(of: "'", with: "&#39;")
}

private func groups(_ s: String, _ pattern: String) -> [String]? {
    guard let re = try? NSRegularExpression(pattern: pattern),
          let m = re.firstMatch(in: s, range: NSRange(s.startIndex..., in: s)) else { return nil }
    return (1..<m.numberOfRanges).map { Range(m.range(at: $0), in: s).map { String(s[$0]) } ?? "" }
}

private func inner(_ el: Element) -> String {
    let t = el.template.first ?? ""
    let pre = "<pre>" + el.template.map(esc).joined(separator: "\n") + "</pre>"
    switch el.presetId {
    case "button": return "<button>\(esc(groups(t, #"^\[\s*(.*?)\s*\]$"#)?[0] ?? t))</button>"
    case "input": return "<input placeholder=\"\(esc(groups(t, #"^\[\s*(.*?)_*\s*\]$"#)?[0] ?? ""))\">"
    case "checkbox", "radio":
        let kind = el.presetId == "checkbox" ? "checkbox" : "radio"
        guard let m = groups(t, el.presetId == "checkbox" ? #"^\[(.)\]\s*(.*)$"# : #"^\((.)\)\s*(.*)$"#) else { return pre }
        return "<label><input type=\"\(kind)\"\(m[0] == " " ? "" : " checked")> \(esc(m[1]))</label>"
    case "select": return "<select><option>\(esc(groups(t, #"^\[▾\s*(.*?)\s*\]$"#)?[0] ?? ""))</option></select>"
    case "divider": return "<hr>"
    case "banner": return "<h1>\(esc(el.text ?? el.label))</h1>"
    case "text": return "<p>" + el.template.map(esc).joined(separator: "<br>") + "</p>"
    case "table":
        let rows = el.template.filter { $0.contains("│") }.map {
            $0.split(separator: "│", omittingEmptySubsequences: false).dropFirst().dropLast().map { esc($0.trimmingCharacters(in: .whitespaces)) }
        }
        guard let head = rows.first else { return pre }
        let body = rows.dropFirst().map { "<tr>" + $0.map { "<td>\($0)</td>" }.joined() + "</tr>" }.joined()
        return "<table><thead><tr>" + head.map { "<th>\($0)</th>" }.joined() + "</tr></thead><tbody>\(body)</tbody></table>"
    default: return pre
    }
}

func toHTML(_ elements: [Element], cols: Int, rows: Int, title: String = "Icelus layout") -> String {
    let parts = elements.map { el -> String in
        let box = "style=\"left:\(el.col)ch;top:calc(\(el.row) * var(--row));width:\(el.width)ch;height:calc(\(el.height) * var(--row))\""
        if el.presetId == "screen" {
            let name = esc(el.text ?? "Screen")
            return "<section class=\"screen\" aria-label=\"\(name)\" \(box)><h2>\(name)</h2></section>"
        }
        return "<div class=\"part part-\(esc(el.presetId))\(el.accent ? " accent" : "")\" \(box)>\(inner(el))</div>"
    }
    return """
    <!doctype html>
    <html lang="en">
    <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>\(esc(title))</title>
    <style>
      :root { --row: 1.5em; font: 14px/1.5 ui-monospace, "SF Mono", Menlo, monospace; }
      body { margin: 0; padding: 16px; }
      .layout { position: relative; width: \(cols)ch; height: calc(\(rows) * var(--row)); }
      .part, .screen { position: absolute; box-sizing: border-box; }
      .accent { color: #1D4ED8; }
      .screen { border: 1px solid currentColor; border-radius: 8px; }
      .screen h2 { margin: 0; padding: 0 1ch; font-size: inherit; }
      pre, p, h1 { margin: 0; font: inherit; }
      h1 { font-weight: 700; font-size: 2em; line-height: calc(3 * var(--row) / 2); }
      input, select, button { font: inherit; width: 100%; box-sizing: border-box; }
      label input { width: auto; }
      hr { margin: calc(var(--row) / 2) 0 0; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid currentColor; padding: 0 1ch; text-align: left; }
    </style>
    </head>
    <body>
    <main class="layout">
    \(parts.joined(separator: "\n"))
    </main>
    </body>
    </html>

    """
}
