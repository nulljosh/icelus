import SwiftUI
import PhotosUI
import ImageIO
import UniformTypeIdentifiers

struct ContentView: View {
    @State var state = EditorState()
    @State var selection: Preset? = presets.first
    @State var selectedId: String?
    /// Parts picked to group: while picking, a tap adds or drops a part.
    @State var picked: [String] = []
    @State var picking = false
    @State var drag: (col: Int, row: Int)?
    @State var erasing = false
    /// The stroke being painted, and the brush's size and mark (Brush.swift).
    @State var stroke: [(Int, Int)] = []
    @State var brushSize = 1
    @State var brushMark = "█"
    @State var gradientMode = "straight"
    @State var adjustKind = "invert"
    @State var cellSel: [(Int, Int)] = []
    @State var fontSize: CGFloat = 13
    @State var pinchStart: CGFloat?
    @AppStorage("glyphic-palette") var mineRaw = "[]"
    @AppStorage("glyphbox-system") var systemRaw = ""
    @AppStorage("glyphbox-more") var showMore = false
    @AppStorage("glyphbox-look") var look = "real"
    @AppStorage("glyphbox-tour-seen") var tourSeen = false
    /// The tutorial step, or nil when it is not running (Tutorial.swift).
    @State var lesson: Int?
    @State var lessonStart = LessonSnapshot()
    @State var copies = 0
    @State var lineDrag: (start: (col: Int, row: Int), end: (col: Int, row: Int))?
    @State var editingText = false
    @State var editDraft = ""
    @State var typing = false
    @State var capturing = false
    @State var showingAccount = false
    @State var accountTab = "profile"
    /// Signed in, or nil. Kept in the Keychain (Account.swift).
    @State var session = SessionStore.load()
    @State var showingLayers = false
    @State var showingHistory = false
    @State var reviewing = false
    @State var presenting: [Slide]? = nil
    @State var pickingPhoto = false
    @State var photoItem: PhotosPickerItem?
    @State var photoLook = "blocks"
    @State var noteDraft = ""
    @State var tracingPick = false
    @State var trace: CGImage?
    @State var sketchSource = "# Sign in\n\"Email\"\n\"Password\"\n[x] Remember me\n[Sign in]  [Cancel]"

    static let minFontSize: CGFloat = 7
    static let maxFontSize: CGFloat = 28
    static let arrows: [(key: KeyEquivalent, dCol: Int, dRow: Int)] = [
        (.leftArrow, -1, 0), (.rightArrow, 1, 0), (.upArrow, 0, -1), (.downArrow, 0, 1),
    ]

