import Foundation

func runActionChecks() {
    func part(_ id: String, col: Int = 0, row: Int = 0) -> Element {
        Element(id: id, presetId: "custom", label: id, template: ["[\(id)]"], width: id.count + 2, height: 1, col: col, row: row)
    }
    let a = part("a"), b = part("b", col: 20, row: 4)
    check(actionStep([a], moveElement([a], id: "a", col: 3, row: 2)) == .move(dCol: 3, dRow: 2), "actions: a move is relative")
    check(actionStep([a], updateElement([a], id: "a", style: "double")) == .set([ActionChange(key: "style", value: .text("double"))]), "actions: a style is a set")
    check(actionStep([a], updateElement([a], id: "a", accent: true)) == .set([ActionChange(key: "accent", value: .flag(true))]), "actions: accent")
    check(actionStep([a, b], [a]) == .delete, "actions: delete")
    check(actionStep([a], [a, b]) == nil && actionStep([a, b], [b, a]) == nil, "actions: adds and reorders are not steps")

    var s = EditorState(cols: 60, rows: 20)
    s.elements = [a, b]
    let from = s.history.count
    s.pushHistory(); s.elements = moveElement(s.elements, id: "a", col: 1, row: 0)
    s.pushHistory(); s.elements = moveElement(s.elements, id: "a", col: 2, row: 1)
    s.pushHistory(); s.elements = updateElement(s.elements, id: "a", style: "heavy")
    let act = recordAction(s, from: from, name: " Nudge and bold ")
    check(act == CanvasAction(name: "Nudge and bold", steps: [.move(dCol: 2, dRow: 1), .set([ActionChange(key: "style", value: .text("heavy"))])]), "actions: nudges in a row merge into one move")
    let out = playAction(s.elements, act.steps, ids: ["b"], cols: 60, rows: 20)
    let c = out.first { $0.id == "b" }
    check(c?.col == 22 && c?.row == 5 && c?.style == "heavy", "actions: replay on another part")
    check(recordAction(s, from: s.history.count).steps.isEmpty && recordAction(s, from: -9, count: 2).name == "Action 3", "actions: empty and numbered")

    check(terminalColors.count == 16 && playAction([b], [.set([ActionChange(key: "ink", value: .number(3))])], ids: ["b"])[0].ink == 3, "actions: ink sets and the color range matches")
    let far = playAction([b], [.move(dCol: 900, dRow: 900)], ids: ["b"], cols: 40, rows: 20)[0]
    check(far.col + far.width <= 40, "actions: a move stays on the canvas")
    check(playAction([b], [.delete, .move(dCol: 1, dRow: 0)], ids: ["b"]).isEmpty, "actions: a deleted part stops its steps")
    check(playAction([b], [.move(dCol: 1, dRow: 0)], ids: ["missing"]) == [b], "actions: a missing part changes nothing")

    let bad = parseActions([NSNull(), "x", ["name": 5, "steps": [["op": "move", "dCol": 1.5, "dRow": 0], ["op": "set", "changes": ["style": "nope", "ink": 3, "template": ["x"]]], ["op": "eval"], ["op": "text", "text": String(repeating: "y", count: 5000)]]] as [String: Any]] as [Any])
    check(bad == [CanvasAction(name: "Action 1", steps: [.set([ActionChange(key: "ink", value: .number(3))]), .text(String(repeating: "y", count: 2000))])], "actions: bad steps are dropped")
    check(parseActions([["name": "big", "steps": Array(repeating: ["op": "delete"], count: 500)]])[0].steps.count == actionStepLimit, "actions: steps stop at the limit")
    var many: [CanvasAction] = []
    for i in 0..<(actionLimit + 2) { many = saveAction(many, CanvasAction(name: "a\(i)", steps: [])) }
    check(many.count == actionLimit, "actions: actions stop at the limit")

    var saved = EditorState()
    saved.elements = [a]
    saved.actions = [CanvasAction(name: "One", steps: [.delete, .set([ActionChange(key: "blend", value: .none), ActionChange(key: "accent", value: .flag(false))])])]
    check(parseProject(serializeProject(saved))?.actions == saved.actions, "actions: survive a save")
    check(!serializeProject(EditorState()).contains("actions"), "actions: none, no key")
    let web = parseProject(#"{"elements":[],"actions":[{"name":"Web","steps":[{"op":"set","changes":{"accent":null,"style":"double"}},{"op":"move","dCol":2,"dRow":-1}]}]}"#)
    check(web?.actions == [CanvasAction(name: "Web", steps: [.set([ActionChange(key: "style", value: .text("double")), ActionChange(key: "accent", value: .flag(false))]), .move(dCol: 2, dRow: -1)])], "actions: a web file opens")
}
