func runPhotoChecks() {
    check(photoToBlocks([0, 255, 0, 255, 255, 255, 0, 0], cols: 2, pixelRows: 4) == ["█ ", "▄▄"],
          "photo: black is a full block, white is space, two pixel rows per line")
    check(photoToBlocks([100, 100, 140, 140], cols: 2, pixelRows: 2) == ["▀▀"], "photo: a flat photo is stretched to full contrast")
    check(photoSize(width: 1000, height: 1000, cols: 60) == (60, 50), "photo: keeps its shape in whole rows")
    check(photoToText([0, 255, 255, 255, 0, 255, 255, 255], w: 2, h: 4, look: "braille") == ["\u{2805}"],
          "photo: braille packs eight dots into one cell")
    check(photoToText([0, 64, 128, 192, 255], w: 5, h: 1, look: "shade") == ["█▓▒░ "], "photo: shade maps brightness to ░ ▒ ▓ █")
    check(photoToText([255, 255, 255, 255], w: 2, h: 2, look: "blocks") == ["  "], "photo: a blank white photo stays white")
    check(photoGrid(width: 1000, height: 1000, cols: 60, look: "braille") == (120, 100) && photoGrid(width: 1000, height: 1000, cols: 60, look: "shade") == (60, 25),
          "photo: braille samples 2x4 a cell, shade one")
    let fill = createElement(drawTools.first { $0.id == "fill" }!, col: 0, row: 0)
    let dark = updateElement([fill], id: fill.id, fill: "▓")
    check(dark[0].template == fillTemplate("▓", width: 8, height: 3), "fill: a new shade refills it")
    check(updateElement(dark, id: fill.id, width: 3, height: 2)[0].template == ["▓▓▓", "▓▓▓"], "fill: a resize keeps its shade")
    check(updateElement(dark, id: fill.id, fill: "x")[0].template == dark[0].template, "fill: only the four shades")
}
