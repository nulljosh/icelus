import SwiftUI

extension ContentView {
    /// The elements with the stroke in progress applied, for the live preview.
    var strokeResult: [Element] {
        if selection?.id == "adjust" { return state.elements } // the box is tinted, the layer lands on release
        if pickingCells {
            guard let move = cellMove else { return state.elements }
            return moveCells(state.elements, cellSel, dCol: move.0, dRow: move.1, cols: state.cols, rows: state.rows)
        }
        if selection?.id == "gradient", let a = stroke.first, let b = stroke.last {
            return paintMarks(state.elements, gradientMarks(a, b, mode: gradientMode, cols: state.cols, rows: state.rows))
        }
        let cells = strokeCells(stroke, size: brushSize, cols: state.cols, rows: state.rows)
        return erasing ? erase(state.elements, cells: cells) : paint(state.elements, cells: cells, char: brushMark)
    }

    /// A drag with the brush or eraser: collect the cells, then land the stroke as one step of undo.
    func stroked(start: (col: Int, row: Int), cell: (col: Int, row: Int), ended: Bool) {
        if stroke.first.map({ $0 != (start.col, start.row) }) ?? true { stroke = [(start.col, start.row)] } // a new stroke
        if stroke.last.map({ $0 != (cell.col, cell.row) }) ?? true { stroke.append((cell.col, cell.row)) }
        guard ended else { return }
        if selection?.id == "adjust" {
            // A dragged box becomes an adjustment layer on top, selected so its kind is right there.
            let (a, b) = (stroke.first!, stroke.last!)
            let layer = adjustLayer(col: min(a.0, b.0), row: min(a.1, b.1), width: abs(a.0 - b.0) + 1, height: abs(a.1 - b.1) + 1, adjust: adjustKind)
            stroke = []
            state.pushHistory(); state.elements.append(layer); persist()
            selection = nil; selectedId = layer.id
            return
        }
        if pickingCells && cellMove == nil {
            // A marquee drag picks its rectangle; a tap clears it, or with the wand picks the run under it.
            let (a, b) = (stroke.first!, stroke.last!)
            cellSel = selection?.id == "wand" ? (a == b ? wand(state.grid, col: a.0, row: a.1) : cellSel)
                : (a == b ? [] : marquee(a, b, cols: state.cols, rows: state.rows))
            stroke = []
            return
        }
        let next = strokeResult
        if let move = cellMove { cellSel = shiftCells(cellSel, dCol: move.0, dRow: move.1, cols: state.cols, rows: state.rows) }
        stroke = []
        guard next.map(\.template) != state.elements.map(\.template) || next.count != state.elements.count else { return }
        state.pushHistory()
        state.elements = next
        persist()
    }

    var pickingCells: Bool { ["marquee", "wand"].contains(selection?.id) }

    /// An adjustment's kind, for the selected one.
    func adjustPicker(_ el: Element) -> some View {
        Picker("Adjust", selection: Binding(get: { el.adjust ?? "invert" }, set: { kind in
            state.pushHistory(); state.elements = updateElement(state.elements, id: el.id, adjust: kind); persist()
        })) { ForEach(adjustments, id: \.self) { Text(LocalizedStringKey(adjustName($0))).tag($0) } }
        .pickerStyle(.menu)
        .fixedSize()
    }

    func adjustName(_ kind: String) -> String {
        ["invert": "Invert", "dim": "Dim", "ascii": "ASCII only", "single": "Single lines", "double": "Double lines", "rounded": "Rounded corners", "heavy": "Heavy lines"][kind] ?? kind
    }

    /// A drag that starts on a picked cell moves what the selection holds, by this many cells.
    var cellMove: (Int, Int)? {
        guard pickingCells, let a = stroke.first, let b = stroke.last, cellSel.contains(where: { $0 == a }) else { return nil }
        return (b.0 - a.0, b.1 - a.1)
    }

    /// What to tint: the marquee being dragged, the selection being moved, or the selection.
    var pickedShown: [(Int, Int)] {
        if selection?.id == "adjust", let a = stroke.first, let b = stroke.last { return marquee(a, b, cols: state.cols, rows: state.rows) }
        guard pickingCells else { return [] }
        if let move = cellMove { return shiftCells(cellSel, dCol: move.0, dRow: move.1, cols: state.cols, rows: state.rows) }
        if ["marquee", "adjust"].contains(selection?.id), let a = stroke.first, let b = stroke.last { return marquee(a, b, cols: state.cols, rows: state.rows) }
        return cellSel
    }

