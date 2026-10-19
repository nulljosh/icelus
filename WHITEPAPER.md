# Icelus Technical Whitepaper

**v48.0.0** | October 2026

Icelus is a design tool for screens, for people and agents. You describe a screen in a sentence and it
draws, or you stamp parts yourself, then edit it like a design tool: real controls on artboards, a brush,
selections, gradients, color and adjustment layers. Underneath, every screen is text on a character grid, which
is why it pastes into a commit, an issue or a chat and stays editable, and why an agent can read and diff it.
Live at [icelus.jaybulb.com](https://icelus.jaybulb.com), and on iPhone, iPad, Mac, Apple Watch and the
terminal.

## Core mechanic: elements on a character grid

A project is a canvas size and a list of elements, each a small template of characters at a cell:
`{"blockprint": 1, "cols": 100, "rows": 50, "elements": [{"presetId": "button", "template": ["[ OK ]"], "col": 2, "row": 1, …}]}`.
`renderElements` stamps them in order, so list order is the z-index. Every edit is a pure function that returns
a new list, which makes undo a stack of 50 lists. The History panel names each step by diffing two neighbouring lists (added, deleted, moved or edited parts), and a jump is undo or redo repeated, so nothing new is stored. Snapshots are named lists saved in the project file. An action is the same diff read the other way: each step since Record becomes a move, a property change, new text, a size or a delete, relative to the part it touched, so it replays on any other part. Auto layout keeps a screen's parts in bands, top to bottom, a set gap apart; after every edit the bands are rebuilt from the heights parts had before it, so a part that grew pushes the next band down instead of merging with it. Constraints run first: when a screen changes size in place, each pinned part inside it moves by the change, half of it for center, or stretches by it for both sides. Sizes copy a screen to phone, tablet and desktop widths and tag each part with a twin; an edit that changes a twin's words, style or color is copied to the twins it did not touch, while each copy keeps its own position. A symbol copy can own its words or style: `symbolFields` drops the owned fields from what syncs to and from it, and a swap is a full replace, taking the other symbol's kind, characters and size and dropping the owns. Variables and modes live on one canvas part: its line mode is applied to the whole grid after everything else is drawn, so a pasted copy can be pure ASCII, and its named spacing values are read by auto layout when a screen's gap or padding names one. A library is a project's symbols written out with their ids; a part placed from it keeps the id, so opening a newer library runs the same sync a symbol edit does, skipping what each copy owns. Deleting a part heals the flow: one arrow in and any number out (or the other way round) become direct arrows, pinned at both ends. A table or list grows by guessing its next value, a number with its step, a counting word, a day or a month. `resizeTemplate` stretches the middle of a box and keeps its
corners and borders, so a wider button is still a button. Export is the grid as lines: plain text, fenced
Markdown, plain ASCII, typed lines, HTML, a PNG, or the project file.

## Lines, screens and the typed syntax

Lines, text, banners and screens are see-through. Where two light strokes meet, `joinChar` ORs the sides each
reaches (up, right, down, left) and draws the result, so a line across a box becomes `┼`. An arrow end dropped
on a part is pinned to it, and `routeLines` redraws pinned arrows from where their parts are now. A screen is a
named frame kept at the back of the list; moving it carries the parts wholly inside it, copying it copies them
with their arrows re-pinned, and an arrow between screens is a link. `screensDocument` writes the flow and every
screen as one Markdown document.

The typed syntax is a line grammar: `# Title` a banner, `"Email"` an input, `[Sign in]` a button, `[x]` and
`(o)` checks and radios, `| a | b |` a table. `parseSketch` makes ordinary elements from it, templates are typed
syntax inside a frame, and `toSketch` writes a wireframe back as typed lines. A table is its cells: `tableFrame`
draws the header line and sizes each column to its longest cell, so editing a cell, or adding a row or column,
redraws the frame to fit. A chart keeps its numbers as text and `chartFrame` draws a bar chart in eighths of a
cell, a sparkline over eight block heights, or a progress row. A line like `a -> b -> c` is a flowchart: `flowchart` puts each box in the column of its
longest path from a start, keeps the row of an arrow that skips a column free, routes branches through the gap
before their box and loops under the boxes, and pins every arrow so the boxes still move. Lines like `User -> App: Sign in` are a sequence diagram,
one part kept as its text: `sequenceFrame` spaces the lifelines so every label fits and draws replies dashed. An indented `- ` list is a tree, `treeFrame` hanging each child off `├──` or `└──`
under its parent, for file trees, sitemaps and org charts. Parts that share a `group` id move as one: `moveElement` carries a part's group the way a
screen carries what is inside it, and a copy stands alone. The layer list hides a part (it is not drawn or copied) or locks it (the canvas lets
clicks through it and will not move it), and steps it up and down the drawing order. A symbol is a part made once and reused: its copies share a
`symbol` id, and `syncSymbol` copies an edit to one copy's words, cells, size or box style to the rest. A part's state is drawn in its characters, so it shows in pasted text:
pressed is heavy lines with solid brackets, disabled dashed with soft ones, error double lines with bangs.

## Import, photos and highlights

`importText` reads any text wireframe back into parts. `findBoxes` walks each top-left corner along the top
edge (titles allowed) and down the left edge, then checks the box closes. A box with dividers is a table and
stays whole; any other box hands its text out as parts. Drawing the parts gives back the same text, checked
against every template. `brokenBoxes` lists corners that never close, which the GitHub Action reports.

A photo becomes `▀ ▄ █` two pixel rows per text row, stretched to full contrast and Floyd-Steinberg dithered.
Tracing shows one faintly under the grid and never enters the file. A highlight is a flag, not a character:
`accentMask` marks the cells each highlighted part paints, in drawing order, so copied text stays plain.

## The real look and Describe it

Since v36 the canvas shows each part as the real thing. `realPart` in `src/lib/real.js` reads a part's
template and answers what it draws as (a button, an input, a switch, a slider, a table, a card) or `null`
when it stays characters (lines, paint, charts, photos, flowcharts). The web draws the answers as an HTML
layer over the same grid (`RealLayer.jsx`) and the apps as `Real.swift` and `RealView.swift`; the layer never
takes a click, so selecting, dragging and every export work unchanged. Settings has a switch for the text
look, remembered per viewer. Real is the default.

Describe it (v37) is a chat panel on the web. A turn goes to `POST /api/describe`, which asks Workers AI
(`@cf/meta/llama-3.3-70b-instruct-fp8-fast`) to answer in the typed syntax above, not in a project file. The
reply is cleaned by `src/lib/describe.js` (fences and prose dropped) and parsed by the same parser people
type into, so a bad answer fails like a typo would. With a screen picked, the screen is sent back as typed
lines and the reply replaces it in place. The route answers only the app's own origin, caps a turn at 2,000
characters and six turns of history, and costs nothing beyond the free daily Workers AI quota. The model sees
only what you send it; nothing is stored.

## Paint, selections, color and layers over the grid

A brush stroke is a see-through `paint` part, one to five cells wide, and the eraser clears paint only
(`brush.js`). A selection is a set of cells from a marquee or a magic-wand run; copy, cut, fill and move work on
cells, carry whole parts with them and never cut a box open (`select.js`). A gradient is a straight or round
`░▒▓█` ramp laid as one stroke of paint (`gradient.js`). Ink and paper come from the 16 terminal colors per part
and per paint stroke (`color.js`); plain copy stays colorless, while Copy as ANSI, HTML and images keep it, and
control characters in a part print as spaces so no raw escape reaches a terminal. An adjustment layer
(`adjust`) sits over an area and changes what is drawn under it, invert, dim, plain ASCII or a box style,
without touching the parts. `extent.js` takes min and max by loop so huge input never overflows the stack.

## Code, decks and the agent kit

`code.js` reads each part and writes a React component with plain CSS or a SwiftUI view that compiles
(`tools/code-check.mjs` compiles every part both ways). `deck.js` turns screens into slides: present full
screen, save a PDF, or download one HTML deck. `handoff.js` writes the Markdown build brief for a coding
agent. `agentkit.js` serves MCP resources (`icelus://syntax`, `icelus://parts`, worked examples from
[docs/EXAMPLES.md](docs/EXAMPLES.md)) and three prompts: `sketch_screen`, `review_project`,
`build_from_design`.

## Agents and sharing

`src/lib/tools.js` is one tool list behind an HTTP API and a stateless MCP server, Cloudflare Pages Functions
with no database: wireframe in, wireframe out, bodies capped at 256 KB. In the browser, WebMCP tools drive the
live canvas through the same reducer as the mouse, so undo covers them. A share link carries the project in the
URL hash, deflated, with inflation capped. The embed is a read-only page that writes the sketch with
`textContent`, so any site may frame it. Details in [docs/API.md](docs/API.md).

## Fast, readable, everywhere

The canvas draws only the cells in view, so a 500 by 500 grid hovers at 60 frames a second, and zoom scales the
cell rather than the page. Every action works from the keyboard and a live region tells a screen reader where
the cursor is; on Apple devices each part is a VoiceOver element. Strings come in 27 languages, right to left
included, each loaded only when used.

`src/lib/engine.js` is the engine and `ios/App/Engine.swift` a line-for-line port, checked by the same tests
(`ios/Checks/`, plain asserts run with `swiftc`). One SwiftUI target builds iOS and macOS; the Watch app and the
terminal companion compile the same engine files. Every surface reads and writes the same project JSON.

## Privacy

Work stays on the device. An account is optional (an email and a name on jaybulb-api, never your work), there are
no analytics in the apps, and no server keeps a copy of your work. Two features send text out when you use them: Describe it sends your message and the picked screen's
typed lines to Workers AI to draw an answer, and capture sends a public page's address to a Function that
fetches it. Neither stores anything.

Apache License 2.0, 2026 Joshua Trommel.
