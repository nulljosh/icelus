// The character grid itself — ported from ios/App/CanvasView.swift.
//
// ponytail: one Text draw per ROW, not per cell. CoreText for metrics (not UIFont) since
// that's the one measurement API that is exact and available across Apple platforms,
// watchOS included.

import SwiftUI
import CoreText

struct CanvasView: View {
    let grid: Grid
    let fontSize: CGFloat
    let onTap: (Int, Int) -> Void

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
        .background(Theme.canvas, in: RoundedRectangle(cornerRadius: Theme.radius))
        .overlay(RoundedRectangle(cornerRadius: Theme.radius).strokeBorder(Theme.rule, lineWidth: 1))
        .gesture(tapGesture)
    }

    private func draw(in context: inout GraphicsContext) {
        let swiftUIFont = Font(font)
        let rowHeight = charH
        for r in 0..<rows {
            let line = String(grid[r])
            guard line.contains(where: { $0 != " " }) else { continue }
            let text = Text(line).font(swiftUIFont).foregroundStyle(Theme.ink)
            context.draw(text, at: CGPoint(x: 0, y: rowHeight * CGFloat(r)), anchor: .topLeading)
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
