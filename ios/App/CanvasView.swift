// The character grid itself.
//
// ponytail: one Text draw per ROW, not per cell — 50 draws instead of 5,000.
// Monospace guarantees a uniform advance, so a whole-line draw lands on the same
// column boundaries the tap math uses.

import SwiftUI
import CoreText

struct CanvasView: View {
    let grid: Grid
    let fontSize: CGFloat
    /// The selected element's box, outlined in the accent. Dragging moves it.
    var selected: Element? = nil
    /// Picked and grouped parts, outlined thinner than the selection.
    var outlined: [Element] = []
    let onTap: (Int, Int) -> Void
    /// Drag offset in whole cells; `ended` is true once, when the finger lifts.
    var onDrag: (_ dCol: Int, _ dRow: Int, _ ended: Bool) -> Void = { _, _, _ in }
    /// With the arrow tool, a drag draws a line from where it started to where it is.
    var drawing = false
    var onLine: (_ start: (col: Int, row: Int), _ end: (col: Int, row: Int), _ ended: Bool) -> Void = { _, _, _ in }
    /// With the brush or the eraser, a drag paints: every cell the finger crosses, then `ended` once.
    var painting = false
    /// Cells the marquee or wand picked, tinted in the accent.
    var picked: [(Int, Int)] = []
    var onPaint: (_ start: (col: Int, row: Int), _ cell: (col: Int, row: Int), _ ended: Bool) -> Void = { _, _, _ in }
    /// Snap guides, drawn as dashed accent lines through these columns and rows.
    var guideCols: [Int] = []
    var guideRows: [Int] = []
    /// A photo to trace over, drawn faint and fitted to the grid. Never saved or exported.
    var trace: CGImage? = nil
    /// Cells drawn in the accent (from accentMask). Nil when nothing is highlighted.
    var accent: [[Bool]]? = nil
    /// Ink and paper per cell (Color.swift). Nil when nothing is colored.
    var colors: ColorMask? = nil
    /// The real look: parts drawn as real controls over the grid (RealView.swift).
    var real = false
    /// The parts, so VoiceOver can reach each one. Activating one selects it, like a tap.
    var parts: [Element] = []

    // CoreText rather than UIFont so this file compiles unchanged on macOS. NSFont has no
    // `lineHeight` and no shared metric API with UIFont, so the alternative was a #if with
    // two different measurement paths — CTFont is one path that is exact on both.
    private var font: CTFont {
        CTFontCreateUIFontForLanguage(.userFixedPitch, fontSize, nil)
            ?? CTFontCreateWithName("Menlo" as CFString, fontSize, nil)
    }

    private var charW: CGFloat {
        let f = font
        var char: UniChar = 77 // "M" — monospace, so any glyph gives the same advance
        var glyph = CGGlyph()
        guard CTFontGetGlyphsForCharacters(f, &char, &glyph, 1) else { return fontSize * 0.6 }
        return CTFontGetAdvancesForGlyphs(f, .horizontal, &glyph, nil, 1)
    }

    private var charH: CGFloat {
        let f = font
        return CTFontGetAscent(f) + CTFontGetDescent(f) + CTFontGetLeading(f)
    }

    private static let blocks: [Character: (CGFloat, CGFloat)] = ["█": (0, 1), "▀": (0, 0.5), "▄": (0.5, 1)]
    /// Shades fill the whole cell at a strength, so a ramp or a shaded photo reads as tone, not stripes.
    private static let shades: [Character: Double] = ["░": 0.25, "▒": 0.5, "▓": 0.75]

    private var cols: Int { grid.first?.count ?? 0 }
    private var rows: Int { grid.count }

    private var canvasSize: CGSize {
        CGSize(width: charW * CGFloat(cols), height: charH * CGFloat(rows))
    }

    var body: some View {
        Canvas(rendersAsynchronously: false) { context, _ in
            draw(in: &context)
        }
        .frame(width: canvasSize.width, height: canvasSize.height, alignment: .topLeading)
        .overlay(alignment: .topLeading) { if real { RealLayerView(elements: parts, charW: charW, rowH: charH, fontSize: fontSize) } }
        .background(Theme.canvas, in: RoundedRectangle(cornerRadius: Theme.radius))
        .overlay(RoundedRectangle(cornerRadius: Theme.radius).strokeBorder(Theme.rule, lineWidth: 1))
        .gesture(tapGesture)
        // Only claim drags while something is selected, so the scroll view still pans otherwise.
        .simultaneousGesture(dragGesture, including: selected == nil && !drawing && !painting ? .subviews : .all)
        .accessibilityElement(children: .contain)
        .accessibilityLabel(parts.isEmpty ? Text("Empty canvas") : Text("Canvas, \(parts.count) parts"))
        .accessibilityChildren {
            ZStack(alignment: .topLeading) {
                ForEach(parts.sorted { ($0.row, $0.col) < ($1.row, $1.col) }) { el in
                    Rectangle()
                        .frame(width: CGFloat(el.width) * charW, height: CGFloat(el.height) * charH)
                        .offset(x: CGFloat(el.col) * charW, y: CGFloat(el.row) * charH)
                        .accessibilityLabel(spokenPart(el))
                        .accessibilityAddTraits(selected?.id == el.id ? [.isButton, .isSelected] : .isButton)
                        .accessibilityAction { onTap(el.col, el.row) }
                }
            }
            .frame(width: canvasSize.width, height: canvasSize.height, alignment: .topLeading)
        }
    }

