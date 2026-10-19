// Component presets — Unicode box-drawing wireframe templates.
// Transcribed from src/lib/presets.js; keep the two in sync.

import Foundation

struct Preset: Identifiable, Hashable {
    let id: String
    let label: String
    let category: String
    let template: [String]
    /// A chart's numbers, which its template is drawn from.
    var text: String? = nil

    // ponytail: width/height are derived, not stored — the JS version carried them as
    // literals and its own test only ever asserted they matched the template.
    var height: Int { template.count }
    var width: Int { template.map(\.count).max() ?? 0 }
}

private func chartPreset(_ id: String, _ label: String, _ category: String, _ text: String) -> Preset {
    Preset(id: id, label: label, category: category, template: chartFrame(id, text), text: text)
}

let presets: [Preset] = [
    Preset(id: "button", label: "Button", category: "Input", template: ["[ OK ]"]),
    Preset(id: "input", label: "Input", category: "Input", template: ["[____________]"]),
    Preset(id: "select", label: "Select", category: "Input", template: ["[▾           ]"]),
    Preset(id: "checkbox", label: "Checkbox", category: "Input", template: ["[✓] Label"]),
    Preset(id: "radio", label: "Radio", category: "Input", template: ["(●) Option"]),
    Preset(id: "toggle", label: "Toggle", category: "Input", template: ["[●━━━━━]"]),
    Preset(id: "table", label: "Table", category: "Data", template: [
        "┌──────┬──────┬──────┐",
        "│ Head │ Head │ Head │",
        "├──────┼──────┼──────┤",
        "│ Cell │ Cell │ Cell │",
        "│ Cell │ Cell │ Cell │",
        "└──────┴──────┴──────┘",
    ]),
    Preset(id: "modal", label: "Modal", category: "Overlay", template: [
        "┌────────────[×]──────┐",
        "│ Modal Title         │",
        "│                     │",
        "│ Content goes here   │",
        "│                     │",
        "│         [ Cancel ]  [ OK ] │",
        "└─────────────────────┘",
    ]),
    Preset(id: "browser", label: "Browser", category: "Layout", template: [
        "┌─────────────────────────────┐",
        "│ ◄ ► ⟳  [___________________]│",
        "├─────────────────────────────┤",
        "│                             │",
        "│                             │",
        "│                             │",
        "└─────────────────────────────┘",
    ]),
    Preset(id: "card", label: "Card", category: "Layout", template: [
        "┌──────────────────┐",
        "│ Card Title       │",
        "│                  │",
        "│ Card content     │",
        "│ goes here.       │",
        "│                  │",
        "│ [ Action ]       │",
        "└──────────────────┘",
    ]),
    Preset(id: "navbar", label: "Navbar", category: "Layout", template: [
        "┌─────────────────────────────────┐",
        "│ ≡  Logo            Search    ☆  │",
        "└─────────────────────────────────┘",
    ]),
    Preset(id: "tabs", label: "Tabs", category: "Layout", template: [
        "┌──────┐  ────────  ────────",
        "│ Tab1 │   Tab 2     Tab 3  ",
        "├──────┴──────────────────┐",
        "│ Content                  │",
        "└──────────────────────────┘",
    ]),
    chartPreset("progress", "Progress", "Feedback", "42"),
    Preset(id: "icon", label: "Icon", category: "Media", template: ["★"]),
    Preset(id: "image", label: "Image", category: "Media", template: [
        "╔══════════════╗",
        "║              ║",
        "║   [ img ]    ║",
        "║              ║",
        "╚══════════════╝",
    ]),
    Preset(id: "divider", label: "Divider", category: "Layout", template: ["─────────────────────"]),
    Preset(id: "alert", label: "Alert", category: "Feedback", template: [
        "┌──────────────────────────┐",
        "│ ⚠  Warning message here  │",
        "└──────────────────────────┘",
    ]),
    Preset(id: "breadcrumb", label: "Breadcrumb", category: "Navigation", template: ["Home > Section > Page"]),
    Preset(id: "avatar", label: "Avatar", category: "Media", template: [
        "╭──╮",
        "│DH│",
        "╰──╯",
    ]),
    Preset(id: "list", label: "List", category: "Data", template: [
        "• Item one",
        "• Item two",
        "• Item three",
    ]),
    Preset(id: "stepper", label: "Stepper", category: "Navigation", template: ["● ─────── ○ ─────── ○"]),
    Preset(id: "rating", label: "Rating", category: "Feedback", template: ["★★★☆☆"]),
    Preset(id: "skeleton", label: "Skeleton", category: "Feedback", template: [
        "░░░░░░░░░░░░░░░░░░░░",
        "░░░░░░░░░░░░░░",
        "░░░░░░░░░░░░░░░░░",
    ]),
    Preset(id: "search", label: "Search", category: "Input", template: ["( Search          )"]),
    Preset(id: "segmented", label: "Segmented", category: "Input", template: ["[ Day | Week | Month ]"]),
    Preset(id: "slider", label: "Slider", category: "Input", template: ["──────●────────"]),
    Preset(id: "textarea", label: "Text area", category: "Input", template: [
        "┌────────────────────┐",
        "│ Write something... │",
        "│                    │",
        "│                    │",
        "└────────────────────┘",
    ]),
    Preset(id: "datepicker", label: "Date picker", category: "Input", template: [
        "┌─ October ────────────┐",
        "│ Mo Tu We Th Fr Sa Su │",
        "│           1  2  3  4 │",
        "│  5  6  7  8  9 10 11 │",
        "│ 12 13 14 15 16 17 18 │",
        "└──────────────────────┘",
    ]),
    Preset(id: "tabbar", label: "Tab bar", category: "Navigation", template: [
        "┌─────────────────────────────────┐",
        "│ Home   Search   Saved   Profile │",
        "└─────────────────────────────────┘",
    ]),
    Preset(id: "pagination", label: "Pagination", category: "Navigation", template: ["‹ Prev   1  2  3  …  9   Next ›"]),
    Preset(id: "sidebar", label: "Sidebar", category: "Layout", template: [
        "┌───────────┐",
        "│ ▸ Inbox   │",
        "│   Drafts  │",
        "│   Sent    │",
        "│   Archive │",
        "└───────────┘",
    ]),
    Preset(id: "accordion", label: "Accordion", category: "Layout", template: [
        "▾ Section one       ",
        "  Content goes here.",
        "▸ Section two       ",
        "▸ Section three     ",
    ]),
    Preset(id: "toast", label: "Toast", category: "Feedback", template: [
        "┌─────────────────────────┐",
        "│ ✓ Saved to your project │",
        "└─────────────────────────┘",
    ]),
    Preset(id: "tooltip", label: "Tooltip", category: "Feedback", template: [
        "┌─────────────┐",
        "│ Helpful tip │",
        "└──────┬──────┘",
        "       ▼       ",
    ]),
    Preset(id: "tags", label: "Tags", category: "Data", template: ["(Design) (Text) (Free)"]),
    chartPreset("chart", "Bar chart", "Data", "Mon 4\nTue 7\nWed 3\nThu 8"),
    chartPreset("sparkline", "Sparkline", "Data", "3 5 2 8 6 9 4 7"),
    Preset(id: "code", label: "Code block", category: "Media", template: [
        "┌─ code ───────────────────┐",
        "│ const screen = sketch(); │",
        "│ paste(screen);           │",
        "└──────────────────────────┘",
    ]),
]

