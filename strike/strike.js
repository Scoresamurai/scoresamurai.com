/* Score Samurai: the Daily Strike.
   One question per Eastern calendar date, the same for everyone, keyed by the bank's start date.
   No account: one localStorage object holds the player's days. A quiet count of days in a row (no grace day,
   no pressure line, archive replays never touch it); no hearts, no badges, no leaderboard. The board, the share text and the share image never show a letter or the answer, and no
   Codex name is shown anywhere: a wrong pick turns its card over to a plain read line in its family's colour.
   Questions come only from strike-bank.json (audited; see README.md for the schema). */
(function () {
  "use strict";
  var KEY = "ss_strike_v1";
  var SITE = "https://scoresamurai.com/strike/";
  var LIVE = location.hostname === "scoresamurai.com";
  var SLOTS = 4;
  var EMOJI = { orange: "🟧", yellow: "🟨", purple: "🟪", blue: "🟦", red: "🟥", brown: "🟫", green: "🟩" };
  var HEX = { orange: "#E07B39", yellow: "#E3B53B", purple: "#8F6BBF", blue: "#5B8BD0", red: "#D9534A", brown: "#A87452", green: "#3F8A4F" };
  var LETTERS = ["A", "B", "C", "D"];
  var MAROON = "#7A0B10", MAROON2 = "#5E080C", WELL = "#4A0509", CREAM = "#F2EBDB", GOLD = "#C9A24A", INK2 = "#5A4D46";
  var KIT_FORM = "10043240"; /* Kit form "Daily Strike": tomorrow's Strike by email */
  var READ_AFTER = 7;        /* the private read opens after this many finished Strikes on this device */
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /* ---------- measurement: GA4 on the live domain only ---------- */
  window.__strikeEvents = [];
  if (LIVE) {
    window.addEventListener("load", function () {
      var s = document.createElement("script"); s.async = true;
      s.src = "https://www.googletagmanager.com/gtag/js?id=G-LYZRWG13P3"; document.head.appendChild(s);
    });
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date()); window.gtag("config", "G-LYZRWG13P3");
  }
  function ev(name, p) {
    window.__strikeEvents.push([name, p || {}]);
    try { if (LIVE && window.gtag) window.gtag("event", name, p || {}); } catch (e) {}
  }

  /* ---------- dates, all on the Eastern calendar ---------- */
  function easternParts(d) {
    var o = {};
    new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" })
      .formatToParts(d).forEach(function (x) { o[x.type] = x.value; });
    return o;
  }
  function easternDate(d) { var p = easternParts(d || new Date()); return p.year + "-" + p.month + "-" + p.day; }
  function toUTC(iso) { var a = iso.split("-"); return Date.UTC(+a[0], +a[1] - 1, +a[2]); }
  function daysBetween(a, b) { return Math.round((toUTC(b) - toUTC(a)) / 86400000); }
  function addDays(iso, n) { return new Date(toUTC(iso) + n * 86400000).toISOString().slice(0, 10); }
  function fmt(iso, opts) { opts.timeZone = "UTC"; return new Intl.DateTimeFormat("en-US", opts).format(new Date(toUTC(iso))); }

  /* ---------- the player's days, on this device only ---------- */
  function load() {
    try { var s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s && s.plays) return s; } catch (e) {}
    return null;
  }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  function daysPlayed(s) { var n = 0; for (var k in s.plays) if (s.plays[k].done) n++; return n; }
  /* days in a row: finished daily Strikes on consecutive Eastern dates, ending today, or yesterday if today is not
     played yet. A missed day ends it. No grace day. Archive replays are not in s.plays, so they never count. */
  function streakOf(s, upto) {
    var d = upto, n = 0;
    if (!(s.plays[d] && s.plays[d].done)) d = addDays(d, -1);
    while (s.plays[d] && s.plays[d].done) { n++; d = addDays(d, -1); }
    return n;
  }
  function tallyText() {
    var played = daysPlayed(state), run = streakOf(state, today), out = [];
    if (played) out.push(played === 1 ? "1 day played" : played + " days played");
    if (run >= 2) out.push(run + " days in a row");
    return out.join(" · ");
  }

  var realToday = easternDate();
  var today = realToday;
  var state = load();
  var isNew = !state;
  if (!state) state = { first: realToday, d7: false, plays: {} };
  if (!state.arch) state.arch = {}; /* archive replays: kept apart from plays, so they never touch the count of days in a row */

  var bank, item, dayNum, labels;
  var mode = "daily", cur = null, todayNum = 0, todayItem = null; /* cur: the Eastern date of the question on the page */

  /* ---------- text: superscript digits are set as real digits, raised, so every glyph comes from the house face ---------- */
  var SUP = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9" };
  function rich(node, text) {
    String(text).split(/([⁰¹²³⁴-⁹]+)/).forEach(function (part, i) {
      if (!part) return;
      if (i % 2) { var s = document.createElement("sup"); s.textContent = part.replace(/./g, function (c) { return SUP[c] || c; }); node.appendChild(s); }
      else node.appendChild(document.createTextNode(part));
    });
    return node;
  }
  function para(text, cls) { return rich(el("p", cls), text); }

  /* the plain one-line reading of a wrong pick; never a Codex name */
  function readOf(i) {
    var r = item.reads && item.reads[i];
    return (typeof r === "string" && r) ? r : "A trap caught that one.";
  }
  function tileOf(i) {
    if (i === item.key) return "green";
    var l = labels[item.labels[i]];
    return (l && HEX[l.tile]) ? l.tile : "brown";
  }

  /* the strike pose, at 800 px for the share image; the page's own two poses load through srcset */
  var warriorImg = null;
  function warrior() {
    if (!warriorImg) {
      warriorImg = new Image(); warriorImg.decoding = "async"; warriorImg.src = "warrior-strike.webp";
      var s = $("wStrike"); if (s) { s.loading = "eager"; if (s.decode) s.decode().catch(function () {}); }
    }
    return warriorImg;
  }

  /* ---------- the board: four slots, one per pick, one object from the first look to the result ---------- */
  function fillBoard(box, tiles) {
    box.innerHTML = "";
    for (var i = 0; i < SLOTS; i++) box.appendChild(el("span", "s" + (tiles[i] ? " t-" + tiles[i] : "")));
  }
  function boardLabel(tiles, done) {
    var caught = tiles.filter(function (t) { return t !== "green"; }).length;
    if (done) return "Your picks: " + tiles.length + (tiles.length === 1 ? " pick" : " picks") + (caught ? ", " + caught + " caught by a trap" : "") + ", the last one struck";
    if (!tiles.length) return "Four empty tiles, one for each pick";
    return "Your picks so far: " + caught + " caught by a trap";
  }
  /* a tile or a card turns over on its edge, takes its new face, and comes back: no bounce */
  function flip(node, apply, axis) {
    var r = axis || "X";
    if (reduce || !node.animate) { apply(); return Promise.resolve(); }
    var applied = false;
    function once() { if (!applied) { applied = true; apply(); } }
    var a = node.animate([{ transform: "rotate" + r + "(0deg)" }, { transform: "rotate" + r + "(90deg)" }], { duration: 150, easing: "ease-in", fill: "forwards" });
    var turn = a.finished.then(function () {
      once();
      var b = node.animate([{ transform: "rotate" + r + "(-90deg)" }, { transform: "rotate" + r + "(0deg)" }], { duration: 180, easing: "ease-out" });
      a.cancel();
      return b.finished;
    }, once);
    /* a page in a background tab holds its animations; the tile still takes its colour and the result still comes */
    return Promise.race([turn, wait(700).then(function () { once(); a.cancel(); })]);
  }

  /* ---------- the question ---------- */
  function displayRest(passage, lines) {
    var t = passage.replace(/^[A-Z][a-z]+(?: [a-z]+)?:\s+/, "");
    for (var i = 0; i < lines.length; i++) {
      if (t.indexOf(lines[i]) !== 0) return null;
      t = t.slice(lines[i].length).replace(/^[;.]\s*/, "");
    }
    return t.trim();
  }
  function renderBody() {
    var box = $("qbody"); box.innerHTML = "";
    var s = item.structured;
    if (s && s.table) {
      var fig = el("figure"), cap = rich(el("figcaption"), s.table.title), wrap = el("div", "tbl"), tb = el("table"), th = el("thead"), tr = el("tr");
      s.table.columns.forEach(function (c) { var x = rich(el("th"), c); x.scope = "col"; tr.appendChild(x); });
      th.appendChild(tr); tb.appendChild(th);
      var body = el("tbody");
      s.table.rows.forEach(function (r) {
        var row = el("tr");
        r.forEach(function (c, j) { var x = rich(el(j ? "td" : "th"), c); if (!j) x.scope = "row"; row.appendChild(x); });
        body.appendChild(row);
      });
      tb.appendChild(body); wrap.appendChild(tb); fig.appendChild(cap); fig.appendChild(wrap); box.appendChild(fig);
      if (s.passage_body) box.appendChild(para(s.passage_body));
      return;
    }
    if (s && s.notes) {
      if (s.notes_intro) box.appendChild(para(s.notes_intro));
      var ul = el("ul", "notes");
      s.notes.forEach(function (n) { ul.appendChild(rich(el("li"), n)); });
      box.appendChild(ul);
      if (s.passage_body) box.appendChild(para(s.passage_body));
      return;
    }
    if (s && s.display) {
      var rest = s.passage_body || displayRest(item.passage, s.display);
      if (rest !== null) {
        var d = el("div", "disp");
        s.display.forEach(function (line) { d.appendChild(rich(el("span"), line)); });
        box.appendChild(d);
        if (rest) box.appendChild(para(rest));
        return;
      }
    }
    box.appendChild(para(item.passage));
  }
  function front(b, i) {
    b.innerHTML = "";
    var l = el("span", "l", LETTERS[i]); l.setAttribute("aria-hidden", "true");
    b.appendChild(l); b.appendChild(rich(el("span", "x"), item.choices[i]));
  }
  function renderQuestion() {
    $("qtag").textContent = item.section;
    $("qday").textContent = "Day " + dayNum;
    renderBody();
    var st = $("qstem"); st.innerHTML = ""; rich(st, item.stem || ""); st.hidden = !item.stem;
    var box = $("qchoices"); box.innerHTML = "";
    item.choices.forEach(function (c, i) {
      var li = el("li");
      var b = el("button", "choice"); b.type = "button"; b.id = "c" + i;
      front(b, i);
      b.setAttribute("aria-label", LETTERS[i] + ". " + b.querySelector(".x").textContent);
      b.addEventListener("click", function () { pick(i); });
      li.appendChild(b); box.appendChild(li);
    });
    $("qcard").hidden = false;
  }

  function store() { return mode === "archive" ? state.arch : state.plays; }
  function playOf() { var st = store(); return st[cur] || (st[cur] = { n: dayNum, id: item.id, picks: [], tiles: [], done: false }); }
  function curPlay() { return store()[cur]; }

  /* the card's other side: a caught card shows only its plain line in the trap colour; the struck card turns green */
  function turnCard(i, done) {
    var b = $("c" + i); if (!b) return;
    var choiceText = (function () { var t = el("span"); rich(t, item.choices[i]); return t.textContent; })();
    if (i === item.key) {
      front(b, i); b.className = "choice won"; b.disabled = true;
      b.setAttribute("aria-label", LETTERS[i] + ", struck. " + choiceText);
      return;
    }
    b.innerHTML = "";
    var l = el("span", "l", LETTERS[i]); l.setAttribute("aria-hidden", "true");
    var x = rich(el("span", "x rd"), readOf(i));
    if (!done) { x.appendChild(document.createTextNode(" ")); x.appendChild(el("b", null, "Pick again.")); }
    b.appendChild(l); b.appendChild(x);
    b.className = "choice caught t-" + tileOf(i); b.disabled = true;
    b.setAttribute("aria-label", LETTERS[i] + ", " + choiceText + ". Caught by a trap: " + readOf(i));
  }
  function lockAll() {
    Array.prototype.forEach.call(document.querySelectorAll(".choice"), function (b) { b.disabled = true; });
    Array.prototype.forEach.call(document.querySelectorAll(".choice .rd b"), function (x) { var p = x.previousSibling; if (p && p.nodeType === 3 && p.nodeValue === " ") p.remove(); x.remove(); });
  }
  function paintAll(p) {
    p.picks.forEach(function (i) { turnCard(i, p.done); });
    if (p.done) lockAll();
    fillBoard($("board"), p.tiles); fillBoard($("mini"), p.tiles);
    $("board").setAttribute("aria-label", boardLabel(p.tiles, p.done));
  }

  function pick(i) {
    var p = playOf();
    if (p.done || p.picks.indexOf(i) >= 0) return;
    if (!p.picks.length) {
      if (mode === "archive") ev("strike_archive_play", { strike_day: dayNum, days_back: todayNum - dayNum, section: item.section });
      else ev("strike_play", { strike_day: dayNum, section: item.section });
      warrior();
    }
    p.picks.push(i); p.tiles.push(tileOf(i));
    var n = p.tiles.length - 1, t = p.tiles[n];
    var slots = [$("board").children[n], $("mini").children[n]];
    var b = $("c" + i);
    b.disabled = true;
    var turns = [
      flip(b, function () { turnCard(i, i === item.key); }, "Y"),
      flip(slots[0], function () { slots[0].className = "s t-" + t; }),
      flip(slots[1], function () { slots[1].className = "s t-" + t; })
    ];
    $("board").setAttribute("aria-label", boardLabel(p.tiles, i === item.key));
    if (i === item.key) {
      p.done = true; p.at = Date.now(); save(state);
      if (mode === "daily") {
        ev("strike_complete", { strike_day: dayNum, tries: p.picks.length, section: item.section });
        ev("strike_streak", { strike_day: dayNum, streak: streakOf(state, today), days_played: daysPlayed(state) });
      }
      prepareShare(p);
      $("msg").textContent = "Struck on pick " + p.picks.length + ".";
      lockAll();
      Promise.all(turns).then(function () { return toTop(); }).then(strike).then(function () { showResult(p, true); });
    } else {
      save(state);
      $("msg").textContent = "Caught. " + readOf(i) + " Pick again.";
    }
  }

  /* ---------- the strike: scroll back to the Warrior, then one slash and the pose swap, under half a second ---------- */
  function toTop() {
    if (window.scrollY < 4) return Promise.resolve();
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    if (reduce) return Promise.resolve();
    return new Promise(function (res) {
      var t0 = Date.now();
      (function check() { if (window.scrollY < 4 || Date.now() - t0 > 700) res(); else requestAnimationFrame(check); })();
    });
  }
  function pose(strikeOn) { if (strikeOn) $("wStrike").loading = "eager"; $("wGuard").hidden = strikeOn; $("wStrike").hidden = !strikeOn; }
  /* the strike pose is fetched once the page has loaded, so it never slows the first look */
  window.addEventListener("load", function () { setTimeout(function () { var s = $("wStrike"); if (s) s.loading = "eager"; }, 0); });
  function strikeReady() {
    var s = $("wStrike"); s.loading = "eager";
    if (s.complete && s.naturalWidth) return Promise.resolve();
    return Promise.race([new Promise(function (r) { s.addEventListener("load", r, { once: true }); s.addEventListener("error", r, { once: true }); }), wait(800)]);
  }
  function strike() {
    return strikeReady().then(strikeNow);
  }
  function strikeNow() {
    var sl = $("slash");
    if (reduce || !sl.animate) { pose(true); return Promise.resolve(); }
    var a = sl.animate([
      { opacity: 0, transform: "rotate(-18deg) scaleX(0)" },
      { opacity: 1, transform: "rotate(-18deg) scaleX(1)", offset: 0.55 },
      { opacity: 0, transform: "rotate(-18deg) scaleX(1)" }
    ], { duration: 300, easing: "ease-out" });
    setTimeout(function () { pose(true); }, 90);
    return Promise.race([a.finished.catch(function () {}), wait(600)]).then(function () { pose(true); return wait(60); });
  }

  /* ---------- the result: the same hero, the day and the pick, the same board, Share ---------- */
  function showResult(p, fresh) {
    var tries = p.picks.length;
    pose(true);
    $("hero").classList.add("struck");
    $("line").hidden = true;
    $("rtitle").textContent = "Day " + dayNum; $("rtitle").hidden = false; $("bline").hidden = false;
    $("rline").textContent = "Struck on pick " + tries; $("rline").hidden = false;
    fillBoard($("board"), p.tiles); fillBoard($("mini"), p.tiles);
    $("board").setAttribute("aria-label", boardLabel(p.tiles, true));
    $("me").hidden = true;
    var tl = mode === "daily" ? tallyText() : "Replay. Your count of days in a row is untouched.";
    $("tally").textContent = tl; $("tally").hidden = !tl;
    $("sharewrap").hidden = false;
    prepareShare(p);
    var lg = $("legend"); lg.innerHTML = ""; var seen = {};
    p.picks.forEach(function (i) {
      if (i === item.key) return;
      var line = readOf(i);
      if (seen[line]) return; seen[line] = 1;
      var li = el("li"); li.appendChild(el("span", "s t-" + tileOf(i))); li.appendChild(rich(el("span"), line)); lg.appendChild(li);
    });
    lg.hidden = !lg.children.length; $("lgh").hidden = lg.hidden;
    var ex = $("explain"); ex.innerHTML = ""; rich(ex, item.explain);
    var d = $("desmos"); d.innerHTML = "";
    if (item.section === "Math") {
      var txt = item.desmos || "By hand, Desmos adds nothing here.";
      var m = /^(Desmos[^:]{0,12}|By hand):\s*/.exec(txt);
      d.appendChild(el("b", null, (m ? m[1] : "Desmos") + ":")); d.appendChild(document.createTextNode(" "));
      rich(d, m ? txt.slice(m[0].length) : txt); d.hidden = false;
    } else d.hidden = true;
    $("after").hidden = false;
    renderRead();
    showMail();
    if (fresh && !reduce) [$("copy"), $("after")].forEach(function (n) { n.classList.remove("settle"); void n.offsetWidth; n.classList.add("settle"); });
  }

  var opensOn = null; /* set before the bank's first day: the countdown runs to it */
  function tick() {
    var now = new Date(), p = easternParts(now), left = 86400 - (+p.hour * 3600 + +p.minute * 60 + +p.second);
    if (opensOn) {
      var ahead = daysBetween(easternDate(now), opensOn) - 1;
      if (ahead < 0) { location.reload(); return; }
      left += ahead * 86400;
    }
    var d = Math.floor(left / 86400), h = Math.floor((left % 86400) / 3600), m = Math.floor((left % 3600) / 60);
    $("next").textContent = (opensOn ? "First Strike in " : "Next Strike in ") + (d ? d + " d " + h + " h" : h + " h " + m + " min");
  }
  setInterval(tick, 30000); /* first tick runs once the bank is in, so the line never shows the wrong countdown */

  /* ---------- the compact bar: shows the board once the big one scrolls away ---------- */
  function watchBar(target) {
    if (!("IntersectionObserver" in window)) return;
    new IntersectionObserver(function (es) { es.forEach(function (x) { $("bar").classList.toggle("show", !x.isIntersecting && x.boundingClientRect.top < 0); }); }).observe(target);
  }

  function renderMe() {
    var me = $("me"), t = tallyText();
    me.textContent = t; me.hidden = !t;
  }

  /* ---------- yesterday's question and its one-line read, under today's board ---------- */
  function firstLine(text) {
    var m = /^(.+?[.!?])(\s+(?=[A-Z“"(])|$)/.exec(String(text).trim());
    return m ? m[1] : String(text).trim();
  }
  function renderYesterday() {
    var box = $("yday");
    if (mode !== "daily" || todayNum < 2 || !bank.days[todayNum - 2]) { box.hidden = true; return; }
    var y = bank.days[todayNum - 2], yd = addDays(today, -1), mine = state.plays[yd];
    $("ydn").textContent = "Day " + (todayNum - 1);
    var yb = $("yboard");
    if (mine && mine.done && mine.tiles && mine.id === y.id) { fillBoard(yb, mine.tiles); yb.setAttribute("aria-label", "Yesterday: struck on pick " + mine.tiles.length); yb.hidden = false; }
    else yb.hidden = true;
    var r = $("yread"); r.innerHTML = ""; rich(r, firstLine(y.explain));
    var q = $("yq"); q.innerHTML = "";
    q.appendChild(el("p", "ysec sc", y.section));
    q.appendChild(para(y.passage));
    if (y.stem) q.appendChild(para(y.stem, "ystem"));
    var ol = el("ul", "ych");
    y.choices.forEach(function (c, i) {
      var li = el("li", i === y.key ? "ykey" : null);
      li.appendChild(el("b", null, LETTERS[i] + ". ")); rich(li, c);
      if (i === y.key) li.appendChild(el("span", "ytag", " The answer"));
      ol.appendChild(li);
    });
    q.appendChild(ol);
    box.hidden = false;
  }

  /* ---------- the private read: the move that costs this player most, after seven Strikes, on this device only ---------- */
  var moves = null;
  function loadMoves() {
    if (!moves) moves = fetch("strike-moves.json", { credentials: "same-origin" }).then(function (r) { return r.json(); }).then(function (j) { return j.moves || {}; }).catch(function () { return {}; });
    return moves;
  }
  function finished() {
    var out = [];
    [state.plays, state.arch].forEach(function (st) {
      for (var d in st) {
        var p = st[d]; if (!p.done) continue;
        var it = bank.days[p.n - 1]; if (!it || it.id !== p.id) continue;
        out.push({ at: p.at || 0, it: it, p: p });
      }
    });
    return out;
  }
  function renderRead() {
    var box = $("myread"), all = finished();
    $("mvdiag").href = "https://scoresamurai.com/diagnostic/?utm_source=strike&utm_medium=daily&utm_campaign=strike&utm_content=read";
    if (all.length < READ_AFTER) {
      $("mv").textContent = "Opens after " + READ_AFTER + " Strikes on this device. So far: " + all.length + ".";
      $("mvm").hidden = true; box.hidden = false; return;
    }
    var count = {}, last = {};
    all.forEach(function (x) {
      x.p.picks.forEach(function (i) {
        var l = x.it.labels[i]; if (!l) return;
        count[l] = (count[l] || 0) + 1; if (!last[l] || x.at > last[l]) last[l] = x.at;
      });
    });
    var top = null;
    for (var l in count) if (!top || count[l] > count[top] || (count[l] === count[top] && last[l] > last[top])) top = l;
    loadMoves().then(function (m) {
      var mv = $("mv"); mv.innerHTML = "";
      if (!top || !m[top]) { mv.textContent = "No move has caught you more than the others yet. Keep playing and it shows up here."; $("mvm").hidden = true; box.hidden = false; return; }
      mv.appendChild(el("b", null, m[top].move)); mv.appendChild(document.createTextNode(" " + m[top].fix));
      $("mvm").textContent = "It caught you " + (count[top] === 1 ? "once" : count[top] + " times") + " in " + all.length + " Strikes. Read as of " + fmt(realToday, { month: "short", day: "numeric" }) + ". Only you see this.";
      $("mvm").hidden = false; box.hidden = false;
    });
  }

  /* ---------- tomorrow's Strike by email, through the Kit form ---------- */
  function showMail(pre) {
    $("mailh").textContent = pre ? "The first Strike by email" : "Tomorrow's Strike by email";
    $("mline").textContent = pre ? "One short email on " + fmt(bank.start, { month: "long", day: "numeric" }) + " when the first Strike is up, then one each morning. Unsubscribe in one click."
                                 : "One short email each morning when the new Strike is up. Unsubscribe in one click.";
    $("mail").hidden = false;
  }
  function mailSubmit(e) {
    e.preventDefault();
    var input = $("mailIn"), out = $("mailOut"), v = input.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { out.textContent = "That email address doesn't look right."; input.focus(); return; }
    var f = new FormData(); f.append("email_address", v);
    var btn = $("mailBtn"); btn.disabled = true; out.textContent = "Sending...";
    fetch("https://app.kit.com/forms/" + KIT_FORM + "/subscriptions", { method: "POST", mode: "no-cors", body: f })
      .then(function () { out.textContent = "Almost there. Check your inbox and tap Confirm."; $("mailForm").hidden = true; },
            function () { out.textContent = "That didn't go through. Try again in a minute."; btn.disabled = false; });
  }

  /* ---------- the archive: replay any past day; replays live apart and never touch the count of days in a row ---------- */
  function renderArchive() {
    var box = $("arch"), list = $("alist");
    if (todayNum < 2) { box.hidden = true; return; }
    list.innerHTML = "";
    for (var n = todayNum - 1; n >= 1; n--) {
      var d = addDays(bank.start, n - 1), it = bank.days[n - 1];
      if (!it) continue;
      var li = el("li"), b = el("button", "aday"); b.type = "button";
      b.appendChild(el("span", "an", "Day " + n));
      b.appendChild(el("span", "ad", fmt(d, { weekday: "short", month: "short", day: "numeric" })));
      var mine = state.plays[d], rep = state.arch[d], show = (mine && mine.done && mine.id === it.id) ? mine : (rep && rep.done && rep.id === it.id) ? rep : null;
      if (show) { var g = el("span", "board"); fillBoard(g, show.tiles); g.setAttribute("aria-hidden", "true"); b.appendChild(g); }
      b.setAttribute("aria-label", "Replay Day " + n + ", " + fmt(d, { weekday: "long", month: "long", day: "numeric" }) + (show ? ", played" : ""));
      (function (k) { b.addEventListener("click", function () { replay(k); }); })(n);
      li.appendChild(b); list.appendChild(li);
    }
    box.hidden = !list.children.length;
    /* the newest fourteen first; the rest stay one tap away so the page never turns into a long list */
    var more = $("amore"), extra = list.children.length - 14;
    Array.prototype.forEach.call(list.children, function (li, i) { li.hidden = i >= 14; });
    more.hidden = extra <= 0;
    if (extra > 0) more.textContent = "Show all " + list.children.length + " days";
  }
  function replay(n) {
    mode = "archive"; dayNum = n; cur = addDays(bank.start, n - 1); item = bank.days[n - 1];
    delete state.arch[cur]; save(state);
    shareFile = null; sharePending = null;
    $("hero").classList.remove("struck"); pose(false);
    ["rtitle", "bline", "rline", "tally", "sharewrap", "me", "yday", "after", "mail", "myread"].forEach(function (k) { $(k).hidden = true; });
    $("line").hidden = false; $("shared").textContent = ""; $("mailForm").hidden = false;
    $("dateline").textContent = "Replay · Day " + n + " · " + fmt(cur, { weekday: "short", month: "short", day: "numeric" });
    $("abar").hidden = false; $("abarDay").textContent = "Day " + n;
    $("diagLink").href = "https://scoresamurai.com/diagnostic/?utm_source=strike&utm_medium=daily&utm_campaign=strike&utm_content=day" + n;
    fillBoard($("board"), []); fillBoard($("mini"), []);
    $("board").setAttribute("aria-label", boardLabel([], false));
    renderQuestion();
    window.scrollTo({ top: 0, behavior: "auto" });
    $("qtag").focus && $("qtag").setAttribute("tabindex", "-1");
  }

  /* ---------- share: text to the clipboard, a square image to the device ---------- */
  function shareText(p) {
    return p.tiles.map(function (t) { return EMOJI[t] || EMOJI.brown; }).join("") + "\nDaily Strike " + dayNum + "\n" + SITE;
  }
  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (res, rej) {
      var t = document.createElement("textarea"); t.value = text; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0";
      document.body.appendChild(t); t.select();
      try { document.execCommand("copy") ? res() : rej(); } catch (e) { rej(e); } document.body.removeChild(t);
    });
  }
  function spaced(x, text, cx, y, track) {
    var w = 0, i, ws = [];
    for (i = 0; i < text.length; i++) { ws.push(x.measureText(text[i]).width); w += ws[i] + (i < text.length - 1 ? track : 0); }
    var px = cx - w / 2; x.textAlign = "left";
    var left = px;
    for (i = 0; i < text.length; i++) { x.fillText(text[i], px, y); px += ws[i] + track; }
    return [left, w];
  }
  function rrect(x, px, py, w, h, r) { x.beginPath(); x.moveTo(px + r, py); x.arcTo(px + w, py, px + w, py + h, r); x.arcTo(px + w, py + h, px, py + h, r); x.arcTo(px, py + h, px, py, r); x.arcTo(px, py, px + w, py, r); x.closePath(); }
  /* The share image is the result card, square: the Warrior standing on the maroon floor, "Daily Strike, Day N",
     the pick line, the board and the URL. No letter, no choice text, no answer, no trap name.
     The Warrior is drawn at 510 px from its 800 px source, never up. */
  /* Playfair's default figures are old-style, and a canvas cannot ask for lining ones, so the share image uses a
     small cut of the same face whose digits are its own lining figures (strike-lining.woff2, built from playfair-display-600). */
  var liningFace = null;
  function lining() {
    if (liningFace) return liningFace;
    liningFace = (window.FontFace ? new FontFace("Strike Lining", "url(strike-lining.woff2)", { weight: "600" }).load().then(function (f) { document.fonts.add(f); }) : Promise.resolve()).catch(function () {});
    return liningFace;
  }
  var HEAD = '"Strike Lining", "Playfair Display", Georgia, serif';
  function drawBoard(x, tiles, S) {
    var size = 116, gap = 20, pad = 18, bw = SLOTS * size + (SLOTS - 1) * gap + pad * 2, bh = size + pad * 2, bx = Math.round((S - bw) / 2), by = 830;
    rrect(x, bx, by, bw, bh, 14); x.fillStyle = MAROON2; x.fill();
    x.save(); rrect(x, bx, by, bw, bh, 14); x.clip();
    var g = x.createLinearGradient(0, by, 0, by + 14); g.addColorStop(0, "rgba(0,0,0,0.45)"); g.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = g; x.fillRect(bx, by, bw, 14);
    x.restore();
    rrect(x, bx + 1, by + 1, bw - 2, bh - 2, 13); x.strokeStyle = "rgba(201,162,74,0.75)"; x.lineWidth = 2; x.stroke();
    for (var i = 0; i < SLOTS; i++) {
      var px = bx + pad + i * (size + gap), py = by + pad, t = tiles[i];
      x.save(); rrect(x, px, py, size, size, 9); x.clip();
      if (t) {
        x.fillStyle = HEX[t] || HEX.brown; x.fillRect(px, py, size, size);
        x.fillStyle = "rgba(255,255,255,0.28)"; x.fillRect(px, py, size, 6);
        x.fillStyle = "rgba(0,0,0,0.22)"; x.fillRect(px, py + size - 8, size, 8);
      } else {
        x.fillStyle = WELL; x.fillRect(px, py, size, size);
        var s = x.createLinearGradient(0, py, 0, py + 16); s.addColorStop(0, "rgba(0,0,0,0.5)"); s.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = s; x.fillRect(px, py, size, 16);
      }
      x.restore();
      rrect(x, px + 1, py + 1, size - 2, size - 2, 8); x.strokeStyle = t ? "rgba(201,162,74,0.9)" : "rgba(201,162,74,0.45)"; x.lineWidth = 2; x.stroke();
    }
  }
  function image(p) {
    var S = 1080, c = document.createElement("canvas"); c.width = S; c.height = S; var x = c.getContext("2d");
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = "high";
    var w = warrior();
    var ready = new Promise(function (res) { if (w.complete && w.naturalWidth) res(); else { w.addEventListener("load", res, { once: true }); w.addEventListener("error", res, { once: true }); } });
    var fonts = document.fonts ? Promise.all([lining(), document.fonts.load('600 80px "Playfair Display"'), document.fonts.load('28px "Playfair Display SC"')]).catch(function () {}) : Promise.resolve();
    return Promise.all([ready, fonts]).then(function () {
      return new Promise(function (res) {
        var FLOOR = 600;
        x.fillStyle = CREAM; x.fillRect(0, 0, S, FLOOR);
        x.fillStyle = MAROON; x.fillRect(0, FLOOR, S, S - FLOOR);
        x.textBaseline = "alphabetic";
        x.fillStyle = INK2; x.font = '28px "Playfair Display SC", Georgia, serif';
        var wm = spaced(x, "SCORE SAMURAI", S / 2, 82, 6);
        /* the belt line: gold, 5 percent of the cap height thick, 47 percent of it under the baseline, the width of the word */
        x.fillStyle = GOLD; x.fillRect(Math.round(wm[0]), 82 + 9, Math.round(wm[1]), 2);
        if (w.naturalWidth) { var wh = 510, ww = Math.round(w.naturalWidth * wh / w.naturalHeight); x.drawImage(w, Math.round((S - ww) / 2), 104, ww, wh); }
        x.textAlign = "center";
        var head = "Daily Strike, Day " + dayNum, fs = 80;
        x.font = "600 " + fs + "px " + HEAD;
        while (x.measureText(head).width > 960 && fs > 56) { fs -= 2; x.font = "600 " + fs + "px " + HEAD; }
        x.fillStyle = CREAM; x.fillText(head, S / 2, 696);
        x.fillStyle = "#E9DCC0"; x.font = "italic 600 30px \"Playfair Display\", Georgia, serif";
        x.fillText("The SAT is a discipline. Master it in The Dojo.", S / 2, 746);
        x.fillStyle = GOLD; x.font = "600 42px " + HEAD;
        x.fillText("Struck on pick " + p.tiles.length, S / 2, 800);
        drawBoard(x, p.tiles, S);
        x.fillStyle = GOLD; x.font = '28px "Playfair Display SC", Georgia, serif';
        spaced(x, "scoresamurai.com/strike", S / 2, 1042, 3);
        c.toBlob(function (b) { res(b); }, "image/png");
      });
    });
  }
  function saveImage(blob) {
    var u = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = u; a.download = "daily-strike-" + dayNum + ".png"; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
  }
  /* The image is drawn as soon as the strike lands, so a tap on Share can open the phone's share sheet at once:
     iOS only opens it from the tap itself, not after the page has waited on a drawing. */
  var shareFile = null, sharePending = null;
  function prepareShare(p) {
    if (sharePending) return sharePending;
    sharePending = image(p).then(function (b) {
      if (b && window.File) { try { shareFile = new File([b], "daily-strike-" + dayNum + ".png", { type: "image/png" }); } catch (e) { shareFile = null; } }
      return b;
    }, function () { return null; });
    return sharePending;
  }
  function canSheet() {
    try { return !!(shareFile && navigator.share && navigator.canShare && navigator.canShare({ files: [shareFile] })); } catch (e) { return false; }
  }
  function sharedEv(p, method, copied, img) {
    ev("strike_share", { strike_day: dayNum, tries: p.picks.length, method: method, copied: copied, image: img, archive: mode === "archive" });
  }
  function share() {
    var p = curPlay(); if (!p || !p.done) return;
    var out = $("shared"), text = shareText(p);
    if (canSheet()) {
      /* called straight from the tap, with the image already drawn */
      navigator.share({ files: [shareFile], text: text, title: "Daily Strike " + dayNum }).then(function () {
        out.textContent = "Shared."; sharedEv(p, "sheet", false, true);
      }, function (e) {
        if (e && e.name === "AbortError") { out.textContent = ""; return; }
        fallback(p, text);
      });
      return;
    }
    fallback(p, text);
  }
  function fallback(p, text) {
    var out = $("shared"), ok = [];
    copy(text).then(function () { ok.push("copied"); }, function () {}).then(function () {
      return shareFile || prepareShare(p);
    }).then(function (b) { if (b) { saveImage(b); ok.push("image"); } }, function () {}).then(function () {
      out.textContent = ok.indexOf("copied") >= 0 ? (ok.indexOf("image") >= 0 ? "Grid copied. Image saved." : "Grid copied.") : (ok.indexOf("image") >= 0 ? "Image saved." : "Copy did not work on this browser.");
      sharedEv(p, "download", ok.indexOf("copied") >= 0, ok.indexOf("image") >= 0);
    });
  }
  function copyResult() {
    var p = curPlay(); if (!p || !p.done) return;
    var out = $("shared");
    copy(shareText(p)).then(function () { out.textContent = "Result copied."; sharedEv(p, "copy", true, false); },
                           function () { out.textContent = "Copy did not work on this browser."; });
  }

  /* ---------- start ---------- */
  function start(b) {
    bank = b; labels = b.labels || {};
    /* Previews only (never on scoresamurai.com): ?day=N opens day N of the bank, so the bank can be read before it starts. */
    if (!LIVE) {
      var q = /[?&]day=(\d{1,3})\b/.exec(location.search);
      if (q && +q[1] >= 1 && +q[1] <= b.days.length) today = addDays(b.start, +q[1] - 1);
    }
    dayNum = daysBetween(b.start, today) + 1;
    item = (dayNum >= 1 && b.days[dayNum - 1]) || null;
    for (var i = 1; i < b.days.length; i++) if (b.days[i].section === b.days[i - 1].section) console.warn("strike-bank: day " + (i + 1) + " repeats " + b.days[i].section);

    var since = daysBetween(state.first, realToday);
    ev(isNew ? "strike_first_open" : "strike_open", { strike_day: dayNum, days_played: daysPlayed(state), days_since_first: since });
    if (!isNew && since >= 7 && !state.d7) { state.d7 = true; ev("strike_return_d7", { strike_day: dayNum, days_since_first: since, days_played: daysPlayed(state) }); }
    save(state);

    fillBoard($("board"), []); fillBoard($("mini"), []);
    tick();
    if (!item && dayNum < 1) {
      /* before the bank's first day: the Warrior, the empty board, the opening date, and the countdown in the footer line */
      opensOn = b.start; tick();
      $("hero").classList.add("pre"); document.querySelector(".stage").classList.add("pre");
      $("dateline").textContent = fmt(today, { weekday: "short", month: "short", day: "numeric" });
      $("rline").textContent = "First Strike lands " + fmt(b.start, { weekday: "long", month: "long", day: "numeric" });
      $("rline").hidden = false;
      $("sheet").hidden = true;
      renderMe(); showMail(true); return;
    }
    if (!item) {
      $("board").hidden = true;
      $("empty").hidden = false; renderMe(); return;
    }
    $("dateline").textContent = "Day " + dayNum + " · " + fmt(today, { weekday: "short", month: "short", day: "numeric" });
    $("diagLink").href = "https://scoresamurai.com/diagnostic/?utm_source=strike&utm_medium=daily&utm_campaign=strike&utm_content=day" + dayNum;
    todayNum = dayNum; todayItem = item; cur = today;
    renderMe();
    renderYesterday();
    renderQuestion();
    renderArchive();
    watchBar($("board"));
    var p = state.plays[today];
    if (p && p.id !== item.id) { delete state.plays[today]; p = null; save(state); }
    if (p) { paintAll(p); if (p.done) showResult(p, false); }
  }

  $("shareBtn").addEventListener("click", share);
  $("copyBtn").addEventListener("click", copyResult);
  $("backToday").addEventListener("click", function () { location.reload(); });
  $("amore").addEventListener("click", function () { Array.prototype.forEach.call($("alist").children, function (li) { li.hidden = false; }); $("amore").hidden = true; });
  $("mailForm").addEventListener("submit", mailSubmit);
  $("diagLink").addEventListener("click", function () { ev("strike_diagnostic_click", { strike_day: dayNum, place: "footer" }); });
  $("mvdiag").addEventListener("click", function () { ev("strike_diagnostic_click", { strike_day: dayNum, place: "read" }); });

  fetch("strike-bank.json", { credentials: "same-origin" }).then(function (r) { return r.json(); }).then(start).catch(function () { $("empty").hidden = false; tick(); });
})();
