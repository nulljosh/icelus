// Engine + presets self-check. Ported from src/lib/engine.test.js and presets.test.js.
//
// Run with no build system, no framework:
//   swiftc -o /tmp/wtcheck ios/App/Engine.swift ios/App/Lines.swift ios/App/Presets.swift ios/App/Syntax.swift ios/Checks/*.swift && /tmp/wtcheck
//
// (`swift file1 file2 file3` compiles but does not run top-level code — use swiftc.)
//
// ponytail: plain asserts in a main.swift instead of an XCTest target — the logic under
// test is pure Foundation, so a test target would only add a build graph to maintain.

import Foundation

var checks = 0
func check(_ condition: @autoclosure () -> Bool, _ label: String) {
    checks += 1
    guard condition() else {
        FileHandle.standardError.write("FAIL: \(label)\n".data(using: .utf8)!)
        exit(1)
    }
}

// MARK: createGrid

let g53 = createGrid(cols: 5, rows: 3)
check(g53.count == 3, "createGrid row count")
check(g53[0].count == 5, "createGrid column count")
check(g53.allSatisfy { $0.allSatisfy { $0 == " " } }, "createGrid fills with spaces")

let gDefault = createGrid()
check(gDefault.count == defaultRows && gDefault[0].count == defaultCols, "createGrid defaults")

// MARK: value semantics

var copied = g53
copied[0][0] = "X"
check(g53[0][0] == " ", "grids are value types — mutating a copy leaves the original alone")

// MARK: gridToText / textToGrid

var rt = createGrid(cols: 5, rows: 3)
rt[0][0] = "H"
rt[1][2] = "i"
let restored = textToGrid(gridToText(rt), cols: 5, rows: 3)
check(restored[0][0] == "H" && restored[1][2] == "i", "text round-trip")
check(gridToText(rt) == gridToText(restored), "round-trip is lossless")

var twoRow = createGrid(cols: 3, rows: 2)
twoRow[0][0] = "A"
twoRow[1][1] = "B"
check(gridToText(twoRow).split(separator: "\n", omittingEmptySubsequences: false).count == 2,
      "gridToText joins rows with newlines")

// Unicode: the presets are box-drawing characters, so this is the case that matters.
var uni = createGrid(cols: 4, rows: 1)
uni[0][0] = "┌"
uni[0][1] = "─"
uni[0][2] = "┐"
check(textToGrid(gridToText(uni), cols: 4, rows: 1)[0][2] == "┐", "unicode survives the round-trip")

// MARK: stampComponent

let stamped = stampComponent(createGrid(cols: 10, rows: 5), template: ["AB", "CD"], col: 2, row: 1)
check(stamped[1][2] == "A" && stamped[1][3] == "B", "stamp first template row")
check(stamped[2][2] == "C" && stamped[2][3] == "D", "stamp second template row")

let untouched = createGrid(cols: 5, rows: 5)
_ = stampComponent(untouched, template: ["X"], col: 0, row: 0)
check(untouched[0][0] == " ", "stampComponent does not mutate its input")

// Clipping at all four edges — the JS version only checked the right edge.
let small = createGrid(cols: 3, rows: 3)
check(stampComponent(small, template: ["ABCD"], col: 2, row: 0)[0][2] == "A", "clips past right edge")
check(stampComponent(small, template: ["AB"], col: -1, row: 0)[0][0] == "B", "clips past left edge")
check(stampComponent(small, template: ["A", "B"], col: 0, row: -1)[0][0] == "B", "clips past top edge")
check(stampComponent(small, template: ["A", "B"], col: 0, row: 2)[2][0] == "A", "clips past bottom edge")

// Every real preset must stamp into the real grid without trapping.
for p in presets {
    let out = stampComponent(createGrid(), template: p.template, col: defaultCols - 2, row: defaultRows - 2)
    check(out.count == defaultRows, "preset \(p.id) stamps at the far corner without resizing the grid")
}

// MARK: setChar

check(setChar(createGrid(cols: 5, rows: 5), col: 2, row: 3, char: "#")[3][2] == "#", "setChar writes")
let oob = createGrid(cols: 5, rows: 5)
check(gridToText(setChar(oob, col: -1, row: 0, char: "#")) == gridToText(oob), "setChar ignores out-of-bounds")
let filled = setChar(createGrid(cols: 3, rows: 3), col: 1, row: 1, char: "*")
check(setChar(filled, col: 1, row: 1, char: nil)[1][1] == " ", "setChar(nil) erases")

// MARK: eraseRegion

