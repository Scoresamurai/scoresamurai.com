# /strike/ : the Daily Strike

One SAT question per Eastern calendar date, the same for everyone, no account. Built Oct 28 2026 (STRIKEPAGE) on branch preview-strike. Not linked from any page and not in sitemap.xml until Sensei approves the merge.

## Files
- index.html: the page, CSS inline, footer, no external CSS. Relative paths only (../fonts, ../warrior.png, strike-bank.json), so the same files run on scoresamurai.com/strike/ and on a branch preview.
- strike.js: day keying, local state, the trap grid, share (text plus square PNG), measurement.
- strike-bank.json: the questions. The current file is a PLACEHOLDER (four Trap Map questions from trap.js, already Sensei-solved and public). Room 4's audited bank replaces it whole.

## strike-bank.json schema (Room 4 delivers exactly this)
```
{
  "version": "string",
  "start": "YYYY-MM-DD",          // Eastern date of Day 1; day n = days since start + 1
  "labels": {                       // the Codex distractor labels used in this bank
    "<label-id>": { "name": "<Codex name shown under the grid>", "tile": "orange|yellow|purple|blue|red|brown" }
  },
  "days": [                         // days[0] is Day 1, in order; Math and Reading and Writing alternate
    {
      "id": "<Original Problem Bank code>",
      "section": "Math" | "Reading and Writing",
      "passage": "<text, or the Math question>",
      "stem": "<question line, or empty>",
      "choices": ["A", "B", "C", "D"],
      "key": 0-3,
      "labels": ["<label-id>" | null, ...],   // one per choice; null on the key
      "explain": "<about 40 words, plain gate grade 7>",
      "desmos": "<Desmos Strategy Guide technique; Math only>"   // empty on a Math day prints: By hand, Desmos adds nothing here.
    }
  ]
}
```
- Green is reserved for the struck tile and is never a label colour. Six label colours, so each day should use at most three.
- Every question must be VERIFIED in the Original Problem Bank (standing rule 3) before it enters this file.
- If a date has no entry, the page says the Strike is not ready and shows no question.

## The grid
One tile per pick, in pick order. A wrong pick takes its label's colour and the player picks again; the struck pick is green. No letters, no choice text, so neither the grid, the share text nor the image shows the answer. No hearts, no streak, no badges, no leaderboard.

## Share
Copies three lines to the clipboard: the grid as coloured squares, "Daily Strike <day>", and https://scoresamurai.com/strike/. Also saves daily-strike-<day>.png (1080 by 1080, maroon field, tiles, Warrior, scoresamurai.com/strike).

## Local state
localStorage key ss_strike_v1: { first, note, d7, plays: { "YYYY-MM-DD": { n, id, picks, tiles, done, at } } }. Same day shows the finished card. A new day shows the day count (days played, never a streak) and yesterday's grid.

## Measurement (GA4 G-LYZRWG13P3, live domain only; previews log to window.__strikeEvents)
- strike_first_open, strike_open: every visit, with strike_day, days_played, days_since_first
- strike_play: first pick of the day (plays)
- strike_complete: struck, with tries (completions)
- strike_share: with copied and image flags (shares)
- strike_return_d7: once per device, the first visit 7 or more days after the first (day-7 return = strike_return_d7 / strike_first_open for that week)
- strike_diagnostic_click: the Diagnostic link, which also carries utm_source=strike&utm_medium=daily&utm_campaign=strike&utm_content=day<n>
Mark strike_complete and strike_share as key events in GA4 if wanted; that is a settings change and Sensei's hand.
