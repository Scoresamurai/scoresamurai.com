/* Score Samurai: Score Lab v2 (branch preview-lab, Oct 14 2026).
   Reads /lab/curve.json (the conversion table, its route bands and its range rule), and /scores/ipeds-sat-2024.json when the college box is used.
   Every number the page shows is traced in the SOURCE LINES comment at the top of lab/index.html.
   Nothing is stored in the browser. Nothing is sent anywhere unless the student asks for the scorecard by email. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };

  /* Capture. The Lab posts to the intake Web App with source "lab". Field names are lab_* on purpose:
     the live intake script ignores a post without student_first, student_email and parent_email, so nothing is
     logged or emailed until lab.gs (apps-script/lab.gs) is deployed and CAPTURE_LIVE is set to true. */
  var ENDPOINT = "https://script.google.com/macros/s/AKfycbwNXGTg_7VgI6U7ejrx6dM9QeX8ObhIZ7br0v9_R0IL8U0SfCiPjL6Mcpcv-fjUFgpdrg/exec";
  var CAPTURE_LIVE = true;

  function ev(name, p) { if (typeof window.gtag === "function") { try { window.gtag("event", name, p || {}); } catch (e) {} } }

  /* College Board total-score percentiles, SAT user group (SAT takers), 900 to 1600 in steps of 10.
     research.collegeboard.org/reports/sat-suite/understanding-scores/sat, read Oct 14 2026. */
  var PCT_USER = { 900: 32, 910: 33, 920: 35, 930: 36, 940: 38, 950: 39, 960: 41, 970: 42, 980: 44, 990: 45,
    1000: 47, 1010: 48, 1020: 50, 1030: 52, 1040: 53, 1050: 55, 1060: 56, 1070: 58, 1080: 59, 1090: 60,
    1100: 62, 1110: 63, 1120: 65, 1130: 66, 1140: 67, 1150: 69, 1160: 70, 1170: 71, 1180: 72, 1190: 74,
    1200: 75, 1210: 76, 1220: 77, 1230: 78, 1240: 79, 1250: 80, 1260: 81, 1270: 82, 1280: 83, 1290: 84,
    1300: 85, 1310: 86, 1320: 87, 1330: 88, 1340: 88, 1350: 89, 1360: 90, 1370: 91, 1380: 91, 1390: 92,
    1400: 93, 1410: 93, 1420: 94, 1430: 94, 1440: 95, 1450: 95, 1460: 96, 1470: 96, 1480: 97, 1490: 97,
    1500: 97, 1510: 98, 1520: 98, 1530: 99, 1540: 99, 1550: 99 };

  /* PSAT/NMSQT. Selection Index = (2 x Reading and Writing + Math) / 10 (College Board).
     Class of 2027 cutoffs and the class of 2028 estimates: Compass Prep, updated Sept 22 2026, read Oct 14 2026. */
  var STATES = { NJ: "New Jersey", NY: "New York", CT: "Connecticut" };
  var CUT = { NJ: 223, NY: 220, CT: 220 };
  var EST = { NJ: "222 to 225", NY: "219 to 223", CT: "219 to 223" };
  var COMMENDED = 208, COMMENDED_EST = "207 to 212";

  /* Station 2: Pattern Codex names and rule lines (Codex, Oct 14 2026). A count shows only where the
     Bluebook Question Index gives one across the eight official practice tests (Tests 4 to 11). */
  var TRAPS = {
    rw: [
      { n: 3, name: "Name the Relationship", tick: "Transitions: the word fit the sentence, not the link between the sentences.",
        rule: "Say out loud what connects these two things. Then pick the rule that matches what you just said. Never pick first and justify after." },
      { n: 29, name: "Can Each Half Stand Alone", tick: "Punctuation between two halves: commas, semicolons, periods.", count: 58,
        rule: "Test each half alone: can it stand as its own sentence? If both can, you need a period, a semicolon, or a comma plus a conjunction. Never a lone comma. Never nothing. And ‘however’ is a stop sign, not a bridge." },
      { n: 24, name: "Same Mechanism, Not Same Topic", tick: "Support or weaken a claim: the answer was on topic but missed the point.",
        rule: "Find the exact mechanism the claim names. Then find the answer that speaks to that exact mechanism. Same topic isn’t the same thing." },
      { n: 27, name: "Cover the Word", tick: "Words in context: I picked the word that sounded smartest.",
        rule: "Cover the blank. Read the sentence. Say your own word out loud. Then find the choice that matches your word, not the one that sounds smartest." },
      { n: 2, name: "The Answer to a Different Question", tick: "Evidence and notes: the answer was true, but it answered something else.",
        rule: "Go back and read what they actually asked for. Not what the passage is about: what the question wants. Those are different things." }
    ],
    m: [
      { n: 6, name: "Name It Before You Solve It", tick: "Word problems: the algebra was fine, the setup was wrong.",
        rule: "Before you touch any algebra, name each thing in words. Whose numbers are whose. Then translate one phrase at a time.",
        des: "Desmos: by hand for the setup. Desmos runs the math, it does not translate the words." },
      { n: 14, name: "Count the Crossings", tick: "Systems: how many solutions, or where two graphs meet.", count: 10,
        rule: "Solutions are where the graphs touch. Count the intersections. A line can cut a parabola twice, never three times.",
        des: "Desmos: Technique 2. Type both equations and count the intersections." },
      { n: 19, name: "Which Denominator", tick: "Tables and probability: I divided by the wrong total.",
        rule: "Before you divide, find your denominator. ‘Of the [subgroup]’ means the subgroup is the bottom. Plain ‘probability’ means the grand total. Read which one they said.",
        des: "Desmos: by hand, Desmos adds nothing here." },
      { n: 12, name: "The Shape on Sight", tick: "Quadratics and factoring: I did it the long way and slipped.",
        rule: "Look at the shape before you start working. Perfect square, difference of squares, vertex form: if you recognize it, you’re already done.",
        des: "Desmos: answers given, graph them and look for the overlap. An answer you have to build, by hand." },
      { n: 45, name: "Sine and Cosine Trade Places", tick: "Right triangles: sine and cosine questions.",
        rule: "In a right triangle, the sine of one sharp angle is the cosine of the other. The two sharp angles add to 90, so the ratio you were given is the ratio you are being asked for.",
        des: "Desmos: by hand, Desmos adds nothing here." }
    ]
  };

  var CURVE = null, SCHOOLS = [], FIELDS = null, estimated = false;
  var st = { ready: false, rw: null, m: null, lo: 0, hi: 0, mid: 0, school: null, verdict: "", traps: [], si: 0 };

  function r10(v) { return Math.round(v / 10) * 10; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function interp(pts, raw) {
    if (raw <= pts[0].raw) return pts[0].scaled;
    for (var i = 1; i < pts.length; i++) {
      if (raw <= pts[i].raw) { var a = pts[i - 1], b = pts[i]; return a.scaled + (b.scaled - a.scaled) * (raw - a.raw) / (b.raw - a.raw); }
    }
    return pts[pts.length - 1].scaled;
  }
  function read(el, max) {
    var s = el.value.trim(); if (s === "") return null;
    var v = parseInt(s, 10); if (isNaN(v)) return null;
    var c = clamp(v, 0, max); if (c !== v) el.value = c; return c;
  }
  /* route: "harder", "easier" or "either" from the Module 1 bands in curve.json */
  function section(key, m1, m2) {
    var sec = CURVE.sections[key], band = CURVE.module1_route[key], sc = CURVE.scale, raw = m1 + m2;
    var route = m1 >= band.harder_min ? "harder" : m1 <= band.easier_max ? "easier" : "either";
    var vals = (route === "either" ? ["harder", "easier"] : [route]).map(function (r) {
      return clamp(r10(interp(sec[r], raw)), sc.section_min, sc.section_max);
    });
    var top = Math.max.apply(null, vals), bot = Math.min.apply(null, vals), hw = CURVE.range.section_halfwidth;
    var lo = clamp(r10(bot - hw), sc.section_min, sc.section_max), hi = clamp(r10(top + hw), sc.section_min, sc.section_max);
    return { m1: m1, m2: m2, raw: raw, route: route, top: top, bot: bot, lo: lo, hi: hi, about: r10((lo + hi) / 2) };
  }
  function pctAt(t) {
    if (t < 900) return null; if (t >= 1560) return "99+";
    return PCT_USER[clamp(r10(t), 900, 1550)];
  }
  function ord(v) {
    if (v === "99+") return "99th";
    var n = v % 100, k = v % 10;
    return v + ((n > 10 && n < 14) ? "th" : k === 1 ? "st" : k === 2 ? "nd" : k === 3 ? "rd" : "th");
  }
  function pctLine(lo, hi) {
    var a = pctAt(lo), b = pctAt(hi);
    if (a === null && b === null) return "Below the 32nd percentile of SAT takers across that whole range.";
    if (a === null) return "Up to about the " + ord(b) + " percentile of SAT takers.";
    if (ord(a) === ord(b)) return "About the " + ord(a) + " percentile of SAT takers.";
    return "Roughly the " + ord(a) + " to " + ord(b) + " percentile of SAT takers.";
  }
  var ROUTE_TXT = { harder: "Harder Module 2", easier: "Easier Module 2", either: "Could be either" };

  function predict() {
    var a = read($("rw1"), 27), b = read($("rw2"), 27), c = read($("m1"), 22), d = read($("m2"), 22);
    if (a === null || b === null || c === null || d === null) {
      st.ready = false; $("result").hidden = true; $("wait1").hidden = false;
      ["rw", "m"].forEach(function (k) { $(k + "-route").textContent = ""; $(k + "-route").className = "route"; });
      decide(); return;
    }
    var rw = section("rw", a, b), m = section("math", c, d), sc = CURVE.scale, hw = CURVE.range.total_halfwidth;
    var lo = clamp(r10(rw.bot + m.bot - hw), sc.total_min, sc.total_max), hi = clamp(r10(rw.top + m.top + hw), sc.total_min, sc.total_max);
    st.ready = true; st.rw = rw; st.m = m; st.lo = lo; st.hi = hi; st.mid = r10((lo + hi) / 2);
    [["rw", rw], ["m", m]].forEach(function (p) {
      var r = $(p[0] + "-route"); r.textContent = ROUTE_TXT[p[1].route]; r.className = "route " + p[1].route;
      $(p[0] + "-score").textContent = "about " + p[1].about;
      $(p[0] + "-sub").textContent = p[1].lo + " to " + p[1].hi;
    });
    $("t-score").textContent = "about " + st.mid;
    $("t-range").textContent = "Likely between " + lo + " and " + hi + ".";
    $("t-pct").textContent = pctLine(lo, hi);
    var bands = CURVE.module1_route, rwB = bands.rw.harder_min, mB = bands.math.harder_min, note;
    var rwOk = rw.route === "harder", mOk = m.route === "harder";
    if (rwOk && mOk) note = "Both sections look routed to the harder Module 2, so the top of the scale is open in both.";
    else if (rw.route === "easier" && m.route === "easier") note = "Both sections look routed to the easier Module 2. The fastest lift is Module 1: about " + rwB + " right in Reading and Writing, about " + mB + " in Math.";
    else {
      var parts = [];
      [["Reading and Writing", rw, rwB], ["Math", m, mB]].forEach(function (s) {
        if (s[1].route === "either") parts.push(s[0] + " sits on the line, so the range covers both routes. About " + s[2] + " right in Module 1 makes the harder one likely.");
        else if (s[1].route === "easier") parts.push(s[0] + " looks routed to the easier module. About " + s[2] + " right in Module 1 opens the top of that section.");
      });
      note = parts.join(" ");
    }
    $("route-now").textContent = note;
    $("result").hidden = false; $("wait1").hidden = true;
    if (!estimated) { estimated = true; ev("lab_estimate", { total_mid: st.mid }); }
    decide();
  }

  function bindTraps() {
    document.querySelectorAll(".lt input").forEach(function (cb) { cb.addEventListener("change", diagnose); });
  }
  function diagnose() {
    var picked = [];
    document.querySelectorAll(".lt input:checked").forEach(function (i) {
      TRAPS[i.dataset.key].forEach(function (t) { if (String(t.n) === i.dataset.n) picked.push(t); });
    });
    st.traps = picked;
    $("moves-sub").textContent = picked.length ? "The rule for each one you ticked:" : "Tick a kind of question you missed to see its rule.";
    var host = $("moves"); host.textContent = "";
    picked.forEach(function (t) {
      var d = document.createElement("div"); d.className = "move";
      var h = document.createElement("p"); h.className = "mv"; h.textContent = t.name; d.appendChild(h);
      var r = document.createElement("p"); r.className = "how"; r.textContent = "“" + t.rule + "”"; d.appendChild(r);
      if (t.des) { var ds = document.createElement("p"); ds.className = "des"; ds.textContent = t.des; d.appendChild(ds); }
      if (t.count) { var c = document.createElement("p"); c.className = "des"; c.textContent = "In " + t.count + " questions across eight official practice tests, by our count."; d.appendChild(c); }
      host.appendChild(d);
    });
  }

  /* Station 3 */
  function schoolRow(s) {
    var g = function (k) { return s[FIELDS.indexOf(k)]; };
    return { id: g("unitid"), name: g("name"), city: g("city"), state: g("state"),
      lo: g("erw25") + g("math25"), mid: g("erw50") + g("math50"), hi: g("erw75") + g("math75"), policy: g("policy"), full: g("name") };
  }
  function findSchool(q) {
    q = q.trim().toLowerCase(); if (!q) return null;
    for (var i = 0; i < SCHOOLS.length; i++) { if (SCHOOLS[i].label.toLowerCase() === q) return SCHOOLS[i]; }
    return null;
  }
  function setVerdict(cls, label, text, gap) {
    $("v-pill").className = "pill " + cls; $("v-pill").textContent = label; $("v-text").textContent = text; $("v-gap").textContent = gap || "";
    st.verdict = label;
  }
  function decide() {
    var s = st.school, c25, c75, mid, name;
    if (s) { c25 = s.lo; c75 = s.hi; mid = s.mid; name = s.name; $("c25").value = c25; $("c75").value = c75; }
    else {
      c25 = parseInt($("c25").value, 10); c75 = parseInt($("c75").value, 10);
      if (!c25 || !c75 || c75 <= c25) { setVerdict("none", "Pick a college", "Pick a college, or type its middle 50 range."); bar(null, null); return; }
      mid = r10((c25 + c75) / 2); name = "this college";
    }
    if (!st.ready) { setVerdict("none", "Scores first", "Fill in the four module boxes above to compare your range."); bar(c25, c75); return; }
    var t = st.mid, lo = st.lo, hi = st.hi, across = lo < mid && hi >= mid ? " Your range crosses their middle score, so a real test could land either side of it." : "";
    var gap = Math.max(0, mid - t), gapTxt = gap ? "About " + gap + " points to their middle score of " + mid + "." : "";
    if (s && s.policy === "B") { setVerdict("info", "Not considered", name + " does not consider SAT scores, so there is nothing to send."); bar(c25, c75); return; }
    if (s && s.policy === "R") {
      setVerdict("info", "Required", name + " required scores for fall 2024 admission, so a score gets sent. Their middle 50 is " + c25 + " to " + c75 + ". Your range is " + lo + " to " + hi + "." + across, gapTxt);
    } else if (t >= mid) {
      setVerdict("good", "Likely worth sending", "About " + t + " is at or above " + name + "’s middle score of " + mid + ". The Lab’s rule of thumb is to send a score at or above the middle." + across, gapTxt);
    } else if (t >= c25) {
      setVerdict("warn", "Your call", "About " + t + " is inside " + name + "’s middle 50 (" + c25 + " to " + c75 + ") but under the middle. Send it if grades are the weaker part of the application. Hold it if the score would be the weakest part." + across, gapTxt);
    } else {
      setVerdict("bad", "Likely hold, for now", "About " + t + " is under " + name + "’s 25th percentile of " + c25 + ". The Lab’s rule of thumb is to hold a score that low at a test optional college." + across, gapTxt);
    }
    bar(c25, c75);
  }
  function bar(c25, c75) {
    var px = function (v) { return clamp((v - 1000) / 600 * 100, 0, 100); };
    if (c25) { $("bar-mid").style.left = px(c25) + "%"; $("bar-mid").style.width = (px(c75) - px(c25)) + "%"; $("bar-mid").hidden = false; }
    else $("bar-mid").hidden = true;
    if (st.ready) { $("bar-you").style.left = px(st.lo) + "%"; $("bar-you").style.width = Math.max(1, px(st.hi) - px(st.lo)) + "%"; $("bar-you").hidden = false; }
    else $("bar-you").hidden = true;
  }

  function psat() {
    var k = $("state").value, nm = STATES[k];
    var rw = read($("p-rw"), 760), m = read($("p-m"), 760);
    if (rw === null || m === null || rw < 160 || m < 160) { $("psat-text").textContent = "Enter both PSAT section scores, 160 to 760."; return; }
    var si = Math.round((rw * 2 + m) / 10); st.si = si;
    var cut = CUT[k], msg = "Selection Index: " + si + ". Reading and Writing counts twice. " + nm + " Semifinalist cutoff for the class of 2027: " + cut + ". Commended: " + COMMENDED + ". ";
    if (si >= cut) msg += "That is at or over the " + nm + " line for the class of 2027.";
    else {
      var d = cut - si, rwOnly = Math.ceil(d * 5 / 10) * 10, both = Math.ceil(d * 10 / 3 / 10) * 10;
      msg += "That is " + d + " short of the " + nm + " line." + (si >= COMMENDED ? " It is in the Commended range." : "");
      if (rw + rwOnly <= 760) msg += " Closing it takes about " + rwOnly + " more points in Reading and Writing alone, or about " + both + " more in each section.";
      else if (rw + both <= 760 && m + both <= 760) msg += " Closing it takes about " + both + " more points in each section.";
    }
    $("psat-text").textContent = msg;
    $("psat-est").textContent = "Estimates for the October 2026 PSAT, not final: " + nm + " " + EST[k] + ", Commended " + COMMENDED_EST + ".";
  }

  function scorecard() {
    return {
      total_range: st.ready ? st.lo + "-" + st.hi : "", total_about: st.ready ? String(st.mid) : "",
      rw_range: st.ready ? st.rw.lo + "-" + st.rw.hi : "", math_range: st.ready ? st.m.lo + "-" + st.m.hi : "",
      rw_m1: st.ready ? st.rw.m1 : "", rw_m2: st.ready ? st.rw.m2 : "", math_m1: st.ready ? st.m.m1 : "", math_m2: st.ready ? st.m.m2 : "",
      rw_route: st.ready ? st.rw.route : "", math_route: st.ready ? st.m.route : "",
      traps: st.traps.map(function (t) { return t.name; }).join("; "),
      school: st.school ? st.school.full : "", school_unitid: st.school ? st.school.id : "",
      school_mid50: $("c25").value && $("c75").value ? $("c25").value + "-" + $("c75").value : "", verdict: st.verdict,
      psat_state: $("state").value, psat_si: st.si ? String(st.si) : "", curve_version: CURVE.version
    };
  }
  function submit(e) {
    e.preventDefault();
    var f = $("cap-form"), email = $("email").value.trim(), pe = $("p-email").value.trim(), needP = $("parent").checked;
    var ok = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    var badE = !ok.test(email), badP = needP && !ok.test(pe);
    $("f-email").classList.toggle("err", badE); $("f-pemail").classList.toggle("err", badP);
    if (badE) { $("email").focus(); return; }
    if (badP) { $("p-email").focus(); return; }
    if (!st.ready) { $("cap-status").textContent = "Fill in the four module boxes first, so there is a scorecard to send."; $("rw1").focus(); return; }
    if (f.website.value) return;
    if (!CAPTURE_LIVE) { $("cap-status").textContent = "Preview build: email sending switches on at launch. Nothing was sent or saved."; return; }
    var btn = $("cap-btn"); btn.disabled = true; btn.textContent = "Sending";
    var q = new URLSearchParams(location.search), data = scorecard();
    data.source = "lab"; data.lab_first = $("first").value.trim(); data.lab_email = email;
    data.lab_parent_email = needP ? pe : ""; data.submitted_at = new Date().toISOString(); data.page = location.pathname;
    var a = window.ssAttr ? window.ssAttr() : {}; Object.keys(a).forEach(function (k) { data[k] = a[k]; });
    ["utm_source", "utm_medium", "utm_campaign"].forEach(function (k) { if (!data[k] && q.get(k)) data[k] = q.get(k); });
    fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(data) })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j || !j.ok) throw new Error("not ok");
        f.hidden = true; $("done").hidden = false; $("done").focus();
        ev("lab_submit", { parent_copy: needP ? "yes" : "no" });
      })
      .catch(function () {
        btn.disabled = false; btn.textContent = "Email me my scorecard";
        $("cap-status").textContent = "That did not go through. Try again, or email senseijay@scoresamurai.com.";
      });
  }

  function wire() {
    ["rw1", "rw2", "m1", "m2"].forEach(function (id) { $(id).addEventListener("input", predict); });
    $("school").addEventListener("change", function () { st.school = findSchool($("school").value); decide(); });
    $("school").addEventListener("input", function () { var s = findSchool($("school").value); if (s) { st.school = s; decide(); } });
    ["c25", "c75"].forEach(function (id) { $(id).addEventListener("input", function () { st.school = null; $("school").value = ""; decide(); }); });
    ["state", "p-rw", "p-m"].forEach(function (id) { $(id).addEventListener("input", psat); });
    $("parent").addEventListener("change", function () { $("f-pemail").hidden = !$("parent").checked; });
    $("cap-form").addEventListener("submit", submit);
  }

  bindTraps();
  var schoolsLoading = null;
  function loadSchools() {
    if (schoolsLoading) return schoolsLoading;
    schoolsLoading = fetch("/scores/ipeds-sat-2024.json").then(function (r) { return r.json(); }).then(function (j) {
      FIELDS = j.fields;
      SCHOOLS = j.schools.map(schoolRow).filter(function (s) { return s.policy === "B" || (s.lo && s.hi); });
      SCHOOLS.forEach(function (s) { s.label = s.name + " (" + s.city + ", " + s.state + ")"; });
      var dl = $("schools"), frag = document.createDocumentFragment();
      SCHOOLS.forEach(function (s) { var o = document.createElement("option"); o.value = s.label; frag.appendChild(o); });
      dl.appendChild(frag);
      var hit = findSchool($("school").value); if (hit) { st.school = hit; decide(); }
    }).catch(function () { schoolsLoading = null; });
    return schoolsLoading;
  }
  /* The college list (about 95 KB) loads only when someone reaches for it. */
  $("school").addEventListener("focus", loadSchools);
  fetch("/lab/curve.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (c) {
    CURVE = c;
    wire(); predict(); diagnose(); psat();
  }).catch(function () { $("lab-load").textContent = "The Lab could not load. Refresh the page to try again."; $("lab-load").hidden = false; });
})();
