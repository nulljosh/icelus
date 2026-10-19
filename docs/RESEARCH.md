# Icelus competitor research

Date: 2026-10-18

Icelus today (from the repo, read only): 23 presets on a 100x50 character grid. Click to place. Export .txt or copy to clipboard. Undo and redo 50 steps. Web, iOS, macOS, Apple Watch, and a TUI. An HTTP API and an MCP endpoint that take a wireframe in and return one out. On the web, elements can be selected, dragged, and removed. iOS still bakes elements into the grid. No connectors, no multi-artboard, no image export, no cloud sync.

Price notes: "Official" means the vendor page was fetched. "Third party" means only aggregator or review sites were found. Figures from aggregators conflict in several places, so confirm before using them in any pitch.

## 1. ASCII and text tools

### ASCIIFlow
- What: Browser editor for ASCII diagrams and boxes by Lewis Hemens. Client-side only.
- Price: Free. Open source (MIT, per AlternativeTo).
- Loved: Quick box, line, and arrow drawing. Exports to plain text, HTML, or ditaa. Self-hostable as a static site.
- Icelus lacks: Lines and arrows that connect shapes. Icelus has no connectors at all.
- Sources: https://cdn.jsdelivr.net/gh/lewish/asciiflow@main/README.md, https://alternativeto.net/software/asciiflow/about

### Monodraw
- What: Mac app for text diagrams, mind maps, and ER diagrams.
- Price: $9.99 one-time license (official Mac page on the vendor site).
- Loved: Connected shapes where arrows re-route when a box moves. FIGlet text banners with 148 fonts. Crow's Foot ER diagrams.
- Icelus lacks: Connected arrows that follow the shapes they link. Icelus also has no banner or big-text stamp.
- Sources: https://monodraw.helftone.com, https://apps.apple.com/us/app/monodraw/id920404675?mt=12

### Mockdown
- What: Listed as a browser tool for ASCII wireframes that exports Markdown (directory listing, May 2026). An OS X Daily review from April 2026 describes the same kind of tool.
- Price: Not confirmed. The mockdown.app page I fetched is a different product (it frames screenshots in device mockups), so identity is unclear.
- Loved: Boxes, arrows, labels, and styling. Copy to clipboard as plain text.
- Icelus lacks: Nothing confirmed. This is the closest direct rival if it is what the review says, so test it side by side.
- Sources: https://osxdaily.com/2026/04/26/create-ascii-art-designs-easily-with-mockdown/, https://tiny-helpers.dev/ascii/

### svgbob
- What: Open source Rust tool that turns ASCII art into SVG. Works as a CLI, a library, and a REST server.
- Price: Free, open source.
- Loved: Pipe text in, get SVG out. Sphinx plugin for docs. Packaged in AUR and nixpkgs.
- Icelus lacks: Image output. Icelus exports only .txt, so a user who wants a PNG or SVG for a deck has to go elsewhere.
- Sources: https://docs.rs/crate/svgbob/0.1.3, https://pypi.org/project/sphinxcontrib-svgbob

### Mermaid
- What: Open source text-to-diagram library. Diagrams are written as text in Markdown.
- Price: Free and open source. mermaid.live is the free online editor.
- Loved: Works inside GitHub, Notion, Obsidian, and Confluence. Many diagram types (flowchart, sequence, ER, Gantt). SVG and PNG export.
- Icelus lacks: A text source that renders a picture. Mermaid is for flows and charts, not screen layouts, so Icelus and Mermaid cover different jobs.
- Sources: https://docsearch.algolia.com/mcp/docs/repo/mermaid-js/mermaid, https://www.stork.ai/en/mermaid

### PlantUML Salt
- What: Wireframe sub-language inside PlantUML. Written between @startsalt and @endsalt.
- Price: Free, open source.
- Loved: Plain markup for controls. [ ] for buttons and checkboxes, ( ) for radios, "" for text areas, ^ for drop lists. Tab bars, menus, and scroll bars. Renders to an image.
- Icelus lacks: A text input that builds a screen. Every Icelus layout is a click-to-place action, so nothing can be typed or pasted as a source.
- Sources: https://plantuml.com/salt

### Excalidraw
- What: Hand-drawn style whiteboard, open source.
- Price: Free (open source, MIT, and a free hosted tier). Excalidraw+ is $6 per user per month (official page).
- Loved: Hand-drawn look that makes drafts feel unfinished on purpose. Shared libraries. Real-time collaboration on the free hosted tier.
- Icelus lacks: Real-time sharing and shared libraries. Icelus grid state stays on the device, with no cloud sync by design.
- Sources: https://plus.excalidraw.com/pricing, https://www.capterra.com/p/10017921/Excalidraw

