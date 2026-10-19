// What the editor does: taps, drags, edits, clipboard and persistence. Split from ContentView.swift to
// keep each file small; same type, so the state stays in one place.

import SwiftUI
import PhotosUI
import ImageIO
import UniformTypeIdentifiers

extension ContentView {
    /// What an action plays on: the picked parts, or the selected one.
    var playTargets: [String] { picked.isEmpty ? selectedId.map { [$0] } ?? [] : picked }

    // MARK: - Actions

    /// Erase removes the element under the tap, a palette pick places one, otherwise the tap selects.
    func tap(col: Int, row: Int) {
        let hit = elementAt(state.elements, col: col, row: row)
        if erasing {
            guard let hit else { return }
            state.pushHistory()
            state.elements = deleteElement(state.elements, id: hit.id)
        } else if let preset = selection {
            guard !["line", "brush", "gradient", "adjust", "marquee", "wand"].contains(preset.id) else { return } // these draw or pick by dragging
            state.pushHistory()
            var el = createElement(preset, col: col, row: row)
            if let t = screenTemplateSources.first(where: { "template-" + $0.name.lowercased().replacingOccurrences(of: " ", with: "-") == preset.id }) {
                // A screen template: the frame goes to the back, its parts on top.
                let placed = screenTemplate(t.name, t.source, col: col, row: row)
                state.elements = [placed[0]] + state.elements + placed.dropFirst()
                state.fitCanvas()
                selection = nil
                selectedId = placed[0].id
                persist()
                return
            }
            if preset.id == "banner" { el.text = "TITLE" }
            if preset.id == "screen" {
                // A screen goes to the back, so the parts inside it draw on top.
                el.text = "Screen"
                state.elements.insert(el, at: 0)
                state.fitCanvas()
            } else {
                state.elements.append(el)
            }
            selection = nil
            selectedId = el.id
            if ["text", "banner", "screen"].contains(preset.id) { editText(el) }
        } else if picking, let hit {
            // Picking parts to group: a tap adds a part or drops it again.
            if let i = picked.firstIndex(of: hit.id) { picked.remove(at: i) } else { picked.append(hit.id) }
            selectedId = picked.last ?? hit.id
            return
        } else {
            selectedId = hit?.id
            picked = []; picking = false
            return
        }
        persist()
    }

    func dragged(dCol: Int, dRow: Int, ended: Bool) {
        guard let id = selectedId else { return }
        guard ended else { drag = (dCol, dRow); return }
        drag = nil
        let moved = dragTarget(id, (dCol, dRow)).elements
        guard moved != state.elements else { return }
        state.pushHistory()
        state.elements = moved
        persist()
    }

    func resize(_ el: Element, dw: Int, dh: Int) {
        let next = updateElement(state.elements, id: el.id, width: el.width + dw, height: el.height + dh)
        guard next != state.elements else { return }
        state.pushHistory()
        state.elements = next
        persist()
    }

    func lined(start: (col: Int, row: Int), end: (col: Int, row: Int), ended: Bool) {
        guard ended else { lineDrag = (start, end); return }
        lineDrag = nil
        guard (start.col, start.row) != (end.col, end.row) else { return }
        state.pushHistory()
        state.elements.append(createLine(state.elements, start: start, end: end))
        selection = nil
        persist()
    }

    func editText(_ el: Element) {
        editDraft = el.text ?? (el.presetId == "table" ? tableText(el.template)
            : charts.contains(el.presetId) ? chartItems(el.template.joined(separator: " ")).map { String($0.value) }.joined(separator: " ")
            : el.template.joined(separator: "\n"))
        editingText = true
    }

    func saveText(_ text: String) {
        guard let id = selectedId else { return }
        let next = updateElement(state.elements, id: id, text: text)
        guard next != state.elements else { return }
        state.pushHistory()
        state.elements = next
        persist()
    }

    /// A table's next row or a list's next item, carrying its pattern on (Heal.swift).
    func expand(_ el: Element) {
        guard let next = expandElement(state.elements, id: el.id) else { return }
        state.pushHistory()
        state.elements = next
        persist()
    }

    func setCells(_ el: Element, _ cells: [[String]]) {
        state.pushHistory()
        state.elements = updateElement(state.elements, id: el.id, cells: cells)
        persist()
    }

    func flag(_ el: Element, hidden: Bool?, locked: Bool?) {
        state.pushHistory()
        state.elements = updateElement(state.elements, id: el.id, hidden: hidden, locked: locked)
        persist()
    }

    func step(_ el: Element, up: Bool) {
        state.pushHistory()
        state.elements = stepElement(state.elements, id: el.id, up: up)
        persist()
    }

    func startLesson() {
        tourSeen = true
        selection = nil
        lessonStart = lessonSnapshot(state.elements, copies: copies)
        lesson = 0
    }

    /// Move the tutorial on when its step is done. Placed: select the new button, so Edit text is right there.
    func advanceLesson() {
        guard let step = lesson, tutorialSteps[step] != "done" else { return }
        let name = tutorialSteps[step]
        guard stepDone(name, selected: selection, elements: state.elements, copies: copies, start: lessonStart) else { return }
        if name == "place", let id = newestButton(state.elements, start: lessonStart) { selection = nil; selectedId = id }
        lessonStart = lessonSnapshot(state.elements, copies: copies)
        lesson = step + 1
    }

