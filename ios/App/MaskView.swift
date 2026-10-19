import SwiftUI

/// Crop and Clip to for the picked part (Mask.swift), next to its colors. The twin of the web inspector's rows.
struct MaskControls: View {
    let el: Element
    let others: [Element]
    let apply: (Inset?, String?) -> Void
    @State private var cropping = false

    var body: some View {
        Button("Crop") { cropping = true }
            .popover(isPresented: $cropping) {
                VStack(alignment: .leading, spacing: 12) {
                    side("Crop top", \.top)
                    side("Crop right", \.right)
                    side("Crop bottom", \.bottom)
                    side("Crop left", \.left)
                }
                .padding(16)
                .frame(minWidth: 240)
            }
        Picker("Clip to", selection: Binding(get: { el.clip ?? "" }, set: { apply(nil, $0) })) {
            Text("None").tag("")
            ForEach(others) { o in Text(verbatim: o.text?.split(separator: "\n").first.map(String.init) ?? o.label).tag(o.id) }
        }
        .pickerStyle(.menu)
        .fixedSize()
    }

    private func side(_ label: LocalizedStringKey, _ key: WritableKeyPath<Inset, Int>) -> some View {
        let now = (el.mask ?? Inset())[keyPath: key]
        return Stepper(value: Binding(get: { now }, set: { v in var m = el.mask ?? Inset(); m[keyPath: key] = v; apply(m, nil) }), in: 0...500) {
            HStack { Text(label); Spacer(); Text(verbatim: "\(now)").monospacedDigit().foregroundStyle(Theme.muted) }
        }
    }
}
