# Architecture

Icelus is a design tool whose screens are text characters on a grid. A project is a list of parts on a character
grid, and the same project JSON opens on the web, iPhone, iPad, Mac, Apple Watch and the terminal. Since v36 the
canvas draws parts as real controls by default (`lib/real.js`); the character look is a Settings switch. The engine is written once in
JavaScript and ported line for line to Swift, with the same tests on both sides.

## Web (`src/`)

| File | What it owns |
|---|---|
| `main.jsx` | Loads the viewer's language, then renders the app and registers the service worker |
| `App.jsx` | The editor reducer (parts, history, selection), menus, sheets, paste, open, share, export, the look switch |
| `i18n.js`, `locales/*.json` | English strings and 26 translations, one lazy file per language, right to left for ar he fa ur |
| `embed.js` (+ `embed.html`) | The read-only embed page: a share link drawn as text, safe to frame |
| `components/Canvas.jsx` | The grid on a canvas: visible cells only, drag, snap, arrow tool, keyboard cursor, live region |
| `components/RealLayer.jsx` | The real look: each part drawn as a real control over the same grid; never takes a click |
| `components/ChatPanel.jsx` | Describe it: the chat that sends a turn to `/api/describe` and places the answer |
| `components/BrushBar.jsx`, `SelectBar.jsx`, `useBrush.js` | Brush, eraser, gradient; marquee and wand selections |
| `components/Present.jsx`, `ReviewList.jsx`, `AccountPanel.jsx`, `Tutorial.jsx`, `Boxy.jsx` | Decks, the review list, Profile and Settings, the five-step tutorial, the mascot |
| `components/Toolbar.jsx`, `Inspector.jsx`, `LayerList.jsx`, `ElementOverlay.jsx` | The palette (Paint, Pick, More, Mine), the inspector, the layer list, resize handles and the inline text editor |
| `components/useZoom.js`, `canvasHelpers.js` | Zoom, pinch and scroll; theme tokens, font measure, spoken part descriptions |
| `lib/engine.js`, `lib/lines.js`, `lib/shapes.js`, `lib/extent.js` | Grid, parts, undo, exports, project files; joins, arrows, styles, screens, snap, accent mask; tables, charts and flowchart boxes; min and max by loop for huge input |
| `lib/presets.js` | The 38 parts, the drawing tools and the four part packs |
| `lib/syntax.js` | The typed syntax both ways (flowcharts too), and the screen templates |
| `lib/real.js` | What each part draws as in the real look (`realPart`), shared with the tests and `Real.swift` |
| `lib/describe.js` | Describe it's prompt and reply cleaning (`describeMessages`, `cleanReply`), used by `/api/describe` |
| `lib/brush.js`, `select.js`, `gradient.js`, `color.js` | Freehand paint and eraser; cell selections, wand, cut, fill, move; `░▒▓█` ramps; the 16 terminal colors and ANSI export |
| `lib/code.js`, `deck.js`, `handoff.js` | React and SwiftUI export; slides, PDF and HTML deck; the Markdown build brief |
| `lib/critique.js`, `tweaks.js`, `system.js`, `capture.js` | Review; spacing and box-style knobs; a design system from code; a web page as a wireframe |
| `lib/agentkit.js`, `toolList.js`, `tools.js`, `webmcp.js` | MCP resources and prompts; the tool list; the tool bodies behind the API and MCP; the in-browser WebMCP tools |
| `lib/importer.js` | Any text wireframe back into parts, and the broken-box check |
| `lib/photo.js`, `palette.js`, `html.js`, `share.js`, `draw.js` | Photo to block art, saved parts, HTML export, share links, glyph drawing |
| `lib/account.js`, `spark.js`, `tutorial.js` | Accounts through jaybulb-api; its small client; the tutorial steps |

## Apple (`ios/App/`, `watchos/`, `tui/`)

