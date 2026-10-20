import SwiftUI

/// Boxy, drawn from brand/mascot.svg on its 240 grid: a frame still being drawn, its last corner open where the
/// pen is, text cursors for eyes and two selection handles for feet. The eyes blink unless motion is reduced.
struct BoxyView: View {
    var size: CGFloat = 120
    @Environment(\.accessibilityReduceMotion) private var still

    var body: some View {
        TimelineView(.periodic(from: .now, by: 0.1)) { time in
            let blink = !still && time.date.timeIntervalSinceReferenceDate.truncatingRemainder(dividingBy: 5) > 4.85
            Canvas { context, box in
                let k = box.width / 240
                func r(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat) -> CGRect { CGRect(x: x * k, y: y * k, width: w * k, height: h * k) }
                context.fill(Path(roundedRect: r(67, 77, 106, 106), cornerRadius: 21 * k), with: .color(Color(red: 0.86, green: 0.91, blue: 1)))
                var frame = Path()
                frame.move(to: CGPoint(x: 146 * k, y: 70 * k))
                frame.addArc(tangent1End: CGPoint(x: 60 * k, y: 70 * k), tangent2End: CGPoint(x: 60 * k, y: 98 * k), radius: 28 * k)
                frame.addArc(tangent1End: CGPoint(x: 60 * k, y: 190 * k), tangent2End: CGPoint(x: 88 * k, y: 190 * k), radius: 28 * k)
                frame.addArc(tangent1End: CGPoint(x: 180 * k, y: 190 * k), tangent2End: CGPoint(x: 180 * k, y: 162 * k), radius: 28 * k)
                frame.addLine(to: CGPoint(x: 180 * k, y: 104 * k))
                context.stroke(frame, with: .color(Theme.accent), style: StrokeStyle(lineWidth: 14 * k, lineCap: .round))
                var pen = context
                pen.translateBy(x: 172 * k, y: 75 * k); pen.rotate(by: .degrees(45))
                pen.fill(Path(roundedRect: CGRect(x: -6 * k, y: -17 * k, width: 12 * k, height: 34 * k), cornerRadius: 6 * k), with: .color(Color(red: 0.36, green: 0.61, blue: 1)))
                for x: CGFloat in [51, 171] {
                    let foot = Path(roundedRect: r(x, 181, 18, 18), cornerRadius: 4 * k)
                    context.fill(foot, with: .color(.white)); context.stroke(foot, with: .color(Theme.accent), lineWidth: 5 * k)
                }
                let face = Color(red: 0.11, green: 0.11, blue: 0.12)
                for x: CGFloat in [96, 133] {
                    context.fill(Path(roundedRect: blink ? r(x, 119, 11, 4) : r(x, 106, 11, 30), cornerRadius: (blink ? 2 : 5.5) * k), with: .color(face))
                }
                var smile = Path()
                smile.move(to: CGPoint(x: 104 * k, y: 156 * k)); smile.addQuadCurve(to: CGPoint(x: 136 * k, y: 156 * k), control: CGPoint(x: 120 * k, y: 168 * k))
                context.stroke(smile, with: .color(face), style: StrokeStyle(lineWidth: 7 * k, lineCap: .round))
            }
        }
        .frame(width: size, height: size)
        .accessibilityLabel("Boxy, the Icelus mascot")
    }
}
