---
name: icelus
description: Design a UI screen in Icelus, a design tool whose screens are text underneath, so they paste into a PR, issue, README or chat. Use when someone asks for a screen, wireframe, mockup or layout, wants to show a UI idea without an image, or wants a design handed to a coding agent.
---

# Icelus

Icelus is a design tool for screens. In the app a person describes a screen in a chat (Describe it) or
edits it on a real canvas; underneath, every screen is text in box-drawing characters, so it goes anywhere
words go and stays editable at https://icelus.jaybulb.com.

Agents do not call `/api/describe`: that route is for the app only and answers other callers with 403. Write
the screen yourself in the typed syntax below and use `sketch_to_wireframe` to draw it and `edit_project`
to change it.

## Connect

Add the MCP server at `https://icelus.jaybulb.com/mcp`. It has tools for every step below, resources
to read first (`icelus://syntax`, `icelus://parts`, `icelus://examples/sign-in` and three more) and
prompts for the three jobs: `sketch_screen`, `review_project` and `build_from_design`. Worked examples,
typed and drawn, are in `docs/EXAMPLES.md`.

## Draw a screen

Write it in the typed syntax, one line per row. Two or more spaces put parts side by side.

```
# Sign in
"Email"  "Password"
[x] Remember me
[Sign in]  [Cancel]
---
| Plan | Price |
| Pro | $1 |
```

`# Title` is a banner, `"Email"` an input, `[Sign in]` a button, `[x]`/`[ ]` checkboxes,
`(o)`/`( )` radios, `[v Country]` a select, `---` a divider, `| a | b |` a table. Anything else is text.

Turn it into a wireframe with whichever is to hand:

- MCP: add `https://icelus.jaybulb.com/mcp` and call `sketch_to_wireframe` with `{ "source": "..." }`.
- HTTP: `curl -sX POST https://icelus.jaybulb.com/api/parse -H 'content-type: application/json' -d '{"source":"[OK]"}'`
- Repo checkout: `printf '[OK]' | node bin/icelus.js draw`

Each returns the wireframe `text` and, for the API, a `project` file. Paste `text` in a fenced code block.

## Change it

Keep the `project` and pass it to `edit_project` (or `POST /api/edit`) with `ops`, each naming a part by
its `index` in `elements`: `move {col,row}`, `resize {width,height}`, `text {text}`,
`style {style: double|rounded|heavy|ascii}`, `delete`, or `arrow {fromCol,fromRow,toCol,toRow}`.
An arrow end that lands on a part stays pinned to it. `wireframe_to_sketch` writes a project back as typed lines.

The person can open the project file in the app to keep editing by hand.

## Hand a design to a coding agent

When the screens are agreed, turn them into a build brief and build from it:

- In the app: Export, then Copy for Claude Code (or Download build brief for a `BUILD.md`).
- CLI: `node bin/icelus.js handoff project.json > BUILD.md`.
- MCP: `wireframe_to_handoff` with `{ "project": ... }`.

To show the screens to people: Export, then Present (Save as PDF from there), or Download deck; CLI
`node bin/icelus.js deck project.json > deck.html`; MCP `wireframe_to_deck`.

For code instead of a brief: Export, then Copy React code or Copy SwiftUI code; CLI
`node bin/icelus.js react project.json > Layout.jsx` (or `swiftui`); MCP `wireframe_to_code` with
`{ "project": ..., "format": "react" }`. Both compile as they are.

The brief draws every screen, lists each part with its words, place and state, gives the flow between
screens, the designer's open notes, and what Review still flags. Build to match it, then check your work
against the drawings.
