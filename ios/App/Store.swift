// On-device persistence: the canvas survives relaunch.
//
// ponytail: one project.json in Application Support, not a DocumentGroup. The app edits
// exactly one canvas, and the file is the same project JSON the web app opens.

import Foundation

enum Store {
    private static func fileURL(_ name: String) -> URL? {
        guard let dir = try? FileManager.default.url(
            for: .applicationSupportDirectory, in: .userDomainMask,
            appropriateFor: nil, create: true
        ) else { return nil }
        return dir.appendingPathComponent(name)
    }

    static func load() -> EditorState? {
        if let url = fileURL("project.json"), let json = try? String(contentsOf: url, encoding: .utf8) {
            if let state = parseProject(json) { return state }
            // Set an unreadable file aside so the next autosave cannot overwrite it.
            if let aside = fileURL("project-unreadable-\(Int(Date().timeIntervalSince1970)).json") {
                try? FileManager.default.moveItem(at: url, to: aside)
            }
        }
        // Up to 2.0 the canvas was saved as plain text. Bring it back as one element.
        guard let url = fileURL("canvas.txt"),
              let text = try? String(contentsOf: url, encoding: .utf8) else { return nil }
        let lines = trimText(text).split(separator: "\n", omittingEmptySubsequences: false).map(String.init)
        guard lines != [""] else { return nil }
        var state = EditorState()
        state.elements = [createElement(Preset(id: "custom", label: "Drawing", category: "Custom", template: lines), col: 0, row: 0)]
        return state
    }

    static func save(_ state: EditorState) {
        guard let url = fileURL("project.json") else { return }
        try? serializeProject(state).write(to: url, atomically: true, encoding: .utf8)
    }
}