    var body: some View {
        VStack(spacing: 0) {
            toolbar
            Divider().overlay(Theme.rule)
            canvas
            if ["brush", "gradient", "adjust"].contains(selection?.id) || erasing { Divider().overlay(Theme.rule); brushBar }
            if pickingCells { Divider().overlay(Theme.rule); selectBar }
            if let el = selectedElement {
                Divider().overlay(Theme.rule)
                inspector(el)
            }
            Divider().overlay(Theme.rule)
            PaletteView(selection: $selection, erasing: $erasing)
        }
        .background(Theme.background)
        .overlay(alignment: .bottom) { if let lesson { TutorialCard(step: lesson) { self.lesson = nil } } }
        .sheet(isPresented: Binding(get: { !tourSeen }, set: { if !$0 { tourSeen = true } })) {
            WelcomeSheet(onStart: startLesson, onSkip: { tourSeen = true })
        }
        .onChange(of: state.elements) { advanceLesson() }
        .onChange(of: copies) { advanceLesson() }
        .onAppear(perform: restore)
        .onChange(of: selection) {
            if !pickingCells { cellSel = [] }
            if selection?.id == "type" { typing = true; selection = nil }
            else if selection?.id == "capture" { capturing = true; selection = nil }
            else if let id = selection?.id, ["photo", "photo-braille", "photo-shade", "trace"].contains(id) {
                tracingPick = id == "trace"; photoLook = id == "photo" ? "blocks" : String(id.dropFirst(6)); pickingPhoto = true; selection = nil
            }
            else if selection != nil { selectedId = nil }
            advanceLesson()
        }
        .photosPicker(isPresented: $pickingPhoto, selection: $photoItem, matching: .images)
        .onChange(of: photoItem) {
            guard let item = photoItem else { return }
            photoItem = nil
            Task {
                guard let data = try? await item.loadTransferable(type: Data.self) else { return }
                if tracingPick { trace = photoImage(data); return }
                guard let template = photoTemplate(data, cols: min(60, state.cols - 4), look: photoLook) else { return }
                placeBelow(Preset(id: "photo", label: "Photo", category: "Draw", template: template))
            }
        }
        .sheet(isPresented: $editingText) {
            TextSheet(title: "Edit text", hint: nil, action: "Save", text: $editDraft, onDone: saveText)
        }
        .sheet(isPresented: $reviewing) {
            ReviewSheet(elements: state.elements, cols: state.cols, rows: state.rows, system: parseSystem(systemRaw), onSelect: { selectedId = $0 }, onRemove: removeParts)
        }
        .sheet(isPresented: $showingLayers) {
            LayersSheet(elements: state.elements, selectedId: selectedId, onSelect: { selectedId = $0 },
                        onFlag: { el, hidden, locked in flag(el, hidden: hidden, locked: locked) },
                        onStep: { el, up in step(el, up: up) })
        }
        .sheet(isPresented: $showingHistory) {
            HistorySheet(state: $state, targets: playTargets, onChange: { selectedId = nil; persist() }, onPlay: persist)
        }
        .onChange(of: session) { SessionStore.save(session) }
        .sheet(isPresented: $showingAccount) {
            AccountSheet(session: $session, showMore: $showMore, tab: accountTab, onTutorial: startLesson)
        }
        #if os(iOS)
        .fullScreenCover(isPresented: Binding(get: { presenting != nil }, set: { if !$0 { presenting = nil } })) {
            if let presenting { PresentView(slides: presenting) }
        }
        #else
        .sheet(isPresented: Binding(get: { presenting != nil }, set: { if !$0 { presenting = nil } })) {
            if let presenting { PresentView(slides: presenting).frame(minWidth: 800, minHeight: 500) }
        }
        #endif
        .sheet(isPresented: $capturing) {
            CaptureSheet { source in
                sketchSource = source; capturing = false
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { typing = true } // after this sheet closes
            }
        }
        .sheet(isPresented: $typing) {
            TextSheet(title: "Type a screen",
                      hint: "# Title  \"Email\"  [Button]  [x] Check  (o) Radio  [v Select]  ---  | a | b |. Two spaces put parts side by side.",
                      action: "Draw it", text: $sketchSource, onDone: drawSketch)
        }
    }

    // MARK: - Pieces

    var selectedElement: Element? {
        state.elements.first { $0.id == selectedId }
    }

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

