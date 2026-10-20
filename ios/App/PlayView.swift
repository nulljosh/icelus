import SwiftUI

/// Play mode, a port of src/components/Play.jsx: one screen at a time, as large as fits, in the real look. Tap a
/// hotspot to open its screen; Back goes to the one before. A tap that misses shows where the hotspots are. Live
/// parts (v55) work while you play: boxes tick, switches flip, tabs switch and fields take typing, this session only.
struct PlayView: View {
    let elements: [Element]
    let start: String
    @Environment(\.dismiss) private var dismiss
    @State private var trail: [String] = []
    @State private var hint = false
    @State private var live: [String: LiveValue] = [:]

    var body: some View {
        let view = playView(elements, trail.last ?? start)
        VStack(spacing: 24) {
            GeometryReader { geo in
                if let view {
                    let font = min(28, geo.size.width * 0.92 / CGFloat(view.cols) / 0.6, geo.size.height * 0.92 / CGFloat(view.rows) / 1.2)
                    let shown = view.elements.map { liveElement($0, live) }
                    let grid = renderElements(shown.filter { realPart($0) == nil }, cols: view.cols, rows: view.rows)
                    CanvasView(grid: grid, fontSize: font, onTap: { col, row in tap(view, shown, col, row) }, real: true, parts: shown)
                    .overlay { if hint { hintMarks(view, geo: geo, font: font) } }
                    .overlay(alignment: .topLeading) { fields(shown, cell: CanvasView.cell(font), font: font) }
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

    private func tap(_ view: PlayScreen, _ shown: [Element], _ col: Int, _ row: Int) {
        if let s = spotAt(view, col: col, row: row) { trail = (trail.isEmpty ? [start] : trail) + [s.to]; return }
        let hit = shown.last { liveKind($0) != nil && liveKind($0) != "type" && col >= $0.col && col < $0.col + $0.width && row >= $0.row && row < $0.row + $0.height }
        if let el = hit { live = pressLive(view, live, id: el.id, dCol: col - el.col) } else { flash() }
    }

    /// A text field over each typed part, inside its frame, in the real look's type.
    private func fields(_ shown: [Element], cell: CGSize, font: CGFloat) -> some View {
        ZStack(alignment: .topLeading) {
            ForEach(shown.filter { liveKind($0) == "type" }) { el in
                let multi = el.presetId == "textarea", inset = multi ? 1 : 0
                TextField("", text: Binding(get: { if case .words(let w) = live[el.id] { w } else { "" } },
                                                       set: { live = typeLive(live, id: el.id, words: $0) }), axis: multi ? .vertical : .horizontal)
                    .textFieldStyle(.plain).font(.system(size: font * 0.93)).padding(.horizontal, multi ? font * 0.5 : font * 0.75)
                    .foregroundStyle(Theme.ink).tint(Theme.accent).accessibilityLabel(Text(verbatim: partWords(el)))
                    .frame(width: cell.width * CGFloat(el.width - 2 * inset), height: cell.height * CGFloat(max(1, el.height - 2 * inset)), alignment: multi ? .topLeading : .leading)
                    .offset(x: cell.width * CGFloat(el.col + inset), y: cell.height * CGFloat(el.row + inset))
            }
        }
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
