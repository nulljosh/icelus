# Changelog

Icelus was called Charwork, Wiretext, Blockframe, Blockprint, Glyphic and Glyphbox before. Every release
ships on the web, iPhone, iPad and Mac unless it says otherwise.

## 2026-10-19
- **53.0.0** Hotspots. Pick a button, open More and choose the screen it opens. A small ring marks it, and a dashed line points to its screen while it is picked. Copy all screens and the build brief list every hotspot in the flow by the words on the part.
- **52.0.0** Copy deck. Open Copy in the inspector to see every word on the canvas in one list and edit any of it there; only those words change. Pick a language and tap Translate to see the whole canvas in it, one step of undo. On iPhone and Mac, Copy is under More (translate is on the web).
- **51.0.0** Access check. Review now flags controls that keyboard and screen reader focus would visit out of reading order, fields with no label, and controls too narrow to tap or touching each other. Fix Focus Order puts the controls in reading order, screen by screen, in one step.
- **50.0.0** Inspect. Pick a part and open More: its position, size and the gap to its neighbours or the screen edge on each side, with its own React or SwiftUI code to copy. Era 5 (Figma) done.
- **49.0.0** Grids. Select a screen and set Columns and Gutter: faint column bands appear inside it, and a part you drag snaps its left or right edge onto a column. Use on Every Screen gives the rest the same grid. The grid saves with the project and never shows in copied text.
- **48.0.0** Libraries. Make parts into symbols, then Export > Download library. Open that file in any project and its parts join Mine; place one and it stays linked. Open a newer version of the library and every linked copy updates, except what a copy owns. On iPhone and Mac, Copy library and Paste do the same.
- **47.0.0** Variables and modes. Under Layers, Canvas has a Lines switch: draw every part in ASCII, light, heavy, double or rounded lines at once, and switch back. Add a named spacing value and bind a screen's auto layout gap or padding to it; change it once and every screen using it restacks.
- **46.0.0** Properties. Select a copy of a symbol and turn on Own words or Own style: edits to the other copies skip what it owns, and turning it off pulls the shared look back. Swap puts another symbol in its place, keeping where it sits.
- **45.0.0** Sizes. Select a screen and tap Make sizes for phone, tablet and desktop widths side by side, resized with your pins. Change the words, style or color of a part in one and the others follow. On iPhone and Mac, a copied screen now keeps every part's color, state and pins.
- **44.0.0** Constraints. Pin a part on a screen to the right, the bottom, the center or both sides. Resize the screen and pinned parts follow; pinned to both sides, they stretch. The layers list keeps the up and down arrows on the picked layer only, so every name fits.
- **43.0.0** Auto layout. Turn it on for a screen and its parts stay stacked with an even gap and padding. Make some text longer and everything below moves down; delete a part and the rest closes up; drag one to reorder. The screen grows and shrinks to fit.
- **42.2.0** Harmonize. Drop a part on a screen and it takes on the look the parts there share: the same box style, ink and paper. A part with its own color keeps it.
- **42.1.0** Find distractions. Check now flags stray painted marks and parts that show nothing, and Remove distractions clears them in one tap. Arrows through a removed part join up.
- **42.0.0** Heal and expand. Delete a box in the middle of a flow and the arrows on either side join up. Add a row to a table or an item to a list and it carries the pattern on: Item 3 then Item 4, Mon then Tue.
- **41.0.0** Actions. Press Record, make a few edits, press Stop. Now pick any other part or screen and press Play to do the same edits to it. Actions save with the project.
- **40.0.0** History. Every step is listed by name, like Add Button or Move Card. Tap one to go back to it, and the steps after it wait in case you change your mind. Take a snapshot to keep a named copy of the canvas; snapshots save with the project.
- **39.0.0** Blend modes. Choose how a part meets what is under it: join the lines, sit over, sit under, or knock out. A cleaner nav bar with Settings and Profile, and a simpler Export menu.
- **38.0.0** Masks. Crop a part from its edges, or clip it to another part. Nothing is cut. Renamed to Icelus.
- **37.0.1** QA pass. A picked screen scrolls clear of the chat, card buttons draw as buttons, prose replies to Describe it are refused.
- **37.0.0** Describe it. Say what a screen is for and it draws; say what to change and it redraws. Web only for now.
- **36.0.0** Real canvas. Parts draw as real controls on artboards. The text look is a switch in Settings.
- **35.1.0** Design pass. Dark mode on every device, one token file, one type scale, tools grouped into Paint, Pick and More.
- **35.0.0** Adjustment layers. Invert, dim, plain ASCII or a box style for everything under an area.
- **34.0.0** Color. Ink and paper from the 16 terminal colors. Copy as ANSI. 34.0.1 keeps control characters out of terminals.
- **33.0.0** Gradients. A straight or round shade ramp as one stroke of paint.
- **32.0.0** Selections. Marquee and magic wand: copy, cut, fill or move cells. 32.0.1 handles huge input.
- **31.0.0** Brush and eraser, one to five cells wide, each stroke its own layer.
- **30.0.0** Agent kit. MCP resources, prompts and worked examples.
- **29.0.0** Decks. Present screens full screen, save as PDF, download an HTML deck.
- **28.0.0** Code export. React with plain CSS, or SwiftUI that compiles.
- **27.0.0** Hand it to Claude Code: one Markdown build brief.
- **26.0.0** Variations. Three takes of a screen; keep one.
- **25.1.0** Accounts, optional, with Profile and Settings.
- **25.0.0** Capture a page. A public web page comes back as a screen. 25.0.1 reads real pages better.
- **24.1.0** Beginner pass. The basics up front, the rest under More, a five-step tutorial.
- **24.0.0** Design systems from code.
- **23.0.0** Review. Overlaps, cut boxes, placeholder labels, missing empty and error states.
- **22.0.0** Notes pinned to parts, for people and agents.
- **21.0.0** Tweaks. Spacing, padding and one box style per screen.
- **20.0.0** Shading. Braille and soft-shade photos, Shade fills.
- **19.0.0** States. Pressed, disabled and error.
- **18.0.0** Symbols. Edit one copy, every copy follows.
- **17.0.0** Layers. Hide, lock, reorder.
- **16.0.0** Groups that move as one.
- **15.0.0** Trees from an indented list.
- **14.0.0** Sequence diagrams from a few lines.
- **13.0.0** Flowcharts from a line like a -> b -> c.
- **12.0.0** Bar charts, sparklines and progress rows from numbers.
- **11.0.0** Tables you edit as typed rows.
- **10.0.0** 27 languages, keyboard control and VoiceOver.
- **9.0.0** Paste any text wireframe, embeds, Shortcuts, a GitHub Action.
- **7.0.0** Highlights, your own parts, part packs, HTML export.
- **6.0.0** Screens, zoom, flow export, templates.

## 2026-10-18
- **5.0.0** Type a screen in a few lines.
- **4.0.0** Arrows that stay attached when parts move.
- **3.0.0** One project file on every device: web, iPhone, iPad, Mac, Apple Watch and the terminal.

## 2026
- **1.x** The first version: pick a part, tap the grid, copy the text.
