import SwiftUI
import WebKit

/// A live code part in the real look (RealView.swift): its HTML in a web view with no saved data and no network,
/// the same rules as the web's sandbox page (landing/sandbox.html). It never takes a tap.
struct LiveCodeView {
    let html: String

    /// The snippet with a policy in front: its own scripts and styles run, nothing loads from anywhere.
    static func page(_ html: String) -> String {
        "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:\">"
            + "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
            + "<style>html,body{margin:0;font:14px -apple-system,system-ui,sans-serif;background:transparent}</style>" + html
    }

    static func makeWebView() -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .nonPersistent()
        let web = WKWebView(frame: .zero, configuration: config)
        #if os(iOS)
        web.isOpaque = false
        web.backgroundColor = .clear
        web.scrollView.isScrollEnabled = false
        #else
        web.setValue(false, forKey: "drawsBackground")
        #endif
        return web
    }
}

#if os(iOS)
extension LiveCodeView: UIViewRepresentable {
    func makeUIView(context: Context) -> WKWebView { Self.makeWebView() }
    func updateUIView(_ web: WKWebView, context: Context) {
        guard context.coordinator.loaded != html else { return }
        context.coordinator.loaded = html
        web.loadHTMLString(Self.page(html), baseURL: nil)
    }
    func makeCoordinator() -> Loaded { Loaded() }
}
#else
extension LiveCodeView: NSViewRepresentable {
    func makeNSView(context: Context) -> WKWebView { Self.makeWebView() }
    func updateNSView(_ web: WKWebView, context: Context) {
        guard context.coordinator.loaded != html else { return }
        context.coordinator.loaded = html
        web.loadHTMLString(Self.page(html), baseURL: nil)
    }
    func makeCoordinator() -> Loaded { Loaded() }
}
#endif

/// The HTML last loaded, so a redraw of the canvas does not reload the page.
final class Loaded { var loaded: String? }
