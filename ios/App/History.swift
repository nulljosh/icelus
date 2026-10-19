import Foundation

/// History (v40), the twin of src/lib/history.js. Each undo step is named from what changed between two
/// element lists, the History sheet jumps to any step, and named snapshots are kept in the project file.
let snapshotLimit = 20

struct CanvasSnapshot: Equatable {
    var name: String
    var elements: [Element]
}

/// kind is start, add, delete, move, edit, reorder, replace, clear or change; element is the part it is about.
struct Step: Equatable {
    let kind: String
    let element: Element?
    let count: Int
}

func stepName(_ before: [Element], _ after: [Element]) -> Step {
    let was = Dictionary(before.map { ($0.id, $0) }, uniquingKeysWith: { first, _ in first })
    let now = Set(after.map(\.id))
    let added = after.filter { was[$0.id] == nil }
    let removed = before.filter { !now.contains($0.id) }
    let changed = after.filter { el in was[el.id].map { $0 != el } ?? false }
    func about(_ kind: String, _ list: [Element]) -> Step { Step(kind: kind, element: list.first, count: list.count) }
    if after.isEmpty && !before.isEmpty { return about("clear", before) }
    if !added.isEmpty && removed.isEmpty && changed.isEmpty { return about("add", added) }
    if !removed.isEmpty && added.isEmpty && changed.isEmpty { return about("delete", removed) }
    if !changed.isEmpty && added.isEmpty && removed.isEmpty {
        // Lines pinned to a moved part change too; name the step after the part, not its lines.
        let parts = changed.filter { $0.from == nil }
        let focus = parts.isEmpty ? changed : parts
        let moved = focus.allSatisfy { el in
            guard var old = was[el.id] else { return false }
            old.col = el.col
            old.row = el.row
            return old == el
        }
        return about(moved ? "move" : "edit", focus)
    }
    if changed.isEmpty && removed.count == before.count && added.count == after.count && !after.isEmpty { return about("replace", after) }
    if added.isEmpty && removed.isEmpty { return about(before.map(\.id) == after.map(\.id) ? "edit" : "reorder", []) }
    return Step(kind: "change", element: nil, count: added.count + removed.count + changed.count)
}

extension EditorState {
    /// Oldest kept step first; the one you are on is at index history.count, redo steps follow it.
    var timeline: [Step] {
        let steps = history + [elements] + future
        return steps.indices.map { $0 == 0 ? Step(kind: "start", element: nil, count: 0) : stepName(steps[$0 - 1], steps[$0]) }
    }

    /// Jumping is undo or redo repeated, so the steps after the target stay redoable.
    mutating func goToStep(_ index: Int) {
        while history.count > max(0, index) { undo() }
        while history.count < index && canRedo { redo() }
    }
}

func cleanSnapshotName(_ name: String, _ n: Int) -> String {
    let trimmed = String(name.trimmingCharacters(in: .whitespacesAndNewlines).prefix(60))
    return trimmed.isEmpty ? "Snapshot \(n)" : trimmed
}

func takeSnapshot(_ snapshots: [CanvasSnapshot], _ elements: [Element], name: String = "") -> [CanvasSnapshot] {
    Array((snapshots + [CanvasSnapshot(name: cleanSnapshotName(name, snapshots.count + 1), elements: elements)]).suffix(snapshotLimit))
}

/// Each snapshot is read like a project of its own, so it gets the same cleaning and its own fresh ids.
func parseSnapshots(_ value: Any?) -> [CanvasSnapshot] {
    let list = (value as? [Any] ?? []).compactMap { $0 as? [String: Any] }.filter { $0["elements"] is [Any] }.suffix(snapshotLimit)
    return list.enumerated().map { i, snap in
        let data = try? JSONSerialization.data(withJSONObject: ["elements": snap["elements"] ?? []])
        let elements = data.flatMap { String(data: $0, encoding: .utf8) }.flatMap(parseProject)?.elements ?? []
        return CanvasSnapshot(name: cleanSnapshotName(snap["name"] as? String ?? "", i + 1), elements: elements)
    }
}
