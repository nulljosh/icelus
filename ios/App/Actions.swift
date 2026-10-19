import Foundation

/// Actions (v41), the twin of src/lib/actions.js. Record a few steps, then replay them on any part. A step is
/// relative to the part it touched: move, set, text, resize or delete. Actions live in the project file.
let actionLimit = 20
let actionStepLimit = 50
private let actionTextLimit = 2000
/// The 16 terminal colors (terminalColors in Color.swift).
private let colorRange = 0..<16
let settableKeys = ["style", "ink", "paper", "blend", "variant", "accent", "hidden", "locked"]

enum ActionValue: Equatable { case none, text(String), number(Int), flag(Bool) }
struct ActionChange: Equatable { let key: String; let value: ActionValue }

enum ActionStep: Equatable {
    case move(dCol: Int, dRow: Int)
    case set([ActionChange])
    case text(String)
    case resize(width: Int, height: Int)
    case delete
}

struct CanvasAction: Equatable {
    var name: String
    var steps: [ActionStep]
}

private func value(_ el: Element, _ key: String) -> ActionValue {
    switch key {
    case "style": return el.style.map(ActionValue.text) ?? .none
    case "ink": return el.ink.map(ActionValue.number) ?? .none
    case "paper": return el.paper.map(ActionValue.number) ?? .none
    case "blend": return el.blend.map(ActionValue.text) ?? .none
    case "variant": return el.variant.map(ActionValue.text) ?? .none
    case "accent": return .flag(el.accent)
    case "hidden": return .flag(el.hidden)
    default: return .flag(el.locked)
    }
}

/// The step one undo entry makes, or nil when it is not about one part (a paste, a reorder, a screen tweak).
func actionStep(_ before: [Element], _ after: [Element]) -> ActionStep? {
    let step = stepName(before, after)
    guard let el = step.element, let was = before.first(where: { $0.id == el.id }) else { return nil }
    if step.kind == "delete" { return .delete }
    if step.kind == "move" { return .move(dCol: el.col - was.col, dRow: el.row - was.row) }
    guard step.kind == "edit" else { return nil }
    if let text = el.text, text != was.text { return .text(String(text.prefix(actionTextLimit))) }
    let changes = settableKeys.filter { value(was, $0) != value(el, $0) }.map { ActionChange(key: $0, value: value(el, $0)) }
    if !changes.isEmpty { return .set(changes) }
    if el.width != was.width || el.height != was.height { return .resize(width: el.width, height: el.height) }
    return nil
}

func cleanActionName(_ name: String, _ n: Int) -> String {
    let trimmed = String(name.trimmingCharacters(in: .whitespacesAndNewlines).prefix(60))
    return trimmed.isEmpty ? "Action \(n)" : trimmed
}

/// Steps from the undo entry `from` (the history count when recording started) to the canvas now.
/// ponytail: an index, so steps older than the 50 undo entries are gone; fine for "a few steps".
func recordAction(_ state: EditorState, from: Int, name: String = "", count: Int = 0) -> CanvasAction {
    let list = state.history + [state.elements]
    var steps: [ActionStep] = []
    for i in max(0, min(from, list.count - 1))..<(list.count - 1) {
        guard let step = actionStep(list[i], list[i + 1]) else { continue }
        // Arrow-key nudges in a row are one move.
        if case let .move(c, r) = step, case let .move(lc, lr)? = steps.last { steps[steps.count - 1] = .move(dCol: lc + c, dRow: lr + r) }
        else { steps.append(step) }
    }
    return CanvasAction(name: cleanActionName(name, count + 1), steps: Array(steps.prefix(actionStepLimit)))
}

func saveAction(_ actions: [CanvasAction], _ action: CanvasAction) -> [CanvasAction] {
    Array((actions + [action]).suffix(actionLimit))
}

private func apply(_ elements: [Element], id: String, _ c: ActionChange) -> [Element] {
    switch (c.key, c.value) {
    case ("style", let v): if case let .text(s) = v { return updateElement(elements, id: id, style: s) }; return updateElement(elements, id: id, style: "single")
    case ("ink", let v), ("paper", let v):
        // ponytail: set here, not via Color.swift, which the Watch and terminal apps do not build.
        let n: Int? = { if case let .number(n) = v, colorRange.contains(n) { return n }; return nil }()
        return elements.map { el in
            guard el.id == id else { return el }
            var next = el
            if c.key == "ink" { next.ink = n } else { next.paper = n }
            return next
        }
    case ("blend", let v): if case let .text(s) = v { return updateElement(elements, id: id, blend: s) }; return updateElement(elements, id: id, blend: "")
    case ("variant", let v): if case let .text(s) = v { return updateElement(elements, id: id, variant: s) }; return updateElement(elements, id: id, variant: "default")
    case ("accent", let v): return updateElement(elements, id: id, accent: v == .flag(true))
    case ("hidden", let v): return updateElement(elements, id: id, hidden: v == .flag(true))
    default: return updateElement(elements, id: id, locked: c.value == .flag(true))
    }
}

