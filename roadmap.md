# Icelus roadmap

Goal: **v10.0.0, the plain-text design tool for people and agents.** You sketch a screen, an agent
sketches a screen, and the result is text that pastes anywhere. Research behind the order is in
[docs/RESEARCH.md](docs/RESEARCH.md).

How a version ships: every item checked, tests green, deployed, and the native apps carry it. Then the
version number bumps and the next list opens. One item at a time, commit and push after each. Every major
gets a new icon and new App Store text. Checkpoints where Joshua gets a report: v3, v5, v10, v20, v50, v100.

**Now:** v56 Transitions (Joshua 2026-10-19: Photoshop and Figma with real elements, toward Claude Design, with a chat to describe a design). v55.0.0 shipped 2026-10-19 (live parts), v54.0.0 shipped 2026-10-19 (play mode), v53.0.0 shipped 2026-10-19 (hotspots), v52.0.0 shipped 2026-10-19 (copy deck), v51.0.0 shipped 2026-10-19 (access check), v50.0.0 shipped 2026-10-19 (inspect; Era 5 Figma done), v49.0.0 shipped 2026-10-19 (grids), v48.0.0 shipped 2026-10-19 (libraries), v47.0.0 shipped 2026-10-19 (variables and modes), v46.0.0 shipped 2026-10-19 (properties), v45.0.0 shipped 2026-10-19 (sizes), v44.0.0 shipped 2026-10-19 (constraints), v43.0.0 shipped 2026-10-19 (auto layout), v42.0.0 shipped 2026-10-19 (heal and expand; Era 4 Photoshop done), v41.0.0 shipped 2026-10-19 (actions: record a few edits, play them on any part), v40.0.0 shipped 2026-10-19 (History panel: named steps, jump to any step, named snapshots), v39.0.0 shipped 2026-10-19 (blend modes, plus UI pass 1: Settings and Profile in the nav bar, grouped Export menu), v38.0.0 shipped 2026-10-19 (masks: crop and clip, web + native), v37.0.1 shipped 2026-10-19 (QA pass), v37.0.0 shipped 2026-10-19 (Describe it chat, web), v36.0.0 shipped 2026-10-19 (real canvas), v35.1.0 shipped 2026-10-19 (design pass), v35.0.0 shipped 2026-10-19 (adjustment layers), v34.0.0 shipped 2026-10-19 (color), v33.0.0 shipped 2026-10-19 (gradients), v32.0.0 shipped 2026-10-19 (selections), v31.0.0 shipped 2026-10-19 (brush and eraser), v30.0.0 shipped 2026-10-19 (agent kit: MCP resources, prompts, worked examples; Era 3 done), v29.0.0 shipped 2026-10-19 (decks: present, PDF, HTML deck), v28.0.0 shipped 2026-10-19 (code export, React and SwiftUI), v27.0.0 shipped 2026-10-19 (handoff brief), v26.0.0 shipped 2026-10-19 (variations), v25.1.0 shipped 2026-10-19 (accounts, Profile and Settings), v25.0.0 shipped 2026-10-19 (capture a page), v24.1.0 shipped 2026-10-19 (beginner pass: basics up front, More for the rest, five-step tutorial on web and native), v24 (design system from code), v23 (critique), v22 (notes), v21 (tweaks), v20.0.0 shipped 2026-10-19 (shading), v19 (variants), v18 (symbols), v17 (layers), v16 (groups), v15 (trees), v14 (sequence diagrams), v13 (flowcharts), v12 (charts), v11 (tables); iOS 12.0.0 is live (ready for sale); launch posts run from the dated queue below.

## v5 Agents
- [ ] Publish to npm as `npx icelus`. 2026-10-27: NOT done. npm is not logged in (E401, run `npm login`), `package.json` is `private: true`, and the name `icelus` is NOT free (npm holds a 0.0.1-security placeholder). Pick a scoped name (e.g. `@jaybulb/icelus`, needs the org) or ask npm to release the name, then drop `private`, set `files`, `npm publish --dry-run`, publish. npm sign-in has no GitHub option (username and password only); ~/.npmrc token returns 401 (dead); Joshua runs `npm login` himself, then publish as @jaybulb/icelus (icelus is taken).
- [ ] Submit `server.json` to the MCP registry. 2026-10-27: server.json fixed (description 81 chars, version 55.4.0) and validates; HTTP auth file is live at https://jaybulb.com/.well-known/mcp-registry-auth (key in the session scratchpad only). Publish was blocked by the permission classifier (public surface). To finish: `mcp-publisher login http --domain jaybulb.com --private-key <hex of the matching ed25519 key>` then `mcp-publisher publish` in `icelus/`. If the key is gone, generate a new ed25519 key and replace the `.well-known` file in nulljosh.github.io.

## v5.x Hardening (Joshua 2026-10-19: speed, efficiency, stability, security)
- [ ] Rate limit /api, /mcp and /api/capture with Cloudflare rules (zone jaybulb.com 5a233f10d21125b64aadab7c2f021f9b). 2026-10-27: NOT done. The wrangler OAuth token and the DNS token get an auth error on /rulesets; needs an API token with Zone WAF/Rulesets Edit (or the dashboard). Planned: 60 req/min per IP on /api and /mcp, 10/min on /api/capture, block action. Each call is already bounded by the body cap and Workers CPU limit

## Road to v100

The long plan (v6 to v100) lives in the wiki page icelus.md under Someday. Pull the next line back here when it starts.

## Launch queue (dated, kit in docs/launch)
- [ ] Reddit r/webdev on 2026-10-26 (post refreshed for v10)
- [ ] Directories: AlternativeTo, Uneed, SaaSHub, Indie Hackers, MCP lists (one per tick, Joshua's yes per form)
- [ ] Product Hunt relaunch, not before 2027-03-21 (Blockframe launched 2026-09-21)
- [ ] Show HN once the account is allowed again

## Waiting on Joshua
- [ ] App Store privacy answers for accounts: email address, linked to the user, for app functionality (the next store submission needs it; it is a dashboard form, Joshua's yes)
- [ ] App Review note: sign-in is optional. Apple may ask for a demo account, which must not be made on the production service without Joshua
- [ ] Cloud projects (v62): a new owner-only table on the shared jaybulb-api, its own release behind jaybulb-api's checks
- [ ] (covered by the combined rate-limit line above) Rate limit /api/capture
- [ ] Describe it: type a sentence, get a screen, and Make (a sentence becomes a whole flow), through a model (blocked: needs Joshua's pay decision; ships as a point release the day he picks)
- [ ] Screenshot or sketch to wireframe through a vision model (blocked: needs Joshua's pay decision, Workers AI free tier or a paid key)
- [ ] iCloud sync for projects on Apple devices (blocked: needs the iCloud capability turned on for the App ID, Joshua's yes)
- [ ] Share extension (blocked: a new extension bundle ID to register with Apple, Joshua's yes)

## Open questions for Joshua
- Public repo: say the word and it flips.
- Price stays $0.99 on the App Store, free on the web (the $1 rule).

## Ingested 2026-10-30
- [ ] (blocked: naming is Joshua's pick, 2026-11-01) Needs better name

## Ingested 2026-10-31
- [ ] Bloated semver: App Store Connect shows 50.0.0 on iOS, status Not Applicable, What's New empty (notes/attachments/2026-10-31/icelus-1.png). Apply honest semver (feature = minor, fix = patch, major only on Joshua's call) and reset the store version line.
