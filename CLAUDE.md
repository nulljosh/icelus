# Icelus

v43.0.0. A design tool for screens, for people and agents: describe a screen and it draws, edit it on a real canvas
like Figma or Photoshop, and underneath every screen is text on a character grid that pastes anywhere. Web (Vite + React 19) at icelus.jaybulb.com, native SwiftUI for
iPhone, iPad and Mac (ASC app 6794988951, $0.99), plus a Watch app and a terminal companion.

Work queue: `roadmap.md`. The /loop runs it from `~/.claude/loops/icelus.md`. Money: `MONEY.md`.
Strategy and rivals: `docs/STRATEGY.md`.

## The loop
A /loop works `roadmap.md` one item per tick. Its rules, launch queue and state live in
`~/.claude/loops/icelus.md`; a fresh session reads `docs/LOOP-HANDOFF.md`. Restart with
`/loop Read ~/.claude/loops/icelus.md and run one tick.`

## Old names that stay on purpose
Ex-Charwork, ex-Wiretext, ex-Blockframe, ex-Blockprint, ex-Glyphic, ex-Glyphbox, ex-Morpheus, ex-Morphis (all 2026-10-19; Apple refused Morpheus and Morphis was a coinage, so the one name everywhere is Icelus, the Greek god who makes dreams look real). Bundle ID `com.nulljosh.wiretext`, Kotlin package
`com.nulljosh.charwork`, Pages project `wiretext` (wiretext.jaybulb.com still serves), localStorage keys
`wiretext-theme` and `wiretext-tour-seen`, `blockprint-doc` and `blockprint-ascii`, the `blockprint: 1` file key and opening `.blockprint` files, plus `glyphic-palette` and `glyphic-language` storage keys and opening `.glyphic` files, plus the `glyphbox-look`, `glyphbox-more`, `glyphbox-system` and `glyphbox-tour-seen` keys, the `glyphbox-session` Keychain service, opening `.glyphbox` files and the glyphbox.jaybulb.com, morpheus.jaybulb.com and morphis.jaybulb.com hosts (still serve, still allowed to use Describe it). Renaming any of them breaks installs or resets preferences.

## Run

```bash
npm install && npm run dev        # :5173
npm test && npm run build
npm run build && npx wrangler pages deploy   # a push deploys nothing; ships the app and landing/ together
swiftc -o /tmp/wtcheck ios/App/Engine.swift ios/App/Lines.swift ios/App/Shapes.swift ios/App/Presets.swift ios/App/Syntax.swift ios/App/Photo.swift ios/App/Palette.swift ios/App/HTML.swift ios/App/Import.swift ios/App/Tweaks.swift ios/App/Critique.swift ios/App/Tutorial.swift ios/App/Account.swift ios/App/Handoff.swift ios/App/Code.swift ios/App/Deck.swift ios/App/Brush.swift ios/App/Select.swift ios/App/Gradient.swift ios/App/Color.swift ios/App/Real.swift ios/App/Mask.swift ios/App/History.swift ios/App/Project.swift ios/App/Actions.swift ios/App/Heal.swift ios/App/Layout.swift ios/Checks/*.swift && /tmp/wtcheck
```

Mac build check (no signing, run in the background, never next to another heavy job):

```bash
cd ios && xcodegen generate && xcodebuild build -project Icelus.xcodeproj -scheme Icelus-iOS \
  -destination 'platform=macOS' -derivedDataPath /tmp/dd-icelus-mac -skipPackagePluginValidation \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY=""
```

## How it works
The canvas is a list of elements (`{id, presetId, label, template, width, height, col, row}`), drawn in
order onto a character grid, so later elements sit on top. Undo keeps 50 element-list snapshots. A project
file is `{blockprint: 1, cols, rows, elements}` (the old key stays so every saved file still opens) and is the same JSON on every platform.

