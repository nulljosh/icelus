<img src="icon.svg" width="80" alt="Icelus">

![version](https://img.shields.io/badge/version-v46.0.0-blue)
![license](https://img.shields.io/badge/license-Apache%202.0-green)

Describe a screen and it draws. Then edit it like Figma or Photoshop, with real buttons, fields and switches on artboards. Underneath, every screen is text on a character grid, so it pastes into a README, an issue or a chat and stays editable.

**Live:** [icelus.jaybulb.com](https://icelus.jaybulb.com). Free on the web, $0.99 on the App Store for iPhone, iPad and Mac, plus Apple Watch and the terminal. One project file opens everywhere.

## Features

- **Describe it.** Say what a screen is for and it appears. Pick a screen and say what to change.
- **A real canvas.** 38 parts, from Button to Table and Tab bar, in iOS, Material, terminal and email styles.
- **Layout like Figma.** Symbols with per-copy words, style and swap, auto layout, constraints, and phone, tablet and desktop sizes kept in step.
- **Paint like Photoshop.** Brush, selections, gradients, 16 colors, masks, blend modes and adjustment layers.
- **History and actions.** Every step by name, snapshots, and recorded edits you can play on any part.
- **Review.** Flags overlaps, cut boxes, placeholder text, missing states and stray marks, and fixes them in one tap.
- **Hand it off.** A build brief for Claude Code, React or SwiftUI code, a deck, a PDF, HTML, an image or plain text.
- **For agents.** An API, an MCP server, Shortcuts actions and a GitHub Action.
- Every key works, VoiceOver reads it, 27 languages. Works without an account.

## Run

```bash
npm install && npm run dev
npm test
```

Command line: `printf '"Email"  [Sign in]' | node bin/icelus.js draw`. Terminal app: `swift build`, then `icelus-tui render sketch.json`. Describe it needs the Workers AI binding, so it runs on the deployed site, not under `npm run dev`. API and tools: [docs/API.md](docs/API.md).

## Check wireframes in CI

The GitHub Action fails a build when a box in a Markdown wireframe no longer closes:

```yaml
- uses: nulljosh/icelus@v46.0.0
  with: { files: "README.md docs/*.md" }
```

## More

[Whitepaper](WHITEPAPER.md) · [Architecture](docs/ARCHITECTURE.md) · [API](docs/API.md) · [Examples](docs/EXAMPLES.md) · [Roadmap](roadmap.md) · [Brand](brand/BRAND.md) · [Privacy](PRIVACY.md)

## License

Apache License 2.0, 2026 Joshua Trommel.
