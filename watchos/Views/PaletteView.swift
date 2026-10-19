// Component picker, adapted for the watch: a vertical list grouped by category instead of
// iOS's horizontal scroller — there's no room on a 41-45mm screen for a horizontal rail.

import SwiftUI

struct PaletteView: View {
    @Binding var selection: Preset?
    @Binding var erasing: Bool

    var body: some View {
        List {
            ForEach(presetCategories, id: \.self) { category in
                Section(category.uppercased()) {
                    ForEach(presets.filter { $0.category == category }) { preset in
                        row(preset)
                    }
                }
            }
        }
        .listStyle(.carousel)
    }

    private func row(_ preset: Preset) -> some View {
        let isSelected = !erasing && selection?.id == preset.id
        return Button {
            erasing = false
            selection = isSelected ? nil : preset
        } label: {
            HStack {
                Text(preset.label)
                    .foregroundStyle(isSelected ? Theme.accent : Theme.ink)
                Spacer()
                if isSelected {
                    Image(systemName: "checkmark")
                        .foregroundStyle(Theme.accent)
                }
            }
        }
        .accessibilityLabel("\(preset.label), \(preset.width) by \(preset.height) characters")
        .accessibilityAddTraits(isSelected ? [.isSelected] : [])
    }
}
