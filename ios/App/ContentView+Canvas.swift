import SwiftUI

extension ContentView {
    /// The elements as drawn right now, with the snap guides: mid-drag the selected part sits where it will
    /// land, and while the arrow tool drags, the line being drawn shows.
    var shown: (elements: [Element], cols: [Int], rows: [Int]) {
        if let lineDrag { return (state.elements + [createLine(state.elements, start: lineDrag.start, end: lineDrag.end)], [], []) }
        if !stroke.isEmpty { return (strokeResult, [], []) }
        guard let drag, let id = selectedId else { return (state.elements, [], []) }
        return dragTarget(id, drag)
    }

    /// Where a dragged part lands: moved, then snapped to other parts' edges and centres.
    func dragTarget(_ id: String, _ d: (col: Int, row: Int)) -> (elements: [Element], cols: [Int], rows: [Int]) {
        let nudged = nudgeElement(state.elements, id: id, dCol: d.col, dRow: d.row, cols: state.cols, rows: state.rows)
        guard (d.col, d.row) != (0, 0), let el = nudged.first(where: { $0.id == id }) else { return (nudged, [], []) }
        let snap = snapPosition(state.elements, id: id, col: el.col, row: el.row)
        return (moveElement(state.elements, id: id, col: snap.col, row: snap.row), snap.guideCols, snap.guideRows)
    }

    var canvas: some View {
        let shown = shown
        // Real look: the grid keeps only character parts; RealLayerView draws the rest.
        let drawn = look == "real" ? shown.elements.filter { realPart($0) == nil } : shown.elements
        return ScrollView([.horizontal, .vertical]) {
            CanvasView(
                grid: look == "real" ? renderElements(drawn, cols: state.cols, rows: state.rows)
                    : drag == nil && lineDrag == nil && stroke.isEmpty ? state.grid : renderElements(shown.elements, cols: state.cols, rows: state.rows),
                fontSize: fontSize,
                selected: shown.elements.first { $0.id == selectedId },
                outlined: shown.elements.filter { el in el.id != selectedId
                    && (picked.contains(el.id) || groupMates(shown.elements, shown.elements.first { $0.id == selectedId }).contains { $0.id == el.id }) },
                onTap: tap,
                onDrag: dragged,
                drawing: selection?.id == "line",
                onLine: lined,
                painting: ["brush", "gradient", "adjust"].contains(selection?.id) || erasing || pickingCells,
                picked: pickedShown,
                onPaint: stroked,
                guideCols: shown.cols,
                guideRows: shown.rows,
                trace: trace,
                accent: drawn.contains { $0.accent } ? accentMask(drawn, cols: state.cols, rows: state.rows) : nil,
                colors: hasColor(drawn) ? colorMask(drawn, cols: state.cols, rows: state.rows) : nil,
                real: look == "real",
                parts: look == "real" ? shown.elements : state.elements
            )
            .padding(20)
        }
        .background(Theme.background)
        // Pinch zooms by font size, like the zoom buttons.
        .simultaneousGesture(MagnifyGesture()
            .onChanged { value in
                if pinchStart == nil { pinchStart = fontSize }
                fontSize = min(Self.maxFontSize, max(Self.minFontSize, (pinchStart ?? fontSize) * value.magnification))
            }
            .onEnded { _ in pinchStart = nil })
    }
}