    /// Copy, cut or fill the picked cells. Drag inside them to move what they hold.
    var selectBar: some View {
        HStack(spacing: 12) {
            if cellSel.isEmpty {
                Text(selection?.id == "wand" ? "Tap a mark to pick its run" : "Drag to pick cells").font(.footnote).foregroundStyle(Theme.muted)
            } else {
                Text("\(cellSel.count) cells").font(.footnote).foregroundStyle(Theme.muted)
                Button("Copy") { copyToClipboard(cellText(state.grid, cellSel)) }
                Button("Cut") { copyToClipboard(cellText(state.grid, cellSel)); applyCells(cutCells(state.elements, cellSel)); cellSel = [] }
                Button("Fill") { applyCells(fillCells(state.elements, cellSel, char: brushMark)) }
                Button("Deselect") { cellSel = [] }
            }
            Spacer()
        }
        .buttonStyle(.bordered)
        .padding(.horizontal, 20)
        .padding(.vertical, 8)
        .background(Theme.background)
    }

    private func applyCells(_ next: [Element]) {
        state.pushHistory()
        state.elements = next
        persist()
    }

    /// Size (one to five cells) and, for the brush, the mark. The eraser takes the same sizes.
    var brushBar: some View {
        HStack(spacing: 12) {
            if selection?.id == "adjust" {
                Picker("Adjust", selection: $adjustKind) { ForEach(adjustments, id: \.self) { Text(LocalizedStringKey(adjustName($0))).tag($0) } }
                    .pickerStyle(.menu)
            } else if selection?.id == "gradient" {
                Picker("Gradient", selection: $gradientMode) {
                    Text("Straight").tag("straight")
                    Text("Round").tag("round")
                }
                .pickerStyle(.segmented)
                .frame(maxWidth: 240)
            } else {
                Picker("Size", selection: $brushSize) {
                    ForEach(brushSizes, id: \.self) { Text(verbatim: "\($0)").tag($0) }
                }
                .pickerStyle(.segmented)
                .frame(maxWidth: 240)
            }
            if selection?.id == "brush" {
                Picker("Mark", selection: $brushMark) {
                    ForEach(brushChars, id: \.self) { Text(verbatim: $0).font(.system(.body, design: .monospaced)).tag($0) }
                }
                .pickerStyle(.menu)
            }
            Spacer()
            Text(erasing ? "Drag over paint to erase it" : selection?.id == "gradient" ? "Drag to lay a ramp" : selection?.id == "adjust" ? "Drag a box to adjust what is under it" : "Drag on the canvas to paint").font(.footnote).foregroundStyle(Theme.muted)
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 8)
        .background(Theme.background)
    }

    /// Ink and paper from the 16 terminal colors, then the crop and clip (Mask.swift). Plain copy never carries them.
    @ViewBuilder func colorPickers(_ el: Element) -> some View {
        MaskControls(el: el, others: state.elements.filter { $0.id != el.id && $0.presetId != "adjust" }) { mask, clip in
            state.pushHistory()
            state.elements = updateElement(state.elements, id: el.id, mask: mask, clip: clip)
            persist()
        }
        ForEach([("Ink", el.ink, true), ("Paper", el.paper, false)], id: \.0) { label, value, isInk in
            Picker(LocalizedStringKey(label), selection: Binding(get: { value ?? -1 }, set: { v in
                state.pushHistory()
                state.elements = updateElement(state.elements, id: el.id, ink: isInk ? v : nil, paper: isInk ? nil : v)
                persist()
            })) {
                Text("None").tag(-1)
                ForEach(0..<terminalColors.count, id: \.self) { i in
                    Text(i < 8 ? LocalizedStringKey(terminalColors[i].name) : "Bright \(String(localized: String.LocalizationValue(terminalColors[i - 8].name)))").tag(i)
                }
            }
            .pickerStyle(.menu)
            .fixedSize()
        }
    }
}
