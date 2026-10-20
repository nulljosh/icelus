import SwiftUI

/// The copy deck (CopyDeck.swift): every run of words on the canvas, one field each. A field commits when you
/// press Return or leave it, as one step of undo. Translate is on the web (it needs the model).
struct CopySheet: View {
    let elements: [Element]
    let onEdit: ([String: String]) -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                let entries = copyEntries(elements)
                if entries.isEmpty { Text("No words on the canvas yet.").foregroundStyle(Theme.muted) }
                ForEach(entries, id: \.key) { e in CopyRow(entry: e, onEdit: onEdit) }
            }
            .navigationTitle("Copy")
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
        }
    }
}

private struct CopyRow: View {
    let entry: CopyEntry
    let onEdit: ([String: String]) -> Void
    @State private var draft = ""

    var body: some View {
        LabeledContent(LocalizedStringKey(entry.label)) {
            TextField("Words", text: $draft)
                .multilineTextAlignment(.trailing)
                .onSubmit(commit)
                .onDisappear(perform: commit)
        }
        .onAppear { draft = entry.text }
    }

    private func commit() { if draft != entry.text && !draft.isEmpty { onEdit([entry.key: draft]) } }
}
