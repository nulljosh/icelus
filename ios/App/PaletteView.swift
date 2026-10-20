// Component palette, grouped by category. Parts come first and four everyday tools after them; the other
// tools and the packs show with More, the same split as the web.

import SwiftUI

struct PaletteView: View {
    @Binding var selection: Preset?
    @Binding var erasing: Bool
    /// The iPhone Add sheet lists the sections top to bottom in a grid; elsewhere it is one row that scrolls sideways.
    var vertical = false
    @AppStorage("glyphic-palette") private var mineRaw = "[]"
    @AppStorage("glyphbox-more") private var showMore = false
    @AppStorage("glyphbox-look") private var look = "real"
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

    private var categories: [String] {
        (mine.isEmpty ? [] : [mineCategory]) + presetCategories + ["Screens"] + (vertical ? [] : ["Draw"])
            + (showMore ? (vertical ? [] : ["Paint", "Pick", "More tools"]) + packCategories : [])
    }
    private func parts(in category: String) -> [Preset] {
        (everydayTools + moreTools + mine + screenTemplates + presets + packs).filter { group(of: $0) == category }
    }

    var body: some View {
        if vertical {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    ForEach(categories, id: \.self) { category in
                        VStack(alignment: .leading, spacing: 8) {
                            heading(category)
                            LazyVGrid(columns: [GridItem(.adaptive(minimum: 100), spacing: 8)], alignment: .leading, spacing: 8) {
                                ForEach(parts(in: category)) { chip($0) }
                            }
                        }
                    }
                }
                .padding(20)
            }
            .background(Theme.background)
        } else {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(alignment: .top, spacing: 24) {
                    ForEach(categories, id: \.self) { categoryColumn($0) }
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 14)
            }
            .fixedSize(horizontal: false, vertical: true) // one row tall, never a share of the screen
            .background(Theme.background)
        }
    }

    private func heading(_ category: String) -> some View {
        Text(LocalizedStringKey(category)).textCase(.uppercase).font(.caption2).tracking(1.2).foregroundStyle(Theme.muted)
    }

    private func categoryColumn(_ category: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            heading(category)
            HStack(alignment: .top, spacing: 8) {
                ForEach(parts(in: category)) { preset in
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

    /// A part drawn small as its real control (RealView.swift), the same thumbnail as the web parts list.
    /// Nil for tools and parts that keep their characters, and in the text look.
    private func thumb(_ preset: Preset) -> AnyView? {
        let el = createElement(preset, col: 0, row: 0)
        guard look == "real", !el.template.isEmpty, realPart(el) != nil else { return nil }
        let w = CGFloat(el.width) * 6, h = CGFloat(el.height) * 14, scale = min(1, 80 / w, 24 / h)
        return AnyView(RealLayerView(elements: [el], charW: 6, rowH: 14, fontSize: 12)
            .frame(width: w, height: h, alignment: .topLeading)
            .scaleEffect(scale, anchor: .topLeading)
            .frame(width: 80, height: 24, alignment: .leading)
            .clipped())
    }

    private func chip(_ preset: Preset) -> some View {
        let isSelected = !erasing && selection?.id == preset.id
        let picture = thumb(preset)
        return Button {
            erasing = false
            selection = isSelected ? nil : preset
        } label: {
            // A part with a real control shows it above its name, like a shape picker; a tool stays a capsule.
            if let picture {
                VStack(alignment: .leading, spacing: 6) {
                    picture
                    Text(LocalizedStringKey(preset.label)).font(.footnote).foregroundStyle(isSelected ? Theme.accent : Theme.ink)
                }
                .frame(maxWidth: vertical ? .infinity : nil, alignment: .leading)
                .padding(10)
                .background(isSelected ? Theme.accent.opacity(0.14) : Theme.canvas, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).strokeBorder(isSelected ? Theme.accent : Theme.rule, lineWidth: 1))
            } else {
                Text(LocalizedStringKey(preset.label))
                    .font(.subheadline)
                    .foregroundStyle(isSelected ? Color.white : Theme.ink)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .frame(maxWidth: vertical ? .infinity : nil, minHeight: vertical ? 66 : nil, alignment: .leading)
                    .background(isSelected ? Theme.accent : Theme.canvas,
                                in: Capsule())
                    .overlay(Capsule().strokeBorder(Theme.rule, lineWidth: isSelected ? 0 : 1))
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel(Text(LocalizedStringKey(preset.label)) + Text(", ") + Text("\(preset.width) by \(preset.height) characters"))
        .accessibilityAddTraits(isSelected ? [.isSelected] : [])
    }
}
