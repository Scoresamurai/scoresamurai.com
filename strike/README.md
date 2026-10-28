# /strike/ : the Daily Strike

One SAT question per Eastern calendar date, the same for everyone, no account. Built Oct 28 2026 (STRIKEPAGE) on branch preview-strike. Not linked from any page and not in sitemap.xml until Sensei approves the merge.

## Files
- index.html: the page, CSS inline, footer, no external CSS. Relative paths only (../fonts, ../warrior.png, strike-bank.json), so the same files run on scoresamurai.com/strike/ and on a branch preview.
- strike.js: day keying, local state, the trap grid, share (text plus square PNG), measurement.
- warrior-strike.webp: the Warrior in the strike pose, 778 by 800, for the result card and the share image.
- strike-bank.json: the questions. The current file is a PLACEHOLDER (four Trap Map questions from trap.js, already Sensei-solved and public). Room 4's audited bank replaces it whole.

## strike-bank.json schema (Room 4 delivers exactly this, in Content / Daily Strike)
```
{
  "version": "string",
  "start": "YYYY-MM-DD",          // Eastern date of Day 1; day n = days since start + 1
  "labels": {                       // the trap families used in this bank: id and tile colour only
    "<family-id>": { "tile": "orange|yellow|purple|blue|red|brown" }
  },
  "days": [                         // days[0] is Day 1, in order; Math and Reading and Writing alternate
    {
      "id": "<Original Problem Bank code>",
      "section": "Math" | "Reading and Writing",
      "passage": "<text, or the Math question>",
      "stem": "<question line, or empty>",
      "choices": ["A", "B", "C", "D"],
      "key": 0-3,
      "labels": ["<family-id>" | null, ...],  // one per choice; null on the key
      "reads": ["<plain line>" | null, ...],  // one per choice; null on the key; Friend Test voice, e.g. "Solved for x and stopped there."
      "explain": "<about 40 words, plain gate grade 7>",
      "desmos": "<Desmos Strategy Guide technique; Math only>"   // empty on a Math day prints: By hand, Desmos adds nothing here.
    }
  ]
}
```
- No Codex name is stored in the bank or shown anywhere: not on the page, not in the share text, not in the saved image. The family id only picks the tile colour; the player sees the plain read line.
- Green is reserved for the struck tile and is never a label colour.
- Every question must be VERIFIED in the Original Problem Bank (standing rule 3) before it enters this file.
- If a date has no entry, the page says the Strike is not ready and shows no question.

## The grid
One tile per pick, in pick order. A wrong pick takes its family's colour, its read line appears under the question and in the list under the grid, and the player picks again; the struck pick is green. No letters, no choice text, so neither the grid, the share text nor the image shows the answer. No hearts, no streak, no badges, no leaderboard.

## The result card and the share image
The Warrior in the strike pose (Brand v3 / Warrior repair Oct 13 / warrior-strike-repaired.png, as delivered, resized to 778 by 800 as warrior-strike.webp), "Day N" and "Struck on pick N" in Playfair Display, the tiles, Share, the read lines, the explanation, the Desmos line on Math days, the Diagnostic line. Share copies three lines to the clipboard (the grid as coloured squares, "Daily Strike <day>", https://scoresamurai.com/strike/) and saves daily-strike-<day>.png: the same card, 1080 square, with the Warrior, the tiles, "Daily Strike, Day N", "Struck on pick N" and scoresamurai.com/strike. The Warrior is drawn at 460 px from an 800 px source, never upscaled.

## Local state
localStorage key ss_strike_v1: { first, d7, plays: { "YYYY-MM-DD": { n, id, picks, tiles, done, at } } }. Same day shows the finished card. A new day shows the day count (days played, never a streak) and yesterday's grid.

## Measurement (GA4 G-LYZRWG13P3, live domain only; previews log to window.__strikeEvents)
- strike_first_open, strike_open: every visit, with strike_day, days_played, days_since_first
- strike_play: first pick of the day (plays)
- strike_complete: struck, with tries (completions)
- strike_share: with copied and image flags (shares)
- strike_return_d7: once per device, the first visit 7 or more days after the first (day-7 return = strike_return_d7 / strike_first_open for that week)
- strike_diagnostic_click: the Diagnostic link, which also carries utm_source=strike&utm_medium=daily&utm_campaign=strike&utm_content=day<n>
Mark strike_complete and strike_share as key events in GA4 if wanted; that is a settings change and Sensei's hand.