    func setNote(_ el: Element, _ note: String) {
        state.pushHistory()
        state.elements = updateElement(state.elements, id: el.id, note: note)
        persist()
    }

    func makeVariations(_ el: Element) {
        let made = variations(state.elements, id: el.id, labels: ["stacked", "split", "dense"].map { String(localized: String.LocalizationValue($0)) })
        guard let first = made.ids.first else { return }
        state.pushHistory()
        state.elements = made.elements
        state.fitCanvas()
        selectedId = first
        persist()
    }

    func keep(_ el: Element) {
        state.pushHistory()
        state.elements = keepVariation(state.elements, id: el.id)
        persist()
    }

    func tweak(_ el: Element, spacing: Int? = nil, padding: Int? = nil, style: String? = nil) {
        state.pushHistory()
        state.elements = tweakScreen(state.elements, id: el.id, spacing: spacing, padding: padding, style: style)
        persist()
    }

    func setFill(_ el: Element, _ fill: Character) {
        state.pushHistory()
        state.elements = updateElement(state.elements, id: el.id, fill: fill)
        persist()
    }

    func setVariant(_ el: Element, _ variant: String) {
        state.pushHistory()
        state.elements = updateElement(state.elements, id: el.id, variant: variant)
        persist()
    }

    func symbol(_ el: Element, detach: Bool) {
        state.pushHistory()
        state.elements = detach ? detachSymbol(state.elements, id: el.id) : makeSymbol(state.elements, id: el.id, symbol: UUID().uuidString)
        persist()
    }

    func group() {
        state.pushHistory()
        state.elements = groupElements(state.elements, ids: picked)
        picked = []; picking = false
        persist()
    }

    func ungroup(_ el: Element) {
        state.pushHistory()
        state.elements = ungroupElements(state.elements, id: el.id)
        persist()
    }

    func highlight(_ el: Element, _ on: Bool) {
        state.pushHistory()
        state.elements = updateElement(state.elements, id: el.id, accent: on)
        persist()
    }

    func restyle(_ el: Element, _ style: String) {
        let next = updateElement(state.elements, id: el.id, style: style)
        guard next != state.elements else { return }
        state.pushHistory()
        state.elements = next
        persist()
    }

    /// A photo lands under whatever is already on the canvas, like a typed screen.
    func placeBelow(_ preset: Preset) {
        let below = state.elements.map { $0.row + $0.height }.max() ?? 0
        let el = createElement(preset, col: 2, row: below + 1)
        state.pushHistory()
        state.elements.append(el)
        selectedId = el.id
        persist()
    }

    /// A typed screen lands under whatever is already on the canvas.
    func drawSketch(_ source: String) {
        let below = state.elements.map { $0.row + $0.height }.max() ?? 0
        let sketch = parseSketch(source, startRow: below + 1)
        guard !sketch.isEmpty else { return }
        state.pushHistory()
        state.elements += sketch
        selection = nil
        persist()
    }

    func duplicate(_ el: Element) {
        let next = duplicateElement(state.elements, id: el.id, cols: state.cols, rows: state.rows)
        state.pushHistory()
        state.elements = next.elements
        state.fitCanvas()
        selectedId = next.id
        persist()
    }

    func reorder(_ el: Element, toBack: Bool) {
        let next = reorderElement(state.elements, id: el.id, toBack: toBack)
        guard next != state.elements else { return }
        state.pushHistory()
        state.elements = next
        persist()
    }

    func nudge(_ el: Element, dCol: Int, dRow: Int) {
        let next = nudgeElement(state.elements, id: el.id, dCol: dCol, dRow: dRow, cols: state.cols, rows: state.rows)
        guard next != state.elements else { return }
        state.pushHistory()
        state.elements = next
        persist()
    }

    /// Paste a text wireframe as parts, under whatever is already on the canvas.
    func pasteWireframe() {
        #if os(macOS)
        let text = NSPasteboard.general.string(forType: .string) ?? ""
        #else
        let text = UIPasteboard.general.string ?? ""
        #endif
        guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, text.count <= 200_000 else { return }
        if let system = parseSystem(text) { // a design system file: its parts join Mine
            mineRaw = serializePalette(withSystem(parsePalette(mineRaw), system))
            systemRaw = serializeSystem(system)
            return
        }
        let below = state.elements.map { $0.row + $0.height }.max().map { $0 + 1 } ?? 0
        let pasted = importText(text, startRow: below, startCol: state.elements.isEmpty ? 0 : 2)
        guard !pasted.isEmpty else { return }
        state.pushHistory()
        state.elements += pasted
        state.fitCanvas()
        persist()
    }

    func copyToClipboard(_ text: String) {
        copies += 1
        #if os(macOS)
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(text, forType: .string)
        #else
        UIPasteboard.general.string = text
        #endif
    }

    func delete(_ el: Element) {
        state.pushHistory()
        state.elements = deleteElement(state.elements, id: el.id)
        selectedId = nil
        persist()
    }

    func undo() {
        state.undo()
        persist()
    }

    func redo() {
        state.redo()
        persist()
    }

    func clear() {
        state.pushHistory()
        state.elements = []
        selectedId = nil
        persist()
    }

    // MARK: - Persistence

    func restore() {
        if let saved = Store.load() { state = saved }
    }

    // ponytail: write on every edit — the project is a few KB, so debouncing would be
    // machinery protecting nothing.
    func persist() {
        Store.save(state)
    }
}