var region = setChar(createGrid(cols: 10, rows: 10), col: 2, row: 2, char: "X")
region = setChar(region, col: 3, row: 3, char: "Y")
let erased = eraseRegion(region, col: 2, row: 2, width: 2, height: 2)
check(erased[2][2] == " " && erased[3][3] == " ", "eraseRegion clears the rectangle")

// MARK: pxToCell

check(pxToCell(px: 30, py: 48, charW: 10, charH: 16) == (3, 3), "pxToCell converts")
check(pxToCell(px: 9, py: 15, charW: 10, charH: 16) == (0, 0), "pxToCell floors")

// MARK: undo / redo

var state = EditorState(cols: 5, rows: 5)
check(!state.canUndo && !state.canRedo, "fresh state has no history")

let blank = state.text
state.undo()
check(state.text == blank, "undo on empty history is a no-op")
state.redo()
check(state.text == blank, "redo on empty future is a no-op")

let zPreset = Preset(id: "z", label: "Z", category: "Test", template: ["Z"])
state.pushHistory()
state.elements.append(createElement(zPreset, col: 0, row: 0))
check(state.canUndo, "editing records history")
check(state.grid[0][0] == "Z", "grid renders the elements")
state.undo()
check(state.grid[0][0] == " ", "undo reverts the edit")
state.redo()
check(state.grid[0][0] == "Z", "redo reapplies the edit")

// A new edit clears the redo stack — otherwise redo would resurrect a discarded branch.
state.pushHistory()
state.elements.append(createElement(zPreset, col: 1, row: 1))
state.undo()
state.pushHistory()
state.elements.append(createElement(zPreset, col: 2, row: 2))
check(!state.canRedo, "a fresh edit clears the redo stack")

// History is bounded, so a long session cannot grow without limit.
var bounded = EditorState(cols: 3, rows: 3)
for i in 0..<(EditorState.historyLimit + 20) {
    bounded.pushHistory()
    bounded.elements.append(createElement(zPreset, col: i % 3, row: (i / 3) % 3))
}
check(bounded.history.count == EditorState.historyLimit, "history is capped at \(EditorState.historyLimit)")

// MARK: elements (ported from the element tests in engine.test.js)

let boxPreset = Preset(id: "box", label: "Box", category: "Test", template: ["┌──┐", "│  │", "└──┘"])
let a = createElement(boxPreset, col: 1, row: 1)
let b = createElement(zPreset, col: 2, row: 2)
check(a.id != b.id, "createElement gives unique ids")
check(a.width == 4 && a.height == 3, "createElement takes the preset size")

let pair = [a, b]
check(renderElements(pair, cols: 6, rows: 5)[1][1] == "┌", "renderElements stamps each element")
check(renderElements(pair, cols: 6, rows: 5)[2][2] == "Z", "later elements paint over earlier ones")
check(elementAt(pair, col: 2, row: 2)?.id == b.id, "elementAt returns the topmost hit")
check(elementAt(pair, col: 4, row: 3)?.id == a.id, "elementAt finds the element under it")
check(elementAt(pair, col: 0, row: 0) == nil, "elementAt misses empty cells")

let moved = moveElement(pair, id: a.id, col: 0, row: 0)
check(moved[0].col == 0 && moved[0].row == 0 && moved[1] == b, "moveElement moves only that element")
check(deleteElement(pair, id: a.id) == [b], "deleteElement removes only that element")

check(resizeTemplate(["┌──┐", "│  │", "└──┘"], width: 6, height: 4) == ["┌────┐", "│    │", "│    │", "└────┘"],
      "resizeTemplate keeps box borders")
check(resizeTemplate(["[ OK ]"], width: 4, height: 1) == ["[ O]"], "resizeTemplate keeps the closing bracket")
check(resizeTemplate(["ab"], width: 4, height: 2) == ["ab  ", "    "], "resizeTemplate pads plain text")

let grown = updateElement(pair, id: a.id, width: 6, height: 4)
check(grown[0].width == 6 && grown[0].height == 4 && grown[0].template.count == 4, "updateElement resizes")
check(updateElement(pair, id: a.id, width: 0, height: 0)[0].width == 2, "updateElement keeps width at least 2")
let retexted = updateElement(pair, id: b.id, text: "hello\r\nyou")
check(retexted[1].template == ["hello", "you"] && retexted[1].width == 5 && retexted[1].height == 2,
      "updateElement with text resizes to fit")

