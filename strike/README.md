# /strike/ : the Daily Strike

One SAT question per Eastern calendar date, the same for everyone, no account. Built Oct 28 2026 (STRIKEPAGE), polished (STRIKEPOLISH), redesigned (STRIKELOOK), live Oct 29 (STRIKELIVE), and given its season features Nov 4 2026 (STRIKEBEST): the share sheet, a quiet count of days in a row, yesterday under today's board, the private read after seven Strikes, the archive, tomorrow's Strike by email, and the Open Graph card.

## Files
- index.html: the page, CSS inline, the one-line footer inside the stage and the site's attribution script. Relative paths only (../fonts, ../warrior.png, strike-bank.json), so the same files run on scoresamurai.com/strike/ and on a branch preview.
- strike.js: day keying, local state, the board and its tile flip, the result card, share (text plus square PNG), measurement.
- strike-moves.json: one plain line per tile family id (s01 to s48): the move, then the fix. Loaded only when a result shows, for the private read. No Codex name.
- og-strike.png: the link preview, 1200 by 630: the Warrior in his strike pose, "Daily Strike", a board, scoresamurai.com/strike.
- strike-bank.json: Room 4's launch bank (STRIKEBANK, Oct 28 2026), 60 days from Fri Nov 6 2026 (Day 60 is Mon Jan 4 2027), wired in whole, with Sensei's ten approved line rewrites and neutral label ids (STRIKEPREP, Oct 28 2026). Its source is Content / Daily Strike / strike-bank.json.
- warrior-guard-400.webp, warrior-guard-600.webp: the ready pose for the hero (Brand v3 / Warrior repair Oct 13 / warrior-guard-repaired.png, resized down, chosen by srcset so it is never enlarged).
- warrior-strike-400.webp, warrior-strike-600.webp: the strike pose for the hero after the strike, the same way.
- warrior-strike.webp: the strike pose at 778 by 800 for the share image (warrior-strike-repaired.png, resized).
- dm-sans-math.woff2: the signs ≤ and ≥ from DM Sans (Google Fonts, OFL), at the same optical size as ../fonts/dm-sans-400-700.woff2, which lacks them. Loaded only by unicode-range, so it costs nothing on days without them.
- strike-lining.woff2: a small cut of ../fonts/playfair-display-600.woff2 whose digits are its own lining figures, for the share image only (a canvas cannot ask Playfair for lining figures, and its default old-style 1 and 0 read as "1o").

## The look (STRIKELOOK2, Oct 29 2026; Claude Design canvas "Daily Strike, three directions", boards C2)
- One stage, at most 640 px wide, with maroon behind it edge to edge. No cream margins and no black footer band.
- The hero, on maroon: Score Samurai and the date in Playfair Display SC, the Warrior in his ready pose (Brand v3 / Warrior repair Oct 13 / warrior-guard-repaired.png, as delivered, resized down only) above the title on a phone and to its right on desktop, "Daily Strike" in Playfair Display, one line ("One SAT question a day. Wrong picks earn tiles. Same question for everyone."), and the board.
- The board is one object from the first look to the result: a recessed maroon tray with a gold hairline holding four slots. Empty slots are sunk wells; a filled tile is raised (top light, bottom shade) with a gold hairline. Each pick turns its slot over on its edge and back in colour (150 ms in, 180 ms out, no bounce). A compact bar with a small copy of the board follows the page down.
- The question on cream: section in small caps, the passage (a table, a bulleted list of notes or display lines when the bank gives days[n].structured), the stem, and four choice cards: full width, cream on cream with a real edge and shadow, the letter in a gold-ringed circle, a press state. A wrong pick turns its card over to its one plain read line on the trap colour with "Pick again."; the struck card turns green.
- The strike: the page returns to the hero, one slash sweeps across the Warrior (300 ms) and his pose swaps to the strike pose 90 ms in. The result then settles in place: "Daily Strike" becomes the small-caps kicker, "Day N" and "Struck on pick N" in Playfair Display, the same board, Share. Under the hero: what caught you, the read, the Desmos line on Math days, then the question with its picks.
- The footer is one line inside the stage: the countdown to the next Strike and the Diagnostic link. Under the stage, on the maroon, a line of small print carries Privacy and the College Board disclaimer.
- prefers-reduced-motion turns the flips, the slash, the settle and the bar's slide off.