### Terminal UI designers (ttkDesigner, dumbPaintTool, Mockscii)
- What: ttkDesigner is a drag-and-drop designer for real terminal apps built on pyTermTk (MIT, pip install). dumbPaintTool is a terminal ASCII and ANSI art editor. Mockscii is a browser editor for colored terminal mockups.
- Price: ttkDesigner and dumbPaintTool are free. Mockscii price not stated in listings, likely free.
- Loved: ttkDesigner exports working TUI code. Mockscii paints each cell with a foreground and background color, and saves JSON with no account.
- Icelus lacks: Per-cell color. Icelus has one ink color and the grid is monochrome. Its TUI companion currently lists the palette only, and it cannot place or edit elements.
- Sources: https://libraries.io/pypi/ttkDesigner, https://hub.docker.com/r/ryback2501/mockscii

## 2. Classic wireframe apps

### Balsamiq Wireframes
- What: Hand-drawn style wireframe app for web and desktop.
- Price: Official: Starter $16 per editor per month, Teams $24, Enterprise $35 (billed annually). 14-day free trial, no free tier. Some aggregators list different numbers, so check the page.
- Loved: The sketchy look keeps reviewers focused on layout, not color. Large control library that many teams already know.
- Icelus lacks: A sketch style for the stamped parts. Icelus also has no shared projects or team comments.
- Sources: https://www.balsamiq.com/pricing/

### Figma
- What: Full design tool for UI, prototypes, and component systems.
- Price: Third party only: Professional full seat $16 per month billed annually, $20 month to month. The Dev and Collab seats are cheaper but cannot edit designs. Official page not reached.
- Loved: Components with auto layout. Prototyping. Huge plugin and community library.
- Icelus lacks: Prototype links between screens. Icelus has no way to link one wireframe to the next.
- Sources: https://www.costbench.com/software/ai-design-tools/figma-ai/, https://toolradar.com/tools/figma/pricing

### Pencil (pen.dev, formerly Pencil Project)
- What: Agentic canvas for design. Designs live in an open .pen file format. Agents can work on the canvas through MCP and a CLI.
- Price: Not stated on the vendor page. It runs on a ChatGPT or Claude subscription or on your own API keys. Older listings say the desktop app is free.
- Loved: Agents draw on the canvas through MCP. Exports to HTML, CSS, and Tailwind. Imports Figma files.
- Icelus lacks: Code export. Icelus produces plain text only, so there is no HTML or Tailwind output.
- Sources: https://www.pen.dev/, https://www.capterra.com/p/176481/Pencil-Project/

### Whimsical
- What: Board tool for flowcharts, mind maps, docs, and wireframes.
- Price: Official: Free $0 (50 board objects and 50 doc blocks a month, watermarked exports, 7-day history). Pro $10 per editor per month, Business $20 (billed annually). Some aggregators list Business at $15.
- Loved: Flowcharts and wireframes on one canvas. Fast mind maps. Simple, clean editing.
- Icelus lacks: A board that holds flows next to screens. Icelus is wireframes only.
- Sources: https://whimsical.com/pricing

### Moqups
- What: Diagramming and wireframe tool with prototypes and real-time comments.
- Price: Free plan with 2 projects and 400 objects (vendor). Third party: Solo about $12 per month for one seat, Team about $30 for five seats. Official numbers did not render cleanly.
- Loved: Large stencil and icon library. Prototype interactions. Real-time commenting.
- Icelus lacks: Prototype interactions and comments on a layout.
- Sources: https://www.capterra.com/p/153363/Moqups/, https://www.softwaresuggest.com/moqups/pricing

### Wireframe.cc
- What: Browser wireframe tool. Not an ASCII tool, despite how it is sometimes listed. Draw a rectangle, then pick a stencil such as a button, hero, or form.
- Price: Free tier with limited features. Premium tier, price not confirmed.
- Loved: Fast rectangle-then-stencil workflow. Each wireframe gets a share URL. PDF and PNG export.
- Icelus lacks: Share URLs and PNG or PDF export. Icelus has text export only, and no public link.
- Sources: https://www.capterra.com/p/145712/Wireframe-cc/, https://www.g2.com/compare/moqups-vs-wireframe-cc

## 3. AI-to-wireframe tools

