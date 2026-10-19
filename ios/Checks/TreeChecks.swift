func runTreeChecks() {
    let src = "- App\n  - Sign in\n    - Reset\n  - Home\n- Help"
    let els = parseSketch(src, startRow: 0, startCol: 0)
    func trimmed(_ t: [String]) -> [String] { t.map { $0.replacingOccurrences(of: #"\s+$"#, with: "", options: .regularExpression) } }
    check(els.count == 1 && els[0].presetId == "tree"
          && trimmed(els[0].template) == ["App", "├── Sign in", "│   └── Reset", "└── Home", "Help"],
          "trees: an indented list draws as a tree, several roots and all")
    check(toSketch(els).source == src, "trees: written back as the list")
    check(trimmed(updateElement(els, id: els[0].id, text: "- Docs\n\t- API")[0].template) == ["Docs", "└── API"], "trees: an edit redraws it")
    check(parseSketch("- Milk\n- Eggs").map(\.presetId) == ["text", "text"], "trees: a flat list stays text")
}