| File | What it owns |
|---|---|
| `Engine.swift`, `Lines.swift`, `Shapes.swift`, `Presets.swift`, `Syntax.swift` | Ports of engine.js, lines.js, shapes.js, presets.js and syntax.js |
| `Import.swift`, `Photo.swift`, `Palette.swift`, `HTML.swift` | Ports of importer.js, photo.js, palette.js and html.js |
| `Real.swift`, `RealView.swift` | Ports of real.js; the real look drawn with SwiftUI controls over the grid |
| `Brush.swift`, `Select.swift`, `Gradient.swift`, `Color.swift` | Ports of brush.js, select.js, gradient.js and color.js |
| `Code.swift`, `Deck.swift`, `Handoff.swift`, `Critique.swift`, `Tweaks.swift` | Ports of the code, deck, handoff, critique and tweaks libraries; `PresentView.swift` plays a deck, the PDF is real |
| `Account.swift`, `AccountSheet.swift`, `CaptureSheet.swift`, `ReviewSheet.swift`, `Tutorial*.swift` | Profile and Settings, capture a page, the review list, the tutorial |
| `ContentView.swift`, `ContentView+Actions.swift`, `+Toolbar.swift`, `+Brush.swift` | The editor: toolbar, canvas, inspector, palette; what each action does; the Export menu; brush and eraser |
| `CanvasView.swift` | The grid as one Text per row, block glyphs as shapes, accent runs, a VoiceOver element per part |
| `PaletteView.swift`, `TextSheet.swift`, `LayersSheet.swift`, `Theme.swift` | Palette chips, the text sheets, the layer list, colour tokens matching the web |
| `Store.swift` | Autosaves project.json in Application Support; sets an unreadable file aside |
| `Intents.swift` | Shortcuts actions: Draw a screen, Make plain ASCII |
| `Localizable.xcstrings` | Built by `tools/strings.py` from `src/locales` and `ios/strings.json`; never edited by hand |
| `ios/Checks/*.swift` | The JS tests as plain asserts, compiled with `swiftc` (the command is in CLAUDE.md) |

`watchos/` compiles Engine, Lines, Shapes, Presets, Store and Theme from `ios/App`. `tui/` symlinks Engine, Lines,
Shapes and Presets. Change a shared file and build both.

## Server (`functions/`)

`api/[[route]].js` and `mcp.js` are Cloudflare Pages Functions over `src/lib/tools.js`. `body.js` caps request
bodies at 256 KB. Nothing is stored. Two routes reach out: `POST /api/capture` fetches a public page, and
`POST /api/describe` asks Workers AI (the `[ai]` binding in `wrangler.toml`, model
`@cf/meta/llama-3.3-70b-instruct-fp8-fast`) to write a screen in the typed syntax. Describe it answers only the
app's own origin, so another site cannot spend the free daily quota. Describe it is on the web only; the native
chat is next on the roadmap. `landing/_headers` sets the CSP; `/app/embed*` is the one path any site
may frame.

## Kotlin (`kmp/`)

An early port of the character-grid engine (`com.nulljosh.charwork`) with Compose apps for Android and desktop.
It predates the element model and is behind the web; v48 turns it into a real Android app.

## Build and deploy

`npm run build` runs `scripts/build-site.sh`: Vite builds the app and the embed into `dist/app`, and `landing/` is
copied to `dist/`, so the landing and the app ship together as one Cloudflare Pages project (`wiretext`, an old
name that stays). `npx wrangler pages deploy` publishes both; a push deploys nothing. `action.yml` is the GitHub
Action, `bin/icelus.js` the command line.

## Rules that keep it working

- The engines stay line-comparable. Change `engine.js`, change `Engine.swift`, test both.
- Saved work keeps old names: the `blockprint: 1` key, the `blockprint-doc` storage key and `.blockprint` files.
- Every source file stays under about 5,000 tokens (a pre-commit hook); split by responsibility, as above.
- Copied text never carries styling. Highlights, tracing and zoom only change how the canvas draws.