- `src/lib/engine.js`: grid, elements, undo, exports (trim, ASCII, Markdown); project files in `project.js` (re-exported) and `Project.swift`
- `src/lib/presets.js`: the 38 parts, the drawing tools and the four part packs (`PACKS`)
- `src/lib/tools.js`: the one tool list behind `/api/*` and `/mcp` (Pages Functions in `functions/`)
- `src/lib/webmcp.js`: browser agent tools that drive the live canvas
- `src/lib/real.js`: `realPart(el)`, what each part draws as in the real look (the default since v36; the text look is a Settings switch, `glyphbox-look` in storage). `RealLayer.jsx` draws it, `Real.swift` and `RealView.swift` are the native twins
- `src/lib/describe.js` + `components/ChatPanel.jsx`: Describe it (v37, web only). `POST /api/describe` in `functions/api/[[route]].js` asks Workers AI (`[ai]` binding in `wrangler.toml`) for typed lines, parsed by `syntax.js`; app origin only
- `src/lib/brush.js`, `select.js`, `gradient.js`, `color.js`, `code.js`, `deck.js`, `handoff.js`, `agentkit.js`: brush, selections, gradients, color and ANSI, React and SwiftUI export, decks, the build brief, MCP resources and prompts. Each has a `.test.js` and a Swift twin in `ios/App/`
- `ios/App/Engine.swift`, `Presets.swift`: line-for-line ports of the two JS files. Change both, test both.
- `ios/App/Store.swift`: autosaves project.json in Application Support
- Languages: web strings in `src/i18n.js` (English) and `src/locales/*.json`; the apps' `ios/App/Localizable.xcstrings`
  is built from those plus `ios/strings.json` by `python3 tools/strings.py`. Never edit the catalog by hand.
- `watchos/` builds from the iOS Engine, Lines, Shapes, Mask, History, Project, Actions, Heal, Layout, Presets, Store and Theme files (see its project.yml); `tui/`
  symlinks Engine, Lines, Shapes, Mask, History, Project, Actions, Heal, Layout and Presets. One engine, four apps.
- `src/lib/mask.js` + `ios/App/Mask.swift`: masks (v38). A crop (`mask` insets) or a clip to another part (`clip` id) turns hidden cells into holes at draw time; the template is never cut
- `lands()` in `src/lib/lines.js` + `Mask.swift`: blend modes (v39). One rule for whether a part's character lands on a cell (join, over, under, knockout), shared by drawing, accent and color so all three agree
- `src/lib/history.js` + `ios/App/History.swift`: history (v40). `stepName` names each undo step from the element diff, `goToStep` is undo or redo repeated, snapshots (`{name, elements}`, at most 20) live in the project file and are parsed like a project of their own. `HistoryList.jsx` and `HistorySheet.swift` draw it
- `src/lib/actions.js` + `ios/App/Actions.swift`: actions (v41). Record marks the undo position; Stop turns each step since then into a relative step (`actionStep`, built on `stepName`); `playAction` replays them on the selected parts. At most 20 actions of 50 steps, in the project file, shown in the History panel. Live-canvas tools for actions and expand are in `webmcpEdit.js`
- `src/lib/heal.js` + `ios/App/Heal.swift`: heal and expand (v42). `deleteElement` calls `closeLines`, which joins the arrows across a deleted part; `expandChanges` / `expandElement` grow a table or list by `nextValue`, the next number, counting word, day or month; `harmonize` gives a part dropped on a screen the style, ink and paper most parts there share (applied on place)
- `src/lib/layout.js` + `ios/App/Layout.swift`: auto layout (v43). A screen with `auto: {gap, pad}` is restacked after every edit by `autoLayout(prev, next)`, run in the App reducer wrapper (not on undo or redo), at the end of edit_project, and in `EditorState.elements` didSet natively
- `src/lib/editProject.js`: the edit_project ops, split from tools.js; argument checks in `toolArgs.js`
- `ios/Checks/main.swift`: the JS tests as plain asserts
- `landing/`: the landing page (static, no build step of its own; `npm run build` copies it to `dist/` and `wrangler pages deploy` publishes it with the app), which embeds the real app at `/app/?demo` (no storage writes), and the ad
  (`landing/ad/`, rebuilt with `tools/ad-capture.mjs`, `ad-audio.py`, `ad-music.py`)

Details: `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/EXAMPLES.md` (generated by `node tools/examples.mjs`), `WHITEPAPER.md`.

## Design
Rules live in `brand/BRAND.md`. Blueprint blue `#1D4ED8` is the one accent, for actions only. Tokens in
`src/index.css` and `brand/tokens.css`, mirrored in `ios/App/Theme.swift`; never a second palette. Type is
The system font (SF Pro on Apple devices), never a custom face. Monospace only inside the grid. Mascot: Boxy. Real look: controls draw in the system font with the same tokens.

## Native notes
- One target builds iOS and macOS (`supportedDestinations`). Two entitlements files, split by SDK, because
  `application-identifier` is not a valid Mac entitlement.
- Measure text with CoreText, not UIFont, so the canvas compiles on both platforms without `#if`.
- One store build in review at a time. Check `asc versions list --app 6794988951` before submitting.