/// Every step on every part named, in order. A part an earlier step deleted is skipped.
func playAction(_ elements: [Element], _ steps: [ActionStep], ids: [String], cols: Int = defaultCols, rows: Int = defaultRows) -> [Element] {
    var out = elements
    for id in ids {
        for step in steps {
            guard out.contains(where: { $0.id == id }) else { break }
            switch step {
            case let .move(c, r): out = nudgeElement(out, id: id, dCol: c, dRow: r, cols: cols, rows: rows)
            case let .resize(w, h): out = updateElement(out, id: id, width: w, height: h)
            case let .text(t): out = updateElement(out, id: id, text: t)
            case .delete: out = deleteElement(out, id: id)
            case let .set(changes): for c in changes { out = apply(out, id: id, c) }
            }
        }
    }
    return out
}

// MARK: - The project file

func actionJSON(_ a: CanvasAction) -> [String: Any] {
    ["name": a.name, "steps": a.steps.map { step -> [String: Any] in
        switch step {
        case let .move(c, r): return ["op": "move", "dCol": c, "dRow": r]
        case let .resize(w, h): return ["op": "resize", "width": w, "height": h]
        case let .text(t): return ["op": "text", "text": t]
        case .delete: return ["op": "delete"]
        case let .set(changes):
            return ["op": "set", "changes": Dictionary(uniqueKeysWithValues: changes.map { c -> (String, Any) in
                switch c.value {
                case .none: return (c.key, NSNull())
                case let .text(s): return (c.key, s)
                case let .number(n): return (c.key, n)
                case let .flag(b): return (c.key, b)
                }
            })]
        }
    }]
}

/// Whatever came from a file or a caller: unknown steps and bad values dropped, sizes capped.
func cleanStep(_ value: Any?) -> ActionStep? {
    guard let s = value as? [String: Any], let op = s["op"] as? String else { return nil }
    func whole(_ k: String, _ lo: Int, _ hi: Int) -> Int? {
        guard let n = s[k] as? NSNumber, CFGetTypeID(n) != CFBooleanGetTypeID(), n.doubleValue == n.doubleValue.rounded() else { return nil }
        return (lo...hi).contains(n.intValue) ? n.intValue : nil
    }
    switch op {
    case "delete": return .delete
    case "move": if let c = whole("dCol", -500, 500), let r = whole("dRow", -500, 500) { return .move(dCol: c, dRow: r) }
    case "resize": if let w = whole("width", 1, 500), let h = whole("height", 1, 500) { return .resize(width: w, height: h) }
    case "text": if let t = s["text"] as? String { return .text(String(t.prefix(actionTextLimit))) }
    case "set":
        guard let raw = s["changes"] as? [String: Any] else { return nil }
        let changes = settableKeys.compactMap { key -> ActionChange? in
            guard let v = raw[key] else { return nil }
            if v is NSNull { return ActionChange(key: key, value: ["accent", "hidden", "locked"].contains(key) ? .flag(false) : .none) }
            if let n = v as? NSNumber, CFGetTypeID(n) == CFBooleanGetTypeID() {
                return ["accent", "hidden", "locked"].contains(key) ? ActionChange(key: key, value: .flag(n.boolValue)) : nil
            }
            if let n = v as? Int, key == "ink" || key == "paper" { return colorRange.contains(n) ? ActionChange(key: key, value: .number(n)) : nil }
            guard let t = v as? String else { return nil }
            let ok = key == "style" ? boxStyles.contains(t) : key == "blend" ? blends.contains(t) : key == "variant" ? variants.contains(t) : false
            return ok ? ActionChange(key: key, value: .text(t)) : nil
        }
        return changes.isEmpty ? nil : .set(changes)
    default: return nil
    }
    return nil
}

func parseActions(_ value: Any?) -> [CanvasAction] {
    let list = (value as? [Any] ?? []).compactMap { $0 as? [String: Any] }.filter { $0["steps"] is [Any] }.suffix(actionLimit)
    return list.enumerated().map { i, a in
        CanvasAction(name: cleanActionName(a["name"] as? String ?? "", i + 1),
                     steps: ((a["steps"] as? [Any]) ?? []).prefix(actionStepLimit).compactMap(cleanStep))
    }
}
