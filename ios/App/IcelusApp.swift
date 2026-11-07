import SwiftUI

@main
struct IcelusApp: App {
    @State private var splashing = true

    var body: some Scene {
        WindowGroup {
            ZStack {
                ContentView()
                #if os(macOS)
                    .onAppear { MacShot.runIfAsked() }
                #endif
                if splashing { Splash { splashing = false } }
            }
        }
        // ponytail: sized for the default 100x50 grid at the default font size. On iOS
        // it is a no-op, so no #if is needed.
        .defaultSize(width: 1000, height: 760)
    }
}

/// Launch splash, once per launch: Boxy pops in on the plain background (the same colour as the system
/// launch screen, so there is no flash), then grows and fades into the canvas. About 1.1s; Reduce Motion skips the motion.
struct Splash: View {
    let done: () -> Void
    @State private var shown = false
    @State private var leaving = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        ZStack {
            Rectangle().fill(.background).ignoresSafeArea()
            BoxyView(size: 112)
                .scaleEffect(leaving ? 1.6 : shown ? 1 : 0.6)
                .opacity(shown ? 1 : 0)
        }
        .opacity(leaving ? 0 : 1)
        .accessibilityHidden(true)
        .allowsHitTesting(!leaving)
        .task {
            if reduceMotion { shown = true; try? await Task.sleep(for: .milliseconds(300)) } else {
                withAnimation(.spring(duration: 0.45, bounce: 0.35)) { shown = true }
                try? await Task.sleep(for: .milliseconds(650))
            }
            withAnimation(.easeIn(duration: 0.3)) { leaving = true }
            try? await Task.sleep(for: .milliseconds(300))
            done()
        }
    }
}

#if os(macOS)
import AppKit

/// `-shot-mac /path/out.png` sizes the window to 1440x900 points (2880x1800 on Retina, an App Store
/// desktop size), saves the window's own pixels and quits. An app may draw its own window without the
/// Screen Recording permission, so this never prompts. Combine with the `-shot-*` flags in `restore()`.
enum MacShot {
    static func runIfAsked() {
        guard let path = UserDefaults.standard.string(forKey: "shot-mac") else { return }
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            guard let window = NSApp.windows.first(where: \.isVisible), let view = window.contentView else { return }
            window.setContentSize(NSSize(width: 1440, height: 900))
            window.center()
            DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                // Drawn at 2x whatever the screen is, so the file is 2880x1800.
                if let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: 2880, pixelsHigh: 1800, bitsPerSample: 8,
                                              samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB,
                                              bytesPerRow: 0, bitsPerPixel: 0) {
                    rep.size = view.bounds.size
                    view.cacheDisplay(in: view.bounds, to: rep)
                    try? rep.representation(using: .png, properties: [:])?.write(to: URL(fileURLWithPath: path))
                }
                exit(0) // terminate(nil) left the window up; this is a screenshot run, nothing to save
            }
        }
    }
}
#endif
