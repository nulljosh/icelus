import SwiftUI

/// The layer list: each screen with its parts, front first. Tap a layer to select it (the only way to pick a locked
/// part), hide or lock it, swipe or long-press to step it up and down. A port of src/components/LayerList.jsx.
struct LayersSheet: View {
    let elements: [Element]
    let selectedId: String?
    let onSelect: (String) -> Void
    let onFlag: (Element, _ hidden: Bool?, _ locked: Bool?) -> Void
    let onStep: (Element, _ up: Bool) -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        let front = Array(elements.reversed())
        let screens = front.filter { $0.presetId == "screen" }
        let home = { (el: Element) in screens.first { !partsInside([el], $0).isEmpty }?.id }
        let loose = front.filter { $0.presetId != "screen" && home($0) == nil }
        NavigationStack {
            List {
                // Each screen with the parts on it, like the layer tree in a design tool; loose parts last.
                ForEach(screens) { screen in
                    Section {
                        row(screen)
                        ForEach(front.filter { $0.presetId != "screen" && home($0) == screen.id }) { row($0).padding(.leading, 16) }
                    }
                }
                if !loose.isEmpty { Section(screens.isEmpty ? "" : "Not on a screen") { ForEach(loose) { row($0) } } }
            }
            .navigationTitle("Layers")
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
        }
    }

    /// One layer: its kind, its words under it, and hide and lock. Swipe to move it up or down.
    private func row(_ el: Element) -> some View {
        let i = elements.count - 1 - (elements.firstIndex { $0.id == el.id } ?? 0) // place from the front
        let name = el.presetId == "screen" ? ((el.text ?? "").isEmpty ? "Screen" : el.text!) : el.label
        let words = el.presetId == "screen" ? "" : partWords(el)
        return HStack(spacing: 8) {
            Button { onSelect(el.id); dismiss() } label: {
                VStack(alignment: .leading, spacing: 2) {
                    Text(LocalizedStringKey(name)).fontWeight(el.presetId == "screen" ? .semibold : .regular)
                        .foregroundStyle(el.id == selectedId ? Theme.accent : el.hidden ? Theme.muted : Theme.ink)
                    if !words.isEmpty && words != name { Text(verbatim: words).font(.footnote).foregroundStyle(Theme.muted) }
                }
                .lineLimit(1)
                .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            icon(el.hidden ? "eye.slash" : "eye", el.hidden ? "Show" : "Hide", on: el.hidden) { onFlag(el, !el.hidden, nil) }
            icon(el.locked ? "lock" : "lock.open", el.locked ? "Unlock" : "Lock", on: el.locked) { onFlag(el, nil, !el.locked) }
        }
        .swipeActions(edge: .leading) {
            if i > 0 { Button("Move up") { onStep(el, true) }.tint(Theme.accent) }
            if i < elements.count - 1 { Button("Move down") { onStep(el, false) } }
        }
        .contextMenu {
            Button("Move up") { onStep(el, true) }.disabled(i == 0)
            Button("Move down") { onStep(el, false) }.disabled(i == elements.count - 1)
        }
    }

    private func icon(_ name: String, _ label: String, on: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: name).foregroundStyle(on ? Theme.accent : Theme.muted).frame(width: 32, height: 32)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(Text(LocalizedStringKey(label)))
    }
}
