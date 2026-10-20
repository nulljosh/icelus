func runAccessChecks() {
    func part(_ id: String, _ col: Int, _ row: Int) -> Element { createElement(presets.first { $0.id == id }!, col: col, row: row) }
    func say(_ text: String, _ col: Int, _ row: Int) -> Element {
        Element(id: "t\(col)-\(row)", presetId: "text", label: "Text", template: [text], width: text.count, height: 1, col: col, row: row)
    }
    func rules(_ els: [Element]) -> [String] { accessIssues(els).map { $0.rule + ($0.kind.map { ":\($0)" } ?? "") } }
    let top = part("button", 2, 2), bottom = part("button", 2, 6), label = say("Done", 2, 10)
    let els = [bottom, label, top]
    check(rules(els) == ["focus_order"], "access: controls out of reading order")
    let fixed = fixFocusOrder(els)
    check(fixed.map(\.id) == [top.id, label.id, bottom.id] && rules(fixed).isEmpty, "access: one tap puts them in reading order")
    let left = Element(id: "L", presetId: "screen", label: "Screen", template: screenFrame("Screen", width: 40, height: 20), width: 40, height: 20, col: 0, row: 0)
    let right = Element(id: "R", presetId: "screen", label: "Screen", template: screenFrame("Screen", width: 40, height: 20), width: 40, height: 20, col: 50, row: 0)
    let a = part("button", 2, 6), b = part("button", 52, 2)
    check(rules([left, right, a, b]).isEmpty && rules([left, right, b, a]) == ["focus_order"], "access: reads screen by screen")
    let field = part("input", 10, 5)
    check(rules([field]) == ["no_label"] && rules([say("Email", 2, 5), field]).isEmpty && rules([say("Email", 10, 3), field]).isEmpty
          && rules([say("Email", 10, 0), field]) == ["no_label"], "access: a field needs a label")
    var tiny = part("button", 2, 2); tiny.template = ["[X]"]; tiny.width = 3
    let a2 = part("button", 2, 2)
    check(rules([tiny]) == ["small_target:narrow"] && rules([a2, part("button", 8, 2)]) == ["small_target:crowded"]
          && rules([a2, part("button", 9, 2)]).isEmpty && rules([a2, part("button", 2, 3)]) == ["small_target:crowded"], "access: room to tap")
    check(critique([part("button", 2, 6), part("button", 2, 2)], cols: 40, rows: 20).contains { $0.rule == "focus_order" }, "access: shows in Review")
}
