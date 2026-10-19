# Icelus strategy

Written 2026-10-18, updated 2026-10-19 for v37. Direction changed on 2026-10-19: Icelus is a real design tool (Figma and Photoshop, with real elements) that you can talk to, and the text underneath is what makes it agent-readable. Rivals in detail: [RESEARCH.md](RESEARCH.md). Money: [MONEY.md](../MONEY.md). Order of work: [roadmap.md](../roadmap.md).

## Where it stands

Free on the web, $0.99 on the App Store. As of 2026-10-18: 27 downloads since July, all while it was free, none since the price;
706 store impressions, 9.5% conversion. iOS 12.0.0 went live on 2026-10-19; the v37 native batch is next. The web app is the trial, the store is the checkout, and right now the
checkout sells nothing.

## What a paid app is missing

1. **A reason to pay.** The web does everything the native app does. Native needs things the web cannot do:
   iCloud sync across devices, a Share extension, Shortcuts, image export to Photos, offline with no tab open.
2. **Store pages that sell.** New 2.0 screenshots, a 30 second preview video (the ad), keywords for "wireframe",
   "mockup", "ASCII", "text diagram".
3. **The Mac in the store.** One target builds for Mac, but no Mac build has shipped. Monodraw's buyers are on Macs.
4. **Proof.** Reviews, a gallery of real screens, a launch day.
5. **One loud feature.** Describe it shipped on the web in v37: say a screen, watch it draw. It is the thing people share, and it needs a native chat and, later, a bring-your-own Claude key.

## Rivals and the gaps they leave

| Tool | What it does well | Gap Icelus takes |
|---|---|---|
| Monodraw ($9.99, Mac) | Connected arrows, banners, groups, layers | No web, no iPhone, no agents, ten times the price |
| ASCIIFlow (free, web) | Fast boxes, lines and freehand | No parts, no app, no API |
| MonoSketch (free, open source, web) | The most-cited Monodraw alternative | No parts, no native apps, no agents |
| PlantUML Salt, Mermaid | Text that renders, Mermaid right inside GitHub | You write markup by hand, nothing to click |
| Balsamiq ($16/mo per editor) | The classic low-fi mockup, a big control library | A picture, not text; priced for teams |
| Excalidraw | Hand-drawn feel, live sharing, share by link | A picture; nothing an agent can diff |
| Figma, FigJam, Figma Make | Everything, for teams | Heavy, paid, output is not text |
| Uizard, Visily ($11-12/mo) | Prompt or photo to a multi-screen draft | Pixels, behind a subscription |
| Google Stitch (free, Gemini) | Infinite canvas, voice, clickable prototypes, DESIGN.md export, an MCP server for Claude Code | Output is pixels and code; no component library, no multiplayer yet |
| Claude Design (Anthropic, April 2026) | Prompt to prototype, decks, design systems from a codebase, Claude Code handoff | A heavy design surface, not a sketch that pastes into a PR |

The pattern: every tool outputs a picture or a file. Icelus outputs text. Text diffs, pastes, survives
in a commit, and is the native language of agents.

## Gaps to close, ranked (research 2026-10-19)
Ranked by how many rivals have it times how cheap it is for us. Each one ships on the web first.

1. Share by link (Excalidraw, Stitch, Claude Design). **Done 2026-10-19:** the sketch rides in the URL hash, no server.
2. A bigger part library (Balsamiq has about 75 controls). **Started 2026-10-19:** 23 to 37 parts plus four drawing tools.
3. A typed syntax that renders in Markdown (Mermaid, Salt). **Done 2026-10-19:** Type it in the app, `/api/parse`, an MCP tool. Still to do: a `icelus` Markdown fence that renders on GitHub.
4. Several screens and a click-through prototype (Stitch, Claude Design, Balsamiq). Screens are done (v6); play mode is v54.
5. Describe it, prompt to screen (Stitch, Uizard, Claude Design). **Done 2026-10-19 on the web (v37):** Workers AI, free daily quota, app origin only. Next: the native chat and a bring-your-own Claude key.
6. Groups and layers (Monodraw). **Done** in v16 and v17.
7. Freehand pencil (ASCIIFlow, Monodraw). **Done** in v31: brush and eraser.
8. Live editing together (Excalidraw, Figma): v65.

