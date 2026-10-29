/* Score Samurai: the Daily Strike.
   One question per Eastern calendar date, the same for everyone, keyed by the bank's start date.
   No account: one localStorage object holds the player's days. No hearts, no streak penalty, no badges,
   no leaderboard. The board, the share text and the share image never show a letter or the answer, and no
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

  var realToday = easternDate();
  var today = realToday;
  var state = load();
  var isNew = !state;
  if (!state) state = { first: realToday, d7: false, plays: {} };

  var bank, item, dayNum, labels;

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
    var a = node.animate([{ transform: "rotate" + r + "(0deg)" }, { transform: "rotate" + r + "(90deg)" }], { duration: 150, easing: "ease-in", fill: "forwards" });
    return a.finished.then(function () {
      apply();
      var b = node.animate([{ transform: "rotate" + r + "(-90deg)" }, { transform: "rotate" + r + "(0deg)" }], { duration: 180, easing: "ease-out" });
      a.cancel();
      return b.finished;
    }, function () { apply(); });
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

  function playOf() { return state.plays[today] || (state.plays[today] = { n: dayNum, id: item.id, picks: [], tiles: [], done: false }); }

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
    if (!p.picks.length) { ev("strike_play", { strike_day: dayNum, section: item.section }); warrior(); }
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
      ev("strike_complete", { strike_day: dayNum, tries: p.picks.length, section: item.section });
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
    return a.finished.catch(function () {}).then(function () { return wait(60); });
  }

  /* ---------- the result: the same hero, the day and the pick, the same board, Share ---------- */
  function showResult(p, fresh) {
    var tries = p.picks.length;
    pose(true);
    $("hero").classList.add("struck");
    $("line").hidden = true;
    $("rtitle").textContent = "Day " + dayNum; $("rtitle").hidden = false;
    $("rline").textContent = "Struck on pick " + tries; $("rline").hidden = false;
    fillBoard($("board"), p.tiles); fillBoard($("mini"), p.tiles);
    $("board").setAttribute("aria-label", boardLabel(p.tiles, true));
    $("me").hidden = true;
    $("sharewrap").hidden = false;
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
    if (fresh && !reduce) [$("copy"), $("after")].forEach(function (n) { n.classList.remove("settle"); void n.offsetWidth; n.classList.add("settle"); });
  }

  function tick() {
    var p = easternParts(new Date()), left = 86400 - (+p.hour * 3600 + +p.minute * 60 + +p.second);
    var h = Math.floor(left / 3600), m = Math.floor((left % 3600) / 60);
    $("next").textContent = "Next Strike in " + h + " h " + m + " min";
  }
  tick(); setInterval(tick, 30000);

  /* ---------- the compact bar: shows the board once the big one scrolls away ---------- */
  function watchBar(target) {
    if (!("IntersectionObserver" in window)) return;
    new IntersectionObserver(function (es) { es.forEach(function (x) { $("bar").classList.toggle("show", !x.isIntersecting && x.boundingClientRect.top < 0); }); }).observe(target);
  }

  function renderMe() {
    var me = $("me"), played = daysPlayed(state), y = state.plays[addDays(today, -1)];
    if (!played && !(y && y.done)) { me.hidden = true; return; }
    me.innerHTML = "";
    if (played) me.appendChild(el("span", null, played === 1 ? "1 day played" : played + " days played"));
    if (y && y.done && y.tiles) {
      var w = el("span", "yd"); w.appendChild(document.createTextNode("Yesterday"));
      var g = el("span", "board"); g.setAttribute("role", "img"); g.setAttribute("aria-label", "Yesterday: struck on pick " + y.tiles.length);
      fillBoard(g, y.tiles); w.appendChild(g); me.appendChild(w);
    }
    me.hidden = false;
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
    for (i = 0; i < text.length; i++) { x.fillText(text[i], px, y); px += ws[i] + track; }
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
    var size = 116, gap = 20, pad = 18, bw = SLOTS * size + (SLOTS - 1) * gap + pad * 2, bh = size + pad * 2, bx = Math.round((S - bw) / 2), by = 818;
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
        spaced(x, "Score Samurai", S / 2, 82, 6);
        if (w.naturalWidth) { var wh = 510, ww = Math.round(w.naturalWidth * wh / w.naturalHeight); x.drawImage(w, Math.round((S - ww) / 2), 104, ww, wh); }
        x.textAlign = "center";
        var head = "Daily Strike, Day " + dayNum, fs = 80;
        x.font = "600 " + fs + "px " + HEAD;
        while (x.measureText(head).width > 960 && fs > 56) { fs -= 2; x.font = "600 " + fs + "px " + HEAD; }
        x.fillStyle = CREAM; x.fillText(head, S / 2, 708);
        x.fillStyle = GOLD; x.font = "600 48px " + HEAD;
        x.fillText("Struck on pick " + p.tiles.length, S / 2, 784);
        drawBoard(x, p.tiles, S);
        x.fillStyle = GOLD; x.font = '28px "Playfair Display SC", Georgia, serif';
        spaced(x, "scoresamurai.com/strike", S / 2, 1036, 3);
        c.toBlob(function (b) { res(b); }, "image/png");
      });
    });
  }
  function saveImage(blob) {
    var u = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = u; a.download = "daily-strike-" + dayNum + ".png"; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
  }
  function share() {
    var p = state.plays[today]; if (!p || !p.done) return;
    var out = $("shared"); var ok = [];
    copy(shareText(p)).then(function () { ok.push("copied"); }, function () {}).then(function () {
      return image(p);
    }).then(function (b) { if (b) { saveImage(b); ok.push("image"); } }, function () {}).then(function () {
      out.textContent = ok.indexOf("copied") >= 0 ? (ok.indexOf("image") >= 0 ? "Grid copied. Image saved." : "Grid copied.") : (ok.indexOf("image") >= 0 ? "Image saved." : "Copy did not work on this browser.");
      ev("strike_share", { strike_day: dayNum, tries: p.picks.length, copied: ok.indexOf("copied") >= 0, image: ok.indexOf("image") >= 0 });
    });
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
    if (!item) {
      $("board").hidden = true;
      if (dayNum < 1) $("emptyText").textContent = "The first Daily Strike opens on " + fmt(b.start, { weekday: "long", month: "long", day: "numeric" }) + ".";
      $("empty").hidden = false; renderMe(); return;
    }
    $("dateline").textContent = "Day " + dayNum + " · " + fmt(today, { weekday: "short", month: "short", day: "numeric" });
    $("diagLink").href = "https://scoresamurai.com/diagnostic/?utm_source=strike&utm_medium=daily&utm_campaign=strike&utm_content=day" + dayNum;
    renderMe();
    renderQuestion();
    watchBar($("board"));
    var p = state.plays[today];
    if (p && p.id !== item.id) { delete state.plays[today]; p = null; save(state); }
    if (p) { paintAll(p); if (p.done) showResult(p, false); }
  }

  $("shareBtn").addEventListener("click", share);
  $("diagLink").addEventListener("click", function () { ev("strike_diagnostic_click", { strike_day: dayNum }); });

  fetch("strike-bank.json", { credentials: "same-origin" }).then(function (r) { return r.json(); }).then(start).catch(function () { $("empty").hidden = false; });
})();
