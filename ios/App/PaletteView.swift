// Component palette, grouped by category. Parts come first and four everyday tools after them; the other
// tools and the packs show with More, the same split as the web.

import SwiftUI

struct PaletteView: View {
    @Binding var selection: Preset?
    @Binding var erasing: Bool
    @AppStorage("glyphic-palette") private var mineRaw = "[]"
    @AppStorage("glyphbox-more") private var showMore = false
    private var mine: [Preset] { parsePalette(mineRaw) }

    /// The tools past the everyday four, in three sections so none of them crowds the basics. Same as the web.
    private static let toolGroups: [String: String] = [
        "brush": "Paint", "gradient": "Paint", "fill": "Paint", "adjust": "Paint", "marquee": "Pick", "wand": "Pick",
        "type": "More tools", "capture": "More tools", "photo-braille": "More tools", "photo-shade": "More tools",
        "trace": "More tools", "banner": "More tools", "boxy": "More tools",
    ]
    private static var moreIds: Set<String> { Set(toolGroups.keys) }
    private var everydayTools: [Preset] { ["line", "text", "photo", "screen"].compactMap { id in drawTools.first { $0.id == id } } }
    private var moreTools: [Preset] { drawTools.filter { Self.moreIds.contains($0.id) } }
    private func group(of p: Preset) -> String { Self.toolGroups[p.id] ?? p.category }

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(alignment: .top, spacing: 24) {
                ForEach(presetCategories + ["Draw"] + (mine.isEmpty ? [] : [mineCategory]) + ["Screens"] + (showMore ? ["Paint", "Pick", "More tools"] + packCategories : []), id: \.self) { category in
                    categoryColumn(category)
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 14)
        }
        .background(Theme.background)
    }

    private func categoryColumn(_ category: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(LocalizedStringKey(category)).textCase(.uppercase)
                .font(.caption2)
                .tracking(1.2)
                .foregroundStyle(Theme.muted)

            HStack(spacing: 8) {
                ForEach((everydayTools + moreTools + mine + screenTemplates + presets + packs).filter { group(of: $0) == category }) { preset in
                    chip(preset)
                        .contextMenu {
                            if preset.category == mineCategory {
                                Button("Remove from palette", role: .destructive) {
                                    mineRaw = serializePalette(mine.filter { $0.id != preset.id })
                                }
                            }
                        }
                }
            }
        }
    }

    private func chip(_ preset: Preset) -> some View {
        let isSelected = !erasing && selection?.id == preset.id
        return Button {
            erasing = false
            selection = isSelected ? nil : preset
        } label: {
            Text(LocalizedStringKey(preset.label))
                .font(.subheadline)
                .foregroundStyle(isSelected ? Color.white : Theme.ink)
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(isSelected ? Theme.accent : Theme.canvas,
                            in: Capsule())
                .overlay(Capsule().strokeBorder(Theme.rule, lineWidth: isSelected ? 0 : 1))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(Text(LocalizedStringKey(preset.label)) + Text(", ") + Text("\(preset.width) by \(preset.height) characters"))
        .accessibilityAddTraits(isSelected ? [.isSelected] : [])
    }
}
