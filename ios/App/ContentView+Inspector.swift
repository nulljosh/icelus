import SwiftUI

/// Inspector controls split out of ContentView to keep it small: a screen's layout knobs and a part's pins.
extension ContentView {
    @ViewBuilder func screenControls(_ el: Element) -> some View {
        if el.presetId == "screen" {
            Toggle("Auto layout", isOn: autoBinding(el)).fixedSize()
            let now = knobs(el)
            Stepper("Spacing \(now.spacing)", onIncrement: { tweak(el, spacing: now.spacing + 1) },
                    onDecrement: { tweak(el, spacing: now.spacing - 1) })
                .fixedSize()
            Stepper("Padding \(now.padding)", onIncrement: { tweak(el, padding: now.padding + 1) },
                    onDecrement: { tweak(el, padding: now.padding - 1) })
                .fixedSize()
            if let auto = el.auto, !canvasVars(state.elements).isEmpty {
                let names = canvasVars(state.elements).keys.sorted()
                Picker("Spacing variable", selection: Binding(get: { auto.gapVar ?? "" }, set: { bind(el, gap: $0) })) {
                    Text("Own value").tag(""); ForEach(names, id: \.self) { Text(verbatim: $0).tag($0) }
                }
                .pickerStyle(.menu).fixedSize()
                Picker("Padding variable", selection: Binding(get: { auto.padVar ?? "" }, set: { bind(el, pad: $0) })) {
                    Text("Own value").tag(""); ForEach(names, id: \.self) { Text(verbatim: $0).tag($0) }
                }
                .pickerStyle(.menu).fixedSize()
            }
            let g = el.grid
            Stepper(g.map { "Columns \($0.cols)" } ?? String(localized: "Columns off"),
                    onIncrement: { setGrid(el, ColumnGrid(cols: min(gridMax, (g?.cols ?? 0) + 1), gutter: g?.gutter ?? 1)) },
                    onDecrement: { setGrid(el, g.flatMap { $0.cols > 1 ? ColumnGrid(cols: $0.cols - 1, gutter: $0.gutter) : nil }) })
                .fixedSize()
            if let g {
                Stepper("Gutter \(g.gutter)", onIncrement: { setGrid(el, ColumnGrid(cols: g.cols, gutter: min(8, g.gutter + 1))) },
                        onDecrement: { setGrid(el, ColumnGrid(cols: g.cols, gutter: max(0, g.gutter - 1))) })
                    .fixedSize()
                Button("Use on Every Screen") { canvasEdit { gridEverywhere($0, id: el.id) } }
            }
            Picker("Every box", selection: Binding(get: { el.style ?? "single" }, set: { tweak(el, style: $0) })) {
                ForEach(boxStyles, id: \.self) { Text($0.capitalized).tag($0) }
            }
            .pickerStyle(.menu)
            .fixedSize()
            if el.size == nil { Button("Make sizes") { sizeScreen(el) } } else { Text(LocalizedStringKey(el.size!)).foregroundStyle(Theme.muted) }
            Button("Show variations") { makeVariations(el) }
            if el.take != nil, state.elements.contains(where: { $0.take == el.take && $0.id != el.id }) {
                Button("Keep this one") { keep(el) }
            }
        }
    }

    /// Pins for a part on a screen: how it follows when the screen is resized (Layout.swift).
    @ViewBuilder func pinControls(_ el: Element) -> some View {
        if el.presetId != "screen", state.elements.contains(where: { $0.presetId == "screen" && !partsInside([el], $0).isEmpty }) {
            Picker("Pin across", selection: Binding(get: { el.pin?.x ?? "left" }, set: { setPin(el, x: $0, y: el.pin?.y) })) {
                ForEach(pinX, id: \.self) { Text(LocalizedStringKey($0 == "both" ? "Left and right" : $0.capitalized)).tag($0) }
            }
            .pickerStyle(.menu).fixedSize()
            Picker("Pin down", selection: Binding(get: { el.pin?.y ?? "top" }, set: { setPin(el, x: el.pin?.x, y: $0) })) {
                ForEach(pinY, id: \.self) { Text(LocalizedStringKey($0 == "both" ? "Top and bottom" : $0.capitalized)).tag($0) }
            }
            .pickerStyle(.menu).fixedSize()
        }
    }

    func sizeScreen(_ el: Element) {
        let made = makeSizes(state.elements, id: el.id)
        guard !made.ids.isEmpty else { return }
        state.pushHistory()
        state.elements = made.elements
        state.fitCanvas()
        persist()
    }

    /// Properties on a symbol copy: own words, own style, or swap to another symbol (Shapes.swift).
    @ViewBuilder func symbolControls(_ el: Element) -> some View {
        if let symbol = el.symbol, symbolUses(state.elements, el) > 1 {
            ForEach(ownKeys, id: \.self) { key in
                Toggle(key == "text" ? "Own words" : "Own style", isOn: Binding(get: { el.own.contains(key) }, set: { on in
                    state.pushHistory()
                    state.elements = updateElement(state.elements, id: el.id, own: on ? el.own + [key] : el.own.filter { $0 != key })
                    persist()
                })).fixedSize()
            }
            let others = Dictionary(state.elements.compactMap { e in e.symbol.flatMap { $0 != symbol ? ($0, e) : nil } }, uniquingKeysWith: { a, _ in a })
            if !others.isEmpty {
                Menu("Swap") {
                    ForEach(others.keys.sorted(), id: \.self) { key in
                        Button(others[key]!.text?.components(separatedBy: "\n").first ?? others[key]!.template.joined(separator: " ").trimmingCharacters(in: .whitespaces)) {
                            state.pushHistory()
                            state.elements = swapSymbol(state.elements, id: el.id, symbol: key)
                            persist()
                        }
                    }
                }
                .fixedSize()
            }
        }
    }

