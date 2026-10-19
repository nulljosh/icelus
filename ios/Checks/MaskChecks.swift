func runMaskChecks() {
    let card = createElement(preset(id: "card")!, col: 0, row: 0)
    check(cleanMask(nil) == nil && cleanMask(["top": 0]) == nil, "mask: nothing to hide is no mask")
    check(cleanMask(["top": -3, "right": "2", "bottom": 1e9, "left": "x"]) == Inset(top: 0, right: 2, bottom: 500, left: 0), "mask: untrusted insets clamp")
    let cropped = updateElement([card], id: card.id, mask: Inset(right: 4))
    check(cropped[0].template == card.template, "mask: the part keeps every character")
    let shown = gridToText(renderElements(cropped, cols: 30, rows: 8)).split(separator: "\n", omittingEmptySubsequences: false)
    check(shown.allSatisfy { $0.replacingOccurrences(of: "\\s+$", with: "", options: .regularExpression).count <= card.width - 4 }, "mask: crop hides the right edge")
    check(gridToText(renderElements(updateElement(cropped, id: card.id, mask: Inset()), cols: 30, rows: 8)) == gridToText(renderElements([card], cols: 30, rows: 8)), "mask: clearing brings it back")
    let under = Element(id: "u", presetId: "card", label: "Card", template: card.template, width: card.width, height: card.height, col: 0, row: 0)
    let over = Element(id: "o", presetId: "card", label: "Card", template: card.template.map { String(repeating: "X", count: $0.count) }, width: card.width, height: card.height, col: 0, row: 0)
    let g = renderElements(updateElement([under, over], id: "o", mask: Inset(left: 3)), cols: 30, rows: 8)
    check(g[1][0] == Array(under.template[1])[0] && g[1][5] == "X", "mask: what is underneath shows through")
    let shape = Element(id: "s", presetId: "button", label: "Button", template: ["[ OK ]"], width: 6, height: 1, col: 2, row: 1)
    let clipped = updateElement([shape, Element(id: "b", presetId: "card", label: "Card", template: card.template.map { String(repeating: "#", count: $0.count) }, width: card.width, height: card.height, col: 0, row: 0)], id: "b", clip: "s")
    let cg = renderElements(clipped, cols: 30, rows: 8)
    check(cg[0][0] == " " && cg[1][2] == "#", "mask: a clip shows the part only inside the other")
    check(updateElement(clipped, id: "b", clip: "b")[1].clip == nil, "mask: never a clip to itself")
    check(gridToText(renderElements([Element(id: "m", presetId: "card", label: "Card", template: card.template, width: card.width, height: card.height, col: 0, row: 0, clip: "gone")], cols: 30, rows: 8)) == gridToText(renderElements([card], cols: 30, rows: 8)), "mask: a clip to a missing part is ignored")
    var saved = EditorState(cols: 30, rows: 8); saved.elements = [Element(id: "a", presetId: "card", label: "Card", template: card.template, width: card.width, height: card.height, col: 0, row: 0, mask: Inset(top: 2)), shape]
    saved.elements[1].clip = "a"
    let json = serializeProject(saved)
    check(!json.contains("\\u0000"), "mask: no holes in saved files")
    let back = parseProject(json)
    check(back?.elements[0].mask == Inset(top: 2) && back?.elements[1].clip == back?.elements[0].id, "mask: crop and clip survive a save, clip re-pointed")
    let js = #"{"elements":[{"id":"a","template":["abc"],"mask":{"top":1}},{"id":"z","template":["x"],"clip":"a","mask":{"left":"no"}}]}"#
    let fromWeb = parseProject(js)
    check(fromWeb?.elements[0].mask == Inset(top: 1) && fromWeb?.elements[1].clip == fromWeb?.elements[0].id && fromWeb?.elements[1].mask == nil, "mask: opens a web file")
}
