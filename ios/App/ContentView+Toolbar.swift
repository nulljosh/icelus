import SwiftUI

extension ContentView {
    /// The basics stay in view: undo, redo, More, Settings, Profile and Export. More shows the rest (Layers, History, Review…) and the extra inspector
    /// controls, remembered per device (glyphbox-more), the same split as the web.
    var toolbar: some View {
        HStack(spacing: 16) {
            Spacer()

            toolButton("Undo", systemImage: "arrow.uturn.backward", enabled: state.canUndo, action: undo)
                .keyboardShortcut("z", modifiers: .command)
            toolButton("Redo", systemImage: "arrow.uturn.forward", enabled: state.canRedo, action: redo)
                .keyboardShortcut("z", modifiers: [.command, .shift])

            if showMore {
                toolButton("Layers", systemImage: "square.3.layers.3d", enabled: !state.elements.isEmpty) { showingLayers = true }
                toolButton("History", systemImage: "clock.arrow.circlepath", enabled: true) { showingHistory = true }
                toolButton("Review", systemImage: "checklist", enabled: !state.elements.isEmpty) { reviewing = true }
                toolButton("Erase", systemImage: "eraser", enabled: true, active: erasing) {
                    erasing.toggle()
                    if erasing { selection = nil; selectedId = nil }
                }
            }


            if trace != nil {
                toolButton("Stop tracing", systemImage: "photo.badge.minus", enabled: true) { trace = nil }
            }
            if showMore {
                toolButton("Paste a text wireframe", systemImage: "doc.on.clipboard", enabled: true, action: pasteWireframe)
                    .keyboardShortcut("v", modifiers: [.command, .shift])
                toolButton("Clear", systemImage: "xmark.square", enabled: !state.elements.isEmpty, action: clear)
                // Pinch zooms too, so the buttons wait under More.
                toolButton("Zoom out", systemImage: "minus.magnifyingglass", enabled: fontSize > Self.minFontSize) {
                    fontSize = max(Self.minFontSize, fontSize - 1)
                }
                toolButton("Zoom in", systemImage: "plus.magnifyingglass", enabled: fontSize < Self.maxFontSize) {
                    fontSize = min(Self.maxFontSize, fontSize + 1)
                }
            }
            toolButton("More", systemImage: "ellipsis.circle", enabled: true, active: showMore) { showMore.toggle() }
            toolButton("Settings", systemImage: "gearshape", enabled: true) { accountTab = "settings"; showingAccount = true }
            toolButton("Profile", systemImage: session == nil ? "person.crop.circle" : "person.crop.circle.fill", enabled: true,
                       active: session != nil) { accountTab = "profile"; showingAccount = true }

            exportMenu
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 12)
        .background(Theme.background)
    }

    /// Copy or share the canvas as text, Markdown, plain ASCII or an image, the same four as the web.
    var exportMenu: some View {
        Menu {
            Button("Copy text") { copyToClipboard(trimText(state.text)) }
            Button("Copy as Markdown") { copyToClipboard(toMarkdown(state.text)) }
            Button("Copy as plain ASCII") { copyToClipboard(toAscii(trimText(state.text))) }
            if hasColor(state.elements) {
                Button("Copy as ANSI") { copyToClipboard(toAnsi(state.grid, colorMask(state.elements, cols: state.cols, rows: state.rows))) }
            }
            Button("Copy as typed lines") { copyToClipboard(toSketch(state.elements).source) }
            Button("Copy HTML") { copyToClipboard(toHTML(state.elements, cols: state.cols, rows: state.rows)) }
            Button("Copy React code") { copyToClipboard(toReact(state.elements, cols: state.cols, rows: state.rows)) }
            Button("Copy SwiftUI code") { copyToClipboard(toSwiftUI(state.elements, cols: state.cols, rows: state.rows)) }
            let deck = slides(state.elements, cols: state.cols, rows: state.rows)
            if !deck.isEmpty { Button("Present") { presenting = deck } }
            Button("Copy for Claude Code") { copyToClipboard(handoff(state.elements, cols: state.cols, rows: state.rows, name: String(localized: "Icelus project"))) }
            if state.elements.contains(where: { $0.presetId == "screen" }) {
                Button("Copy all screens") {
                    copyToClipboard(screensDocument(state.elements, cols: state.cols, rows: state.rows) ?? "")
                }
            }
            Divider()
            ShareLink("Share text", item: trimText(state.text))
            ShareLink("Share image", item: Snapshot(text: state.text), preview: SharePreview("Icelus wireframe"))
        } label: {
            Label("Export", systemImage: "square.and.arrow.up")
                .labelStyle(.iconOnly)
                .foregroundStyle(Theme.ink)
        }
        .menuIndicator(.hidden)
        .fixedSize()
        .disabled(state.elements.isEmpty)
        .accessibilityLabel("Export")
    }
}