### Uizard (by Miro)
- What: AI tool that turns text, sketches, and screenshots into editable wireframes and mockups.
- Price: Third party conflicts. One source: Free, Pro $12 per month billed annually (500 AI generations), Business $39. CostBench lists Pro $19 and Business $49 per user. Check the vendor page.
- Loved: Screenshot scanner. Sketch to wireframe. Quick AI generations.
- Icelus lacks: Screenshot or sketch input. Icelus cannot turn an image into a layout.
- Sources: https://uxmagic.ai/blog/uizard-review-2026, https://costbench.com/software/ai-design-tools/uizard/

### Visily
- What: AI wireframe and UI mockup tool with real-time collaboration.
- Price: Third party: Pro $11 per editor per month, Business $29. Billing basis is unclear across sites.
- Loved: Generates screens from screenshots, sketches, or text prompts. Real-time collaboration and commenting. Custom fonts on Pro.
- Icelus lacks: Prompt-to-layout generation. Icelus places parts only when a user clicks, so it cannot fill a screen from a sentence.
- Sources: https://www.techjockey.com/us/detail/visily-ai, https://us.fitgap.com/products/visily

### Google Stitch
- What: Google's AI tool that turns a prompt, sketch, or screenshot into UI screens. Successor to Galileo AI.
- Price: Free in 2026 per several reviews. Usage is capped by daily and monthly credits, and the limits vary by source.
- Loved: Prompt to screen. Export to HTML and CSS or to Figma.
- Icelus lacks: Code export. Icelus has no HTML output and no AI generation from a prompt.
- Sources: https://www.banani.co/blog/google-stitch-ai-review, https://moda.app/blog/google-stitch-review

### ASCIIFlow MCP (bobooooo/asciiflow-mcp)
- What: MCP server that exposes ASCIIFlow drawing primitives so assistants can draw ASCII wireframes from a PRD or a description.
- Price: Free. Runs with npx and needs Node 20 or later. Repo fetch returned 404 during this research, so the listing is unverified.
- Loved: Agents draw directly with box, line, and text tools.
- Icelus lacks: Agent editing of placed elements. Icelus's MCP turns a wireframe into a new one. The live canvas tools cannot yet select, move, or delete elements (repo roadmap says so).
- Sources: https://glama.ai/mcp/servers/kvqjwm7wn4

### BareMinimum (listing only)
- What: Listed as a free AI generator for TUI-style ASCII wireframes from a prompt or screenshot, with export to text, Markdown, PNG, or React code.
- Price: Listed as free. Not confirmed. The bareminimum.ai site I fetched is an unrelated companion app, so this product may not be the one the listings describe.
- Loved: Prompt or screenshot to TUI wireframe. Drag and drop on a canvas. Exports to Markdown and PNG.
- Icelus lacks: Confirmed by listings only. If real, it is the nearest direct rival. Confirm it exists before you plan around it.
- Sources: https://indexator.ai/startups/bareminimum, https://theresanaiforthat.com/ai/bareminimum/

## Ranked: 10 features for Icelus next

1. **Select, move, resize, and delete on iOS and Mac.** Web already has it. iOS still bakes elements into the grid, so the apps behave differently. Size: M.
2. **Agent tools to select, move, resize, and delete elements.** Today agents can only place or rewrite a layout. Listed as a roadmap item. Size: S.
3. **Arrows and connectors that stay attached when boxes move.** Monodraw's best feature, and the main gap for flows between screens. Size: M.
4. **PNG export of the grid.** Icelus exports only .txt. A PNG drops straight into a deck or a bug report. Size: S.
5. **Multi-artboard canvas.** Several screens on one pan and zoom surface. Listed as the next roadmap item. Size: L.
6. **Typed text syntax to draw a screen.** Something like PlantUML Salt: [Button], (radio), "input". Good for agents and power users, and the /render endpoint already takes text in. Size: M.
7. **Screenshot or sketch to wireframe.** The most asked AI feature in this group (Uizard, Visily, Stitch). Would use a vision model through the existing API. Size: L.
8. **Per-cell color or an accent highlight.** Mockscii paints each cell. Mark one error or the selected item. Keep the plain-text copy colorless. Size: M.
9. **Read-only share link for a wireframe.** Wireframe.cc does this. Needs a small store, which conflicts with the no-storage backend rule today. Size: M.
10. **Custom presets saved to the palette.** Monodraw and Balsamiq let users keep their own components. Preset IDs are fixed today, so this needs a new ID scheme. Size: M.

## Takeaways
- Icelus's best lane is "text out, plain and pasteable." No product here does a plain-text copy and an agent API at the same time with this little setup.
- The biggest holes are connectors, image export, and element editing on iOS.
- Confirm Mockdown and BareMinimum before any launch copy names them.
