func runFileChecks() {
    for t in fileTemplates {
        let p = templateProject(t.id)
        check(p.elements.filter { $0.presetId == "screen" }.count == t.screens.count && p.elements.filter { $0.opens != nil }.count == t.links.count,
              "files: template \(t.id) builds its screens and links")
        check(parseProject(serializeProject(p))?.elements.count == p.elements.count, "files: template \(t.id) saves")
    }
    let onboarding = templateProject("onboarding").elements, next = onboarding.filter { $0.opens != nil }
    check(playPath(onboarding, start: startScreen(onboarding)!.id, presses: [next[0].id, next[1].id]).path.map(\.title) == ["Welcome", "Notifications", "Ready"],
          "files: a template plays straight away")
    check(templateProject("nope").elements.isEmpty, "files: an unknown template is blank")
    let raw = #"{"files":[{"id":"f-a","name":" Home\u0007 ","updated":5},{"id":"f-a","name":"dupe"},{"id":"../x"},{"id":"f-b","name":""}],"current":"f-zzz"}"#
    let ix = cleanIndex(raw.data(using: .utf8))
    check(ix.files.map(\.id) == ["f-a", "f-b"] && ix.files[0].name == "Home" && ix.files[1].name == "Untitled" && ix.current == "f-a", "files: an untrusted index is cleaned")
    check(cleanIndex("nope".data(using: .utf8)) == FileIndex() && cleanIndex(serializeIndex(ix)) == ix, "files: index round trip")
    var f = addFile(FileIndex(), id: "f-1", name: "Sign in", now: 1)
    f = addFile(f, id: "f-2", name: "Sign in", now: 2)
    check(f.files.map(\.name) == ["Sign in 2", "Sign in"] && f.current == "f-2", "files: new files get unique names and open")
    f = renameFile(f, id: "f-2", name: " Checkout ")
    check(f.files[0].name == "Checkout" && renameFile(f, id: "f-2", name: "  ").files[0].name == "Checkout", "files: rename, never to empty")
    f = removeFile(f, id: "f-2")
    check(f.files.map(\.id) == ["f-1"] && f.current == "f-1" && removeFile(f, id: "f-1") == f, "files: remove, never the last")
    var many = FileIndex()
    for i in 0..<(filesMax + 3) { many = addFile(many, id: "f-\(i)", name: "File") }
    check(many.files.count == filesMax && newFileId().hasPrefix("f-"), "files: the limit holds")
}
