func runLibraryChecks() {
    func copy(_ id: String, _ col: Int, _ symbol: String) -> Element { var e = createElement(presets.first { $0.id == id }!, col: col, row: 0); e.symbol = symbol; return e }
    let a = copy("button", 0, "btn"), b = copy("button", 10, "btn")
    var card = copy("card", 0, "card"); card.style = "double"
    let lib = makeLibrary([a, b, card, createElement(presets.first { $0.id == "input" }!, col: 0, row: 5)], name: "Kit")
    check(lib.name == "Kit" && lib.parts.map(\.symbol) == ["btn", "card"] && lib.parts[1].style == "double", "library: one part per symbol")
    check(parseLibrary(serializeLibrary(lib)) == lib, "library: survives a round trip")
    let edited = makeLibrary(updateElement([a, b], id: a.id, text: "Pay now"), name: "Kit")
    var owner = b; owner.own = ["text"]
    let other = copy("button", 30, "btn")
    let pulled = pullLibrary([owner, other, card], edited)
    check(pulled.changed == 1 && pulled.elements[1].template.joined().contains("Pay now") && !pulled.elements[0].template.joined().contains("Pay now"), "library: pull updates linked copies, minus owned words")
    check(pulled.elements[2] == card && pullLibrary(pulled.elements, edited).changed == 0, "library: unlinked parts and a second pull change nothing")
    let part = libraryPalette(makeLibrary([card]))[0]
    check(part.symbol == "card" && part.template.joined().contains("╔") && createElement(part, col: 0, row: 0).symbol == "card", "library: a placed part stays linked")
    check(parsePalette(serializePalette([part]))[0].symbol == "card", "library: the palette keeps the link")
    check(parseLibrary("nope") == nil && parseLibrary(#"{"icelusLibrary":2,"parts":[]}"#) == nil && parseLibrary(#"{"icelusLibrary":true,"parts":[]}"#) == nil, "library: bad files refused")
    let junk = parseLibrary(#"{"icelusLibrary":1,"parts":[{"symbol":"s","label":"Ok","template":["[ ]"],"style":"neon"},{"symbol":"s","label":"Dupe","template":["x"]},{"symbol":"","label":"No","template":["x"]},{"symbol":"t","label":"Bad","template":[1]},null]}"#)
    check(junk?.parts == [LibraryPart(symbol: "s", label: "Ok", presetId: "custom", template: ["[ ]"])], "library: junk parts dropped")
    let many = "{\"icelusLibrary\":1,\"parts\":[" + (0..<300).map { "{\"symbol\":\"s\($0)\",\"label\":\"P\",\"template\":[\"x\"]}" }.joined(separator: ",") + "]}"
    check(parseLibrary(many)?.parts.count == libraryMax, "library: capped at 100 parts")
}
