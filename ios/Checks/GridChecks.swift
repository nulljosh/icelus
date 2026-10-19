func runGridChecks() {
    func screen(_ col: Int, _ w: Int) -> Element {
        Element(id: "s\(col)", presetId: "screen", label: "Screen", template: screenFrame("Screen", width: w, height: 20), width: w, height: 20, col: col, row: 0, text: "Screen")
    }
    let plain = screen(0, 42)
    let gridded = updateElement([plain], id: plain.id, grid: ColumnGrid(cols: 4, gutter: 2))[0]
    check(gridColumns(gridded).map(\.col) == [4, 13, 22, 31] && gridColumns(gridded).allSatisfy { $0.width == 7 }, "grids: column bands inside the frame")
    check(gridColumns(plain).isEmpty && gridColumns(updateElement([plain], id: plain.id, grid: ColumnGrid(cols: 24, gutter: 8))[0]).isEmpty, "grids: no bands when off or when they do not fit")
    check(cleanGrid(["cols": 99, "gutter": -1]) == ColumnGrid(cols: 4, gutter: 1) && cleanGrid("3") == nil && cleanGrid(["cols": true]) == ColumnGrid(), "grids: bad grids cleaned")
    let btn = createElement(presets.first { $0.id == "button" }!, col: 13, row: 5)
    let els = [gridded, btn]
    let s = snapPosition(els, id: btn.id, col: 11, row: 5)
    check(s.col == 13 && s.guideCols.contains(13), "grids: left edge snaps onto a band")
    check(snapToGrid(els, id: btn.id, (14, 5, [], [])).col == 14 && snapToGrid([plain, btn], id: btn.id, (13, 5, [], [])).col == 13, "grids: right edge snaps, no grid no snap")
    check(gridToText(renderElements([gridded], cols: 50, rows: 22)) == gridToText(renderElements([plain], cols: 50, rows: 22)), "grids: never in the text")
    var state = EditorState(cols: 50, rows: 22)
    state.elements = [gridded]
    check(parseProject(serializeProject(state))?.elements[0].grid == ColumnGrid(cols: 4, gutter: 2), "grids: survive a save")
    let other = screen(50, 30)
    check(gridEverywhere([gridded, other], id: gridded.id)[1].grid == ColumnGrid(cols: 4, gutter: 2), "grids: spread to every screen")
    var had = other; had.grid = ColumnGrid(cols: 2, gutter: 1)
    check(gridEverywhere([plain, had], id: plain.id)[1].grid == nil, "grids: spreading none takes them off")
}
