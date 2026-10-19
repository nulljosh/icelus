// A sheet with one monospaced text box and two buttons. Edits a part's text, and types a whole screen.

import SwiftUI

struct TextSheet: View {
    let title: String
    let hint: String?
    let action: String
    @Binding var text: String
    let onDone: (String) -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(LocalizedStringKey(title)).font(.title2.bold()).foregroundStyle(Theme.ink)
            TextEditor(text: $text)
                .font(.system(.body, design: .monospaced))
                .scrollContentBackground(.hidden)
                .padding(12)
                .frame(minHeight: 160)
                .background(Theme.background, in: RoundedRectangle(cornerRadius: 20))
            if let hint {
                Text(LocalizedStringKey(hint)).font(.footnote).foregroundStyle(Theme.muted)
            }
            HStack(spacing: 12) {
                Spacer()
                Button("Cancel") { dismiss() }
                    .keyboardShortcut(.cancelAction)
                Button(LocalizedStringKey(action)) { onDone(text); dismiss() }
                    .keyboardShortcut(.defaultAction)
                    .buttonStyle(.borderedProminent)
                    .tint(Theme.accent)
            }
            .controlSize(.large)
        }
        .padding(24)
        .frame(minWidth: 360)
        .background(Theme.canvas)
        .presentationDetents([.medium, .large])
    }
}