    func setPin(_ el: Element, x: String?, y: String?) {
        state.pushHistory()
        state.elements = updateElement(state.elements, id: el.id, pin: Pin(x: x, y: y))
        persist()
    }

    /// Bind a screen's gap or pad to a canvas variable by name; an empty name keeps its own value.
    func bind(_ el: Element, gap: String? = nil, pad: String? = nil) {
        guard var a = el.auto else { return }
        let now = knobs(el)
        if let gap { a.gapVar = gap.isEmpty ? nil : gap; a.gap = now.spacing }
        if let pad { a.padVar = pad.isEmpty ? nil : pad; a.pad = now.padding }
        state.pushHistory()
        state.elements = updateElement(state.elements, id: el.id, auto: a)
        persist()
    }

    /// The canvas as a whole (v47, Modes.swift): its line mode over every part, and named spacing for auto layout.
    var canvasMenu: some View {
        let vars = canvasVars(state.elements), names = vars.keys.sorted()
        return Menu {
            Picker("Lines", selection: Binding(get: { canvasMode(state.elements) ?? "" }, set: { m in canvasEdit { setMode($0, m.isEmpty ? nil : m) } })) {
                Text("Each part its own").tag("")
                ForEach(modes, id: \.self) { m in
                    Text(LocalizedStringKey(["ascii": "ASCII only", "single": "Single lines", "heavy": "Heavy lines", "double": "Double lines", "rounded": "Rounded corners"][m]!)).tag(m)
                }
            }
            ForEach(names, id: \.self) { name in
                Picker(selection: Binding(get: { vars[name] ?? 1 }, set: { v in canvasEdit { setVar($0, name, v) } })) {
                    ForEach(0...autoMax, id: \.self) { Text("\($0)").tag($0) }
                } label: { Text(verbatim: name) }
            }
            if names.count < varMax {
                Button("Add Spacing") {
                    let name = names.isEmpty ? "space" : ((2...99).map { "space-\($0)" }.first { vars[$0] == nil } ?? "space-0")
                    canvasEdit { setVar($0, name, 1) }
                }
            }
            if !names.isEmpty {
                Menu("Remove") { ForEach(names, id: \.self) { name in Button(name) { canvasEdit { setVar($0, name, nil) } } } }
            }
        } label: {
            Label("Canvas", systemImage: "square.grid.3x3")
                .labelStyle(.iconOnly)
                .foregroundStyle(Theme.ink)
        }
        .menuIndicator(.hidden)
        .fixedSize()
        .accessibilityLabel("Canvas")
    }

    /// A hotspot (v53, Hotspots.swift): the screen a press on this part opens. Shown once the canvas has a screen.
    @ViewBuilder func hotspotControls(_ el: Element) -> some View {
        let screens = state.elements.filter { $0.presetId == "screen" }
        if canOpen(el), !screens.isEmpty {
            Picker("Opens", selection: Binding(get: { opensScreen(state.elements, el)?.id ?? "" },
                                               set: { id in canvasEdit { updateElement($0, id: el.id, opens: id.isEmpty ? nil : id) } })) {
                Text("Nothing").tag("")
                ForEach(screens, id: \.id) { Text(verbatim: ($0.text ?? "").isEmpty ? "Screen" : $0.text!).tag($0.id) }
            }
            .pickerStyle(.menu).fixedSize()
        }
    }

    func setGrid(_ el: Element, _ grid: ColumnGrid?) { canvasEdit { updateElement($0, id: el.id, grid: grid) } }

    func canvasEdit(_ change: ([Element]) -> [Element]) {
        state.pushHistory()
        state.elements = change(state.elements)
        persist()
    }

    /// Inspect (v50, Inspect.swift): the gap to the neighbours on each side, and this part's own code.
    @ViewBuilder func inspectControls(_ el: Element) -> some View {
        if let gap = partSpacing(state.elements, id: el.id) {
            let side = { (v: Int?) in v.map(String.init) ?? "–" }
            Text(verbatim: "←\(side(gap.left)) →\(side(gap.right)) ↑\(side(gap.top)) ↓\(side(gap.bottom))")
                .foregroundStyle(Theme.muted).fixedSize()
                .accessibilityLabel("Spacing left \(side(gap.left)), right \(side(gap.right)), top \(side(gap.top)), bottom \(side(gap.bottom))")
        }
        Menu("Code") {
            Button("Copy React") { copyToClipboard(partSnippet(el, format: "react")) }
            Button("Copy SwiftUI") { copyToClipboard(partSnippet(el, format: "swiftui")) }
        }
        .fixedSize()
    }
}