let pushed = nudgeElement(pair, id: a.id, dCol: 100, dRow: -100, cols: 10, rows: 10)
check(pushed[0].col == 6 && pushed[0].row == 0, "nudgeElement keeps the element on the canvas")

let dup = duplicateElement(pair, id: a.id, cols: 10, rows: 10)
check(dup.elements.count == 3 && dup.id != a.id && dup.elements[2].id == dup.id, "duplicateElement adds a copy with a new id")
check(dup.elements[2].col == 3 && dup.elements[2].row == 2 && dup.elements[2].template == a.template,
      "duplicateElement offsets the copy")
check(duplicateElement(pair, id: a.id, cols: 6, rows: 4).elements[2].col == 2, "duplicateElement stays on the canvas")
check(duplicateElement(pair, id: "nope").id == nil, "duplicateElement ignores unknown ids")
check(reorderElement(pair, id: a.id, toBack: false).map(\.id) == [b.id, a.id], "reorderElement brings to front")
check(reorderElement(pair, id: b.id, toBack: true).map(\.id) == [b.id, a.id], "reorderElement sends to back")

// MARK: lines (ported from the lines tests in engine.test.js)

check(joinChar("─", "│") == "┼" && joinChar("│", "─") == "┼", "joinChar crosses strokes")
check(joinChar("─", "┐") == "┬", "joinChar joins a corner onto a line")
check(joinChar("│", "A") == "A" && joinChar("A", "─") == "─", "joinChar leaves other characters alone")
let straight = lineShape(from: (2, 1), to: (5, 1))
check(straight.template == ["───▶"] && straight.width == 4 && straight.col == 2 && straight.row == 1, "lineShape draws a straight arrow")
check(lineShape(from: (5, 1), to: (2, 1)).template == ["◀───"], "lineShape points left")
check(lineShape(from: (0, 0), to: (0, 2), arrow: false).template == ["│", "│", "│"], "lineShape draws a plain vertical line")
check(lineShape(from: (0, 0), to: (3, 2)).template == ["───┐", "   │", "   ▼"], "lineShape elbows across then down")
check(lineShape(from: (3, 2), to: (0, 0)).template == ["▲   ", "│   ", "└───"], "lineShape elbows across then up")
let boxEl = Element(id: "b", presetId: "card", label: "Card", template: ["┌─┐", "│ │", "└─┘"], width: 3, height: 3, col: 0, row: 0)
let lineEl = Element(id: "l", presetId: "line", label: "Arrow", template: ["  ", "──"], width: 2, height: 2, col: 1, row: 0)
let crossed = renderElements([boxEl, lineEl], cols: 4, rows: 3)
check(crossed[0][1] == "─" && crossed[1][1] == "─" && crossed[1][2] == "┼", "lines are see-through and join what they cross")

// MARK: connectors (ported from the connectors tests in engine.test.js)

func card(_ id: String, _ col: Int, _ row: Int) -> Element {
    Element(id: id, presetId: "card", label: "Card", template: ["┌──┐", "│  │", "└──┘"], width: 4, height: 3, col: col, row: row)
}
let twoCards = [card("a", 0, 0), card("b", 10, 0)]
let link = createLine(twoCards, start: (3, 1), end: (10, 1))
check(link.from == Anchor(col: 3, row: 1, id: "a", dCol: 3, dRow: 1) && link.to == Anchor(col: 10, row: 1, id: "b", dCol: 0, dRow: 1),
      "createLine pins its ends to the parts under them")
check(createLine([], start: (1, 1), end: (4, 1)).from == Anchor(col: 1, row: 1), "createLine leaves ends on empty cells loose")
let followed = moveElement(twoCards + [link], id: "b", col: 10, row: 4).first { $0.id == link.id }!
check(followed.to?.col == 10 && followed.to?.row == 5, "a pinned line follows its part")
check(followed.template == ["───────┐", "       │", "       │", "       │", "       ▼"], "a pinned line reroutes as an elbow")
let cut = moveElement(twoCards + [link], id: link.id, col: link.col + 1, row: link.row + 2).first { $0.id == link.id }!
check(cut.from == Anchor(col: 4, row: 3), "moving the line itself cuts it loose")
check(moveElement([card("a", 0, 0), cut], id: "a", col: 5, row: 5)[1] == cut, "a loose line stays put")
check(deleteElement(twoCards + [link], id: "a").last?.template == link.template, "a deleted part leaves the end where it was")
let dupLine = duplicateElement(twoCards + [link], id: link.id)
check(dupLine.elements.last?.from == Anchor(col: 5, row: 2), "a duplicated line is loose")
var linked = EditorState(cols: 20, rows: 10)
linked.elements = twoCards + [link]
let reopenedLink = parseProject(serializeProject(linked))!
check(reopenedLink.elements[2].from?.id == reopenedLink.elements[0].id, "pins survive saving and opening a project")
check(moveElement(reopenedLink.elements, id: reopenedLink.elements[0].id, col: 0, row: 3)[2].from?.row == 4,
      "a reopened pinned line still follows its part")
