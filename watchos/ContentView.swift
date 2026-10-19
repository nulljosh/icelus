import SwiftUI

struct ContentView: View {
    // ponytail: a 28 by 14 canvas fits the watch face; a bigger project file opens at its own size and scrolls.
    @State private var state = EditorState(cols: 28, rows: 14)
    @State private var selection: Preset? = presets.first
    @State private var erasing = false
    @State private var fontSize: CGFloat = 8

    private static let minFontSize: CGFloat = 5
    private static let maxFontSize: CGFloat = 14

    var body: some View {
        TabView {
            canvasPage
            PaletteView(selection: $selection, erasing: $erasing)
        }
        .tabViewStyle(.verticalPage)
        .onAppear(perform: restore)
    }

    // MARK: - Pages

    private var canvasPage: some View {
        NavigationStack {
            ScrollView([.horizontal, .vertical]) {
                CanvasView(grid: state.grid, fontSize: fontSize, onTap: place)
            }
            .background(Theme.background)
            .navigationTitle("Icelus")
            .toolbar {
                ToolbarItemGroup(placement: .bottomBar) {
                    toolButton("Undo", systemImage: "arrow.uturn.backward", enabled: state.canUndo, action: undo)
                    toolButton("Erase", systemImage: erasing ? "eraser.fill" : "eraser", enabled: true) {
                        erasing.toggle()
                        if erasing { selection = nil }
                    }
                    toolButton("Clear", systemImage: "trash", enabled: !state.elements.isEmpty, action: clear)
                    ShareLink(item: trimText(state.text)) {
                        Image(systemName: "square.and.arrow.up")
                    }
                    .accessibilityLabel("Export as text")
                }
            }
        }
    }

    private func toolButton(
        _ label: String,
        systemImage: String,
        enabled: Bool,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            Image(systemName: systemImage)
                .foregroundStyle(enabled ? Theme.ink : Theme.muted)
        }
        .disabled(!enabled)
        .accessibilityLabel(label)
    }

    // MARK: - Actions

    private func place(col: Int, row: Int) {
        if erasing {
            guard let hit = elementAt(state.elements, col: col, row: row) else { return }
            state.pushHistory()
            state.elements = deleteElement(state.elements, id: hit.id)
        } else if let preset = selection {
            state.pushHistory()
            state.elements.append(createElement(preset, col: col, row: row))
        } else {
            return
        }
        persist()
    }

    private func undo() {
        state.undo()
        persist()
    }

    private func clear() {
        state.pushHistory()
        state.elements = []
        persist()
    }

    // MARK: - Persistence

    private func restore() {
        if let saved = Store.load() { state = saved }
    }

    // ponytail: write on every edit, same as iOS — the watch canvas is smaller still, so
    // debouncing protects nothing here either.
    private func persist() {
        Store.save(state)
    }
}
