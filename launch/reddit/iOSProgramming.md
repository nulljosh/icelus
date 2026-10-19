Note: "Show and Tell" flair required. Check for a weekly self-promo thread first, post there if one exists.

Title: Native SwiftUI wireframe tool, rewritten off a WKWebView shell after a Guideline 5.6 rejection

Body:
Icelus lets you stamp UI components onto a monospace character grid and copy the result as plain text. It started as a WKWebView shell around the web build, and Apple flagged it under Guideline 5.6 as too thin to be its own app.

I rewrote it native: SwiftUI Canvas draws the grid, one Text draw per row instead of per cell, CoreText for measurement since NSFont has no lineHeight and CTFont is the one API that compiles on both iOS and macOS without a #if. The grid logic itself is a small reducer ported function for function from the web engine, so both sides stay testable against the same behavior. One target covers iOS and macOS through supportedDestinations.

It's $0.99 on the App Store, free on the web. Happy to talk through the CoreText measurement approach or the port if anyone's tackling something similar.

wiretext.jaybulb.com
