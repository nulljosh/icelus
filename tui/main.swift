import Foundation
import SwiftTUI

// The terminal companion reads and writes the same project.json as the web and the apps.
// Engine.swift and Presets.swift here are symlinks to ios/App, so all of them draw the same way.
//
//   icelus-tui                                  the 38 parts
//   icelus-tui project.json                     view a project
//   icelus-tui render project.json [--ascii]    print it, trimmed, for pipes
//   icelus-tui place project.json button 4 2   add a part and save (creates the file)

func load(_ path: String) -> EditorState? {
    guard let json = try? String(contentsOfFile: path, encoding: .utf8) else { return nil }
    return parseProject(json)
}

func fail(_ message: String) -> Never {
    FileHandle.standardError.write((message + "\n").data(using: .utf8)!)
    exit(1)
}

struct Card: View {
    let title: String
    let lines: [String]

    var body: some View {
        VStack(alignment: .leading) {
            Text(title).bold()
            ForEach(lines.indices, id: \.self) { Text(lines[$0]) }
        }
        .padding()
        .border()
    }
}

let args = Array(CommandLine.arguments.dropFirst())

switch args.first {
case "render":
    guard args.count >= 2, let state = load(args[1]) else { fail("usage: icelus-tui render project.json [--ascii]") }
    let text = trimText(state.text)
    print(args.contains("--ascii") ? toAscii(text) : text)
case "place":
    guard args.count == 5, let preset = preset(id: args[2]), let col = Int(args[3]), let row = Int(args[4]) else {
        fail("usage: icelus-tui place project.json <part> <col> <row>\nparts: " + presets.map(\.id).joined(separator: " "))
    }
    var state = load(args[1]) ?? EditorState()
    state.elements.append(createElement(preset, col: col, row: row))
    do { try serializeProject(state).write(toFile: args[1], atomically: true, encoding: .utf8) } catch { fail("\(error)") }
    print(trimText(state.text))
case let path?:
    guard let state = load(path) else { fail("not a Icelus project: \(path)") }
    let names = state.elements.map(\.label).joined(separator: ", ")
    Application(rootView: Card(title: "\(path), \(state.elements.count) parts: \(names)",
                               lines: trimText(state.text).components(separatedBy: "\n"))).start()
case nil:
    Application(rootView: Card(title: "Icelus parts",
                               lines: presets.map { "\($0.id) (\($0.category)): \($0.template.first ?? "")" })).start()
}