## strike-bank.json schema
```
{
  "version": "string",
  "start": "YYYY-MM-DD",          // Eastern date of Day 1; day n = days since start + 1
  "labels": {                       // the trap families used in this bank: a neutral id (s01, s02 ...) and a tile colour only
    "<sNN>": { "tile": "orange|yellow|purple|blue|red|brown" }
  },
  "days": [                         // days[0] is Day 1, in order; Math and Reading and Writing alternate
    {
      "id": "<Original Problem Bank code>",
      "section": "Math" | "Reading and Writing",
      "passage": "<text, or the Math question>",
      "stem": "<question line, or empty>",
      "choices": ["A", "B", "C", "D"],
      "key": 0-3,
      "labels": ["<sNN>" | null, ...],        // one per choice; null on the key
      "reads": ["<plain line>" | null, ...],  // one per choice; null on the key; Friend Test voice
      "explain": "<about 40 words>",
      "desmos": "<Desmos Strategy Guide technique; Math only>",  // empty on a Math day prints: By hand, Desmos adds nothing here.
      "structured": {                         // optional; when present the page renders it in place of passage
        "table": { "title": "", "columns": [], "rows": [[]] },
        "notes_intro": "", "notes": [],       // a bulleted list
        "display": [],                        // equations or a data set, one per line, centred
        "passage_body": ""                    // the text after the table, notes or display
      }
    }
  ]
}
```
- No Codex name and no Codex-shaped id is stored in the bank or shown anywhere: not on the page, not in the share text, not in the saved image. The neutral id only picks the tile colour; the player sees the plain read line. Only Content / Daily Strike / strike-bank-master.json (internal, never on the site) maps the ids to the Codex.
- Green is reserved for the struck tile and is never a label colour.
- Superscript digits (², ³, ⁴, ⁷ and the rest) are set as real digits raised in DM Sans, so every glyph comes from the house face.
- Every question must be VERIFIED in the Original Problem Bank (standing rule 3) before it enters this file.
- Before the start date the page keeps the same stage (STRIKELIVE, Oct 29 2026; canvas board "C2 · Before Nov 17"; the start date is Fri Nov 6 2026 since STRIKENOW): the Warrior in ready pose, the board empty, "First Strike lands" and the start date in gold, and the footer line counting down to midnight Eastern on the start date ("First Strike in D d H h", then "H h M min" on the last day). The sheet is hidden. When the countdown runs out the page reloads itself into Day 1. After the last day the page says the Strike is not ready.

## Previews
On any host other than scoresamurai.com, ?day=N (1 to 60) opens day N of the bank. The live site ignores it.

## The grid
One tile per pick, in pick order, on a board of four. A wrong pick takes its family's colour; the struck pick is green. No letters, no choice text, so neither the grid, the share text nor the image shows the answer. No hearts, no badges, no leaderboard.

## STRIKEBEST (Nov 4 2026)
- Days in a row: finished daily Strikes on consecutive Eastern dates, ending today or yesterday. A missed day ends it; there is no grace day. Shown as one quiet line ("9 days played · 9 days in a row", the count only from 2), never with a warning, a timer or a reward. Archive replays never touch it.
- Yesterday: under today's board, yesterday's day number, the player's own board for it if played, the first sentence of its read, and a "See yesterday's question" fold with the question and its answer.
- The read: after 7 finished Strikes on this device (daily and replays), the result shows "The move that costs you most": the tile family that caught the player most often (ties go to the most recent), its plain move and fix from strike-moves.json, how often it caught them, and the date. The Diagnostic line sits under it (utm_content=read). Before 7 it says how many are done. It never leaves the device.
- Past Strikes: every day before today, newest first, fourteen shown and the rest one tap away. A replay starts fresh, is stored apart (ss_strike_v1.arch), never counts toward days in a row, and sends strike_archive_play instead of strike_play, strike_complete and strike_streak.
- Tomorrow's Strike by email: one line, an email field and "Send it to me", posting to Kit form 10043240 (Daily Strike, double opt-in). Before the start date it reads "The first Strike by email". No other data leaves the page.

## Share
The image is drawn the moment the strike lands, so a tap on Share opens the phone's share sheet at once with the image and the three lines (iOS opens the sheet only from the tap itself). Where there is no share sheet, Share falls back to the old way below. "Copy result" copies the three lines on its own.

Before STRIKEBEST: Share copies three lines to the clipboard (the grid as coloured squares, "Daily Strike <day>", https://scoresamurai.com/strike/) and saves daily-strike-<day>.png: the result card, 1080 square. Cream above, the Warrior at 510 px from his 800 px source (never upscaled) standing on the maroon floor at y 600, "Score Samurai" in small caps at the top, "Daily Strike, Day N" and "Struck on pick N" in Playfair Display with lining figures, the board as on the page (the tray, four 116 px slots, raised tiles, gold hairlines), and scoresamurai.com/strike.

## Local state
localStorage key ss_strike_v1: { first, d7, plays: { "YYYY-MM-DD": { n, id, picks, tiles, done, at } }, arch: { same shape, archive replays } }. Same day shows the finished card. A new day shows the days played, the days in a row, and yesterday.

## Measurement (GA4 G-LYZRWG13P3, live domain only; previews log to window.__strikeEvents)
- strike_first_open, strike_open: every visit, with strike_day, days_played, days_since_first
- strike_play: first pick of the day (plays)
- strike_complete: struck, with tries (completions)
- strike_share: with method (sheet, copy, download), copied and image flags, and archive (shares)
- strike_streak: on each finished daily Strike, with streak (days in a row, today included) and days_played
- strike_archive_play: first pick of a replay, with strike_day and days_back
- strike_return_d7: once per device, the first visit 7 or more days after the first (day-7 return = strike_return_d7 / strike_first_open for that week)
- strike_diagnostic_click: the Diagnostic link, with place (footer or read), which also carries utm_source=strike&utm_medium=daily&utm_campaign=strike&utm_content=day<n>
Mark strike_complete and strike_share as key events in GA4 (the launch kit has the clicks); that is a settings change and Sensei's hand.

## STRIKENOW (Nov 5 2026)
- Sensei's order: the Daily Strike goes live Fri Nov 6 2026, not Tue Nov 17. strike-bank.json "start" is now 2026-11-06; strike.js and index.html read every date from it, so the gold line reads "First Strike lands Friday, November 6", the countdown runs to midnight Eastern on Nov 6, and the email line says November 6.
- Day numbering, the 60-question bank and its order, the archive and the share card are unchanged. Day 1 is Nov 6 and Day 60 is Mon Jan 4 2027. Eastern date keying is unchanged; the flip still happens at midnight ET.
- og-strike.png carries no date and is unchanged.