/// Categories in first-appearance order, matching the JS `[...new Set(...)]`.
let presetCategories: [String] = presets.reduce(into: [String]()) { acc, p in
    if !acc.contains(p.category) { acc.append(p.category) }
}

func preset(id: String) -> Preset? {
    presets.first { $0.id == id }
}

/// The drawing tools sit first in the palette. Arrow and Type it are tools, the rest stamp like parts.
let drawTools: [Preset] = [
    Preset(id: "screen", label: "Screen", category: "Draw", template: screenFrame("Screen", width: 40, height: 22)),
    Preset(id: "type", label: "Type it", category: "Draw", template: ["[OK] \"Email\""]),
    Preset(id: "capture", label: "Capture a page", category: "Draw", template: ["www ⇣ [ ]"]),
    Preset(id: "photo", label: "Photo", category: "Draw", template: ["▄█▀▄█"]),
    Preset(id: "trace", label: "Trace a photo", category: "Draw", template: ["░▒▓"]),
    Preset(id: "photo-braille", label: "Braille photo", category: "Draw", template: ["⣿⡣⡃⡀"]),
    Preset(id: "photo-shade", label: "Shade photo", category: "Draw", template: ["█▓▒░"]),
    Preset(id: "fill", label: "Shade", category: "Draw", template: ["▒▒▒▒▒▒▒▒", "▒▒▒▒▒▒▒▒", "▒▒▒▒▒▒▒▒"]),
    Preset(id: "line", label: "Arrow", category: "Draw", template: ["───▶"]),
    Preset(id: "brush", label: "Brush", category: "Draw", template: ["█▓▒░"]),
    Preset(id: "adjust", label: "Adjust", category: "Draw", template: ["┏━◐┓"]),
    Preset(id: "gradient", label: "Gradient", category: "Draw", template: ["░▒▓█"]),
    Preset(id: "marquee", label: "Select area", category: "Draw", template: ["┌╌╌┐"]),
    Preset(id: "wand", label: "Magic wand", category: "Draw", template: ["╱✦"]),
    Preset(id: "text", label: "Text", category: "Draw", template: ["Text"]),
    Preset(id: "banner", label: "Banner", category: "Draw", template: bannerText("TITLE")),
    Preset(id: "boxy", label: "Boxy", category: "Draw", template: ["   ▌   ", "╭─────╮", "│ ● ● │", "│  ◡  │", "╰─┬─┬─╯"]),
]

