func runTableChecks() {
    let frame = tableFrame([["Name", "Plan"], ["Ada", "Pro"]])
    check(frame == ["┌──────┬──────┐", "│ Name │ Plan │", "├──────┼──────┤", "│ Ada  │ Pro  │", "└──────┴──────┘"],
          "tables: a header line, columns sized to their longest cell")
    let table = createElement(Preset(id: "table", label: "Table", category: "Data", template: frame), col: 1, row: 1)
    check(tableText(table.template) == "Name | Plan\nAda | Pro", "tables: cells read back as typed rows")
    let grown = updateElement([table], id: table.id, text: "Name | Plan\nGrace Hopper | Team")[0]
    check(grown.template[3] == "│ Grace Hopper │ Team │" && grown.width == 23, "tables: cells grow with their text")
    let wider = updateElement([table], id: table.id, cells: [["Name", "Plan", "Seats"], ["Ada", "Pro"]])[0]
    check(wider.template[3] == "│ Ada  │ Pro  │       │", "tables: a new column is blank below its header")
    check(updateElement([table], id: table.id, width: 40, height: 9)[0].template == frame, "tables: a drag never stretches one")
}