    /// What a part is, for VoiceOver: its kind, its words, where it is and how big. Matches the web's describe.
    private func spokenPart(_ el: Element) -> String {
        let marks = Set("─│┌┐└┘├┤┬┴┼╭╮╰╯━┃═║▀▄█▌░▒▓_")
        let words = String((el.text ?? el.template.joined(separator: " ")).map { marks.contains($0) ? " " : $0 })
            .split(separator: " ").joined(separator: " ")
        let label = String(localized: String.LocalizationValue(el.label))
        let said = words.isEmpty ? "" : ", " + String(words.prefix(80))
        return String(localized: "\(label)\(said), column \(el.col + 1), row \(el.row + 1), \(el.width) by \(el.height)")
    }

    private var dragGesture: some Gesture {
        DragGesture(minimumDistance: painting ? 0 : 4)
            .onChanged { moved($0, ended: false) }
            .onEnded { moved($0, ended: true) }
    }

    private func moved(_ value: DragGesture.Value, ended: Bool) {
        if painting {
            let start = pxToCell(px: value.startLocation.x, py: value.startLocation.y, charW: charW, charH: charH)
            onPaint(start, pxToCell(px: value.location.x, py: value.location.y, charW: charW, charH: charH), ended)
        } else if drawing {
            let start = pxToCell(px: value.startLocation.x, py: value.startLocation.y, charW: charW, charH: charH)
            let end = pxToCell(px: value.location.x, py: value.location.y, charW: charW, charH: charH)
            onLine(start, end, ended)
        } else {
            onDrag(cells(value.translation).col, cells(value.translation).row, ended)
        }
    }

    private func cells(_ t: CGSize) -> (col: Int, row: Int) {
        (Int((t.width / charW).rounded()), Int((t.height / charH).rounded()))
    }

    /// A terminal color from its hex.
    static func terminal(_ i: Int) -> Color {
        let v = Int(terminalColors[i].hex.dropFirst(), radix: 16) ?? 0
        return Color(red: Double(v >> 16 & 255) / 255, green: Double(v >> 8 & 255) / 255, blue: Double(v & 255) / 255)
    }

    /// What a cell's mark is drawn in: its ink, -2 for the accent, -1 for the text color.
    private func tone(_ r: Int, _ c: Int) -> Int {
        if let i = colors?.ink[r][c], i >= 0 { return i }
        return accent?[r][c] == true ? -2 : -1
    }
    private func paint(_ tone: Int) -> Color { tone >= 0 ? Self.terminal(tone) : tone == -2 ? Theme.accent : Theme.ink }

    /// One Text per row; a row with colored cells is a few runs joined, one per tone.
    private func rowText(_ line: [Character], _ r: Int) -> Text {
        guard accent != nil || colors != nil else { return Text(String(line)).foregroundStyle(Theme.ink) }
        var out = Text("")
        var start = 0
        for c in 1...line.count where c == line.count || tone(r, c) != tone(r, start) {
            out = out + Text(String(line[start..<c])).foregroundStyle(paint(tone(r, start)))
            start = c
        }
        return out
    }

