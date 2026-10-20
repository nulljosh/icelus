# Icelus brand kit and design system

**v38.0.0.** The mark is a box of glyphs: a corner, a half block, a full block and a corner, in a rounded box. It says what Icelus makes and stays the same from version to version.

`sheet.html` shows the whole kit on one page, light and dark. Screenshot it after any brand change.

## The mark
One bold flat white glyph on a blueprint-blue gradient tile (`#5B9BFF` to `#1D4ED8`). No text, no outline,
no emblem. The glyph is a box of glyphs: a rounded box holding two box-drawing corners, a half block and a
full block. It says what Icelus makes. A major may refine it, never replace it, and it is never a picture
of a feature.

- `../Icelus.icon` is the source of truth (Icon Composer). Light and dark fills are set in it.
- `../icon.svg` is the flat copy for READMEs (80 px). `icon-1024.png` is the App Store icon, no alpha.
- `mark.svg` is the glyph alone in `currentColor`, and the input to `make_brand.py` (`icon` skill) when the icon is recut.
- Every surface is cut from `icon-1024.png`: iOS and Mac `AppIcon`, Watch `AppIcon`, web `icon-192`/`512`,
  favicons and the face in `landing/og.png`. Regenerate them all together, never one alone.
- Clear space equal to the glyph's thickest stroke. Smallest size 16 px. Check it at 29 px before shipping.

## Mascot
Boxy is a frame in Icelus, still being drawn: a rounded blueprint-blue outline with its last corner open where
the pen is, two text cursors for eyes, a small smile, and two selection handles for feet. It is the thing you
make in the app, caught halfway and pleased about it. The pen flashes like a caret and the eyes blink every few
seconds; both stop for reduced motion. Never a solid block (that read as a toy brick).

- `mascot.svg` is the source (240 grid). Outline and handles the accent, the inside `#DCE8FF`, the pen `#5B9BFF`,
  face `#1D1D1F`.
- On a dark ground the outline turns `#5B9BFF` and the face navy (`#0B1F5C`).
- Boxy in text is a stamp in the palette, so the mascot pastes wherever the wireframes do:

```
╭────╴╱
│ ▌ ▌ │
│  ◡  │
▣─────▣
```

Boxy appears on the landing, the welcome card, the empty canvas and the ad's end card. Never inside the
app icon, never with a frame around it, never with props.

## Colour
One palette, the same numbers on every platform. `tokens.css` is the one token file (color light and dark,
type, space, radii, controls); the app imports it, `ios/App/Theme.swift` mirrors the colors and follows the
system appearance on iPhone, iPad and Mac, and the Watch is always dark.

| Role | Light | Dark |
|---|---|---|
| Accent | `#1D4ED8` | `#5B9BFF` |
| Pressed | `#1E40AF` | `#5B9BFF` |
| Text | `#1D1D1F` | `#F5F5F7` |
| Ground | `#F5F5F7` | `#000000` |
| Card and canvas | `#FFFFFF` | `#1C1C1E` |
| Hairline | `rgba(60,60,67,0.18)` | `rgba(255,255,255,0.16)` |

One palette means one file: no remote token import, nothing warm. Never brown, beige, purple or teal.

The accent marks actions, links, the selected element, snap guides and the icon, nothing else. No gradients
outside the icon tile.

## Type
The system font: SF Pro on Apple devices, `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue",
Helvetica, Arial, sans-serif` on the web. Never a custom face (Block Sans was retired in v3). Scale 34/40 bold,
22/28 semibold, 17/24, 15/20, 13/16, line heights in steps of 4, large type tightened to -0.022em. Grid
previews in the palette and inspector are the one exception, 11/16 monospace. Monospace (`ui-monospace`, SF Mono, Menlo)
appears only inside the character grid and its previews, because the grid is the product.

## Space and shape
- 8 point grid: 4, 8, 12, 16, 24, 32, 48. Side margin 20. Reading column 680.
- Radii: cards 28, grouped lists 20, the canvas 10, controls fully round, icon 22 percent.
- Controls are 48 point capsules, one height in a row. Focus is a 4 point ring at 30 percent accent.
- Motion is 0.2 s ease and honours reduced motion.

## The real look
Since v36 the canvas shows parts as real controls on artboards, the way a design tool does. They follow
the same rules as the rest of the app: the system font, the palette above, capsule buttons, hairline
borders, the one accent for actions. Ink and paper colors on a part override the tokens. Lines, paint,
charts, photos and flowcharts stay as characters in both looks. The text look, every part as characters,
is a switch in Settings, and a pasted or exported sketch is always text. A new part ships with both: its
characters (below) and its real twin in `src/lib/real.js` and `ios/App/Real.swift`.

## The parts
The 38 parts are drawn with single-line box characters (`┌─┐│└┘`) so they paste cleanly into any
monospace font. Plain ASCII export maps them to `+ - |`. A new part keeps that look: one line weight,
square corners, text padded by one space inside its frame.

## Voice
Short sentences, plain words, one person at a time. Say what it does, then stop. No em dashes, no emojis,
no "seamlessly". The line: Describe a screen. Edit it like a design tool. It is text underneath, so it pastes anywhere. The older line, "Sketch a screen in plain text", is retired as the pitch; it still describes the text look.

## The landing and the Icelus plate
The landing follows the Themis page, after the Hermes Agent site: one night-blue field (`--field`, `--field-deep` in dark), a giant headline in the system serif (`ui-serif`, New York on Apple devices, no bundled face), and one engraving. The engraving is Icelus, the winged dream god, cut from Bernard Picart's *The House of Sleep* (1733, Rijksmuseum, CC0) and printed as a blue plate: navy lines on pale paper, trimmed to the arch of his niche, with slow engraved rays behind. It is credited under the image. Never a stock photo, and never a screenshot in its place.
