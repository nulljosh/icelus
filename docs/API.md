# Icelus API

Icelus has two agent-facing interfaces, and they are not the same shape:

- **WebMCP**, in the browser, driving the live canvas. Stateful, it has `undo`.
- **HTTP**, on the deployed site: a REST API and a server MCP endpoint. Stateless
  transforms: a wireframe goes in, a wireframe comes out.

The split is deliberate. Keeping the server side stateless is what lets it run with no
database, no session store and no Durable Object.

Both HTTP surfaces call one shared definition in `src/lib/tools.js`, so they cannot
describe different behaviour. Add a tool there, not in either handler.

## HTTP

Served by Cloudflare Pages Functions from `functions/`. No auth, no writes to anything,
every response is a pure function of the request. Two routes reach outside: `/api/capture` fetches a
public page, and `/api/describe` calls Workers AI (the one route that is not open to any caller).

### REST

| Route | Body / query | Returns |
|---|---|---|
| `GET /api/components` | `?category=` optional | The 38 presets and the 16 pack parts (iOS, Material, Terminal, Email), their templates and sizes, plus every category |
| `POST /api/place` | `{ text?, componentId, col, row, cols?, rows? }` | `{ text, cols, rows, placed }` |
| `POST /api/render` | `{ text, cols?, rows? }` | `{ text, cols, rows }`. Pads, clips, normalizes |
| `POST /api/parse` | `{ source, cols?, rows? }` | `{ text, project }`. Draws a screen from the typed syntax, see below |
| `POST /api/edit` | `{ project, ops }` | `{ text, project }`. Moves, resizes, retexts, restyles and deletes parts by `index`, and draws `arrow`s |
| `POST /api/capture` | `{ url, cols?, rows? }` | `{ source, text, project }`. A public web page (HTTP or HTTPS, 8 seconds, first 2 MB, every redirect hop checked) drawn as a wireframe |
| `POST /api/describe` | `{ message, current?, history?, cols?, rows? }` | `{ source, text, project }`. A screen drawn from a sentence. See below |
| `GET /api` | none | The endpoint list |

### Describe it (`POST /api/describe`)

The route behind the Describe chat in the app (v37). `message` is up to 2,000 characters; `current` is the
typed lines of the screen to change (up to 4,000); `history` is the last six `{ role, content }` turns.
Workers AI writes the answer in the typed syntax below, `cleanReply` strips fences and prose, and the same
parser behind `/api/parse` turns it into `project`. It answers only the app's own origin (icelus.jaybulb.com,
the old wiretext.jaybulb.com and localhost); anything else gets `403`. That is a courtesy check, not a lock,
since a script can send any `Origin`; the free daily Workers AI quota is the real ceiling on cost. Errors:
`400` empty message, `422` when the model is busy or draws nothing, `503` when the `AI` binding is missing
(for example under `npm run dev`). It is not an MCP tool: agents already write the typed syntax themselves with
`sketch_to_wireframe` and the `sketch_screen` prompt. Source: `src/lib/describe.js`.

`place_component` is stateless, so chain calls by feeding the returned `text` back in as
the next request's `text`. Omit `text` to start from a blank grid. Placement that falls
off the grid is clipped, not an error; bad input (unknown `componentId`, a non-integer
`col`, text over 200,000 characters) is a `400` naming the problem.

```bash
curl -sX POST https://icelus.jaybulb.com/api/place \
  -H 'content-type: application/json' \
  -d '{"componentId":"button","col":2,"row":1,"cols":12,"rows":3}'
```

### MCP

`POST /mcp` is JSON-RPC, stateless streamable HTTP. No SDK and no Durable Object; the
transport is ported from `sidewise/src/mcp.js`. Tools: `list_components`,
`place_component`, `render_wireframe`, `sketch_to_wireframe`, `edit_project` (move, resize, text, style, tweak a screen, note, color (ink and paper 0-15), mask (crop insets, or clip to another part), blend (join, over, under or knockout: how a part meets what is under it), delete, arrow, an adjustment layer over an area, paint and erase a freehand stroke, a straight or round gradient, and cut, fill or move_cells on an area or a wand run), `list_notes` (what people pinned to parts, to act on and resolve), `wireframe_to_ansi` (the wireframe with each part's ink and paper as terminal colors), `wireframe_to_deck` (every screen as a slide: `{ slides, html }`, one HTML deck that presents with the arrow keys and prints a page a slide), `wireframe_to_code` (the layout as a React component with plain CSS or a SwiftUI view that compiles, `format: react|swiftui`), `wireframe_to_handoff` (a Markdown build brief for a coding agent: screens, typed lines, parts table, flow, notes, review, project file), `html_to_wireframe` (a page's HTML as typed lines, text and a project; `POST /api/capture {url}` fetches a public page for you), `system_from_code` (a design system file from source files: components drawn as parts, box style from radius tokens), `critique_project` (a design review, optionally against a system: overlaps, cut boxes, placeholder labels, missing empty and error states, with part indexes), `wireframe_to_sketch` (a project back as typed lines), `wireframe_to_html` (a page of real
elements for a developer) and `text_to_project` (any pasted text wireframe made editable).

