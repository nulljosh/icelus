import SwiftUI

/// The real look on the native canvas, a port of src/components/RealLayer.jsx: every part with a real twin
/// drawn as a real control on the same grid. It never takes a tap, so selecting and dragging work unchanged.
struct RealLayerView: View {
    let elements: [Element]
    let charW: CGFloat
    let rowH: CGFloat
    let fontSize: CGFloat

    var body: some View {
        let byId = Dictionary(elements.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
        ZStack(alignment: .topLeading) {
            ForEach(elements.filter { !$0.hidden }) { el in
                if let p = realPart(el) {
                    let part = RealPartView(el: el, part: p, charW: charW, rowH: rowH)
                        .frame(width: CGFloat(el.width) * charW, height: CGFloat(el.height) * rowH, alignment: .topLeading)
                    // A crop or clip (Mask.swift) hides the rest of the control; it never changes the control.
                    if let b = shownBox(el, byId) {
                        part.mask(alignment: .topLeading) {
                            Rectangle().frame(width: CGFloat(max(0, b.c1 - b.c0)) * charW, height: CGFloat(max(0, b.r1 - b.r0)) * rowH)
                                .offset(x: CGFloat(b.c0 - el.col) * charW, y: CGFloat(b.r0 - el.row) * rowH)
                        }.offset(x: CGFloat(el.col) * charW, y: CGFloat(el.row) * rowH)
                    } else {
                        part.offset(x: CGFloat(el.col) * charW, y: CGFloat(el.row) * rowH)
                    }
                }
            }
        }
        .font(.system(size: fontSize * 0.93))
        .foregroundStyle(Theme.ink)
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }
}

private struct RealPartView: View {
    let el: Element
    let part: RealPart
    let charW: CGFloat
    let rowH: CGFloat

    private var ink: Color? { el.ink.map(CanvasView.terminal) ?? (el.accent ? Theme.accent : nil) }
    private var paper: Color? { el.paper.map(CanvasView.terminal) }
    private let fill = Theme.adaptive(0x3C3C43, 0xFFFFFF, light: 0.08, dark: 0.10)
    private let deep = Color(red: 0.114, green: 0.306, blue: 0.847)

    var body: some View {
        switch part {
        case .control(let c): control(c)
        case .toggle(let on):
            Capsule().fill(on ? Color.green : Theme.rule).frame(width: rowH * 1.6, height: rowH * 0.9)
                .overlay(alignment: on ? .trailing : .leading) { Circle().fill(.white).padding(2).shadow(radius: 1) }
                .frame(maxHeight: .infinity)
        case .slider(let v), .progress(let v):
            GeometryReader { g in
                ZStack(alignment: .leading) {
                    Capsule().fill(Theme.rule)
                    Capsule().fill(Theme.accent).frame(width: g.size.width * v)
                }.frame(height: rowH * 0.25).frame(maxHeight: .infinity)
            }
        case .search(let placeholder): field(placeholder, glass: true)
        case .avatar(let initials):
            Circle().fill(paper ?? Theme.accent.opacity(0.15)).overlay(Text(verbatim: initials).fontWeight(.semibold).foregroundStyle(ink ?? Theme.accent))
        case .image: RoundedRectangle(cornerRadius: rowH * 0.4).fill(paper ?? fill).overlay(Image(systemName: "photo").foregroundStyle(Theme.muted))
        case .skeleton: RoundedRectangle(cornerRadius: rowH * 0.3).fill(fill)
        case .segmented(let items):
            HStack(spacing: 0) {
                ForEach(Array(items.enumerated()), id: \.offset) { i, s in
                    Text(verbatim: s).fontWeight(i == 0 ? .semibold : .regular).frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background(i == 0 ? Capsule().fill(Theme.canvas) : nil)
                }
            }.padding(2).background(Capsule().fill(fill))
        case .tags(let items):
            HStack(spacing: 4) { ForEach(Array(items.enumerated()), id: \.offset) { _, s in Text(verbatim: s).padding(.horizontal, 6).background(Capsule().fill(Theme.accent.opacity(0.15))).foregroundStyle(Theme.accent) } }
                .frame(maxHeight: .infinity)
        case .box(let rows):
            RoundedRectangle(cornerRadius: rowH * 0.6).fill(paper ?? Theme.canvas)
                .overlay(RoundedRectangle(cornerRadius: rowH * 0.6).strokeBorder(Theme.rule))
                .overlay(alignment: .topLeading) { words(rows) }
        case .words(let rows): words(rows)
        }
    }

