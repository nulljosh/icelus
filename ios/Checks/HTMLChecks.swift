func runHTMLChecks() {
    let html = toHTML(parseSketch("# Hi\n\"Email\"  [Sign in]\n[x] Remember me\n[v Country]\n| Name | Plan |\n| Ada | Pro |", startRow: 0), cols: 60, rows: 20)
    check(html.contains("<h1>Hi</h1>") && html.contains("<input placeholder=\"Email\">") && html.contains("<button>Sign in</button>"),
          "html: heading, input and button become real elements")
    check(html.contains("<input type=\"checkbox\" checked> Remember me") && html.contains("<select><option>Country</option></select>"),
          "html: checkbox and select")
    check(html.contains("<thead><tr><th>Name</th><th>Plan</th></tr></thead><tbody><tr><td>Ada</td><td>Pro</td></tr>"), "html: a table")
    check(html.contains("left:2ch;top:calc(4 * var(--row))"), "html: parts keep their grid position")
    let bad = Element(id: "x", presetId: "text", label: "Text", template: ["<script>alert(1)</script>"], width: 25, height: 1, col: 0, row: 0)
    var screen = bad; screen.presetId = "screen"; screen.text = "\"><img src=x onerror=alert(1)>"
    let escaped = toHTML([bad, screen], cols: 30, rows: 2, title: "</title><script>")
    check(!escaped.contains("<script>") && !escaped.contains("<img") && escaped.contains("&lt;script&gt;"), "html: everything is escaped")
}