```bash
curl -sX POST https://icelus.jaybulb.com/mcp \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Resources (`resources/list`, `resources/read`): `icelus://syntax` (the typed syntax), `icelus://parts`
(every part and how it draws) and `icelus://examples/<slug>` (worked example projects: `sign-in`,
`onboarding`, `settings`, `inbox`, each with empty and error states, see `docs/EXAMPLES.md`).

Prompts (`prompts/list`, `prompts/get`): `sketch_screen {description}` (type it, draw it, review it until
clean), `review_project {project}` (critique and fix) and `build_from_design {project, stack}` (the
brief, the code, then the build). Unknown names and missing arguments come back as JSON-RPC errors.

```bash
curl -sX POST https://icelus.jaybulb.com/mcp -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"prompts/get","params":{"name":"sketch_screen","arguments":{"description":"a checkout"}}}'
```

Note the difference from WebMCP below: there is no `undo` over HTTP, because there is no
server-side canvas to undo. The caller holds the state.

## WebMCP (browser only)

With the app open, Icelus registers tools on `document.modelContext`.
Source: `src/lib/webmcp.js`.

### Read-only

| Tool | Does |
|---|---|
| `get_wireframe` | The current wireframe as ASCII text |
| `list_components` | Placeable components and their categories; filter with `category` |
| `list_elements` | The parts on the canvas: id, part, position, size, style |
| `handoff` | The canvas as a Markdown build brief for a coding agent |
| `slides` | The canvas as a deck: each screen as a slide, in reading order |
| `export_code` | The canvas as a React component with plain CSS, or a SwiftUI view |
| `critique` | A design review: overlaps, cut boxes, placeholder labels, missing empty and error states, open notes |
| `list_notes` | The notes pinned to parts, to act on and resolve |

### Reversible writes

| Tool | Does |
|---|---|
| `place_component` | Stamp a component at `col`/`row` (0-based, from top left) |
| `set_wireframe` | Replace the whole wireframe with ASCII `text` |
| `move_element`, `resize_element` | Move or resize a part by `id` |
| `set_text`, `style_element`, `set_note` | Change a part's text, its box style, or pin a note to it (empty resolves it) |
| `delete_element`, `select_element` | Delete or highlight a part |
| `draw_arrow` | An elbow arrow between two cells, pinned to any part an end lands on |
| `paint` | A freehand stroke through points with one character, 1 to 5 cells wide; `erase: true` clears paint |
| `gradient` | A straight or round `░▒▓█` ramp from one cell to another, as one stroke of paint |
| `cells` | Copy, cut, fill or move an area or a wand run, by cells rather than parts |
| `adjust` | An adjustment layer over an area: invert, dim, plain ASCII, or a box style |
| `mask_element` | Crop a part with insets, or clip it to another part's box; the part keeps every character |
| `blend_element` | How a part meets what is under it: join, over, under or knockout |
| `type_screen` | Add a screen written in the typed syntax |
| `clear_wireframe` | Erase the canvas |
| `undo` / `redo` | Step the history |

Every write goes through the same reducer the toolbar uses, so `undo` reverses
anything an agent did. Nothing is persisted server-side, so no tool requires
confirmation.

## The typed syntax

`POST /api/parse` and the `sketch_to_wireframe` tool draw a whole screen from a few lines:

```
# Sign in
"Email"
"Password"
[x] Remember me
[Sign in]  [Cancel]
```

`# Title` is a banner, `"Email"` an input, `[Sign in]` a button, `[x] Label` and `[ ] Label` checkboxes,
`(o) Label` and `( ) Label` radios, `[v Country]` a select, `---` a divider, and `| a | b |` lines a table
whose first row is the header. Anything else is text. Two or more spaces put parts side by side. The
returned `project` opens in the app as editable parts. In the app, pick Type it in the palette.
