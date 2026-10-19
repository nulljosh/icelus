# Icelus roadmap

Goal: **v10.0.0, the plain-text design tool for people and agents.** You sketch a screen, an agent
sketches a screen, and the result is text that pastes anywhere. Research behind the order is in
[docs/RESEARCH.md](docs/RESEARCH.md).

How a version ships: every item checked, tests green, deployed, and the native apps carry it. Then the
version number bumps and the next list opens. One item at a time, commit and push after each. Every major
gets a new icon and new App Store text. Checkpoints where Joshua gets a report: v3, v5, v10, v20, v50, v100.

**Now:** v47 Variables and modes (Joshua 2026-10-19: Photoshop and Figma with real elements, toward Claude Design, with a chat to describe a design). v46.0.0 shipped 2026-10-19 (properties), v45.0.0 shipped 2026-10-19 (sizes), v44.0.0 shipped 2026-10-19 (constraints), v43.0.0 shipped 2026-10-19 (auto layout), v42.0.0 shipped 2026-10-19 (heal and expand; Era 4 Photoshop done), v41.0.0 shipped 2026-10-19 (actions: record a few edits, play them on any part), v40.0.0 shipped 2026-10-19 (History panel: named steps, jump to any step, named snapshots), v39.0.0 shipped 2026-10-19 (blend modes, plus UI pass 1: Settings and Profile in the nav bar, grouped Export menu), v38.0.0 shipped 2026-10-19 (masks: crop and clip, web + native), v37.0.1 shipped 2026-10-19 (QA pass), v37.0.0 shipped 2026-10-19 (Describe it chat, web), v36.0.0 shipped 2026-10-19 (real canvas), v35.1.0 shipped 2026-10-19 (design pass), v35.0.0 shipped 2026-10-19 (adjustment layers), v34.0.0 shipped 2026-10-19 (color), v33.0.0 shipped 2026-10-19 (gradients), v32.0.0 shipped 2026-10-19 (selections), v31.0.0 shipped 2026-10-19 (brush and eraser), v30.0.0 shipped 2026-10-19 (agent kit: MCP resources, prompts, worked examples; Era 3 done), v29.0.0 shipped 2026-10-19 (decks: present, PDF, HTML deck), v28.0.0 shipped 2026-10-19 (code export, React and SwiftUI), v27.0.0 shipped 2026-10-19 (handoff brief), v26.0.0 shipped 2026-10-19 (variations), v25.1.0 shipped 2026-10-19 (accounts, Profile and Settings), v25.0.0 shipped 2026-10-19 (capture a page), v24.1.0 shipped 2026-10-19 (beginner pass: basics up front, More for the rest, five-step tutorial on web and native), v24 (design system from code), v23 (critique), v22 (notes), v21 (tweaks), v20.0.0 shipped 2026-10-19 (shading), v19 (variants), v18 (symbols), v17 (layers), v16 (groups), v15 (trees), v14 (sequence diagrams), v13 (flowcharts), v12 (charts), v11 (tables); iOS 12.0.0 is live (ready for sale); launch posts run from the dated queue below.