    func inspector(_ el: Element) -> some View {
        // Scrolls sideways on a narrow iPhone.
        ScrollView(.horizontal, showsIndicators: false) { HStack(spacing: 16) {
            Text(el.label).font(.headline).foregroundStyle(Theme.ink)
            Spacer()
            if el.presetId == "adjust" { adjustPicker(el) }
            if el.presetId == "table" {
                // A table sizes by rows and columns.
                let cells = tableCells(el.template), width = cells.map(\.count).max() ?? 1
                Stepper("Rows \(cells.count)", onIncrement: { expand(el) },
                        onDecrement: { if cells.count > 1 { setCells(el, Array(cells.dropLast())) } })
                    .fixedSize()
                Stepper("Columns \(width)", onIncrement: {
                    setCells(el, cells.enumerated().map { i, r in
                        r + Array(repeating: "", count: width - r.count) + [i == 0 ? String(localized: "Head") : ""] })
                }, onDecrement: { if width > 1 { setCells(el, cells.map { Array($0.prefix(width - 1)) }) } })
                    .fixedSize()
            }
            if el.presetId == "list" { toolButton("Add Item", systemImage: "plus", enabled: true) { expand(el) } }
            toolButton("Edit text", systemImage: "character.cursor.ibeam", enabled: true) { editText(el) }
            if el.presetId == "fill" {
                Picker("Shade", selection: Binding(get: { el.template.first?.first ?? "▒" }, set: { setFill(el, $0) })) {
                    ForEach(Array(zip(fills, ["Light", "Medium", "Dark", "Solid"])), id: \.0) { Text(LocalizedStringKey($0.1)).tag($0.0) }
                }
                .pickerStyle(.menu)
                .fixedSize()
            }
            toolButton("Duplicate", systemImage: "plus.square.on.square", enabled: true) { duplicate(el) }
                .keyboardShortcut("d", modifiers: .command)
            toolButton("Delete", systemImage: "trash", enabled: true) { delete(el) }
                .keyboardShortcut(.delete, modifiers: [])
            toolButton("More", systemImage: "ellipsis.circle", enabled: true, active: showMore) { showMore.toggle() }
            if showMore {
                if !sized.contains(el.presetId) { // a chart's numbers and a sequence's messages size it
                    Stepper("Width \(el.width)", onIncrement: { resize(el, dw: 1, dh: 0) },
                            onDecrement: { resize(el, dw: -1, dh: 0) })
                        .fixedSize()
                    Stepper("Height \(el.height)", onIncrement: { resize(el, dw: 0, dh: 1) },
                            onDecrement: { resize(el, dw: 0, dh: -1) })
                        .fixedSize()
                }
                if el.template.joined().contains(where: { "─│┌┐└┘├┤┬┴┼".contains($0) }) {
                    Picker("Box style", selection: Binding(get: { el.style ?? "single" }, set: { restyle(el, $0) })) {
                        ForEach(boxStyles, id: \.self) { Text($0.capitalized).tag($0) }
                    }
                    .pickerStyle(.menu)
                    .fixedSize()
                }
                TextField("Note", text: $noteDraft, prompt: Text("A note for you or an agent"), axis: .vertical)
                    .lineLimit(1...3)
                    .frame(minWidth: 160, maxWidth: 260)
                    .onSubmit { setNote(el, noteDraft) }
                    .onChange(of: selectedId, initial: true) { noteDraft = selectedElement?.note ?? "" }
                if noteDraft != (el.note ?? "") { toolButton("Save note", systemImage: "note.text", enabled: true) { setNote(el, noteDraft) } }
                if el.note != nil { toolButton("Resolve", systemImage: "checkmark.circle", enabled: true) { setNote(el, ""); noteDraft = "" } }
                if el.presetId == "screen" {
                    Toggle("Auto layout", isOn: autoBinding(el)).fixedSize()
                    let now = knobs(el)
                    Stepper("Spacing \(now.spacing)", onIncrement: { tweak(el, spacing: now.spacing + 1) },
                            onDecrement: { tweak(el, spacing: now.spacing - 1) })
                        .fixedSize()
                    Stepper("Padding \(now.padding)", onIncrement: { tweak(el, padding: now.padding + 1) },
                            onDecrement: { tweak(el, padding: now.padding - 1) })
                        .fixedSize()
                    Picker("Every box", selection: Binding(get: { el.style ?? "single" }, set: { tweak(el, style: $0) })) {
                        ForEach(boxStyles, id: \.self) { Text($0.capitalized).tag($0) }
                    }
                    .pickerStyle(.menu)
                    .fixedSize()
                    Button("Show variations") { makeVariations(el) }
                    if el.take != nil, state.elements.contains(where: { $0.take == el.take && $0.id != el.id }) {
                        Button("Keep this one") { keep(el) }
                    }
                }
                Picker("State", selection: Binding(get: { el.variant ?? "default" }, set: { setVariant(el, $0) })) {
                    ForEach(variants, id: \.self) { Text(LocalizedStringKey($0.capitalized)).tag($0) }
                }
                .pickerStyle(.menu)
                .fixedSize()
                colorPickers(el)
                Toggle("Highlight", isOn: Binding(get: { el.accent }, set: { highlight(el, $0) }))
                    .fixedSize()
                toolButton("Save to palette", systemImage: "square.and.arrow.down.on.square", enabled: true) {
                    mineRaw = serializePalette(addToPalette(parsePalette(mineRaw), el))
                }
                toolButton(picking ? "Done picking" : "Pick parts", systemImage: "plus.rectangle.on.rectangle", enabled: true, active: picking) {
                    picking.toggle()
                    picked = picking ? [el.id] : []
                }
                if picked.count >= 2 {
                    Button("Group \(picked.count)") { group() }.keyboardShortcut("g", modifiers: .command)
                }
                if el.group != nil {
                    Button("Ungroup") { ungroup(el) }.keyboardShortcut("g", modifiers: [.command, .shift])
                }
                if el.symbol != nil {
                    Text("\(symbolUses(state.elements, el)) copies").foregroundStyle(Theme.muted)
                    Button("Detach") { symbol(el, detach: true) }
                } else {
                    Button("Make symbol") { symbol(el, detach: false) }
                }
                toolButton("Send to back", systemImage: "square.3.layers.3d.bottom.filled", enabled: true) {
                    reorder(el, toBack: true)
                }
                .keyboardShortcut("[", modifiers: [])
                toolButton("Bring to front", systemImage: "square.3.layers.3d.top.filled", enabled: true) {
                    reorder(el, toBack: false)
                }
                .keyboardShortcut("]", modifiers: [])
            }
        } }
        .background { nudgeKeys(el) }
        .foregroundStyle(Theme.ink)
        .padding(.horizontal, 20)
        .padding(.vertical, 8)
        .background(Theme.background)
    }

