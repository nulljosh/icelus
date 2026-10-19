// The brand palette (brand/BRAND.md), the same numbers as brand/tokens.css, light and dark. Every color follows
// the system appearance. The Watch app compiles this file too.

import SwiftUI
#if canImport(UIKit)
import UIKit
#elseif canImport(AppKit)
import AppKit
#endif

enum Theme {
    static let background = adaptive(0xF5F5F7, 0x000000)              // ground
    static let canvas = adaptive(0xFFFFFF, 0x1C1C1E)                   // card and canvas
    static let accent = adaptive(0x1D4ED8, 0x5B9BFF)                   // blueprint blue
    static let ink = adaptive(0x1D1D1F, 0xF5F5F7)
    static let muted = ink.opacity(0.6)
    static let rule = adaptive(0x3C3C43, 0xFFFFFF, light: 0.18, dark: 0.16) // hairline
    static let radius: CGFloat = 10

    /// One color for light and one for dark, picked by the system appearance as it changes.
    static func adaptive(_ light: UInt32, _ dark: UInt32, light lightAlpha: CGFloat = 1, dark darkAlpha: CGFloat = 1) -> Color {
        func rgb(_ v: UInt32) -> (CGFloat, CGFloat, CGFloat) { (CGFloat(v >> 16 & 255) / 255, CGFloat(v >> 8 & 255) / 255, CGFloat(v & 255) / 255) }
        let (lr, lg, lb) = rgb(light), (dr, dg, db) = rgb(dark)
        #if os(watchOS)
        return Color(red: dr, green: dg, blue: db).opacity(darkAlpha) // a watch is always dark
        #elseif canImport(UIKit)
        return Color(UIColor { traits in
            traits.userInterfaceStyle == .dark ? UIColor(red: dr, green: dg, blue: db, alpha: darkAlpha) : UIColor(red: lr, green: lg, blue: lb, alpha: lightAlpha)
        })
        #else
        return Color(NSColor(name: nil) { look in
            look.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua
                ? NSColor(srgbRed: dr, green: dg, blue: db, alpha: darkAlpha) : NSColor(srgbRed: lr, green: lg, blue: lb, alpha: lightAlpha)
        })
        #endif
    }
}
