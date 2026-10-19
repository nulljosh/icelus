import SwiftUI

/// The layer list: every part, front first. Tap a name to select it (the only way to pick a locked part),
/// hide it, lock it, or step it up and down. A port of src/components/LayerList.jsx.
struct LayersSheet: View {
    let elements: [Element]
    let selectedId: String?
    let onSelect: (String) -> Void
    let onFlag: (Element, _ hidden: Bool?, _ locked: Bool?) -> Void
    let onStep: (Element, _ up: Bool) -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                ForEach(Array(elements.reversed().enumerated()), id: \.element.id) { i, el in
                    HStack(spacing: 12) {
                        Button { onSelect(el.id); dismiss() } label: {
                            Text(LocalizedStringKey(el.text?.components(separatedBy: "\n").first ?? el.label))
                                .foregroundStyle(el.id == selectedId ? Theme.accent : el.hidden ? Theme.muted : Theme.ink)
                                .lineLimit(1)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                        .buttonStyle(.plain)
                        icon(el.hidden ? "eye.slash" : "eye", el.hidden ? "Show" : "Hide", on: el.hidden) { onFlag(el, !el.hidden, nil) }
                        icon(el.locked ? "lock" : "lock.open", el.locked ? "Unlock" : "Lock", on: el.locked) { onFlag(el, nil, !el.locked) }
                        icon("arrow.up", "Move up", on: false) { onStep(el, true) }.disabled(i == 0)
                        icon("arrow.down", "Move down", on: false) { onStep(el, false) }.disabled(i == elements.count - 1)
                    }
                }
            }
            .navigationTitle("Layers")
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
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
