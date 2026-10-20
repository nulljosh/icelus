import Foundation

/// Inspect (v50), after Figma's Dev Mode: the gap to the nearest part or screen edge on each side of a part.
/// Its code comes from partSnippet in Code.swift. src/lib/inspect.js is the twin.
struct Spacing: Equatable {
    var left: Int?, right: Int?, top: Int?, bottom: Int?
}

func partSpacing(_ elements: [Element], id: String) -> Spacing? {
    guard let el = elements.first(where: { $0.id == id }) else { return nil }
    func holds(_ s: Element) -> Bool { el.col > s.col && el.row > s.row && el.col + el.width < s.col + s.width && el.row + el.height < s.row + s.height }
    let screen = elements.first { $0.presetId == "screen" && $0.id != id && holds($0) }
    let others = elements.filter { $0.id != id && !$0.hidden && !["line", "adjust", "paint", "screen"].contains($0.presetId) }
    let across = others.filter { $0.row < el.row + el.height && el.row < $0.row + $0.height }
    let down = others.filter { $0.col < el.col + el.width && el.col < $0.col + $0.width }
    func near(_ gaps: [Int], _ edge: Int?) -> Int? { (gaps + (screen != nil ? [edge!] : [])).filter { $0 >= 0 }.min() }
    return Spacing(
        left: near(across.map { el.col - ($0.col + $0.width) }, screen.map { el.col - ($0.col + 1) }),
        right: near(across.map { $0.col - (el.col + el.width) }, screen.map { $0.col + $0.width - 1 - (el.col + el.width) }),
        top: near(down.map { el.row - ($0.row + $0.height) }, screen.map { el.row - ($0.row + 1) }),
        bottom: near(down.map { $0.row - (el.row + el.height) }, screen.map { $0.row + $0.height - 1 - (el.row + el.height) }))
}
