import SwiftUI

/// Color and width variables in the Canvas menu (Modes.swift): the color mode, each named color's light and dark
/// value, each named width, and adding or removing them. Parts bind to them in the color pickers.
struct CanvasVarsMenu: View {
    let elements: [Element]
    let edit: (([Element]) -> [Element]) -> Void

    var body: some View {
        let colors = canvasColors(elements), widths = canvasWidths(elements)
        let colorNames = colors.keys.sorted(), widthNames = widths.keys.sorted()
        Divider()
        Picker("Color Mode", selection: Binding(get: { colorMode(elements) }, set: { m in edit { setColorMode($0, m) } })) {
            Text("Light").tag("light")
            Text("Dark").tag("dark")
        }
        ForEach(colorNames, id: \.self) { name in
            let pair = colors[name] ?? [4, 12]
            Menu {
                colorPicker("Light", pair[0]) { v in edit { setColorVar($0, name, [v, pair[1]]) } }
                colorPicker("Dark", pair[1]) { v in edit { setColorVar($0, name, [pair[0], v]) } }
            } label: { Text(verbatim: name) }
        }
        if colorNames.count < varMax {
            Button("Add Color") { edit { setColorVar($0, fresh(colors.keys, "color"), [4, 12]) } }
        }
        ForEach(widthNames, id: \.self) { name in
            let now = widths[name] ?? 20
            Picker(selection: Binding(get: { now }, set: { v in edit { setWidthVar($0, name, v) } })) {
                ForEach(Array(Set(Array(stride(from: 4, through: 120, by: 2)) + [now])).sorted(), id: \.self) { Text("\($0)").tag($0) }
            } label: { Text(verbatim: name) }
        }
        if widthNames.count < varMax {
            Button("Add Width") { edit { setWidthVar($0, fresh(widths.keys, "width"), 20) } }
        }
        if !colorNames.isEmpty || !widthNames.isEmpty {
            Menu("Remove") {
                ForEach(colorNames, id: \.self) { name in Button(name) { edit { setColorVar($0, name, nil) } } }
                ForEach(widthNames, id: \.self) { name in Button(name) { edit { setWidthVar($0, name, nil) } } }
            }
        }
    }

    private func colorPicker(_ label: LocalizedStringKey, _ value: Int, _ set: @escaping (Int) -> Void) -> some View {
        Picker(label, selection: Binding(get: { value }, set: set)) {
            ForEach(0..<terminalColors.count, id: \.self) { i in
                Text(i < 8 ? LocalizedStringKey(terminalColors[i].name) : "Bright \(String(localized: String.LocalizationValue(terminalColors[i - 8].name)))").tag(i)
            }
        }
    }

    private func fresh<S: Sequence>(_ taken: S, _ base: String) -> String where S.Element == String {
        let set = Set(taken)
        if !set.contains(base) { return base }
        return (2...99).map { "\(base)-\($0)" }.first { !set.contains($0) } ?? "\(base)-0"
    }
}

/// A live part's variable name for play (Play.swift). Saved on Return or when focus leaves, so typing is one undo step.
struct SetsField: View {
    let value: String?
    let save: (String?) -> Void
    @State private var draft = ""
    @FocusState private var focused: Bool

    var body: some View {
        TextField("Sets Variable", text: $draft, prompt: Text(verbatim: "name"))
            .textFieldStyle(.roundedBorder)
            .frame(maxWidth: 160)
            .autocorrectionDisabled()
            .focused($focused)
            .onAppear { draft = value ?? "" }
            .onChange(of: value) { _, v in draft = v ?? "" }
            .onSubmit(commit)
            .onChange(of: focused) { _, on in if !on { commit() } }
    }

    private func commit() {
        let v = draft.trimmingCharacters(in: .whitespaces).lowercased()
        if v != (value ?? "") { save(v.isEmpty ? nil : v) }
    }
}

/// A live code part's HTML (Play.swift setHtml). Saved when focus leaves, so a whole edit is one undo step.
struct HtmlField: View {
    let value: String?
    let save: (String) -> Void
    @State private var draft = ""
    @FocusState private var focused: Bool

    var body: some View {
        TextField("HTML", text: $draft, prompt: Text(verbatim: "<button>Hi</button>"), axis: .vertical)
            .textFieldStyle(.roundedBorder)
            .font(.system(.footnote, design: .monospaced))
            .lineLimit(3...8)
            .frame(maxWidth: 260)
            .autocorrectionDisabled()
            .focused($focused)
            .onAppear { draft = value ?? "" }
            .onChange(of: value) { _, v in draft = v ?? "" }
            .onChange(of: focused) { _, on in if !on, draft != (value ?? "") { save(draft) } }
    }
}
