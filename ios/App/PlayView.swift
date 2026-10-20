import SwiftUI

/// Play mode, a port of src/components/Play.jsx: one screen at a time, as large as fits, in the real look. Tap a
/// hotspot to open its screen; Back goes to the one before. A tap that misses shows where the hotspots are.
struct PlayView: View {
    let elements: [Element]
    let start: String
    @Environment(\.dismiss) private var dismiss
    @State private var trail: [String] = []
    @State private var hint = false

    var body: some View {
        let view = playView(elements, trail.last ?? start)
        VStack(spacing: 24) {
            GeometryReader { geo in
                if let view {
                    let font = min(28, geo.size.width * 0.92 / CGFloat(view.cols) / 0.6, geo.size.height * 0.92 / CGFloat(view.rows) / 1.2)
                    let grid = renderElements(view.elements.filter { realPart($0) == nil }, cols: view.cols, rows: view.rows)
                    CanvasView(grid: grid, fontSize: font, onTap: { col, row in
                        if let s = spotAt(view, col: col, row: row) { trail = (trail.isEmpty ? [start] : trail) + [s.to] } else { flash() }
                    }, real: true, parts: view.elements)
                    .overlay { if hint { hintMarks(view, geo: geo, font: font) } }
                    .fixedSize()
                    .frame(width: geo.size.width, height: geo.size.height)
                }
            }
            HStack(spacing: 8) {
                Button("Back") { trail.removeLast() }.disabled(trail.count < 2)
                    .keyboardShortcut(.leftArrow, modifiers: [])
                Text(verbatim: view?.title ?? "").foregroundStyle(Theme.muted).frame(minWidth: 64)
                Button("Done") { dismiss() }.keyboardShortcut(.cancelAction)
            }
            .buttonStyle(.bordered)
            .controlSize(.large)
            .padding(.bottom, 24)
        }
        .padding(.top, 16)
        .background(Theme.background.ignoresSafeArea())
        .onAppear { if view == nil { dismiss() } }
    }

    private func flash() {
        withAnimation(.easeInOut(duration: 0.2)) { hint = true }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) { withAnimation(.easeInOut(duration: 0.2)) { hint = false } }
    }

    /// The hotspots, tinted for a moment after a tap that missed them.
    private func hintMarks(_ view: PlayScreen, geo: GeometryProxy, font: CGFloat) -> some View {
        Canvas { context, size in
            let charW = size.width / CGFloat(view.cols), rowH = size.height / CGFloat(view.rows)
            for s in view.spots {
                let box = CGRect(x: charW * CGFloat(s.col), y: rowH * CGFloat(s.row), width: charW * CGFloat(s.width), height: rowH * CGFloat(s.height))
                context.fill(Path(roundedRect: box, cornerRadius: min(box.height / 2, 8)), with: .color(Theme.accent.opacity(0.25)))
            }
        }
        .allowsHitTesting(false)
    }
}
