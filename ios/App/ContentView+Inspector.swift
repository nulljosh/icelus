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

    func setPin(_ el: Element, x: String?, y: String?) {
        state.pushHistory()
        state.elements = updateElement(state.elements, id: el.id, pin: Pin(x: x, y: y))
        persist()
    }
}
