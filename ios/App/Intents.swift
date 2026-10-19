// Shortcuts actions. Text in, wireframe text out, on device, so a Shortcut can draw a screen from a few
// typed lines (Share Sheet, Siri, the Shortcuts app) without opening Icelus.

import AppIntents

struct DrawScreenIntent: AppIntent {
    static let title: LocalizedStringResource = "Draw a screen"
    static let description = IntentDescription(
        "Draws a screen from typed lines. # Title is a banner, \"Email\" an input, [Sign in] a button, [x] a checkbox, (o) a radio, [v Country] a select, --- a divider, | a | b | a table.")

    @Parameter(title: "Typed lines", inputOptions: String.IntentInputOptions(multiline: true))
    var source: String

    static var parameterSummary: some ParameterSummary { Summary("Draw a screen from \(\.$source)") }

    func perform() async throws -> some IntentResult & ReturnsValue<String> {
        .result(value: drawSketch(String(source.prefix(20_000))))
    }
}

struct PlainASCIIIntent: AppIntent {
    static let title: LocalizedStringResource = "Make plain ASCII"
    static let description = IntentDescription("Swaps box-drawing characters for + - | so a wireframe reads anywhere, even in email.")

    @Parameter(title: "Wireframe", inputOptions: String.IntentInputOptions(multiline: true))
    var text: String

    func perform() async throws -> some IntentResult & ReturnsValue<String> {
        .result(value: toAscii(String(text.prefix(200_000))))
    }
}

struct IcelusShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(intent: DrawScreenIntent(), phrases: ["Draw a screen in \(.applicationName)"],
                    shortTitle: "Draw a screen", systemImageName: "rectangle.on.rectangle")
        AppShortcut(intent: PlainASCIIIntent(), phrases: ["Make plain ASCII with \(.applicationName)"],
                    shortTitle: "Plain ASCII", systemImageName: "textformat")
    }
}
