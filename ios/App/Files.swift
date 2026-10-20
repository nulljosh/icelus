import Foundation

/// Files, a port of src/lib/files.js: the open file is the working canvas (Store's project.json), every file is
/// kept as its own project JSON in Application Support/Files, and an index keeps the names. A new file starts blank
/// or from a template whose buttons are already linked (Hotspots.swift), so Play walks the flow at once.
let filesMax = 100, fileNameMax = 60

struct FileTemplate { let id: String; let name: String; let screens: [(String, String)]; let links: [(Int, String, Int)] }

let fileTemplates: [FileTemplate] = [
    FileTemplate(id: "blank", name: "Blank", screens: [], links: []),
    FileTemplate(id: "sign-in", name: "Sign in", screens: [
        ("Sign in", "# Welcome back\n\"Email\"\n\"Password\"\n[x] Remember me\n[Sign in]  [Create account]"),
        ("Create account", "# Create account\n\"Name\"\n\"Email\"\n\"Password\"\n[x] I agree to the terms\n[Create account]  [Back]"),
        ("Home", "# Home\nYou are signed in.\n---\n[Settings]  [Sign out]"),
    ], links: [(0, "Sign in", 2), (0, "Create account", 1), (1, "Create account", 2), (1, "Back", 0), (2, "Sign out", 0)]),
    FileTemplate(id: "onboarding", name: "Onboarding", screens: [
        ("Welcome", "# Welcome\nSketch a screen in a minute.\nShare it as plain text.\n\n[Next]"),
        ("Notifications", "# Stay in the loop\nWe tell you when a teammate\nleaves a note.\n[x] Allow notifications\n[Next]  [Skip]"),
        ("Ready", "# You are all set\nYour first screen is waiting.\n\n[Start]"),
    ], links: [(0, "Next", 1), (1, "Next", 2), (1, "Skip", 2)]),
    FileTemplate(id: "settings", name: "Settings", screens: [
        ("Settings", "# Settings\n[Account]\n[x] Notifications\n[ ] Dark mode\n[v English]\n---\n[Sign out]"),
        ("Account", "# Account\n\"Name\"\n\"Email\"\n[Save]  [Back]"),
    ], links: [(0, "Account", 1), (1, "Back", 0), (1, "Save", 0)]),
    FileTemplate(id: "inbox", name: "Inbox", screens: [
        ("Inbox", "# Inbox\n\"Search\"\n| From | Subject |\n| Ada | Lunch? |\n| Grace | The build |\n[Open]  [Compose]"),
        ("Message", "# Lunch?\nFrom Ada, 12:04\n---\nAre you free at one?\n[Reply]  [Back]"),
        ("Compose", "# New message\n\"To\"\n\"Subject\"\n\"Message\"\n[Send]  [Cancel]"),
    ], links: [(0, "Open", 1), (0, "Compose", 2), (1, "Back", 0), (1, "Reply", 2), (2, "Send", 0), (2, "Cancel", 0)]),
    FileTemplate(id: "checkout", name: "Checkout", screens: [
        ("Cart", "# Your cart\n| Item | Price |\n| Lamp | $40 |\n| Rug | $120 |\nTotal $160\n[Check out]"),
        ("Payment", "# Payment\n\"Card number\"\n\"Expiry\"  \"CVC\"\n[x] Save this card\n[Pay $160]  [Back]"),
        ("Done", "# Thank you\nYour order is on its way.\n\n[Keep shopping]"),
    ], links: [(0, "Check out", 1), (1, "Pay $160", 2), (1, "Back", 0), (2, "Keep shopping", 0)]),
]

/// A template as a canvas: its screens in a row, six cells apart, linked as listed. Blank is an empty canvas.
func templateProject(_ id: String) -> EditorState {
    let t = fileTemplates.first { $0.id == id } ?? fileTemplates[0]
    var col = 2, elements: [Element] = [], frames: [[Element]] = []
    for (name, source) in t.screens {
        let els = screenTemplate(name, source, col: col, row: 2)
        frames.append(els); elements += els
        col += els[0].width + 6
    }
    let words = { (el: Element) in (el.text ?? el.template.joined(separator: " ")).replacingOccurrences(of: "[", with: "").replacingOccurrences(of: "]", with: "").trimmingCharacters(in: .whitespaces) }
    for (from, label, to) in t.links {
        guard from < frames.count, to < frames.count, let button = frames[from].first(where: { $0.presetId == "button" && words($0) == label }) else { continue }
        elements = updateElement(elements, id: button.id, opens: frames[to][0].id)
    }
    let cols = min(500, max(defaultCols, (elements.map { $0.col + $0.width }.max() ?? 0) + 4))
    let rows = min(500, max(defaultRows, (elements.map { $0.row + $0.height }.max() ?? 0) + 4))
    var state = EditorState(cols: cols, rows: rows)
    state.elements = elements
    return state
}