    @ViewBuilder private func control(_ c: CodePart) -> some View {
        switch c {
        case .screen(let title):
            RoundedRectangle(cornerRadius: rowH * 0.6).fill(paper ?? Theme.canvas)
                .overlay(RoundedRectangle(cornerRadius: rowH * 0.6).strokeBorder(Theme.rule))
                .shadow(color: .black.opacity(0.06), radius: 8, y: 4)
                .overlay(alignment: .topLeading) { // its column grid (Grids.swift) as faint bands on the artboard
                    ForEach(gridColumns(el), id: \.col) { b in
                        Rectangle().fill(Theme.accent.opacity(0.08)).frame(width: charW * CGFloat(b.width), height: rowH * CGFloat(el.height - 2))
                            .offset(x: charW * CGFloat(b.col - el.col), y: rowH)
                    }
                }
                .overlay(alignment: .topLeading) { Text(verbatim: title).font(.caption).foregroundStyle(Theme.muted).offset(y: -rowH) }
        case .button(let label):
            Capsule().fill(paper ?? deep).overlay(Text(verbatim: label).fontWeight(.semibold).foregroundStyle(ink ?? .white).lineLimit(1))
        case .input(let placeholder): field(placeholder, glass: false)
        case .select(let value):
            field(value, glass: false, chevron: true)
        case .checkbox(let on, let label), .radio(let on, let label):
            HStack(spacing: 6) {
                let isRadio: Bool = { if case .radio = c { return true }; return false }()
                Image(systemName: on ? (isRadio ? "largecircle.fill.circle" : "checkmark.square.fill") : (isRadio ? "circle" : "square"))
                    .foregroundStyle(on ? Theme.accent : Theme.muted)
                Text(verbatim: label).foregroundStyle(ink ?? Theme.ink).lineLimit(1)
            }.frame(maxHeight: .infinity)
        case .divider: Divider().frame(maxHeight: .infinity)
        case .heading(let text): Text(verbatim: text).font(.system(size: rowH * 1.6, weight: .bold)).foregroundStyle(ink ?? Theme.ink).lineLimit(1).frame(maxHeight: .infinity)
        case .text(let lines): words(lines.enumerated().map { TextRow(row: $0.offset, col: 0, text: $0.element) })
        case .table(let head, let body):
            SwiftUI.Grid(alignment: .leading, horizontalSpacing: 8, verticalSpacing: 0) {
                GridRow { ForEach(Array(head.enumerated()), id: \.offset) { _, c in Text(verbatim: c).fontWeight(.semibold) } }.frame(height: rowH * 2)
                ForEach(Array(body.enumerated()), id: \.offset) { _, r in
                    GridRow { ForEach(Array(r.enumerated()), id: \.offset) { _, c in Text(verbatim: c) } }.frame(height: rowH * 2)
                }
            }
            .padding(.horizontal, 8)
            .background(RoundedRectangle(cornerRadius: rowH * 0.4).fill(paper ?? Theme.canvas))
            .overlay(RoundedRectangle(cornerRadius: rowH * 0.4).strokeBorder(Theme.rule))
        case .pre(let lines): words(rowsOfText(lines))
        }
    }

    private func field(_ text: String, glass: Bool, chevron: Bool = false) -> some View {
        HStack(spacing: 6) {
            if glass { Image(systemName: "magnifyingglass").foregroundStyle(Theme.muted) }
            Text(verbatim: text).foregroundStyle(ink ?? (chevron ? Theme.ink : Theme.muted)).lineLimit(1)
            Spacer(minLength: 0)
            if chevron { Image(systemName: "chevron.down").foregroundStyle(Theme.muted) }
        }
        .padding(.horizontal, 8)
        .frame(maxHeight: .infinity)
        .background(RoundedRectangle(cornerRadius: rowH * 0.4).fill(paper ?? fill))
        .overlay(RoundedRectangle(cornerRadius: rowH * 0.4).strokeBorder(el.variant == "error" ? Color.red : Theme.rule))
    }

    private func words(_ rows: [TextRow]) -> some View {
        ZStack(alignment: .topLeading) {
            ForEach(rows, id: \.row) { r in
                Group {
                    if r.button { Text(verbatim: r.text).fontWeight(.semibold).foregroundStyle(.white).padding(.horizontal, rowH * 0.6).background(Capsule().fill(deep)) }
                    else { Text(verbatim: r.text).foregroundStyle(ink ?? Theme.ink) }
                }.lineLimit(1)
                    .frame(height: rowH).offset(x: CGFloat(r.col) * charW, y: CGFloat(r.row) * rowH)
            }
        }
    }
}
