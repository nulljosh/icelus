import SwiftUI

/// The iPhone layout, the same shape as the web on a phone: the canvas runs edge to edge, and over it float
/// Liquid Glass bars: undo and redo top left, Tools, Play and Export top right, the selected part's row and a tab
/// bar (Add, Layers, History, Settings) at the bottom. Settings holds Profile. iPad and Mac keep regularLayout.
extension ContentView {
    var isPhone: Bool {
        #if os(iOS)
        sizeClass == .compact
        #else
        false
        #endif
    }

    @ViewBuilder var layout: some View {
        #if os(iOS)
        if sizeClass == .compact { phoneLayout } else { regularLayout }
        #else
        regularLayout
        #endif
    }

    var phoneLayout: some View {
        canvas
            .safeAreaInset(edge: .top, spacing: 0) {
                VStack(spacing: 8) {
                    phoneTopBar
                    if let lesson { TutorialCard(step: lesson, compact: true) { self.lesson = nil }.glass(in: RoundedRectangle(cornerRadius: 24)) .padding(.horizontal, 16) }
                }
            }
            .safeAreaInset(edge: .bottom, spacing: 0) {
                VStack(spacing: 8) {
                    if ["brush", "gradient", "adjust"].contains(selection?.id) || erasing { brushBar.clipShape(RoundedRectangle(cornerRadius: 24)).padding(.horizontal, 16) }
                    if pickingCells { selectBar.clipShape(RoundedRectangle(cornerRadius: 24)).padding(.horizontal, 16) }
                    if let el = selectedElement { inspector(el, floating: true).glass(in: Capsule()).padding(.horizontal, 16) }
                    phoneTabBar
                }
            }
            .sheet(isPresented: $addingParts) {
                NavigationStack {
                    PaletteView(selection: $selection, erasing: $erasing, vertical: true)
                        .navigationTitle("Add")
                        #if os(iOS)
                        .navigationBarTitleDisplayMode(.inline)
                        #endif
                        .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { addingParts = false } } }
                }
                .presentationDetents([.medium, .large])
            }
            .onChange(of: selection) { if selection != nil { addingParts = false } } // picked: back to the grid to place it
    }

    /// Two glass capsules: history on the left, making on the right.
    private var phoneTopBar: some View {
        HStack {
            HStack(spacing: 4) {
                barButton("Undo", "arrow.uturn.backward", enabled: state.canUndo, action: undo)
                barButton("Redo", "arrow.uturn.forward", enabled: state.canRedo, action: redo)
            }
            .glass(in: Capsule())
            Spacer(minLength: 8)
            fileTitle.glass(in: Capsule())
            Spacer(minLength: 8)
            HStack(spacing: 4) {
                toolsMenu.frame(width: 44, height: 44)
                if let first = startScreen(state.elements, selectedId: selectedId) {
                    barButton("Play", "play.fill", enabled: true) { playing = first.id }
                }
                exportMenu.frame(width: 44, height: 44)
            }
            .glass(in: Capsule())
        }
        .font(.system(size: 17, weight: .medium))
        .padding(.horizontal, 16)
        .padding(.top, 4)
    }

    private func barButton(_ title: String, _ icon: String, enabled: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: icon).frame(width: 44, height: 44).contentShape(Rectangle())
                .foregroundStyle(enabled ? Theme.ink : Theme.muted)
        }
        .buttonStyle(.plain)
        .disabled(!enabled)
        .accessibilityLabel(Text(LocalizedStringKey(title)))
    }

    /// The drawing tools and the canvas-wide actions, one menu so the top bar stays small.
    private var toolsMenu: some View {
        Menu {
            Section {
                ForEach(drawTools.filter { Self.phoneTools.contains($0.id) || showMore }) { tool in
                    Button { erasing = false; selectedId = nil; selection = tool } label: {
                        Label(LocalizedStringKey(tool.label), systemImage: Self.toolIcons[tool.id] ?? "pencil")
                    }
                }
            }
            Section {
                Button { erasing.toggle(); if erasing { selection = nil; selectedId = nil } } label: { Label("Erase", systemImage: "eraser") }
                Button { reviewing = true } label: { Label("Review", systemImage: "checklist") }.disabled(state.elements.isEmpty)
                Button { showingCopy = true } label: { Label("Copy", systemImage: "textformat") }.disabled(state.elements.isEmpty)
                if showMore { canvasMenu }
                Button(action: pasteWireframe) { Label("Paste a text wireframe", systemImage: "doc.on.clipboard") }
                Button(role: .destructive, action: clear) { Label("Clear", systemImage: "xmark.square") }.disabled(state.elements.isEmpty)
            }
        } label: {
            Image(systemName: selection.flatMap { Self.toolIcons[$0.id] } ?? "pencil.tip.crop.circle")
                .foregroundStyle(selection.map { s in drawTools.contains { $0.id == s.id } } == true || erasing ? Theme.accent : Theme.ink)
        }
        .menuIndicator(.hidden)
        .accessibilityLabel("Tools")
    }

    static let phoneTools: Set<String> = ["line", "text", "screen", "photo", "type"]
    static let toolIcons: [String: String] = [
        "line": "arrow.up.right", "text": "textformat", "screen": "iphone", "photo": "photo", "type": "keyboard",
        "brush": "paintbrush.pointed", "gradient": "circle.lefthalf.filled", "fill": "square.fill.on.square.fill",
        "adjust": "slider.horizontal.3", "marquee": "rectangle.dashed", "wand": "wand.and.stars", "capture": "globe",
        "photo-braille": "photo", "photo-shade": "photo", "trace": "photo.on.rectangle", "banner": "textformat.size", "boxy": "face.smiling",
    ]

    /// A floating glass tab bar, like the iOS 26 one.
    private var phoneTabBar: some View {
        HStack(spacing: 0) {
            tab("Add", "plus", active: addingParts) { addingParts = true }
            tab("Layers", "square.3.layers.3d", enabled: !state.elements.isEmpty) { showingLayers = true }
            tab("History", "clock.arrow.circlepath") { showingHistory = true }
            tab("Settings", "gearshape") { accountTab = "settings"; showingAccount = true }
        }
        .padding(.horizontal, 8)
        .glass(in: Capsule())
        .padding(.horizontal, 24)
        .padding(.bottom, 4)
    }

    private func tab(_ title: String, _ icon: String, enabled: Bool = true, active: Bool = false, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: 2) {
                Image(systemName: icon).font(.system(size: 20, weight: .medium)).frame(height: 26) // one height, so the labels line up
                Text(LocalizedStringKey(title)).font(.system(size: 10, weight: .medium))
            }
            .frame(maxWidth: .infinity, minHeight: 56)
            .foregroundStyle(active ? Theme.accent : enabled ? Theme.ink : Theme.muted)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .disabled(!enabled)
    }
}

extension View {
    /// Liquid Glass on iOS 26 and later, a thin material before it.
    @ViewBuilder func glass<S: Shape>(in shape: S) -> some View {
        if #available(iOS 26, macOS 26, *) { glassEffect(.regular.interactive(), in: shape) }
        else { background(.ultraThinMaterial, in: shape) }
    }
}