let webLine = #"{"blockprint":1,"cols":20,"rows":10,"elements":[{"id":"el-4","presetId":"card","template":["┌┐","└┘"],"col":0,"row":0},{"id":"el-5","presetId":"line","template":["──▶"],"col":1,"row":0,"from":{"col":1,"row":0,"id":"el-4","dCol":1,"dRow":0},"to":{"col":3,"row":0}}]}"#
let openedWeb = parseProject(webLine)!
check(openedWeb.elements[1].from?.id == openedWeb.elements[0].id && openedWeb.elements[1].from?.dCol == 1,
      "opens a web project with a pinned line")
check(parseProject(webLine)?.elements[1].to == Anchor(col: 3, row: 0), "a loose web line end stays loose")

// MARK: text and banners (ported from engine.test.js)

check(bannerText("HI") == ["█ █ ▀█▀", "█▀█  █ ", "▀ ▀ ▀▀▀"], "bannerText draws big letters three rows tall")
check(bannerText("hi") == bannerText("HI") && bannerText("A~B") == bannerText("A B"), "bannerText upper-cases and blanks unknowns")
let bannerEl = Element(id: "bn", presetId: "banner", label: "Banner", template: bannerText("TITLE"), width: 19, height: 3,
                       col: 0, row: 0, text: "TITLE")
let rewritten = updateElement([bannerEl], id: "bn", text: "OK")[0]
check(rewritten.text == "OK" && rewritten.template == bannerText("OK") && rewritten.width == 7, "a banner edits its words and redraws")
let underText = Element(id: "u", presetId: "card", label: "Card", template: ["┌───┐", "│ x │", "└───┘"], width: 5, height: 3, col: 0, row: 0)
let overText = Element(id: "t", presetId: "text", label: "Text", template: ["a b"], width: 3, height: 1, col: 1, row: 1)
check(String(renderElements([underText, overText], cols: 5, rows: 3)[1]) == "│axb│", "text is see-through")
var bannerProject = EditorState(cols: 10, rows: 5)
bannerProject.elements = [bannerEl]
check(parseProject(serializeProject(bannerProject))?.elements[0].text == "TITLE", "banner words survive a project round-trip")
check(toAscii("▀▄█") == "\"_#", "toAscii maps half blocks")
check(toAscii("│  ◡  │ ▌") == "|  u  | |", "toAscii maps Boxy's mouth and caret")

// MARK: snap and styles (ported from engine.test.js)

func part(_ id: String, _ col: Int, _ row: Int, _ width: Int = 4, _ height: Int = 3) -> Element {
    Element(id: id, presetId: "card", label: "Card", template: ["┌──┐", "│  │", "└──┘"], width: width, height: height, col: col, row: row)
}
let snapped = snapPosition([part("a", 10, 0, 6), part("b", 0, 8, 6)], id: "b", col: 11, row: 8)
check(snapped.col == 10 && snapped.row == 8 && snapped.guideCols == [10] && snapped.guideRows.isEmpty, "snaps to a nearby left edge")
let centred = snapPosition([part("a", 10, 0, 8), part("b", 0, 8)], id: "b", col: 15, row: 8)
check(centred.col == 16 && centred.guideCols == [17], "snaps a centre to a right edge")
check(snapPosition([part("a", 10, 0, 8), part("b", 0, 8)], id: "b", col: 30, row: 20).guideCols.isEmpty, "far parts do not snap")
let lineOnly = Element(id: "l", presetId: "line", label: "Arrow", template: ["──▶"], width: 3, height: 1, col: 10, row: 0)
check(snapPosition([lineOnly, part("b", 0, 8)], id: "b", col: 11, row: 8).col == 11, "never snaps to lines")
check(styleChar("┌", "double") == "╔" && styleChar("┼", "heavy") == "╋" && styleChar("┐", "rounded") == "╮", "styleChar swaps line sets")
check(styleChar("│", "ascii") == "|" && styleChar("A", "double") == "A", "styleChar leaves other characters alone")
let styledPart = updateElement([part("a", 0, 0)], id: "a", style: "double")[0]
check(String(renderElements([styledPart], cols: 4, rows: 3)[0]) == "╔══╗", "a styled box draws its own line set")
check(updateElement([styledPart], id: "a", style: "single")[0].style == nil &&
      updateElement([styledPart], id: "a", style: "nope")[0].style == nil, "single and unknown styles clear the style")
