// The first-run tutorial, a port of src/lib/tutorial.js: five small steps that wait for you to do each one,
// then move on by themselves. Pick Button, place it, change its words, drag it, copy the screen.

let tutorialSteps = ["pick", "place", "edit", "move", "copy", "done"]

struct LessonSnapshot {
    var copies = 0
    var buttons: [(id: String, col: Int, row: Int, text: String)] = []
}

func lessonSnapshot(_ elements: [Element], copies: Int = 0) -> LessonSnapshot {
    LessonSnapshot(copies: copies, buttons: elements.filter { $0.presetId == "button" }
        .map { (id: $0.id, col: $0.col, row: $0.row, text: $0.template.joined(separator: "\n")) })
}

func stepDone(_ step: String, selected: Preset?, elements: [Element], copies: Int, start: LessonSnapshot) -> Bool {
    let now = lessonSnapshot(elements, copies: copies).buttons
    func was(_ id: String) -> (id: String, col: Int, row: Int, text: String)? { start.buttons.first { $0.id == id } }
    switch step {
    case "pick": return selected?.id == "button"
    case "place": return now.count > start.buttons.count
    case "edit": return now.contains { b in was(b.id).map { $0.text != b.text } ?? false }
    case "move": return now.contains { b in was(b.id).map { $0.col != b.col || $0.row != b.row } ?? false }
    case "copy": return copies > start.copies
    default: return false
    }
}

/// The button just placed, so the next step can select it for you.
func newestButton(_ elements: [Element], start: LessonSnapshot) -> String? {
    elements.last { el in el.presetId == "button" && !start.buttons.contains { $0.id == el.id } }?.id
}
