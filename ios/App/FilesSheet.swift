import SwiftUI

/// Files, a port of src/components/FilesPanel.jsx: new from a template (blank, or a few linked screens), then
/// every file, the open one first. Tap to open; swipe or long-press to rename, copy or delete.
struct FilesSheet: View {
    let library: FileIndex
    let onOpen: (String) -> Void
    let onCreate: (String) -> Void
    let onDuplicate: (String) -> Void
    let onDelete: (String) -> Void
    let onRename: (String, String) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var renaming: FileEntry?
    @State private var draft = ""

    private var sorted: [FileEntry] {
        library.files.sorted { a, b in a.id == library.current ? true : b.id == library.current ? false : a.updated > b.updated }
    }

    var body: some View {
        NavigationStack {
            List {
                Section("New file") {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 104), spacing: 12)], spacing: 12) {
                        ForEach(fileTemplates, id: \.id) { t in
                            Button { onCreate(t.id); dismiss() } label: {
                                VStack(alignment: .leading, spacing: 8) {
                                    TemplateThumb(id: t.id)
                                    Text(LocalizedStringKey(t.name)).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.ink).lineLimit(1).minimumScaleFactor(0.8).padding(.horizontal, 4)
                                }
                                .padding(8)
                                .background(Theme.background, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.vertical, 8)
                }
                Section("Your files") {
                    ForEach(sorted) { f in
                        Button { onOpen(f.id); dismiss() } label: {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(verbatim: f.name).fontWeight(f.id == library.current ? .semibold : .regular).foregroundStyle(Theme.ink)
                                Text(f.id == library.current ? String(localized: "Open now") : f.updated > 0 ? Date(timeIntervalSince1970: f.updated / 1000).formatted(.relative(presentation: .named)) : "")
                                    .font(.footnote).foregroundStyle(f.id == library.current ? Theme.accent : Theme.muted)
                            }
                            .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .swipeActions {
                            if library.files.count > 1 { Button("Delete", role: .destructive) { onDelete(f.id) } }
                            Button("Duplicate") { onDuplicate(f.id); dismiss() }.tint(Theme.accent)
                        }
                        .contextMenu {
                            Button("Rename") { draft = f.name; renaming = f }
                            Button("Duplicate") { onDuplicate(f.id); dismiss() }
                            if library.files.count > 1 { Button("Delete", role: .destructive) { onDelete(f.id) } }
                        }
                    }
                }
            }
            .navigationTitle("Files")
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
            .alert("Rename", isPresented: Binding(get: { renaming != nil }, set: { if !$0 { renaming = nil } })) {
                TextField("Name", text: $draft)
                Button("Save") { if let f = renaming { onRename(f.id, draft) }; renaming = nil }
                Button("Cancel", role: .cancel) { renaming = nil }
            }
        }
        #if os(macOS)
        .frame(minWidth: 520, minHeight: 560)
        #endif
    }
}

/// A template's first screen drawn small in the real look, or the dot grid for Blank.
private struct TemplateThumb: View {
    let id: String
    var body: some View {
        let els = templateProject(id).elements // a few dozen parts: cheap enough to build each time
        let view = startScreen(els).flatMap { playView(els, $0.id) }
        ZStack {
            RoundedRectangle(cornerRadius: 12, style: .continuous).fill(Theme.canvas)
            if let v = view {
                let w = CGFloat(v.cols) * 3, h = CGFloat(v.rows) * 7, scale = min(1, 96 / w, 64 / h)
                RealLayerView(elements: v.elements, charW: 3, rowH: 7, fontSize: 5.5)
                    .frame(width: w, height: h, alignment: .topLeading)
                    .scaleEffect(scale)
                    .frame(width: w * scale, height: h * scale)
            } else {
                Canvas { context, size in
                    for x in stride(from: 4.0, to: size.width, by: 8) { for y in stride(from: 4.0, to: size.height, by: 8) {
                        context.fill(Path(ellipseIn: CGRect(x: x - 0.75, y: y - 0.75, width: 1.5, height: 1.5)), with: .color(Theme.rule))
                    } }
                }
            }
        }
        .frame(height: 76)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}