/// Part packs: parts in the style of a platform, a port of PACKS in src/lib/presets.js.
let packs: [Preset] = [
    Preset(id: "ios-nav", label: "Nav bar", category: "iOS", template: ["‹ Back      Title      Edit"]),
    Preset(id: "ios-list", label: "Inset list", category: "iOS", template: ["╭─────────────────────────╮", "│ Wi-Fi             On  › │", "├─────────────────────────┤", "│ Bluetooth         On  › │", "╰─────────────────────────╯"]),
    Preset(id: "ios-switch", label: "Switch row", category: "iOS", template: ["Airplane mode          ◯━━"]),
    Preset(id: "ios-sheet", label: "Sheet", category: "iOS", template: ["╭────────────────────────╮", "│          ━━━           │", "│ Share                  │", "│ Copy   Print   Save    │", "╰────────────────────────╯"]),
    Preset(id: "md-appbar", label: "Top app bar", category: "Material", template: ["┏━━━━━━━━━━━━━━━━━━━━━━━┓", "┃ ≡  Title            ⋮ ┃", "┗━━━━━━━━━━━━━━━━━━━━━━━┛"]),
    Preset(id: "md-fab", label: "Action button", category: "Material", template: ["╭───╮", "│ + │", "╰───╯"]),
    Preset(id: "md-chips", label: "Chips", category: "Material", template: ["( Filter ✓ )  ( Sort )  ( Near me )"]),
    Preset(id: "md-snackbar", label: "Snackbar", category: "Material", template: ["┌────────────────────────────┐", "│ Message sent          UNDO │", "└────────────────────────────┘"]),
    Preset(id: "term-prompt", label: "Prompt", category: "Terminal", template: ["$ icelus draw screen.txt"]),
    Preset(id: "term-progress", label: "Progress", category: "Terminal", template: ["[██████████░░░░░░] 62%"]),
    Preset(id: "term-menu", label: "Menu", category: "Terminal", template: ["> Start", "  Settings", "  Quit"]),
    Preset(id: "term-window", label: "Window", category: "Terminal", template: ["┌─ ~/project ───────────────┐", "│ $ npm test                │", "│ 103 passed                │", "└───────────────────────────┘"]),
    Preset(id: "email-header", label: "Header", category: "Email", template: ["From: Ada <ada@example.com>", "Subject: Lunch?", "───────────────────────────"]),
    Preset(id: "email-button", label: "Email button", category: "Email", template: ["╔═══════════════════╗", "║   Confirm email   ║", "╚═══════════════════╝"]),
    Preset(id: "email-hero", label: "Hero image", category: "Email", template: ["┌────────────────────────────┐", "│                            │", "│         [ image ]          │", "│                            │", "│                            │", "└────────────────────────────┘"]),
    Preset(id: "email-footer", label: "Footer", category: "Email", template: ["You got this because you signed up.", "Unsubscribe · Preferences"]),
]
let packCategories: [String] = packs.reduce(into: []) { if !$0.contains($1.category) { $0.append($1.category) } }
