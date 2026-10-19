package com.nulljosh.charwork

// Ported from src/lib/presets.js / ios/App/Presets.swift. Keep line-comparable.
data class Preset(val id: String, val label: String, val category: String, val template: List<String>, val width: Int, val height: Int)

val PRESETS: List<Preset> = listOf(
    Preset("button", "Button", "Input", listOf("[ OK ]"), 6, 1),
    Preset("input", "Input", "Input", listOf("[____________]"), 14, 1),
    Preset("select", "Select", "Input", listOf("[▾           ]"), 14, 1),
    Preset("checkbox", "Checkbox", "Input", listOf("[✓] Label"), 9, 1),
    Preset("radio", "Radio", "Input", listOf("(●) Option"), 10, 1),
    Preset("toggle", "Toggle", "Input", listOf("[●━━━━━]"), 8, 1),
    Preset("table", "Table", "Data", listOf("┌──────┬──────┬──────┐", "│ Head │ Head │ Head │", "├──────┼──────┼──────┤", "│ Cell │ Cell │ Cell │", "│ Cell │ Cell │ Cell │", "└──────┴──────┴──────┘"), 22, 6),
    Preset("modal", "Modal", "Overlay", listOf("┌────────────[×]──────┐", "│ Modal Title         │", "│                     │", "│ Content goes here   │", "│                     │", "│         [ Cancel ]  [ OK ] │", "└─────────────────────┘"), 25, 7),
    Preset("browser", "Browser", "Layout", listOf("┌─────────────────────────────┐", "│ ◄ ► ⟳  [___________________]│", "├─────────────────────────────┤", "│                             │", "│                             │", "│                             │", "└─────────────────────────────┘"), 33, 7),
    Preset("card", "Card", "Layout", listOf("┌──────────────────┐", "│ Card Title       │", "│                  │", "│ Card content     │", "│ goes here.       │", "│                  │", "│ [ Action ]       │", "└──────────────────┘"), 20, 8),
    Preset("navbar", "Navbar", "Layout", listOf("┌─────────────────────────────────┐", "│ ≡  Logo            Search    ☆  │", "└─────────────────────────────────┘"), 35, 3),
    Preset("tabs", "Tabs", "Layout", listOf("┌──────┐  ────────  ────────", "│ Tab1 │   Tab 2     Tab 3  ", "├──────┴──────────────────┐", "│ Content                  │", "└──────────────────────────┘"), 30, 5),
    Preset("progress", "Progress", "Feedback", listOf("▓▓▓▓▓▓░░░░░░░░ 42%"), 18, 1),
    Preset("icon", "Icon", "Media", listOf("★"), 1, 1),
    Preset("image", "Image", "Media", listOf("╔══════════════╗", "║              ║", "║   [ img ]    ║", "║              ║", "╚══════════════╝"), 16, 5),
    Preset("divider", "Divider", "Layout", listOf("─────────────────────"), 21, 1),
    Preset("alert", "Alert", "Feedback", listOf("┌──────────────────────────┐", "│ ⚠  Warning message here  │", "└──────────────────────────┘"), 28, 3),
    Preset("breadcrumb", "Breadcrumb", "Navigation", listOf("Home > Section > Page"), 21, 1),
    Preset("avatar", "Avatar", "Media", listOf("╭──╮", "│DH│", "╰──╯"), 4, 3),
    Preset("list", "List", "Data", listOf("• Item one", "• Item two", "• Item three"), 12, 3),
    Preset("stepper", "Stepper", "Navigation", listOf("● ─────── ○ ─────── ○"), 21, 1),
    Preset("rating", "Rating", "Feedback", listOf("★★★☆☆"), 5, 1),
    Preset("skeleton", "Skeleton", "Feedback", listOf("░░░░░░░░░░░░░░░░░░░░", "░░░░░░░░░░░░░░", "░░░░░░░░░░░░░░░░░"), 20, 3),
)

val CATEGORIES: List<String> = PRESETS.map { it.category }.distinct()

fun getPreset(id: String): Preset? = PRESETS.find { it.id == id }
