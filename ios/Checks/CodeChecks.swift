func runCodeChecks() {
    let screen = Element(id: "s", presetId: "screen", label: "Screen", template: screenFrame("Sign in", width: 30, height: 12),
                         width: 30, height: 12, col: 0, row: 0, text: "Sign in")
    let parts = parseSketch("\"Email\"\n[Email___]\n[x] Remember me\n[Sign in]", startRow: 2, startCol: 2)
    check(componentName("sign-in flow") == "SignInFlow" && componentName("3 screens") == "Layout3Screens"
          && componentName("") == "Layout" && componentName("Café menu") == "CafeMenu", "code: component names")
    check(readPart(parts.last!) == .button("Sign in"), "code: a button reads as a button")
    check(parts.contains { readPart($0) == .checkbox(true, "Remember me") }, "code: a checked box reads as checked")
    let react = toReact([screen] + parts, cols: 60, rows: 20, name: "Acme")
    check(react.contains("export default function Acme()") && react.contains("<button type=\"button\">{\"Sign in\"}</button>")
          && react.contains("defaultChecked={true} /> {\"Remember me\"}") && react.contains("left: '2ch'"), "code: React component")
    let swift = toSwiftUI([screen] + parts, cols: 60, rows: 20, name: "Acme")
    check(swift.contains("struct AcmeView: View") && swift.contains("Button {} label: { Text(verbatim: \"Sign in\") }")
          && swift.contains(".offset(x: 2 * ch,"), "code: SwiftUI view")
    let evil = "{alert(1)}</style><script>\"`${x}`\\"
    let el = Element(id: "t", presetId: "text", label: "Text", template: [evil], width: 40, height: 1, col: -3, row: 0)
    check(toReact([el], cols: 40, rows: 2).contains("<p>{\"{alert(1)}</style><script>\\\"`${x}`\\\\\"}</p>"), "code: React keeps typed text a string")
    check(toSwiftUI([el], cols: 40, rows: 2).contains("Text(verbatim: \"{alert(1)}</style><script>\\\"`${x}`\\\\\")")
          && toSwiftUI([el], cols: 40, rows: 2).contains(".offset(x: 0 * ch"), "code: SwiftUI keeps typed text a string, clamps off-grid")
}
