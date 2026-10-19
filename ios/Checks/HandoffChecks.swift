func runHandoffChecks() {
    let screen = Element(id: "s", presetId: "screen", label: "Screen", template: screenFrame("Sign in", width: 30, height: 12),
                         width: 30, height: 12, col: 0, row: 0, text: "Sign in")
    var parts = parseSketch("\"Email\"\n[Sign in]", startRow: 2, startCol: 2)
    parts[1].note = "make it the main button"; parts[1].variant = "pressed"
    let md = handoff([screen] + parts, cols: 60, rows: 20, name: "Acme")
    check(md.hasPrefix("# Acme: build brief\n\nBuild these screens"), "handoff: opens with a build instruction")
    check(md.contains("## Sign in") && md.contains("┌─ Sign in") && md.contains("[Sign in]"), "handoff: draws each screen and its typed lines")
    check(md.contains("| Button | Sign in |") && md.contains("| pressed |") && md.contains("| Input | Email |"), "handoff: parts table with words and state")
    check(md.contains("make it the main button"), "handoff: carries notes")
    let json = md.components(separatedBy: "```json\n").last?.components(separatedBy: "\n```").first ?? ""
    check(parseProject(json)?.elements.count == 3, "handoff: the project file opens again")
}
