func runVariantChecks() {
    let btn = createElement(Preset(id: "button", label: "Button", category: "Input", template: ["[ OK ]"]), col: 0, row: 0)
    let card = createElement(Preset(id: "card", label: "Card", category: "Layout", template: ["┌──┐", "└──┘"]), col: 0, row: 0)
    func draw(_ el: Element, _ v: String) -> String {
        trimText(gridToText(renderElements(updateElement([el], id: el.id, variant: v), cols: 8, rows: 2)))
    }
    check([draw(btn, "pressed"), draw(btn, "disabled"), draw(btn, "error")] == ["▐ OK ▌", "‹ OK ›", "! OK !"],
          "variants: pressed, disabled and error drawn in the characters")
    check(draw(card, "pressed") == "┏━━┓\n┗━━┛" && draw(card, "error") == "╔══╗\n╚══╝", "variants: boxes take the state's lines")
    let pressed = updateElement([btn], id: btn.id, variant: "pressed")[0]
    check(updateElement([pressed], id: btn.id, variant: "default")[0].variant == nil, "variants: default clears the state")
    let linked = duplicateElement(makeSymbol([btn], id: btn.id, symbol: "s"), id: btn.id).elements
    check(updateElement(linked, id: btn.id, variant: "error")[1].variant == nil, "variants: each copy keeps its own state")
    var state = EditorState(); state.elements = [pressed]
    check(parseProject(serializeProject(state))?.elements.first?.variant == "pressed", "variants: the state survives the project file")
}
