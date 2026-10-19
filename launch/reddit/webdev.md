Note: no karma/flair gate. Frame as build story, not an ad.

Title: I built a wireframe tool that outputs plain text instead of an image

Body:
I kept wanting to sketch a UI layout inside a GitHub issue or a Slack message, and every wireframe tool I had exports a PNG. A PNG can't be pasted into a text field, edited by someone else, or diffed.

Icelus stores the document as a 100x50 array of characters. Pick one of 23 component presets, click to stamp it on the grid, and the whole thing is a pure function over that array, so undo and redo are just keeping old grids around instead of tracking reverse operations. Export copies the grid as text, which pastes anywhere text goes.

Built with Vite 6 and React 19, no UI libraries. Free on the web, and there's a $0.99 native iOS and macOS app for people who want it off the browser.

Open to feedback on the component set or the grid approach.

wiretext.jaybulb.com
