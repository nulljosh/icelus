# Icelus loop handoff (2026-10-19, midday)

## What the loop is

A /loop that works `roadmap.md` top to bottom, one item per tick: build the smallest version that works, web first and then the Swift port, test both sides, commit, push, deploy the web, tick the item. Each finished major gets a version bump, a tag and new App Store text. The icon is the box of glyphs and stays. The tick rules, the launch queue and the watch items live in `~/.claude/loops/icelus.md`.

## Where things stand

- v37.0.0 is live at icelus.jaybulb.com. The direction changed on 2026-10-19: Icelus is a real design tool (Figma and Photoshop with real elements) with a chat that draws a screen from a sentence. The text look is a Settings switch, not the pitch.
- Shipped this stretch, all on web and native unless noted: code export (v28), decks (v29), the agent kit with MCP resources and prompts (v30), brush and eraser (v31), selections (v32), gradients (v33), color and ANSI (v34), adjustment layers (v35), the design pass with native dark mode (v35.1), the real canvas (v36, default look, `src/lib/real.js`), and Describe it (v37, web only).
- Describe it is a chat panel (`ChatPanel.jsx`) over `POST /api/describe`: Workers AI writes typed lines (`src/lib/describe.js`), the existing parser draws them, and the route answers only the app's own origin. Checked live: it returns 403 to any other caller.
- Tests: 259 on the web (35 files), plus the Swift checks (`swiftc` command in CLAUDE.md). Mac and iOS build clean. `node tools/code-check.mjs` compiles every part as React and SwiftUI.
- Store: iOS 12.0.0 is live (App Store Connect says ready for sale). The next native batch is v37; its text is `docs/store/37.0.0.md`, with the Describe paragraph held back until the native chat exists.
- Docs and landing were synced to v37 on this date. The landing deploys with the app: `npm run build` copies `landing/` into `dist/`, then `npx wrangler pages deploy` (a push deploys nothing).
- GitHub Actions is still stalled account-wide. Local tests are the gate.

## Next, in order

1. v38 Masks: hide part of a part without cutting it, or clip one part to the shape of another. Web first, then Swift.
2. Native Describe chat: the same panel on iPhone, iPad and Mac, calling `/api/describe`. Then put its paragraph back in the store text.
3. Bring your own Claude key: a setting that lets Describe it call Claude with the person's own key, so the free Workers AI quota stops being the ceiling.
4. Real palette previews: the palette and inspector show each part as its real control, not its characters.
5. Store batch: bump the native build, apply `docs/store/37.0.0.md`, retake the screenshots in the real look, run `asc workflow run ship-ios VERSION:37.0.0`.
6. Waiting on Joshua: App Store privacy answers (accounts, and Describe sending text to Workers AI), cloud projects (a new jaybulb-api table), a rate limit on /api/capture and /api/describe, iCloud, the share extension, npm, the MCP registry, and the public repo.

## Restart prompt

```
/loop Read ~/.claude/loops/icelus.md and run one tick.
```
