/* Score Samurai: the three-screen Diagnostic form, one copy on home and /diagnostic/ (LANDING, Nov 10 2026).
   Screen 1 is taps only: who is filling this in, grade, the test date, and a score or "No score yet". Screen 2 is the
   scores and the frustration. Screen 3, "Where should the Diagnostic go?", takes the names and emails last.
   Same field names, same endpoint, same GA4 events (diagnostic_step and diagnostic_step_2 / _3 on screens 2 and 3,
   diagnostic_submit on ok:true), plus diagnostic_step_1_done when screen 1 is passed. Answers save as you go in this
   browser (localStorage "ss_dx") and are cleared on a sent form.
   ENGINE2, Nov 4 2026 (INTAKE-SPEC.md): an optional practice-test block on screen 2. The miss fields and the
   screenshot upload show only for a Bluebook practice test; screenshots are scaled to 1600 px on the long side
   and sent in a "shots" array inside the same text/plain POST.
   /diagnostic/?for=parent starts the role on "I'm a parent".
   PHONEFIELD, Nov 11 2026: on the parent path only, the parent phone field becomes "Best number (optional)" with a
   helper line, a light check (if filled, at least 10 digits) and is also posted as "phone". The student path is
   unchanged and posts no "phone". diagnostic_submit carries has_phone yes or no.
   LISTBOX, Nov 12 2026: the student path no longer shows or posts a parent phone. The parent path adds an unticked
   "Send me one SAT trap a week by email." box on screen 3, posted as weekly_email "yes" when ticked and "" otherwise
   (always "" on the student path). The box is never saved or restored, so it is never pre-ticked. */