    private func draw(in context: inout GraphicsContext) {
        let swiftUIFont = Font(font)
        let rowHeight = charH
        if let trace {
            let k = min(canvasSize.width / CGFloat(trace.width), canvasSize.height / CGFloat(trace.height))
            var faint = context
            faint.opacity = 0.22
            faint.draw(Image(decorative: trace, scale: 1),
                       in: CGRect(x: 0, y: 0, width: CGFloat(trace.width) * k, height: CGFloat(trace.height) * k))
        }
        for r in 0..<rows {
            if let paper = colors?.paper[r] { // paper first, under the marks
                for (c, p) in paper.enumerated() where p >= 0 {
                    let x0 = (charW * CGFloat(c)).rounded(), y0 = (rowHeight * CGFloat(r)).rounded()
                    context.fill(Path(CGRect(x: x0, y: y0, width: (charW * CGFloat(c + 1)).rounded() - x0, height: (rowHeight * CGFloat(r + 1)).rounded() - y0)), with: .color(Self.terminal(p)))
                }
            }
            guard grid[r].contains(where: { $0 != " " }) else { continue }
            // Block characters are painted as rectangles that fill the cell; a font's █ ▀ ▄ stop short
            // of the line height and a banner would come out striped.
            var line = grid[r]
            for (c, ch) in grid[r].enumerated() {
                if let shade = Self.shades[ch] {
                    line[c] = " "
                    // Edges rounded to the point, so neighbours meet without a gap or a darker overlap.
                    let x0 = (charW * CGFloat(c)).rounded(), y0 = (rowHeight * CGFloat(r)).rounded()
                    context.fill(Path(CGRect(x: x0, y: y0, width: (charW * CGFloat(c + 1)).rounded() - x0, height: (rowHeight * CGFloat(r + 1)).rounded() - y0)),
                                 with: .color(paint(tone(r, c)).opacity(shade)))
                    continue
                }
                guard let (top, bottom) = Self.blocks[ch] else { continue }
                line[c] = " "
                let y0 = rowHeight * (CGFloat(r) + top), y1 = rowHeight * (CGFloat(r) + bottom)
                context.fill(Path(CGRect(x: charW * CGFloat(c), y: y0, width: charW, height: y1 - y0).integral),
                             with: .color(paint(tone(r, c))))
            }
            let text = rowText(line, r).font(swiftUIFont)
            context.draw(text, at: CGPoint(x: 0, y: rowHeight * CGFloat(r)), anchor: .topLeading)
        }
        for (c, r) in picked {
            context.fill(Path(CGRect(x: charW * CGFloat(c), y: rowHeight * CGFloat(r), width: charW, height: rowHeight)), with: .color(Theme.accent.opacity(0.15)))
        }
        let dash = StrokeStyle(lineWidth: 1, dash: [4, 4])
        for c in guideCols {
            let x = charW * (CGFloat(c) + 0.5)
            context.stroke(Path { $0.move(to: CGPoint(x: x, y: 0)); $0.addLine(to: CGPoint(x: x, y: canvasSize.height)) },
                           with: .color(Theme.accent), style: dash)
        }
        for r in guideRows {
            let y = rowHeight * (CGFloat(r) + 0.5)
            context.stroke(Path { $0.move(to: CGPoint(x: 0, y: y)); $0.addLine(to: CGPoint(x: canvasSize.width, y: y)) },
                           with: .color(Theme.accent), style: dash)
        }
        for s in parts where s.presetId == "screen" && !s.hidden { // a screen's column grid (Grids.swift), faint bands
            for b in gridColumns(s) {
                context.fill(Path(CGRect(x: charW * CGFloat(b.col), y: rowHeight * CGFloat(s.row + 1), width: charW * CGFloat(b.width),
                                         height: rowHeight * CGFloat(s.height - 2))), with: .color(Theme.accent.opacity(0.08)))
            }
        }
        for el in parts where el.presetId == "adjust" && !el.hidden && !el.canvas { // an adjustment's area, dashed
            let area = CGRect(x: charW * CGFloat(el.col), y: rowHeight * CGFloat(el.row), width: charW * CGFloat(el.width), height: rowHeight * CGFloat(el.height))
            context.stroke(Path(area.insetBy(dx: 0.5, dy: 0.5)), with: .color(Theme.accent), style: StrokeStyle(lineWidth: 1, dash: [3, 3]))
        }
        for el in parts where el.note != nil && !el.hidden { // a part with a note wears a dot on its top right corner
            let dot = CGRect(x: charW * CGFloat(el.col + el.width) - 4, y: rowHeight * CGFloat(el.row) - 4, width: 8, height: 8)
            context.fill(Path(ellipseIn: dot), with: .color(Theme.accent))
        }
        for el in outlined {
            let box = CGRect(x: charW * CGFloat(el.col), y: rowHeight * CGFloat(el.row),
                             width: charW * CGFloat(el.width), height: rowHeight * CGFloat(el.height))
            context.stroke(Path(roundedRect: box.insetBy(dx: -2, dy: -2), cornerRadius: 4), with: .color(Theme.accent), lineWidth: 1)
        }
        if let el = selected {
            let box = CGRect(x: charW * CGFloat(el.col), y: rowHeight * CGFloat(el.row),
                             width: charW * CGFloat(el.width), height: rowHeight * CGFloat(el.height))
            context.stroke(Path(roundedRect: box.insetBy(dx: -2, dy: -2), cornerRadius: 4),
                           with: .color(Theme.accent), lineWidth: 2)
        }
    }

    private var tapGesture: some Gesture {
        SpatialTapGesture().onEnded { value in
            let cell = pxToCell(
                px: value.location.x, py: value.location.y,
                charW: charW, charH: charH
            )
            guard cell.col >= 0, cell.col < cols, cell.row >= 0, cell.row < rows else { return }
            onTap(cell.col, cell.row)
        }
    }
}
