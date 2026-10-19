import SwiftUI

/// The History sheet: snapshots on top, then every step by name, newest first. Tap a step to jump there;
/// steps after it stay redoable (dimmed) until the next edit. A port of src/components/HistoryList.jsx.
/// Actions: Record closes the sheet so you can edit; open it again to stop, then Play replays on the selection.
struct HistorySheet: View {
    @Binding var state: EditorState
    let targets: [String]
    let onChange: () -> Void
    let onPlay: () -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        let at = state.history.count
        let steps = Array(state.timeline.enumerated()).reversed()
        NavigationStack {
            List {
                Section("Snapshots") {
                    ForEach(state.snapshots.indices, id: \.self) { i in
                        HStack(spacing: 12) {
                            TextField("Snapshot name", text: Binding(get: { state.snapshots[i].name },
                                                                    set: { state.snapshots[i].name = String($0.prefix(60)) }))
                                .onSubmit { state.snapshots[i].name = cleanSnapshotName(state.snapshots[i].name, i + 1); onChange() }
                            Button("Restore") { restore(i) }.buttonStyle(.borderless).foregroundStyle(Theme.accent)
                        }
                    }
                    .onDelete { state.snapshots.remove(atOffsets: $0); onChange() }
                    Button("Take Snapshot") { state.snapshots = takeSnapshot(state.snapshots, state.elements); onChange() }
                        .foregroundStyle(Theme.accent)
                }
                Section("Actions") {
                    ForEach(state.actions.indices, id: \.self) { i in
                        HStack(spacing: 12) {
                            TextField("Action name", text: Binding(get: { state.actions[i].name },
                                                                  set: { state.actions[i].name = String($0.prefix(60)) }))
                                .onSubmit { state.actions[i].name = cleanActionName(state.actions[i].name, i + 1); onChange() }
                            Button { play(i) } label: { Image(systemName: "play.fill") }
                                .buttonStyle(.borderless).foregroundStyle(Theme.accent).disabled(targets.isEmpty)
                                .accessibilityLabel("Play on selection")
                        }
                    }
                    .onDelete { state.actions.remove(atOffsets: $0); onChange() }
                    if let from = state.recording {
                        Button("Stop Recording (\(recordAction(state, from: from).steps.count) steps)") { stop(from) }
                            .foregroundStyle(Theme.accent).fontWeight(.semibold)
                    } else {
                        Button("Record Action") { state.recording = state.history.count; dismiss() }
                            .foregroundStyle(Theme.accent)
                    }
                }
                Section("Steps") {
                    ForEach(steps, id: \.offset) { i, step in
                        Button { state.goToStep(i); onChange() } label: {
                            HStack {
                                Text(label(step))
                                    .foregroundStyle(i == at ? Theme.accent : i > at ? Theme.muted : Theme.ink)
                                    .fontWeight(i == at ? .semibold : .regular)
                                    .lineLimit(1)
                                Spacer()
                                if i == at { Image(systemName: "checkmark").foregroundStyle(Theme.accent) }
                            }
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .navigationTitle("History")
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { onChange(); dismiss() } } }
        }
    }

    private func stop(_ from: Int) {
        let made = recordAction(state, from: from, count: state.actions.count)
        state.recording = nil
        if !made.steps.isEmpty { state.actions = saveAction(state.actions, made) }
        onChange()
    }

    private func play(_ i: Int) {
        let out = playAction(state.elements, state.actions[i].steps, ids: targets, cols: state.cols, rows: state.rows)
        guard out != state.elements else { return }
        state.pushHistory()
        state.elements = out
        onPlay()
        dismiss()
    }

    private func restore(_ i: Int) {
        state.pushHistory()
        state.elements = state.snapshots[i].elements
        onChange()
    }

    private func label(_ step: Step) -> String {
        let part = step.element.map { $0.text?.components(separatedBy: "\n").first ?? String(localized: String.LocalizationValue($0.label)) } ?? ""
        switch (step.kind, step.count > 1) {
        case ("start", _): return String(localized: "Opened")
        case ("reorder", _): return String(localized: "Reorder parts")
        case ("replace", _): return String(localized: "Replace canvas")
        case ("clear", _): return String(localized: "Clear canvas")
        case ("change", _): return String(localized: "Change \(step.count) parts")
        case ("add", true): return String(localized: "Add \(step.count) parts")
        case ("delete", true): return String(localized: "Delete \(step.count) parts")
        case ("move", true): return String(localized: "Move \(step.count) parts")
        case ("edit", true): return String(localized: "Edit \(step.count) parts")
        case (_, _) where step.element == nil: return String(localized: "Edit canvas")
        case ("add", _): return String(localized: "Add \(part)")
        case ("delete", _): return String(localized: "Delete \(part)")
        case ("move", _): return String(localized: "Move \(part)")
        default: return String(localized: "Edit \(part)")
        }
    }
}