(function () {
  var ENDPOINT = "https://script.google.com/macros/s/AKfycbwNXGTg_7VgI6U7ejrx6dM9QeX8ObhIZ7br0v9_R0IL8U0SfCiPjL6Mcpcv-fjUFgpdrg/exec";
  var KEY = "ss_dx";
  var form = document.getElementById("dx");
  if (!form) return;
  var wrap = document.getElementById("dxwrap") || form.parentNode;
  var screens = Array.prototype.slice.call(form.querySelectorAll("[data-screen]"));
  var bars = form.querySelectorAll(".dx-prog i");
  var cur = 0;

  function ev(name, params) { if (window.gtag) { try { gtag("event", name, params || {}); } catch (e) {} } }
  function top(el) { return el.getBoundingClientRect().top + (window.pageYOffset || document.documentElement.scrollTop) - 80; }

  function show(n, moved) {
    cur = n;
    screens.forEach(function (s, i) { s.classList.toggle("hidden", i !== n); });
    bars.forEach(function (b, i) { b.classList.toggle("on", i <= n); });
    document.getElementById("stepLabel").textContent = "Step " + (n + 1) + " of 3";
    if (!moved) return;
    var first = screens[n].querySelector("input:not([type=radio]):not([type=hidden]),select,textarea");
    if (first && n > 0) { try { first.focus({ preventScroll: true }); } catch (e) {} }
    window.scrollTo({ top: top(form), behavior: "smooth" });
    ev("diagnostic_step", { step: n + 1 });
    /* DIAGPAGE, Nov 9 2026: one named event per screen, so the screens split in the standard Events report. */
    ev("diagnostic_step_" + (n + 1));
  }

  function valid(n) {
    var ok = true;
    screens[n].querySelectorAll("[required]").forEach(function (f) {
      if (f.closest(".hidden")) return; // a field the screen is not showing
      var field = f.closest(".field");
      var good = f.type === "radio" ? !!form.querySelector('input[name="' + f.name + '"]:checked') : f.value.trim() !== "" && (f.type !== "email" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.value.trim()));
      if (field) field.classList.toggle("err", !good);
      if (!good && ok) { ok = false; try { f.focus(); } catch (e) {} }
    });
    /* PHONEFIELD: the parent's best number is optional; if filled it needs at least 10 digits. */
    var ph = screens[n].querySelector("#pphone");
    if (ph && roleVal() === "parent") {
      var v = ph.value.trim(), phGood = v === "" || v.replace(/\D/g, "").length >= 10, pf = ph.closest(".field");
      if (pf) pf.classList.toggle("err", !phGood);
      if (!phGood && ok) { ok = false; try { ph.focus(); } catch (e) {} }
    }
    return ok;
  }

  function next() {
    if (!valid(cur)) return;
    if (cur === 0) ev("diagnostic_step_1_done");
    show(cur + 1, true);
  }

  form.addEventListener("click", function (e) {
    if (e.target.closest("[data-next]")) next();
    if (e.target.closest("[data-back]")) show(cur - 1, true);
  });
  form.querySelectorAll("input,select,textarea").forEach(function (f) {
    var clear = function () { var fl = f.closest(".field"); if (fl) fl.classList.remove("err"); };
    f.addEventListener("input", clear); f.addEventListener("change", clear);
  });

  /* Who's filling this in (screen 1). On screen 3 the role sets the labels, the block headings and which block comes
     first: a parent sees "About you" (their own details) first and the student's fields labelled as the student's. */
  var roleLabels = { first: "Student’s first name", last: "Student’s last name", semail: "Student’s email", school: "Student’s school", pfirst: "Your first name", plast: "Your last name", pemail: "Your email", pphone: "Best number <span class=\"hint\">(optional)</span>" };
  var ownAc = { first: 1, last: 1, semail: 1 };
  var sBlock = document.getElementById("sBlock"), pBlock = document.getElementById("pBlock"), who = document.getElementById("dxWho");
  function roleVal() { var r = form.querySelector('input[name="role"]:checked'); return r ? r.value : ""; }
  function applyRole() {
    var parent = roleVal() === "parent";
    Object.keys(roleLabels).forEach(function (id) {
      var inp = document.getElementById(id), lab = form.querySelector('label[for="' + id + '"]');
      if (!inp || !lab) return;
      if (!lab.hasAttribute("data-own")) lab.setAttribute("data-own", lab.innerHTML);
      if (parent) { if (id === "pphone") lab.innerHTML = roleLabels[id]; else lab.textContent = roleLabels[id]; } else lab.innerHTML = lab.getAttribute("data-own");
      if (!ownAc[id]) return;
      if (!inp.hasAttribute("data-ac")) inp.setAttribute("data-ac", inp.getAttribute("autocomplete") || "");
      inp.setAttribute("autocomplete", parent ? "off" : inp.getAttribute("data-ac"));
    });
    [sBlock, pBlock].forEach(function (b) {
      if (!b) return;
      var h = b.querySelector("h3"); if (h) h.textContent = h.getAttribute(parent ? "data-h-parent" : "data-h-student");
    });
    var fPhone = document.getElementById("fPhone"), fWeekly = document.getElementById("fWeekly"), wk = document.getElementById("weekly");
    if (fPhone) fPhone.classList.toggle("hidden", !parent);
    if (fWeekly) fWeekly.classList.toggle("hidden", !parent);
    if (wk && !parent) wk.checked = false;
    var ph = document.getElementById("pphone"), phHelp = document.getElementById("pphoneHelp");
    if (phHelp) phHelp.classList.toggle("hidden", !parent);
    if (ph) {
      if (parent && phHelp) ph.setAttribute("aria-describedby", "pphoneHelp"); else ph.removeAttribute("aria-describedby");
      if (!parent) { var pf = ph.closest(".field"); if (pf) pf.classList.remove("err"); }
    }
    if (who && sBlock && pBlock) {
      if (parent && who.firstElementChild !== pBlock) who.insertBefore(pBlock, sBlock);
      if (!parent && who.firstElementChild !== sBlock) who.insertBefore(sBlock, pBlock);
    }
  }
  form.querySelectorAll('input[name="role"]').forEach(function (r) { r.addEventListener("change", applyRole); });

  /* The practice-test block: fields 19 to 23 appear only when field 18 names a Bluebook practice test. */
  var ptest = document.getElementById("ptest"), missBlock = document.getElementById("missBlock");
  function bluebook() { return !!ptest && /^Practice Test \d+$/.test(ptest.value); }
  function missSet() { if (missBlock) missBlock.classList.toggle("hidden", !bluebook()); }
  if (ptest) ptest.addEventListener("change", missSet);

  /* PAGEGO, Nov 9 2026: "No score yet" beside the total score clears and disables the total, Math and Reading and
     Writing scores and the practice-test select, and posts recent_score "none".
     STARTREAD, Nov 10 2026: the two optional no-score questions show only with "No score yet". */
  var noScore = document.getElementById("noscore");
  function noScoreSet(keep) {
    var on = !!(noScore && noScore.checked);
    ["recent", "math", "rw", "ptest"].forEach(function (id) {
      var f = document.getElementById(id); if (!f) return;
      if (on) f.value = "";
      f.disabled = on;
      if (id === "recent") f.required = !on;
      var fld = f.closest(".field"); if (fld) fld.classList.remove("err");
    });
    if (on && missBlock) missBlock.classList.add("hidden");
    var ns = document.getElementById("nsBlock");
    if (ns) {
      ns.classList.toggle("hidden", !on);
      if (!on && keep !== true) ns.querySelectorAll("input[type=radio]").forEach(function (r) { r.checked = false; });
    }
  }
  if (noScore) noScore.addEventListener("change", noScoreSet);

  /* Answers save as you go: every named answer (not the screenshots, not the honeypot), in this browser only. */
  var savedEl = document.getElementById("dxSaved");
  function save() {
    try {
      var o = {};
      form.querySelectorAll("input[name],select[name],textarea[name]").forEach(function (f) {
        if (f.type === "file" || f.type === "checkbox" || f.name === "website") return;
        if (f.type === "radio") { if (f.checked) o[f.name] = f.value; return; }
        o[f.name] = f.value;
      });
      o._noscore = !!(noScore && noScore.checked);
      localStorage.setItem(KEY, JSON.stringify(o));
      if (savedEl) savedEl.textContent = "Saved";
    } catch (e) {}
  }
  form.addEventListener("input", save);
  form.addEventListener("change", save);
  var restored = false;
  try {
    var o = JSON.parse(localStorage.getItem(KEY) || "null");
    if (o && typeof o === "object") {
      Object.keys(o).forEach(function (k) {
        if (k === "_noscore" || !/^[a-z_0-9]+$/.test(k)) return;
        form.querySelectorAll('[name="' + k + '"]').forEach(function (f) {
          if (f.type === "radio") f.checked = f.value === o[k];
          else if (f.type !== "file" && f.type !== "checkbox") f.value = o[k] == null ? "" : String(o[k]);
        });
      });
      if (noScore && o._noscore) noScore.checked = true;
      restored = true;
    }
  } catch (e) {}
  if (!roleVal() && /(^|[?&])for=parent(&|$)/.test(location.search)) {
    var pr = form.querySelector('input[name="role"][value="parent"]'); if (pr) pr.checked = true;
  }
  applyRole();
  noScoreSet(true);
  missSet();
  if (restored && savedEl) savedEl.textContent = "Saved";

  var MAX_SHOTS = 4, LONG_SIDE = 1600, MAX_SHOT_BYTES = 6 * 1024 * 1024;
  var shotsIn = document.getElementById("shots");
  if (shotsIn) shotsIn.addEventListener("change", function () {
    document.getElementById("fShots").classList.toggle("err", shotsIn.files.length > MAX_SHOTS);
  });

  /* One image to {name, type, data}: drawn to a canvas no more than LONG_SIDE px on its long side. PNG first, JPEG at q
     when the PNG is too big. */
  function shrink(file, q) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var k = Math.min(1, LONG_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
        var c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(img.naturalWidth * k)); c.height = Math.max(1, Math.round(img.naturalHeight * k));
        var g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
        g.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        var name = String(file.name || "screenshot").slice(0, 80);
        var png = c.toDataURL("image/png").split(",")[1];
        if (png.length <= MAX_SHOT_BYTES / MAX_SHOTS) return resolve({ name: name, type: "image/png", data: png });
        resolve({ name: name, type: "image/jpeg", data: c.toDataURL("image/jpeg", q).split(",")[1] });
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("image")); };
      img.src = url;
    });
  }
  function readShots() {
    if (!bluebook() || !shotsIn || !shotsIn.files.length) return Promise.resolve([]);
    var files = Array.prototype.slice.call(shotsIn.files, 0, MAX_SHOTS);
    function at(q) {
      return Promise.all(files.map(function (f) { return shrink(f, q); })).then(function (list) {
        var bytes = list.reduce(function (n, s) { return n + s.data.length; }, 0);
        if (bytes <= MAX_SHOT_BYTES) return list;
        if (q > 0.6) return at(q - 0.15);
        throw new Error("size");
      });
    }
    return at(0.92);
  }

  form.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" || e.isComposing) return;
    var t = e.target;
    if (!t || t.tagName === "TEXTAREA" || t.tagName === "BUTTON" || t.tagName === "A") return;
    if (cur < 2) { e.preventDefault(); next(); }
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!valid(2)) return;
    if (form.website.value) return; // honeypot
    var btn = document.getElementById("submit");
    var status = document.getElementById("status");
    if (shotsIn && shotsIn.files.length > MAX_SHOTS && bluebook()) {
      show(1, false); document.getElementById("fShots").classList.add("err"); shotsIn.focus(); return;
    }
    btn.disabled = true; btn.textContent = "Sending";
    status.textContent = "";
    var data = {};
    new FormData(form).forEach(function (v, k) { if (typeof v === "string") data[k] = v.trim(); });
    if (!bluebook()) ["missed_rw_m1", "missed_rw_m2", "missed_math_m1", "missed_math_m2"].forEach(function (k) { delete data[k]; });
    if (!data.practice_test) delete data.practice_test;
    ["missed_rw_m1", "missed_rw_m2", "missed_math_m1", "missed_math_m2"].forEach(function (k) { if (data[k] === "") delete data[k]; });
    if (noScore && noScore.checked) { data.recent_score = "none"; ["math_score", "rw_score", "practice_test"].forEach(function (k) { delete data[k]; }); }
    if (!(noScore && noScore.checked)) { delete data.math_class; delete data.psat_taken; }
    ["math_class", "psat_taken"].forEach(function (k) { if (!data[k]) delete data[k]; });
    if (roleVal() === "parent" && data.parent_phone) data.phone = data.parent_phone;
    if (roleVal() !== "parent") delete data.parent_phone;
    var wkIn = document.getElementById("weekly");
    data.weekly_email = roleVal() === "parent" && wkIn && wkIn.checked ? "yes" : "";
    data.page = location.href; data.submitted_at = new Date().toISOString();
    var attr = window.ssAttr ? window.ssAttr() : {};
    Object.keys(attr).forEach(function (k) { data[k] = attr[k]; });

    /* The reply is read: "Sent" and the GA4 submit event happen only when the script answers ok:true. */
    readShots()
      .then(function (shots) {
        if (shots.length) data.shots = shots;
        return fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(data) });
      })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j || j.ok !== true) throw new Error("not ok");
        form.classList.add("hidden");
        if (window.ssCalStart) window.ssCalStart();
        var grid = wrap.closest ? wrap.closest(".dx-grid") : null; if (grid) grid.classList.add("sent");
        var done = document.getElementById("done");
        done.classList.remove("hidden");
        try { localStorage.removeItem(KEY); } catch (e) {}
        /* STARTREAD, Nov 10 2026: after a no-score submit, one button to the Belt Check. This browser remembers the address
           for 14 days so a finished Belt Check can reach Sensei with this request (belt.js). Nothing is kept otherwise. */
        if (data.recent_score === "none") {
          try { localStorage.setItem("ss_belt_intake", JSON.stringify({ email: data.student_email, at: Date.now() })); } catch (e) {}
          var bb = document.getElementById("beltBtn"); if (bb) bb.classList.remove("hidden");
        }
        if (location.pathname === "/") { var hb = document.getElementById("dxHome"); if (hb) hb.classList.add("hidden"); }
        window.scrollTo({ top: top(done), behavior: "smooth" });
        try { done.focus({ preventScroll: true }); } catch (e) {}
        ev("diagnostic_submit", { source: data.heard || "", has_phone: data.phone ? "yes" : "no" });
      })
      .catch(function () {
        btn.disabled = false; btn.textContent = "Send me my Diagnostic";
        status.textContent = "That didn't go through. Try again, or email senseijay@scoresamurai.com and we'll take it from there.";
      });
  });

  /* CALFAST, Nov 10 2026: the Calendly loader sits in the page, right under the box. */

  show(0, false);
})();
