# Icelus loop handoff (2026-10-19, evening)

## What the loop is

A /loop that works `roadmap.md` one item per tick: build the smallest version that works, web first and then the Swift port, test both sides, commit, push, deploy the web, tick the item. Each finished major gets a version bump, a tag and new App Store text. The icon is the box of glyphs and stays. Joshua's bar is A+ on every screen, checked in the simulator and in a headless browser. The tick rules, the launch queue and the watch items live in `~/.claude/loops/icelus.md`.

## Where things stand

- The repo is at 55.3.0. Shipped this stretch: hotspots (a button opens another screen), play mode (click through linked screens), live parts (boxes tick, tabs switch, fields take typing), an iPhone layout with glass bars and a bottom tab bar where Settings holds Profile, a tutorial that stays out of the way, a slim selection bar, Files for many files with six linked templates, and layers grouped by screen with Review checks on open.
- Boxy is the new original mascot. It is still being drawn: the frame is not finished and the eyes follow the cursor.
- The web is live at icelus.jaybulb.com.
- Native: iOS 50.0.0 is waiting for review. The 55.x native build compiles and looks right in the simulator but has not been submitted. Nothing newer has reached the App Store.
- The asc CLI hung this session, so store state was not re-read. Put a timeout on every asc call and check `asc versions list --app 6794988951` before any submit. Only one store build in review at a time.
- Old private tags leaked to the public repo through a `--tags` push and were deleted. Push tags by name only: `git push origin main vN.0.0`. Never push anything from icelus-private, and never push private-main to origin. Commit by exact path.

## Next, in order

1. iPhone inspector row: show the tools as icons only. The More control is a long sideways strip, so fix that first.
2. History sheet: it feels empty. Fill it with the named steps and a clear way to jump back.
3. Add sheet: the Text area and Date picker thumbnails are blank. Draw them.
4. Regrade every screen to A. Each screen gets a headless walk in light, dark and 390 wide, and a look at the screenshots.
5. Native: TestFlight 55.x. Then pull 50.0.0 from review and submit 55.x, once asc responds.
6. v56 Transitions (push, sheet and fade between screens, plus Motion), then v57 Prototype links, then v58 Flow map.

Waiting on Joshua: App Store privacy answers for accounts, rate limits on /api/capture and /api/describe, the pay decision that Describe it and Make need, and the share extension and iCloud items.

## Restart prompt

```
/loop Read ~/.claude/loops/icelus.md and run one tick.
```
