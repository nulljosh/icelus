func runPaletteChecks() {
    let card = createElement(Preset(id: "card", label: "Card", category: "Layout", template: ["┌──┐", "└──┘"]), col: 0, row: 0)
    let first = toPalettePart(card)
    check(first.label == "Card" && first.category == mineCategory && first.width == 4, "palette: a part saves under Mine")
    check(toPalettePart(card, existing: [first]).label == "Card 2", "palette: a second copy gets a fresh name")
    var rounded = card; rounded.style = "rounded"
    check(toPalettePart(rounded).template == ["╭──╮", "╰──╯"], "palette: the box style is baked in")
    let saved = serializePalette(addToPalette([], card))
    check(parsePalette(saved).map(\.label) == ["Card"], "palette: round-trips through storage")
    check(parsePalette("[{\"id\":\"x\",\"label\":\"Bad\",\"template\":[\"a\"]}]").isEmpty && parsePalette("{nope").isEmpty,
          "palette: bad entries are dropped")

    check(packs.count == 16 && packCategories == ["iOS", "Material", "Terminal", "Email"], "packs: four packs of four")
    check(packs.allSatisfy { p in !"┌╭┏╔".contains(p.template[0].first ?? " ") || Set(p.template.map(\.count)).count == 1 },
          "packs: every box is rectangular")
}