## v2.0.0 Icelus (this release)
- [ ] Repo goes public (needs Joshua's yes)

## v5 Agents
- [ ] Publish it to npm as `npx icelus` (the name is free; needs Joshua's yes)
- [ ] Submit `server.json` to the MCP registry once the name locks (needs Joshua's yes, it is public)

## v5.x Hardening (Joshua 2026-10-19: speed, efficiency, stability, security)
- [ ] Rate limit /api and /mcp with a Cloudflare rule (zone change, needs Joshua's yes; each call is already bounded by the body cap and Workers CPU limit)

## Road to v100

One major version per line from here. Each one ships on the web first (deploy the same day), then iOS
and Mac in the next store batch. Only one store build is in review at a time, so native majors queue
and go out together. A version is done when it is live, tested, and its line is checked here. Free on
the web, $0.99 on the App Store, always (the $1 rule): nothing below is a paid tier.

### Where v21 to v100 come from (Joshua 2026-10-19: "Figma, photoshop and Claude design are the inspirations")
Each era takes the best ideas of one tool and redraws them for a character grid. Claude Design brings
describe, tweak and hand off to code. Photoshop brings painting, selections, adjustment layers, masks and
history. Figma brings components, auto layout, variables, prototypes and working together. Agents stay the
wedge: every new feature is also an API and MCP tool on the day it ships.

### Gaps, round two (docs/STRATEGY.md, one per tick between versions)
- [ ] Describe into a selection: marquee an area and type what goes there.
- [ ] Notes Claude acts on: a note addressed to Claude is read by Describe it and resolved when done.
- [ ] PowerPoint export: the deck as a .pptx.
- [ ] Auto layout across: stacks that run left to right, with alignment and wrap (Figma auto layout).
- [ ] Live code parts: a part that runs a small sandboxed HTML snippet in the real look.
- [ ] Show and hide per copy: a symbol copy hides a line of itself without detaching (Figma boolean properties).

### Era 4: Photoshop, paint with characters (31 to 40)

### Era 5: Figma, components and layout (41 to 50)
- [ ] **v47 Variables and modes.** Name spacing, widths and glyphs once. Switch the whole canvas between ASCII, light and heavy.
- [ ] **v48 Libraries.** Publish a part library and pull its updates into any project.
- [ ] **v49 Grids.** Column grids and guides you can save and reuse.
- [ ] **v50 Inspect.** Click a part to see its position, size, spacing and the code for it.
- [ ] **v51 Access check.** Focus order, labels and touch sizes checked on every screen.
- [ ] **v52 Copy deck.** Every piece of text in one sheet, edited there, and a preview of the screen in any of the 27 languages.

### Era 6: Figma, prototype (51 to 60)
- [ ] **v53 Hotspots.** Mark a button and choose the screen it opens.
- [ ] **v54 Play mode.** Click through linked screens like a real app.
- [ ] **v55 Live parts.** Checkboxes tick, tabs switch and fields take typing while you play.
- [ ] **v56 Transitions.** Push, sheet and fade between screens, plus Motion: a part keyframed across screens.
- [ ] **v57 Prototype links.** Share a playable prototype with one link.
- [ ] **v58 Flow map.** Every screen and link on one map, drawn for you.
- [ ] **v59 Present.** Play a prototype full screen, step by step, for a meeting.
- [ ] **v60 Tests.** Give a tester a task and record where they clicked.
- [ ] **v61 Heatmaps.** See where testers clicked across a screen.
- [ ] **v62 Prototype kit.** Every prototype action as an API and MCP tool, so an agent can build and test a flow.

### Era 7: Figma, together (61 to 70)
- [ ] **v64 Cloud projects.** Projects saved to D1, open on any device.
- [ ] **v65 Live editing.** Two people on one canvas, through a Durable Object.
- [ ] **v66 Comments.** Notes become threads: reply, mention, resolve.
- [ ] **v67 Version history.** Every save kept. Scrub back and restore.
- [ ] **v68 Branches.** Try an idea on a copy and merge it back.
- [ ] **v69 Teams.** Shared folders and shared part libraries.
- [ ] **v70 Follow.** Watch where a teammate is looking and what they pick.
- [ ] **v71 Review.** Send a screen for sign-off and collect approvals.
- [ ] **v72 Offline first.** Edit anywhere, sync when back online, never lose work.

### Era 8: open everything (71 to 80)
- [ ] **v73 SVG and PNG.** Image export for decks and docs.
- [ ] **v74 Mermaid.** Read and write Mermaid flowcharts and sequence diagrams.
- [ ] **v75 PlantUML Salt.** Read and write Salt wireframes.
- [ ] **v76 Excalidraw.** Import and export Excalidraw scenes.
- [ ] **v77 Figma import.** Bring a Figma frame in as a wireframe.
- [ ] **v78 Figma export.** Send a wireframe to Figma as frames.
- [ ] **v79 Penpot.** Open source design files, both ways.
- [ ] **v80 Camera.** Point the iPhone at a paper sketch and get a wireframe, on device.
- [ ] **v81 Bulk convert.** The CLI turns a folder of anything into anything.
- [ ] **v82 Format spec.** The project format written up as an open spec with a test suite anyone can run.

### Era 9: everywhere (81 to 90)
- [ ] **v83 VS Code.** Edit wireframes inside code comments and Markdown files.
- [ ] **v84 Obsidian.** A plugin that draws and edits wireframe blocks in notes.
- [ ] **v85 Raycast.** Make a quick wireframe from the launcher.
- [ ] **v86 Unfurls.** Slack and Discord links show the wireframe.
- [ ] **v87 Live embeds.** GitHub, Notion and blog embeds that stay current.
- [ ] **v88 Vim mode.** Modal keys for people who never leave the keyboard.
- [ ] **v89 TUI editor.** The terminal companion edits, not just shows.
- [ ] **v90 Android.** The KMP module becomes a real Android app.
- [ ] **v91 Watch.** Glance at a project and approve a review.
- [ ] **v92 Browser extension.** Wireframe any page you are looking at.

### Era 10: the hundred (91 to 100)
- [ ] **v93 Gallery.** Publish a screen, browse what others made, remix any of it into your project.
- [ ] **v94 Lessons.** Learn layout by doing, inside the app.
- [ ] **v95 Plugins.** A small, sandboxed plugin API and a directory to find them. Describe a plugin and it is written for you.
- [ ] **v96 Scripts.** Draw with a few lines of JavaScript.
- [ ] **v97 Huge canvases.** Smooth at 10,000 by 10,000 cells. A viewport-sized canvas, so big grids stay sharp too (a 500 by 500 grid draws soft today: its backing store is capped under Safari's limit).
- [ ] **v98 Sites.** Publish a set of screens as a real, working web page.
- [ ] **v99 Build it.** A project becomes a working app, checked against its own wireframes.
- [ ] **v100 Parity.** Web, iOS, Mac, Android, terminal and watch all do the same things.
- [ ] **v101 Polish.** Every screen, doc and page at the A+ bar, in all 27 languages, zero open issues.
- [ ] **v102 Icelus 100.** Launch week two, and the plain-text design tool everyone uses.

## Launch queue (dated, kit in docs/launch)
- [ ] Reddit r/webdev on 2026-10-26 (post refreshed for v10)
- [ ] Directories: AlternativeTo, Uneed, SaaSHub, Indie Hackers, MCP lists (one per tick, Joshua's yes per form)
- [ ] Product Hunt relaunch, not before 2027-03-21 (Blockframe launched 2026-09-21)
- [ ] Show HN once the account is allowed again

## Waiting on Joshua
- [ ] App Store privacy answers for accounts: email address, linked to the user, for app functionality (the next store submission needs it; it is a dashboard form, Joshua's yes)
- [ ] App Review note: sign-in is optional. Apple may ask for a demo account, which must not be made on the production service without Joshua
- [ ] Cloud projects (v62): a new owner-only table on the shared jaybulb-api, its own release behind jaybulb-api's checks
- [ ] Rate limit /api/capture with a Cloudflare rule (it fetches any public page for anyone; capped at 8 s and 2 MB a call)
- [ ] Describe it: type a sentence, get a screen, and Make (a sentence becomes a whole flow), through a model (blocked: needs Joshua's pay decision; ships as a point release the day he picks)
- [ ] Screenshot or sketch to wireframe through a vision model (blocked: needs Joshua's pay decision, Workers AI free tier or a paid key)
- [ ] iCloud sync for projects on Apple devices (blocked: needs the iCloud capability turned on for the App ID, Joshua's yes)
- [ ] Share extension (blocked: a new extension bundle ID to register with Apple, Joshua's yes)

## Open questions for Joshua
- Public repo: say the word and it flips.
- Price stays $0.99 on the App Store, free on the web (the $1 rule).
