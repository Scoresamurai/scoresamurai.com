/* Score Samurai: the Daily Strike.
   One question per Eastern calendar date, the same for everyone, keyed by the bank's start date.
   No account: one localStorage object holds the player's days. No hearts, no streak penalty, no badges,
   no leaderboard. The grid and the share text never show the answer.
   Questions come only from strike-bank.json (audited; see README.md for the schema). */
(function () {
  "use strict";
  var KEY = "ss_strike_v1";
  var SITE = "https://scoresamurai.com/strike/";
  var LIVE = location.hostname === "scoresamurai.com";
  var EMOJI = { orange: "🟧", yellow: "🟨", purple: "🟪", blue: "🟦", red: "🟥", brown: "🟫", green: "🟩" };
  var HEX = { orange: "#D9772B", yellow: "#E3B53B", purple: "#7E57A8", blue: "#3C6FB0", red: "#C23B32", brown: "#8A5A3B", green: "#3F8A4F" };
  var LETTERS = ["A", "B", "C", "D"];

  function $(id) { return document.getElementById(id); }

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
  function addDays(iso, n) { var t = new Date(toUTC(iso) + n * 86400000); return t.toISOString().slice(0, 10); }

  /* ---------- the player's days, on this device only ---------- */
  function load() {
    try { var s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s && s.plays) return s; } catch (e) {}
    return null;
  }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  function daysPlayed(s) { var n = 0; for (var k in s.plays) if (s.plays[k].done) n++; return n; }

  var today = easternDate();
  var state = load();
  var isNew = !state;
  if (!state) state = { first: today, d7: false, plays: {} };

  var bank, item, dayNum, labels;

  /* the plain one-line reading of a wrong pick; never a Codex name */
  function readOf(i) {
    var r = item.reads && item.reads[i];
    return (typeof r === "string" && r) ? r : "A trap caught that one.";
  }
  var warriorImg = null;
  function warrior() {
    if (!warriorImg) { warriorImg = new Image(); warriorImg.decoding = "async"; warriorImg.src = "warrior-strike.webp"; }
    return warriorImg;
  }

  function tileOf(i) {
    if (i === item.key) return "green";
    var l = labels[item.labels[i]];
    return (l && HEX[l.tile]) ? l.tile : "brown";
  }

  function renderMe() {
    var me = $("me"), played = daysPlayed(state), y = state.plays[addDays(today, -1)];
    if (!played && !y) { me.hidden = true; return; }
    me.innerHTML = "";
    if (played) {
      var c = document.createElement("span"); c.className = "chip";
      c.textContent = played === 1 ? "1 day played" : played + " days played";
      me.appendChild(c);
    }
    if (y && y.done && y.tiles) {
      var c2 = document.createElement("span"); c2.className = "chip";
      c2.appendChild(document.createTextNode("Yesterday"));
      c2.appendChild(gridEl(y.tiles, "Yesterday's grid: " + y.tiles.length + (y.tiles.length === 1 ? " pick" : " picks")));
      me.appendChild(c2);
    }
    me.hidden = false;
  }

  function gridEl(tiles, label) {
    var g = document.createElement("span"); g.className = "grid"; g.setAttribute("role", "img"); g.setAttribute("aria-label", label);
    tiles.forEach(function (t) { var s = document.createElement("span"); s.className = "tile t-" + t; g.appendChild(s); });
    return g;
  }

  function renderQuestion() {
    $("hdrDay").textContent = "Day " + dayNum;
    $("qtag").textContent = item.section + " · Day " + dayNum;
    $("qpassage").textContent = item.passage;
    $("qstem").textContent = item.stem || "";
    $("qstem").hidden = !item.stem;
    var box = $("qchoices"); box.innerHTML = "";
    item.choices.forEach(function (c, i) {
      var li = document.createElement("li");
      var b = document.createElement("button"); b.type = "button"; b.className = "choice"; b.id = "c" + i;
      b.innerHTML = '<span class="ltr"></span><span class="txt"></span>';
      b.querySelector(".ltr").textContent = LETTERS[i];
      b.querySelector(".txt").textContent = c;
      b.addEventListener("click", function () { pick(i); });
      li.appendChild(b); box.appendChild(li);
    });
    $("qcard").hidden = false;
  }

  function playOf() { return state.plays[today] || (state.plays[today] = { n: dayNum, id: item.id, picks: [], tiles: [], done: false }); }

  function paintPicks(p) {
    p.picks.forEach(function (i) {
      var b = $("c" + i); if (!b) return;
      if (i === item.key) { b.classList.add("won"); }
      else { b.classList.add("caught"); b.querySelector(".ltr").className = "ltr t-" + tileOf(i); b.disabled = true; b.setAttribute("aria-label", LETTERS[i] + ", caught by a trap"); }
    });
    if (p.done) Array.prototype.forEach.call(document.querySelectorAll(".choice"), function (b) { b.disabled = true; });
  }

  function pick(i) {
    var p = playOf();
    if (p.done || p.picks.indexOf(i) >= 0) return;
    if (!p.picks.length) { ev("strike_play", { strike_day: dayNum, section: item.section }); warrior(); }
    p.picks.push(i); p.tiles.push(tileOf(i));
    if (i === item.key) {
      p.done = true; p.at = Date.now(); save(state);
      paintPicks(p);
      $("msg").textContent = "Struck.";
      ev("strike_complete", { strike_day: dayNum, tries: p.picks.length, section: item.section });
      renderResult(p, true);
    } else {
      save(state); paintPicks(p);
      $("msg").textContent = readOf(i) + " Pick again.";
    }
  }

  function renderResult(p, fresh) {
    var tries = p.picks.length;
    $("rtitle").textContent = "Day " + dayNum;
    $("rline").textContent = "Struck on pick " + tries;
    var g = $("rgrid"); g.innerHTML = "";
    p.tiles.forEach(function (t) { var s = document.createElement("span"); s.className = "tile t-" + t; g.appendChild(s); });
    g.setAttribute("aria-label", "Your grid: " + tries + (tries === 1 ? " pick" : " picks") + ", the last one struck");
    var lg = $("legend"); lg.innerHTML = ""; var seen = {};
    p.picks.forEach(function (i) {
      if (i === item.key) return;
      var name = readOf(i);
      if (seen[name]) return; seen[name] = 1;
      var li = document.createElement("li"); var s = document.createElement("span"); s.className = "tile t-" + tileOf(i);
      li.appendChild(s); li.appendChild(document.createTextNode(name)); lg.appendChild(li);
    });
    lg.hidden = !lg.children.length;
    $("explain").textContent = item.explain;
    var d = $("desmos");
    if (item.section === "Math") {
      d.innerHTML = "<b>Desmos:</b> "; d.appendChild(document.createTextNode(item.desmos || "By hand, Desmos adds nothing here.")); d.hidden = false;
    } else d.hidden = true;
    var a = $("diagLink"); a.href = "https://scoresamurai.com/diagnostic/?utm_source=strike&utm_medium=daily&utm_campaign=strike&utm_content=day" + dayNum;
    $("result").hidden = false;
    tick();
    if (fresh) $("result").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function tick() {
    var p = easternParts(new Date()), left = 86400 - (+p.hour * 3600 + +p.minute * 60 + +p.second);
    var h = Math.floor(left / 3600), m = Math.floor((left % 3600) / 60);
    $("next").textContent = "Next Strike in " + h + " h " + m + " min, at midnight Eastern.";
  }
  setInterval(function () { if (!$("result").hidden) tick(); }, 30000);

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
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  /* The share image is the result card, square: the Warrior, the tiles, "Daily Strike, Day N", the pick line and the
     URL. No letter, no choice text, no answer, no trap name. The Warrior is drawn below its own pixel size, never up. */
  function image(p) {
    return new Promise(function (res) {
      var S = 1080, c = document.createElement("canvas"); c.width = S; c.height = S; var x = c.getContext("2d");
      x.imageSmoothingEnabled = true; x.imageSmoothingQuality = "high";
      var w = warrior();
      var draw = function () {
        /* the card, stacked as on the page: Warrior, "Daily Strike, Day N", "Struck on pick N", tiles, URL, all centred */
        x.fillStyle = "#7A0B10"; x.fillRect(0, 0, S, S);
        var wh = 460, ww = w.naturalWidth ? Math.round(w.naturalWidth * wh / w.naturalHeight) : 0, wx = Math.round((S - ww) / 2), wy = 48;
        var g = x.createRadialGradient(S / 2, wy + wh / 2, 30, S / 2, wy + wh / 2, wh * 0.6);
        g.addColorStop(0, "rgba(242,235,219,0.30)"); g.addColorStop(0.6, "rgba(242,235,219,0.10)"); g.addColorStop(1, "rgba(242,235,219,0)");
        x.fillStyle = g; x.fillRect(0, 0, S, wy + wh + 40);
        if (ww) x.drawImage(w, wx, wy, ww, wh);
        x.textAlign = "center"; x.textBaseline = "alphabetic";
        x.fillStyle = "#F2EBDB"; x.font = '600 76px "Playfair Display", Georgia, serif';
        x.fillText("Daily Strike, Day " + dayNum, S / 2, 618);
        x.fillStyle = "#C9A24A"; x.font = '600 56px "Playfair Display", Georgia, serif';
        x.fillText("Struck on pick " + p.tiles.length, S / 2, 700);
        var n = p.tiles.length, size = 132, gap = 20, tw = n * size + (n - 1) * gap, tx = Math.round((S - tw) / 2);
        p.tiles.forEach(function (t, i) { x.fillStyle = HEX[t] || HEX.brown; rr(x, tx + i * (size + gap), 752, size, size, 20); x.fill(); });
        x.fillStyle = "#C9A24A"; x.font = '700 44px "DM Sans", system-ui, sans-serif';
        x.fillText("scoresamurai.com/strike", S / 2, 1006);
        c.toBlob(function (b) { res(b); }, "image/png");
      };
      if (w.complete && w.naturalWidth) draw(); else { w.addEventListener("load", draw, { once: true }); w.addEventListener("error", draw, { once: true }); }
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
      return (document.fonts ? document.fonts.ready : Promise.resolve()).then(function () { return image(p); });
    }).then(function (b) { if (b) { saveImage(b); ok.push("image"); } }, function () {}).then(function () {
      out.textContent = ok.indexOf("copied") >= 0 ? (ok.indexOf("image") >= 0 ? "Grid copied. Image saved." : "Grid copied.") : (ok.indexOf("image") >= 0 ? "Image saved." : "Copy did not work on this browser.");
      ev("strike_share", { strike_day: dayNum, tries: p.picks.length, copied: ok.indexOf("copied") >= 0, image: ok.indexOf("image") >= 0 });
    });
  }

  /* ---------- start ---------- */
  function start(b) {
    bank = b; labels = b.labels || {};
    dayNum = daysBetween(b.start, today) + 1;
    item = (dayNum >= 1 && b.days[dayNum - 1]) || null;
    for (var i = 1; i < b.days.length; i++) if (b.days[i].section === b.days[i - 1].section) console.warn("strike-bank: day " + (i + 1) + " repeats " + b.days[i].section);

    var since = daysBetween(state.first, today);
    ev(isNew ? "strike_first_open" : "strike_open", { strike_day: dayNum, days_played: daysPlayed(state), days_since_first: since });
    if (!isNew && since >= 7 && !state.d7) { state.d7 = true; ev("strike_return_d7", { strike_day: dayNum, days_since_first: since, days_played: daysPlayed(state) }); }
    save(state);
    renderMe();

    if (!item) { $("hdrDay").textContent = ""; $("empty").hidden = false; return; }
    renderQuestion();
    var p = state.plays[today];
    if (p && p.id !== item.id) { delete state.plays[today]; p = null; save(state); }
    if (p) { paintPicks(p); if (p.done) renderResult(p, false); }
  }

  $("shareBtn").addEventListener("click", share);
  $("diagLink").addEventListener("click", function () { ev("strike_diagnostic_click", { strike_day: dayNum }); });

  fetch("strike-bank.json", { credentials: "same-origin" }).then(function (r) { return r.json(); }).then(start).catch(function () { $("empty").hidden = false; });
})();
