import SwiftUI

/// Files (Files.swift): switching, making, copying and removing files. A file opens with its own undo history.
extension ContentView {
    var fileName: String { library.files.first { $0.id == library.current }?.name ?? "Untitled" }

    private func show(_ next: EditorState) {
        state = next; selectedId = nil; picked = []; fitted = false
        persist()
    }

    func openFile(_ id: String) {
        guard id != library.current else { return }
        library = touchFile(library, id: library.current); library.current = id
        show(FileLibrary.load(id) ?? templateProject("blank"))
        FileLibrary.saveIndex(library)
    }

    func createFile(_ templateId: String) {
        let id = newFileId(), project = templateProject(templateId)
        let name = templateId == "blank" ? "Untitled" : fileTemplates.first { $0.id == templateId }?.name ?? "Untitled"
        library = addFile(touchFile(library, id: library.current), id: id, name: name)
        show(project)
        FileLibrary.saveIndex(library)
    }

    func duplicateFile(_ id: String) {
        guard let source = id == library.current ? state : FileLibrary.load(id) else { return }
        let copy = newFileId(), name = library.files.first { $0.id == id }?.name ?? "Untitled"
        library = addFile(touchFile(library, id: library.current), id: copy, name: "\(name) copy")
        var fresh = EditorState(cols: source.cols, rows: source.rows)
        fresh.elements = source.elements
        show(fresh)
        FileLibrary.saveIndex(library)
    }

    func deleteFile(_ id: String) {
        let next = removeFile(library, id: id)
        guard next != library else { return }
        FileLibrary.delete(id)
        let reopen = id == library.current
        library = next
        if reopen, let current = next.current { show(FileLibrary.load(current) ?? templateProject("blank")) }
        FileLibrary.saveIndex(library)
    }

    func renameOpenFile(_ id: String, _ name: String) {
        library = renameFile(library, id: id, name: name)
        FileLibrary.saveIndex(library)
    }

    /// The open file's name, which opens Files: the document title, like Pages or Freeform.
    var fileTitle: some View {
        Button { showingFiles = true } label: {
            HStack(spacing: 4) {
                Text(verbatim: fileName).font(.subheadline.weight(.semibold)).lineLimit(1).truncationMode(.tail)
                Image(systemName: "chevron.down").font(.caption.weight(.semibold)).foregroundStyle(Theme.muted)
            }
            .foregroundStyle(Theme.ink)
            .padding(.horizontal, 12).frame(minHeight: 44)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(Text("Files, \(fileName)"))
    }
}