var styledProject = EditorState(cols: 8, rows: 4)
styledProject.elements = [styledPart]
check(parseProject(serializeProject(styledProject))?.elements[0].style == "double", "box style survives saving")

// MARK: exports

check(toAscii("┌─┐\n│●│\n└─┘") == "+-+\n|*|\n+-+", "toAscii maps box drawing")
check(toAscii("a…é") == "a...?", "toAscii expands and replaces the rest")
check(trimText("ab  \n    \n\n") == "ab", "trimText drops trailing spaces and blank rows")
check(trimText("  a\n\n b") == "  a\n\n b", "trimText keeps leading space and inner blank rows")
check(toMarkdown("x  \n ") == "```\nx\n```", "toMarkdown fences the trimmed text")

// MARK: project files (the same JSON the web app writes)

var saved = EditorState(cols: 10, rows: 5)
saved.elements = [createElement(boxPreset, col: 1, row: 1), createElement(zPreset, col: 6, row: 2)]
let reopened = parseProject(serializeProject(saved))
check(reopened?.cols == 10 && reopened?.rows == 5, "project round-trip keeps the canvas size")
check(reopened?.elements.map(\.template) == saved.elements.map(\.template), "project round-trip keeps every element")
check(reopened?.text == saved.text, "project round-trip draws the same canvas")
check(reopened?.canUndo == false, "opening a project starts a fresh history")

let fromWeb = #"{"blockprint":1,"cols":12,"rows":4,"elements":[{"id":"el-9","presetId":"button","label":"Button","template":["[ OK ]"],"width":6,"height":1,"col":2,"row":3},{"broken":true}]}"#
let web = parseProject(fromWeb)
check(web?.elements.count == 1 && web?.elements[0].label == "Button", "opens a web project and drops broken elements")
check(web?.grid[3][2] == "[", "a web project draws where the web put it")
check(parseProject(#"{"cols":9000,"rows":-1,"elements":[]}"#)?.cols == defaultCols, "a bad size falls back to the default")
check(parseProject("not json") == nil && parseProject(#"{"cols":10}"#) == nil, "rejects files that are not projects")

// MARK: presets

check(!presets.isEmpty, "presets exist")
check(presets.count == 38, "all 38 presets ported from presets.js")
check(Set(presets.map(\.id)).count == presets.count, "preset ids are unique")
for p in presets {
    check(!p.id.isEmpty && !p.label.isEmpty && !p.category.isEmpty, "preset \(p.id) has its labels")
    check(!p.template.isEmpty, "preset \(p.id) has a template")
    check(p.height == p.template.count, "preset \(p.id) height matches template")
    check(p.width > 0, "preset \(p.id) has a width")
}
check(presetCategories == presets.reduce(into: [String]()) { if !$0.contains($1.category) { $0.append($1.category) } },
      "categories are unique and in first-appearance order")
check(preset(id: "button")?.id == "button", "lookup by id")
check(preset(id: "not-real") == nil, "unknown id returns nil")
for p in presets { check(preset(id: p.id) == p, "lookup returns preset \(p.id)") }

runSyntaxChecks()
runPhotoChecks()
runScreenChecks()
runPaletteChecks()
runHTMLChecks()
runImportChecks()
runTableChecks()
runChartChecks()
runFlowChecks()
runSequenceChecks()
runTreeChecks()
runGroupChecks()
runLayerChecks()
runSymbolChecks()
runVariantChecks()
runTweakChecks()
runNoteChecks()
runCritiqueChecks()
runSystemChecks()
runTutorialChecks()
runAccountChecks()
runHandoffChecks()
runCodeChecks()
runDeckChecks()
runBrushChecks()
runSelectChecks()
runGradientChecks()
runColorChecks()
runAdjustChecks()
runRealChecks()
runMaskChecks()
runBlendChecks()
runHistoryChecks()
runActionChecks()
runHealChecks()
runDistractionChecks()
runLayoutChecks()
runPinChecks()
runSizeChecks()
runPropertyChecks()
runModeChecks()
runLibraryChecks()
runGridChecks()
runInspectChecks()
runAccessChecks()
runCopyChecks()
runHotspotChecks()
runPlayChecks()

print("ok — \(checks) checks passed")
