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
        // A blank canvas says what to do, like the web: Boxy and one line. It never takes a tap.
        .overlay { if state.elements.isEmpty { emptyCanvas.allowsHitTesting(false) } }
        // Fit the work to the width once, so a phone opens on the whole screen, not its top left corner.
        .background(GeometryReader { g in Color.clear.onAppear { DispatchQueue.main.async { fit(width: g.size.width) } } }) // after restore
        // Pinch zooms by font size, like the zoom buttons.
        .simultaneousGesture(MagnifyGesture()
            .onChanged { value in
                if pinchStart == nil { pinchStart = fontSize }
                fontSize = min(Self.maxFontSize, max(Self.minFontSize, (pinchStart ?? fontSize) * value.magnification))
            }
            .onEnded { _ in pinchStart = nil })
    }

    private var emptyCanvas: some View {
        VStack(spacing: 8) {
            BoxyView(size: 96)
            Text("A blank frame").font(.title3.weight(.semibold)).foregroundStyle(Theme.ink)
            #if os(iOS)
            Text(sizeClass == .compact ? "Tap Add, pick a part, then tap the grid." : "Pick a part, then tap the grid.").foregroundStyle(Theme.muted)
            #else
            Text("Pick a part, then click the grid.").foregroundStyle(Theme.muted)
            #endif
        }
        .multilineTextAlignment(.center)
        .padding(24)
    }

    /// The type size that shows the widest part of the work (at least a 40-column phone screen) across the view.
    func fit(width: CGFloat) {
        #if os(iOS)
        guard !fitted, width > 0, sizeClass == .compact else { return } // iPad and Mac keep their size
        #else
        return
        #endif
        fitted = true
        let cols = max(40, state.elements.filter { !$0.hidden }.map { $0.col + $0.width }.max() ?? 0)
        let perPoint = CanvasView.cell(14).width / 14
        let size = (width - 48) / (CGFloat(cols) * perPoint) // the canvas pads 20 a side, plus a little air
        fontSize = min(Self.maxFontSize, max(Self.minFontSize, size.rounded(.down)))
    }
}