struct FileEntry: Equatable, Identifiable { let id: String; var name: String; var updated: Double }
struct FileIndex: Equatable { var files: [FileEntry] = []; var current: String? }

func newFileId() -> String { "f-" + String(UUID().uuidString.lowercased().filter { $0.isLetter || $0.isNumber }.prefix(16)) }
func cleanFileName(_ name: String) -> String {
    String(name.filter { !($0.asciiValue.map { $0 < 32 } ?? false) && !$0.isNewline }.trimmingCharacters(in: .whitespaces).prefix(fileNameMax))
}

/// The index from storage, untrusted: bad rows are dropped, at most filesMax kept, an unknown current falls back.
func cleanIndex(_ data: Data?) -> FileIndex {
    guard let data, let raw = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] else { return FileIndex() }
    var seen = Set<String>(), files: [FileEntry] = []
    for case let f as [String: Any] in raw["files"] as? [Any] ?? [] {
        guard let id = f["id"] as? String, id.range(of: "^f-[a-z0-9]{1,32}$", options: .regularExpression) != nil, seen.insert(id).inserted else { continue }
        let name = cleanFileName(f["name"] as? String ?? "")
        files.append(FileEntry(id: id, name: name.isEmpty ? "Untitled" : name, updated: (f["updated"] as? NSNumber)?.doubleValue ?? 0))
        if files.count == filesMax { break }
    }
    let current = raw["current"] as? String
    return FileIndex(files: files, current: files.contains { $0.id == current } ? current : files.first?.id)
}

func serializeIndex(_ index: FileIndex) -> Data {
    let files = index.files.map { ["id": $0.id, "name": $0.name, "updated": $0.updated] as [String: Any] }
    return (try? JSONSerialization.data(withJSONObject: ["files": files, "current": index.current as Any])) ?? Data()
}

/// A name not already taken: Sign in, then Sign in 2, Sign in 3.
func uniqueFileName(_ index: FileIndex, _ base: String) -> String {
    let clean = cleanFileName(base), name = clean.isEmpty ? "Untitled" : clean, taken = Set(index.files.map(\.name))
    guard taken.contains(name) else { return name }
    var n = 2
    while taken.contains("\(name) \(n)") { n += 1 }
    return "\(name) \(n)"
}

func addFile(_ index: FileIndex, id: String, name: String, now: Double = Date().timeIntervalSince1970 * 1000) -> FileIndex {
    guard index.files.count < filesMax else { return index }
    return FileIndex(files: [FileEntry(id: id, name: uniqueFileName(index, name), updated: now)] + index.files, current: id)
}
func renameFile(_ index: FileIndex, id: String, name: String) -> FileIndex {
    var next = index
    if !cleanFileName(name).isEmpty, let i = next.files.firstIndex(where: { $0.id == id }) { next.files[i].name = cleanFileName(name) }
    return next
}
func touchFile(_ index: FileIndex, id: String?, now: Double = Date().timeIntervalSince1970 * 1000) -> FileIndex {
    var next = index
    if let i = next.files.firstIndex(where: { $0.id == id }) { next.files[i].updated = now }
    return next
}
/// There is always one file open, so the last one is never removed.
func removeFile(_ index: FileIndex, id: String) -> FileIndex {
    guard index.files.count > 1 else { return index }
    let files = index.files.filter { $0.id != id }
    return FileIndex(files: files, current: index.current == id ? files.first?.id : index.current)
}

/// Where the files live: Application Support/Files/index.json and one <id>.json each.
enum FileLibrary {
    private static var dir: URL? {
        guard let base = try? FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true) else { return nil }
        let d = base.appendingPathComponent("Files", isDirectory: true)
        try? FileManager.default.createDirectory(at: d, withIntermediateDirectories: true)
        return d
    }
    private static func url(_ id: String) -> URL? { dir?.appendingPathComponent("\(id).json") }
    /// The index, or a new one that files the canvas already open as Untitled.
    static func loadIndex() -> FileIndex {
        let index = cleanIndex(dir.flatMap { try? Data(contentsOf: $0.appendingPathComponent("index.json")) })
        return index.files.isEmpty ? addFile(index, id: newFileId(), name: "Untitled") : index
    }
    static func saveIndex(_ index: FileIndex) { if let u = dir?.appendingPathComponent("index.json") { try? serializeIndex(index).write(to: u, options: .atomic) } }
    static func load(_ id: String) -> EditorState? { url(id).flatMap { try? String(contentsOf: $0, encoding: .utf8) }.flatMap(parseProject) }
    static func save(_ id: String, _ state: EditorState) { if let u = url(id) { try? serializeProject(state).write(to: u, atomically: true, encoding: .utf8) } }
    static func delete(_ id: String) { if let u = url(id) { try? FileManager.default.removeItem(at: u) } }
}
