# Icelus Money

How Icelus makes money. The fleet-wide ledger is `GTM.md` in the Code root.

## Price

$0.99 upfront on the App Store. Free on the web.

## Rail

App Store paid download. Apple keeps 15%, so each sale pays out $0.84. The web version stays free, so the landing page is the trial and the store is the checkout.

## Why it is worth a dollar

In Joshua's voice:

first sale was a friend of my dad's. he paid a dollar and didn't ask what it does, which is fair, it does one thing.
you pick a part, stamp it on a grid, copy it as text. the text pastes into a commit, an issue, a readme. every other wireframe tool hands you a picture nobody can edit.
monodraw is $9.99. balsamiq is $16 a month per editor. this is $0.99, free on the web, and it saves as you draw so you can't lose the sketch xd
2.0.0 with the new name and icon is in review now. the web version already has all of it, and the landing page runs the real app so you can try before the dollar.

As Steve Jobs on stage:

Most wireframe tools give you a picture. A picture you cannot edit in a pull request. A picture you cannot paste into a chat.
Everyone else made the sketch a file. We made it text.
Today we are introducing Icelus. Pick a part. Stamp it on a grid. Copy it anywhere.
It saves as you draw, and an assistant can sketch with you. It just works.
How it makes money. The plan is a dollar from each person, and the dollar is the point: Monodraw is $9.99 and Balsamiq is $16 a month per editor.
The first thing to try after that is a paid pack of parts, which is not built yet. No number yet.
One more thing. This is Boxy.

## Numbers

Since 2026-07-01 (`asc web analytics overview --app 6794988951 --start 2026-07-01 --end <today>`):
27 downloads, 12 redownloads, 706 store impressions, 102 page views, 9.5% conversion, $0 proceeds.
Every download landed while the app was free; none since the $0.99 price on 2026-09-20.
The dad's-friend dollar does not show in Apple's numbers.

## Next

iOS 2.0.0 went to review on 2026-10-18 (build 202610182155). Once it is live: Product Hunt, then watch App Store Connect sales. If a month passes with installs on the web and none in the store, go back to free. Part packs wait for the first sale that is not a friend.

## Change it

`asc pricing schedule create --app 6794988951 --price 0.99 --base-territory USA --start-date YYYY-MM-DD`. Swap `--price 0.99` for `--free` to revert. No build, no review.

Anyone who got Icelus while it was free keeps it free. Only new customers pay.

*ASC 6794988951. Price set 2026-09-20. Renamed from Blockframe 2026-10-18.*
