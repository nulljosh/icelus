import Foundation

/// Play mode (v54): click through linked screens like a real app. One screen is shown on its own, moved to the
/// top left, and a press on a hotspot (Hotspots.swift) opens the screen it names. src/lib/play.js is the twin.
struct Spot: Equatable { let id: String; let col, row, width, height: Int; let to: String; let label: String }
struct PlayScreen { let id: String; let title: String; let cols, rows: Int; let spots: [Spot]; let elements: [Element] }

func playScreens(_ elements: [Element]) -> [Element] {
    elements.filter { $0.presetId == "screen" && !$0.hidden }.sorted { ($0.row, $0.col) < ($1.row, $1.col) }
}

/// Where play starts: the picked screen, or the screen holding the picked part, else the first screen.
func startScreen(_ elements: [Element], selectedId: String? = nil) -> Element? {
    let screens = playScreens(elements)
    if let sel = elements.first(where: { $0.id == selectedId }),
       let s = screens.first(where: { $0.id == sel.id || !partsInside([sel], $0).isEmpty }) { return s }
    return screens.first
}

/// One screen to play: it and what sits inside it, shifted so the screen is at 0,0 (the canvas part comes too,
/// so its line mode still applies), plus its hotspots with the words to read out.
func playView(_ elements: [Element], _ screenId: String) -> PlayScreen? {
    guard let screen = elements.first(where: { $0.id == screenId && $0.presetId == "screen" && !$0.hidden }) else { return nil }
    let inside = partsInside(elements, screen).filter { !$0.hidden }.map { carry($0, dCol: -screen.col, dRow: -screen.row) }
    let spots = inside.compactMap { el -> Spot? in
        guard canOpen(el), let to = opensScreen(elements, el), !to.hidden, to.id != screen.id else { return nil }
        return Spot(id: el.id, col: el.col, row: el.row, width: el.width, height: el.height, to: to.id, label: partWords(el))
    }
    return PlayScreen(id: screen.id, title: (screen.text ?? "").isEmpty ? "Screen" : screen.text!, cols: screen.width, rows: screen.height,
                      spots: spots, elements: [carry(screen, dCol: -screen.col, dRow: -screen.row)] + inside + elements.filter(\.canvas))
}

/// The hotspot under a cell of the shown screen, topmost first, or nil.
func spotAt(_ view: PlayScreen?, col: Int, row: Int) -> Spot? {
    view?.spots.last { col >= $0.col && col < $0.col + $0.width && row >= $0.row && row < $0.row + $0.height }
}

/// An agent or a check plays a flow: press hotspots by part id in turn. The screens visited, and the step where
/// a press was not a hotspot on the screen shown at the time.
func playPath(_ elements: [Element], start: String, presses: [String]) -> (path: [PlayScreen], error: String?) {
    guard var view = playView(elements, start) else { return ([], "start must be a screen that is shown") }
    var path = [view]
    for (i, id) in presses.enumerated() {
        guard let spot = view.spots.first(where: { $0.id == id }), let next = playView(elements, spot.to) else {
            return (path, "press \(i) is not a hotspot on \(view.title)")
        }
        view = next
        path.append(view)
    }
    return (path, nil)
}
