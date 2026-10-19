func runChartChecks() {
    check(chartFrame("chart", "Mon 4\nTuesday 8\nWed 1") == [
        "Mon     ██████████           4", "", "Tuesday ████████████████████ 8", "", "Wed     ██▌                  1"],
          "charts: bars scale to the largest value in eighths, labels lined up")
    check(chartFrame("chart", "2, 4") == ["██████████           2", "", "████████████████████ 4"], "charts: bare numbers draw bars")
    check(chartFrame("sparkline", "1 2 3 4 5 6 7 8") == ["▁▂▃▄▅▆▇█"] && chartFrame("sparkline", "5 5") == ["▄▄"],
          "charts: a sparkline spreads values over eight heights")
    check(chartFrame("progress", "Upload 50%") == ["Upload ▓▓▓▓▓▓▓░░░░░░░ 50%"] && chartFrame("progress", "140") == ["▓▓▓▓▓▓▓▓▓▓▓▓▓▓ 100%"],
          "charts: progress fills to a percent, capped at 100")
    var el = createElement(Preset(id: "sparkline", label: "Sparkline", category: "Data", template: ["▁█"], text: "1 2"), col: 0, row: 0)
    el = updateElement([el], id: el.id, text: "3 1 2")[0]
    check(el.text == "3 1 2" && el.template == ["█▁▅"] && el.width == 3, "charts: numbers kept as text, redrawn on edit")
    check(updateElement([el], id: el.id, width: 30, height: 4)[0].width == 3 && chartItems("no numbers here").isEmpty,
          "charts: a drag never stretches one")
}
