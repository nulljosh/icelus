func runTutorialChecks() {
    let button = presets.first { $0.id == "button" }!
    var elements: [Element] = [], start = lessonSnapshot(elements)
    check(!stepDone("pick", selected: nil, elements: elements, copies: 0, start: start)
          && stepDone("pick", selected: button, elements: elements, copies: 0, start: start), "tutorial: pick waits for Button")
    let b = createElement(button, col: 2, row: 2); elements = [b]
    check(stepDone("place", selected: nil, elements: elements, copies: 0, start: start) && newestButton(elements, start: start) == b.id,
          "tutorial: place sees the new button")
    start = lessonSnapshot(elements)
    elements = updateElement(elements, id: b.id, text: "[ Sign up ]")
    check(stepDone("edit", selected: nil, elements: elements, copies: 0, start: start), "tutorial: edit sees new words")
    start = lessonSnapshot(elements)
    elements = moveElement(elements, id: b.id, col: 10, row: 5)
    check(stepDone("move", selected: nil, elements: elements, copies: 0, start: start), "tutorial: move sees a drag")
    start = lessonSnapshot(elements, copies: 3)
    check(!stepDone("copy", selected: nil, elements: elements, copies: 3, start: start)
          && stepDone("copy", selected: nil, elements: elements, copies: 4, start: start), "tutorial: copy waits for a copy")
    let old = createElement(button, col: 0, row: 0), before = lessonSnapshot([old])
    check(!stepDone("place", selected: nil, elements: [old], copies: 0, start: before), "tutorial: buttons already there do not count")
}
