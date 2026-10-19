# Reddit

Joshua posts by hand, one sub a day at most. Never the same body twice.

## r/SideProject (no karma gate, tell the build story)

Title: I built a design tool you describe a screen to, and the screens are plain text underneath

I write a lot of issues and pull requests, and every time I wanted to show a layout it meant an image from a
design tool that went stale the day after. So I built Icelus. You describe a screen in a sentence, or stamp parts like buttons, inputs and
tables yourself, then move, resize and paint over them on a real canvas. Underneath it is a character grid,
so you can copy the whole screen as text. It pastes anywhere and stays editable.

It started as a web toy and grew into a native app for iPhone, iPad and Mac, plus a Watch app and a terminal
tool, all reading the same small JSON file. There's also an API and an MCP server so agents can draw screens.

Built with React, SwiftUI and Cloudflare Pages Functions. I'd love feedback on which parts are missing and
whether the export formats fit how you work. https://icelus.jaybulb.com

## r/webdev (2026-10-26; frame as a tool you built, check the weekly showoff rule first)

Title: I made a design tool whose files are text, and it can read any text wireframe back in

Every part is a small array of strings with a position, drawn in order onto a character grid on an HTML canvas.
Moves, resizes and undo are pure functions over that list. The part I am proudest of is the way back: paste any
box-drawing or +---+ wireframe from a README and it finds the boxes by their corners and edges, keeps tables
whole and turns loose text into parts, and drawing them again gives back the exact same text (the tests check
it against every template). The same check runs as a GitHub Action that fails a build when a box in your docs
stops closing. The canvas draws only the cells in view, so a 500 by 500 grid still hovers at 60 fps. It runs in
27 languages and works fully from the keyboard. Curious how other people sketch layouts in issues.
https://icelus.jaybulb.com
