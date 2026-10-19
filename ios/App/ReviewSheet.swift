import SwiftUI

/// Review: run the critique and list what to fix. Tap an issue to select its part. A port of
/// src/components/ReviewList.jsx.
struct ReviewSheet: View {
    let elements: [Element]
    let cols: Int, rows: Int
    var system: DesignSystem? = nil
    let onSelect: (String) -> Void
    var onRemove: ([String]) -> Void = { _ in }
    @State private var issues: [CritiqueIssue]?
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                if let system { LabeledContent("Design system", value: system.name) }
                Button("Check now") { issues = critique(elements, cols: cols, rows: rows, system: system) }
                if let issues, issues.isEmpty { Text("Nothing to fix").foregroundStyle(Theme.muted) }
                let distractions = (issues ?? []).filter { $0.rule == "distraction" }.compactMap(\.id)
                if !distractions.isEmpty {
                    Button("Remove \(distractions.count) distractions") { onRemove(distractions); dismiss() }.foregroundStyle(Theme.accent)
                }
                ForEach(Array((issues ?? []).enumerated()), id: \.offset) { _, issue in
                    Button { if let id = issue.id { onSelect(id); dismiss() } } label: {
                        HStack(spacing: 12) {
                            Circle().strokeBorder(issue.severity == "info" ? Theme.muted : Theme.accent, lineWidth: 2)
                                .background(Circle().fill(issue.severity == "error" ? Theme.accent : .clear))
                                .frame(width: 8, height: 8)
                            message(issue).foregroundStyle(Theme.ink).frame(maxWidth: .infinity, alignment: .leading)
                        }
                    }
                    .buttonStyle(.plain)
                    .disabled(issue.id == nil)
                }
            }
            .navigationTitle("Review")
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
        }
    }

    private func name(_ id: String?) -> String {
        guard let el = elements.first(where: { $0.id == id }) else { return "" }
        return String(localized: String.LocalizationValue(el.label))
    }

    private func message(_ i: CritiqueIssue) -> Text {
        let part = name(i.id)
        switch i.rule {
        case "off_grid": return Text("\(part) runs off the grid")
        case "overlap": return Text("\(part) overlaps \(name(i.otherId))")
        case "broken_box": return Text("A box here is cut open")
        case "vague_label": return Text("\(part) says \"\(i.word ?? "")\", which is placeholder text")
        case "no_empty_state": return Text("\(part) has no empty state")
        case "no_error_state": return Text("\(part) has no error state")
        case "off_system": return Text("\(part) is off the \(i.style ?? "") style")
        case "distraction": return i.kind == "stray" ? Text("\(part): a few stray marks") : Text("\(part) shows nothing")
        default: return Text("Note on \(part): \(i.note ?? "")")
        }
    }
}
