import SwiftUI

/// Present, a port of src/components/Present.jsx: one screen at a time, full screen. Tap the right of a slide or
/// press the arrow keys to move. Save as PDF shares every slide as a page of one PDF.
struct PresentView: View {
    let slides: [Slide]
    @Environment(\.dismiss) private var dismiss
    @State private var at = 0
    @State private var pdf: URL?

    var body: some View {
        VStack(spacing: 24) {
            GeometryReader { geo in
                SlideView(slide: slides[at], size: geo.size)
                    .contentShape(Rectangle())
                    .onTapGesture { location in go(location.x < geo.size.width / 3 ? -1 : 1) }
            }
            HStack(spacing: 8) {
                Button { go(-1) } label: { Image(systemName: "chevron.left") }
                    .keyboardShortcut(.leftArrow, modifiers: []).disabled(at == 0)
                    .accessibilityLabel(Text("Previous"))
                Text("\(at + 1) of \(slides.count)").foregroundStyle(Theme.muted).frame(minWidth: 64)
                Button { go(1) } label: { Image(systemName: "chevron.right") }
                    .keyboardShortcut(.rightArrow, modifiers: []).disabled(at == slides.count - 1)
                    .accessibilityLabel(Text("Next"))
                if let pdf { ShareLink(item: pdf) { Text("Save as PDF") } }
                Button("Done") { dismiss() }.keyboardShortcut(.cancelAction)
            }
            .buttonStyle(.bordered)
            .controlSize(.large)
            .padding(.bottom, 24)
        }
        .background(Theme.background.ignoresSafeArea())
        .task { pdf = deckPDF(slides) }
    }

    private func go(_ d: Int) { at = max(0, min(slides.count - 1, at + d)) }
}

/// One slide: the screen's text, as large as fits.
struct SlideView: View {
    let slide: Slide
    let size: CGSize

    var body: some View {
        let (w, h) = slideSize(slide.text)
        let font = min(size.width * 0.88 / CGFloat(w) / 0.6, size.height * 0.8 / CGFloat(h) / 1.2, 28)
        Text(verbatim: slide.text)
            .font(.system(size: max(4, font), design: .monospaced))
            .foregroundStyle(Theme.ink)
            .fixedSize()
            .frame(width: size.width, height: size.height)
            .accessibilityLabel(Text(verbatim: slide.title))
    }
}

/// Every slide as a landscape page of one PDF in the temporary folder.
@MainActor func deckPDF(_ slides: [Slide]) -> URL? {
    let url = FileManager.default.temporaryDirectory.appendingPathComponent("Icelus deck.pdf")
    var box = CGRect(x: 0, y: 0, width: 1280, height: 720)
    guard let ctx = CGContext(url as CFURL, mediaBox: &box, nil) else { return nil }
    for slide in slides {
        let page = SlideView(slide: slide, size: box.size).background(Color.white).environment(\.colorScheme, .light) // a PDF page is paper
        ImageRenderer(content: page).render { _, draw in
            ctx.beginPDFPage(nil)
            draw(ctx)
            ctx.endPDFPage()
        }
    }
    ctx.closePDF()
    return url
}
