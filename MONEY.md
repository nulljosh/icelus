# Icelus Money

How Icelus makes money. The company plan is `REVENUE.md` in the Code root; the ledger is `GTM.md`.

## Price and rail

$0.99 upfront on the App Store (ASC 6794988951), iPhone, iPad and Mac. Apple keeps 15%, so each sale pays about $0.84. Free on the web at icelus.jaybulb.com, where the landing page runs the real app.

## What is actually sold

The design tool: the canvas, the parts, the text under every screen, the exports and the agent tools. All of it is ours. The dollar is for the app. The paid parts of the cloud (Describe it and Translate) are a cost we carry, not a second thing to buy.

## Who pays and why

A product person or developer who wants a wireframe they can paste into a commit, an issue or a chat. Most rivals charge more, and some charge monthly. Icelus is one dollar, and it saves as you draw.

## Cost to serve

Describe it and Translate call Workers AI (Llama 3.3 70B) through the `[ai]` binding, from the app origin only. The code's own note says the daily quota is the ceiling on what it costs. Translate takes at most 200 strings of 200 characters, 8,000 in all, per call. ElevenLabs narrated the launch ad only. It is not in the app. The code sets no dollar cap.

## Where we are

- 2026-09-20: price set to $0.99.
- 2026-10-18: iOS 2.0.0 went to review.
- 2026-10-19: renamed to Icelus. The old names are listed in `CLAUDE.md`.
- Last read in the old file (date not recorded): 27 downloads, 706 store impressions and 102 page views. Every download came while the app was free.
- Revenue: no verified number (the App Store Connect key cannot read sales yet).

## Role in the company plan

Catalogue. GTM.md lists it as a $0.99 app that is free on the web. It serves Stage 0 as one more dollar app that has to prove strangers pay. Under Stage 2 it earns a place on the grid or is retired.

## Next

Once 2.0.0 is live, read the first month of store sales against web page views.

## Million, billion, trillion

**A million.** Icelus is the wireframe tool people paste into their pull requests, bought once for a dollar.

**A billion.** Icelus is the design tool on every Jaybulb device, where a sketch becomes text a developer can use.

**A trillion.** Icelus is how every screen on the platform gets drawn and handed to a developer, as text.

## Change it

`asc pricing schedule create --app 6794988951 --price 0.99 --base-territory USA --start-date YYYY-MM-DD`. Swap `--price 0.99` for `--free` to revert. No build, no review. Only with Joshua's yes in chat.

Anyone who got Icelus while it was free keeps it free.

*ASC 6794988951. Verified 2026-11-02.*
