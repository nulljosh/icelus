func runSystemChecks() {
    let raw = #"{"icelusSystem":1,"name":"Acme","style":"rounded","parts":[{"label":"PrimaryButton","template":["[ Primary ]"]},{"label":"Bad","template":[]}]}"#
    let sys = parseSystem(raw)
    check(sys?.name == "Acme" && sys?.style == "rounded" && sys?.parts.count == 1, "system: a system file is read, bad parts dropped")
    check(parseSystem(#"{"parts":[]}"#) == nil, "system: only icelus system files")
    let once = withSystem([], sys!), twice = withSystem(once, sys!)
    check(twice.count == 1 && twice[0].category == mineCategory && twice[0].label == "PrimaryButton", "system: parts join Mine once")
    check(parseSystem(serializeSystem(sys!))?.name == "Acme", "system: the stored system reads back")
    let card = createElement(presets.first { $0.id == "card" }!, col: 0, row: 0)
    check(critique([card], cols: 60, rows: 30, system: sys).contains { $0.rule == "off_system" && $0.style == "rounded" }, "system: Review flags boxes off its style")
    var round = card; round.style = "rounded"
    check(!critique([round], cols: 60, rows: 30, system: sys).contains { $0.rule == "off_system" }, "system: boxes in its style pass")
}
