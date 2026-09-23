# Score Samurai site v4, build notes for Cowork

Static site. No framework, no build step. Deploy the folder as-is to GitHub Pages (repo root, custom domain scoresamurai.com, CNAME file = scoresamurai.com). Carrd site stays untouched as rollback.

## Files
- index.html, site.css, warrior.png (add from Brand v3 / 07 Social profile-picture-800x800.png; also export og.png 1200x630 from the lockup)
- trap.js: the live trap on the home page (five Trap Map spread questions, Sensei-solved)
- belt/index.html + belt.js: "Which belt are you", the ten Trap Map Mini Diagnostic questions, Sensei-solved
- diagnostic/index.html + diag.js: the three-screen intake, seventeen fields, same list and order as the TutorBird widget
- apps-script/Code.gs: the intake endpoint (deploy from senseijay@ as a Web App, Execute as Me, access Anyone; paste the URL into diag.js ENDPOINT)
- privacy/index.html: port the live privacy section verbatim into the site.css shell (not included here)
- sat-punctuation/, sat-vocabulary-in-context/, sat-reading-answer-choices/, sat-math-wrong-answer/, sat-inequality-tables/, sat-score-report/: the six search pages already built on Sep 22, re-shelled in site.css with the shared header and footer
- sitemap.xml, robots.txt

## Slots marked in the HTML (search for "EMBED:" and "OPTIONS:")
1. ga4-gtag: paste the live embed unchanged.
2. ga4-events: paste the live embed unchanged (.js-tb hook fires diagnostic_open; the Kit MutationObserver needs the Kit form present on the page).
3. jsonld-schema: paste the live embed unchanged; add "url" for /belt/ and /diagnostic/ only if the schema has a hasPart list; otherwise leave.
4. pinterest p:domain_verify meta: copy from the live head.
5. Kit form 9907591 in the Trap Map card (#trapmap): paste the live Kit embed; style its input with `.tm input` and its button with `.btn`.
6. diagnostic/index.html target test date OPTIONS: copy the live TutorBird dropdown's options in order.
7. The requirement FAQ answer (COPY: marker): paste the live verbatim answer.

## Rules that hold
- No em dashes anywhere. No price, session count or week count on any page (ruling 15). No "your kid". No named college as a placement.
- Every question in trap.js and belt.js is from The Trap Map, which Sensei solved. Add no other question without his personal solve (standing rule 3).
- The About section, hero lines, Method, cards, Dojo Ranks and For Parents are ruled copy: verbatim.

## Checks before the domain moves
- axe-core: zero violations on every page. Lighthouse mobile: accessibility 95+, performance 90+.
- Every fold opens by keyboard. Every button has a visible focus ring.
- diag.js: submit a test intake with senseijay+static1@scoresamurai.com; confirm the sheet row, the Sensei email and the family confirmation arrive.
- belt.js: answer all ten correctly and see "Green, working toward Blue"; miss Q1 and Q5 and see Trap 1 named.
- trap.js: each of the five cards reveals the trap on a wrong pick and "Clean" on the right one.
- 390 and 1280: no horizontal overflow on any page.

## DNS move (SiteGround, Sensei signed in)
- A records for scoresamurai.com to GitHub Pages' four IPs; CNAME www to <user>.github.io; MX untouched; Kit CNAMEs untouched; Pinterest and GA4 unaffected.
- Enforce HTTPS in the repo's Pages settings after the certificate issues.
- Rollback: put the Carrd records back. The Carrd site is never deleted.