Sources: [AlternativeTo on Monodraw](https://alternativeto.net/software/monodraw), [AlternativeTo on ASCIIFlow](https://alternativeto.net/software/asciiflow),
[Stitch's 2026 redesign](https://www.techloy.com/google-stitch-vibe-design-explained-how-the-new-5-features-actually-work/),
[Claude Design launch coverage](https://noqta.tn/en/news/anthropic-claude-design-tool-figma-canva-2026),
[2026 wireframing roundup](https://www.banani.co/blog/best-wireframing-tools).

## Gaps to close, round two (research 2026-10-19, after v41)
What the three inspirations shipped in 2026 that the roadmap did not cover yet, cheapest first. Each is one tick.

1. Find distractions (Photoshop 2026 Remove). **Done 2026-10-19 (v42.1):** Review flags stray marks, paint off every screen and parts that show nothing; one tap removes them.
2. Harmonize (Photoshop). **Done 2026-10-19 (v42.2):** a part dropped on a screen takes the box style, ink and paper most parts there share.
3. Describe into a selection (Photoshop Generative Fill, Claude Design inline edits): marquee an area, type what goes there.
4. Notes Claude acts on (Claude Design comments): a note addressed to Claude is read by Describe it and resolved when done.
5. PowerPoint export (Claude Design exports PPTX): the deck as a .pptx, one slide a screen.
6. Motion (Figma Motion, open beta): a part keyframed across linked screens, played in play mode. Folds into v56.
7. Live code parts (Figma code layers, beta): a part that runs a small sandboxed HTML snippet in the real look.
8. Describe a plugin (Figma generative plugins): folds into v95.
9. Auto layout across, with alignment and wrap (Figma). Found after v43 shipped the down stack.
10. Show and hide per copy (Figma boolean properties): a symbol copy hides one of its lines, like an icon or a subtitle, without detaching. Found after v46 shipped own words, own style and swap.
11. Color and width variables with light and dark sets (Figma color variables and modes). Found after v47 shipped named spacing and the canvas line mode.
12. Libraries by link with an update list (Figma library updates): today a library travels as a file. Found after v48.
13. Row grids and named grid styles (Figma grid styles). Found after v49 shipped column grids.

Already level: inline sliders (v21 tweaks), design system from code and checks against it (v24, v23), handoff bundle to Claude Code (v27),
standalone HTML (v28), decks and PDF (v29), history and actions (v40, v41). Skipped on purpose: shaders, 3D transforms and AI upscale,
which mean nothing on a character grid.

Sources: [Claude Design June update](https://pureai.com/articles/2026/06/17/anthropic-overhauls-claude-design.aspx),
[Claude Design review](https://www.banani.co/blog/claude-design-review), [Figma Config 2026](https://www.cmswire.com/digital-experience/figma-launches-code-layers-motion-at-config-2026/),
[Config 2026 recap](https://dev.classmethod.jp/en/articles/figma-config-2026-recap/), [Photoshop 2026 overview](https://photoshopcafe.com/whats-new-in-photoshop-2026-full-release-overview/).

## The monopoly plan

Own the plain-text screen format, the way Markdown owns plain-text documents.

1. **Publish the format.** A short open spec for `.icelus` projects and the typed syntax (v5), Apache 2.0.
   Anyone can render it; Icelus is the best editor for it.
2. **Be in every agent's hands.** The MCP server and API exist now. Add the Claude skill, MCP directory listings,
   and an `npx icelus` CLI, so when an agent is asked to sketch a screen it reaches for Icelus.
3. **Be where the text lands.** A GitHub Action that renders and checks wireframes in READMEs and PRs, VS Code and
   Obsidian plugins, Slack unfurls. Every pasted sketch carries a small "made with Icelus" link back.
4. **Price it out of reach.** Free on the web forever, $0.99 native. Nobody undercuts free plus a dollar.
5. **A data moat.** A public gallery of screens (v93). Templates people remix keep them here; the gallery
   also teaches agents what good screens look like.

## Toward Claude Design

Describe a screen and get one, then talk to it. Text is a better canvas for this than pixels: the agent can read
every cell, diff it and edit one line.

- Describe it (v37, web): sentence to screen through Workers AI, drawn with real parts. Next: native chat, bring your own Claude key.
- Critique (v23): spacing, missing states, unclear labels, with part indexes.
- Handoff brief (v27), React and SwiftUI export (v28), decks (v29), agent kit (v30): the sketch becomes the build plan.
- v98 and v99: one sentence becomes a linked flow, then a working app checked against the sketch.

Era 3 (Claude Design, v21 to v30) is done and Describe it closed the loop in v37.

## Toward Figma

Figma won on multiplayer, components and prototypes. Icelus does each one in text.

- Together (Era 7, v63 to v72): accounts, cloud projects, live editing through a Durable Object, comments, history, branches.
- Symbols and variants (v18, v19), libraries (v48), variables and modes (v47), auto layout (v43).
- Prototype (Era 6, v53 to v62): hotspots, play mode, shared prototype links.
- Figma import and export (v77, v78) so teams can move in without leaving.

## Toward Photoshop

Photoshop is layers, colour and brushes. On a character grid that means (the real canvas of v36 shows it on artboards):

- Color (v34): ink and paper from the 16 terminal colors; plain-text copy stays colourless.
- Layers (v17) with hide, lock, reorder. Adjustment layers (v35): invert, dim, ASCII only, box style.
- Shading and braille fills (v20): block, shade and braille characters turn an image into text art.
- Brush and eraser (v31), selections (v32), gradients (v33) are shipped. Masks (v38), blend modes (v39), history (v40) and actions (v41) are shipped. Next: heal and expand (v42).
- PNG and SVG export (v73) for decks and print.

## This month

1. The v37 native batch to the store: new text from `docs/store/37.0.0.md`, retaken screenshots of the real look.
2. v38 Masks, then the native Describe chat and bring-your-own Claude key.
3. The 30 second ad (`landing/ad.mp4`) on the landing and as the App Store preview; retake it in the real look.
4. Product Hunt at v10-plus when Joshua says go; the relaunch text is in `docs/launch/`.
5. The Claude skill and MCP listings.