    /// Arrow keys nudge, Shift for 5. Invisible buttons carry the shortcuts.
    func nudgeKeys(_ el: Element) -> some View {
        ZStack {
            ForEach(Self.arrows, id: \.key.character) { a in
                Button("") { nudge(el, dCol: a.dCol, dRow: a.dRow) }.keyboardShortcut(a.key, modifiers: [])
                Button("") { nudge(el, dCol: a.dCol * 5, dRow: a.dRow * 5) }.keyboardShortcut(a.key, modifiers: .shift)
            }
        }
        .opacity(0)
        .accessibilityHidden(true)
    }

    func toolButton(
        _ label: String,
        systemImage: String,
        enabled: Bool,
        active: Bool = false,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            Image(systemName: systemImage)
                .foregroundStyle(active ? Theme.accent : (enabled ? Theme.ink : Theme.muted))
        }
        .disabled(!enabled)
        .accessibilityLabel(Text(LocalizedStringKey(label)))
        .help(Text(LocalizedStringKey(label)))
        .accessibilityAddTraits(active ? [.isSelected] : [])
    }
}

/// The trimmed canvas as a PNG, rendered only when someone actually shares it.
struct Snapshot: Transferable {
    let text: String

    static var transferRepresentation: some TransferRepresentation {
        DataRepresentation(exportedContentType: .png) { snapshot in
            await MainActor.run { snapshot.png() }
        }
    }

    @MainActor func png() -> Data {
        let lines = trimText(text).split(separator: "\n", omittingEmptySubsequences: false)
        let cols = max(1, lines.map(\.count).max() ?? 1)
        let grid = textToGrid(lines.joined(separator: "\n"), cols: cols, rows: max(1, lines.count))
        let renderer = ImageRenderer(content: CanvasView(grid: grid, fontSize: 14, onTap: { _, _ in })
            .padding(16)
            .background(Theme.background)
            .environment(\.colorScheme, .light)) // an image is always the light page
        renderer.scale = 2
        let data = NSMutableData()
        guard let image = renderer.cgImage,
              let dest = CGImageDestinationCreateWithData(data, UTType.png.identifier as CFString, 1, nil)
        else { return Data() }
        CGImageDestinationAddImage(dest, image, nil)
        CGImageDestinationFinalize(dest)
        return data as Data
    }
}
