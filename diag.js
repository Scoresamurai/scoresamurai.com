/* Score Samurai: the three-screen Diagnostic form. DIAGFORM, Nov 6 2026: screen 1 is three questions (your first name,
   your email, the test date); who is filling it in and the student's and parent's details move to screen 3. Same field
   names in the post, same GA4 events (diagnostic_step on screens 2 and 3, diagnostic_submit on ok:true).
   Seventeen fields, same as the TutorBird intake,
   posted to the Apps Script endpoint (apps-script/Code.gs). Set ENDPOINT before deploy.
   ENGINE2, Nov 4 2026 (INTAKE-SPEC.md): an optional practice-test block on screen 2. The miss fields and the
   screenshot upload show only for a Bluebook practice test; screenshots are scaled to 1600 px on the long side
   and sent as JPEG in a "shots" array inside the same text/plain POST. */
(function () {
  var ENDPOINT = "https://script.google.com/macros/s/AKfycbwNXGTg_7VgI6U7ejrx6dM9QeX8ObhIZ7br0v9_R0IL8U0SfCiPjL6Mcpcv-fjUFgpdrg/exec";
  var form = document.getElementById("dx");
  if (!form) return;
  var screens = Array.prototype.slice.call(form.querySelectorAll("[data-screen]"));
  var bars = form.querySelectorAll(".steps i");
  var cur = 0;

  function show(n, moved) {
    cur = n;
    screens.forEach(function (s, i) { s.classList.toggle("hidden", i !== n); });
    bars.forEach(function (b, i) { b.classList.toggle("on", i <= n); });
    document.getElementById("stepLabel").textContent = "Step " + (n + 1) + " of 3";
    if (!moved) return;
    var first = screens[n].querySelector("input,select,textarea");
    if (first) first.focus({ preventScroll: true });
    window.scrollTo({ top: form.offsetTop - 80, behavior: "smooth" });
    if (window.gtag) { try {
      gtag("event", "diagnostic_step", { step: n + 1 });
      /* DIAGPAGE, Nov 9 2026: "step" is not a registered GA4 dimension, so step 2 and step 3 could not be told apart.
         One named event per screen splits them in the standard Events report with no Admin change. */
      gtag("event", "diagnostic_step_" + (n + 1));
    } catch (e) {} }
  }

  function valid(n) {
    var ok = true;
    screens[n].querySelectorAll("[required]").forEach(function (f) {
      if (f.closest(".hidden")) return; // a field the screen is not showing (DIAGFORM)
      var field = f.closest(".field");
      var good = f.type === "radio" ? !!form.querySelector('input[name="' + f.name + '"]:checked') : f.value.trim() !== "" && (f.type !== "email" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.value.trim()));
      field.classList.toggle("err", !good);
      if (!good && ok) { ok = false; f.focus(); }
    });
    return ok;
  }

  form.addEventListener("click", function (e) {
    if (e.target.matches("[data-next]")) { if (valid(cur)) show(cur + 1, true); }
    if (e.target.matches("[data-back]")) { show(cur - 1, true); }
  });
  form.querySelectorAll("input,select,textarea").forEach(function (f) {
    f.addEventListener("input", function () { f.closest(".field") && f.closest(".field").classList.remove("err"); });
  });

  /* Who's filling this in (screen 3 since DIAGFORM, Nov 6 2026). Screen 1 asks only "your" first name and email; the
     role decides whether they are the student's or the parent's, so that pair is hidden on screen 3 and copied in on
     submit. A parent sees the student's fields labelled as the student's, and the browser stops offering the parent's
     own details there. */
  var roleLabels = { first: "Student’s first name", last: "Student’s last name", semail: "Student’s email", school: "Student’s school", plast: "Your last name", pphone: "Your phone (optional)" };
  var sBlock = document.getElementById("sBlock"), pBlock = document.getElementById("pBlock");
  form.querySelectorAll('input[name="role"]').forEach(function (r) {
    r.addEventListener("change", function () {
      var parent = form.role.value === "parent";
      Object.keys(roleLabels).forEach(function (id) {
        var inp = document.getElementById(id), lab = form.querySelector('label[for="' + id + '"]');
        if (!inp || !lab) return;
        if (!lab.hasAttribute("data-own")) lab.setAttribute("data-own", lab.textContent);
        lab.textContent = parent ? roleLabels[id] : lab.getAttribute("data-own");
        if (id === "plast" || id === "pphone") return;
        if (!inp.hasAttribute("data-ac")) inp.setAttribute("data-ac", inp.getAttribute("autocomplete") || "");
        inp.setAttribute("autocomplete", parent ? "off" : inp.getAttribute("data-ac"));
      });
      [sBlock, pBlock].forEach(function (b) {
        if (!b) return;
        b.classList.remove("hidden");
        var h = b.querySelector("h3"); if (h) h.textContent = h.getAttribute(parent ? "data-h-parent" : "data-h-student");
      });
      form.querySelectorAll("[data-me]").forEach(function (f) { f.classList.toggle("hidden", f.getAttribute("data-me") === (parent ? "parent" : "student")); });
    });
  });
  /* Screen 1's two answers into the role's own fields, so the post carries the same field names as before. */
  function copyMe() {
    var meFirst = document.getElementById("meFirst"), meEmail = document.getElementById("meEmail");
    var parent = form.role.value === "parent";
    document.getElementById(parent ? "pfirst" : "first").value = meFirst.value.trim();
    document.getElementById(parent ? "pemail" : "semail").value = meEmail.value.trim();
  }
  /* The practice-test block: fields 19 to 23 appear only when field 18 names a Bluebook practice test. */
  var ptest = document.getElementById("ptest"), missBlock = document.getElementById("missBlock");
  function bluebook() { return !!ptest && /^Practice Test \d+$/.test(ptest.value); }
  if (ptest && missBlock) {
    ptest.addEventListener("change", function () { missBlock.classList.toggle("hidden", !bluebook()); });
  }
  /* PAGEGO, Nov 9 2026: "No score yet" beside the total score. Ticking it clears and disables the total, Math and Reading
     and Writing scores (and the practice-test block, since there is no test to read), and lets the form go on. The post
     then carries recent_score "none", so the intake email reads "recent_score: none" and "Engine-ready: no". */
  var noScore = document.getElementById("noscore");
  function noScoreSet() {
    var on = !!(noScore && noScore.checked);
    ["recent", "math", "rw", "ptest"].forEach(function (id) {
      var f = document.getElementById(id); if (!f) return;
      if (on) f.value = "";
      f.disabled = on;
      if (id === "recent") f.required = !on;
      var fld = f.closest(".field"); if (fld) fld.classList.remove("err");
    });
    if (on && missBlock) missBlock.classList.add("hidden");
  }
  if (noScore) noScore.addEventListener("change", noScoreSet);

  var MAX_SHOTS = 4, LONG_SIDE = 1600, MAX_SHOT_BYTES = 6 * 1024 * 1024;
  var shotsIn = document.getElementById("shots");
  if (shotsIn) shotsIn.addEventListener("change", function () {
    document.getElementById("fShots").classList.toggle("err", shotsIn.files.length > MAX_SHOTS);
  });

  /* One image to {name, type, data}: drawn to a canvas no more than LONG_SIDE px on its long side. PNG first, since a
     screenshot is text and JPEG blur costs the review reader rows (pre-launch test 3, Nov 4 2026); JPEG at q when the
     PNG is too big. */
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
    if (cur < 2) { e.preventDefault(); if (valid(cur)) show(cur + 1, true); }
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!valid(2)) return;
    if (form.website.value) return; // honeypot
    var btn = document.getElementById("submit");
    var status = document.getElementById("status");
    if (shotsIn && shotsIn.files.length > MAX_SHOTS && bluebook()) {
      /* Checked before the button locks: it used to stay on "Sending" with nothing sent (DIAGFORM). */
      show(1, false); document.getElementById("fShots").classList.add("err"); shotsIn.focus(); return;
    }
    copyMe();
    btn.disabled = true; btn.textContent = "Sending";
    status.textContent = "";
    var data = {};
    new FormData(form).forEach(function (v, k) { if (typeof v === "string") data[k] = v.trim(); });
    if (!bluebook()) ["missed_rw_m1", "missed_rw_m2", "missed_math_m1", "missed_math_m2"].forEach(function (k) { delete data[k]; });
    if (!data.practice_test) delete data.practice_test;
    ["missed_rw_m1", "missed_rw_m2", "missed_math_m1", "missed_math_m2"].forEach(function (k) { if (data[k] === "") delete data[k]; });
    if (noScore && noScore.checked) { data.recent_score = "none"; ["math_score", "rw_score", "practice_test"].forEach(function (k) { delete data[k]; }); }
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
        var cal = document.getElementById("cal"); if (cal && !cal.getAttribute("src")) cal.setAttribute("src", cal.getAttribute("data-src"));
        var book = document.getElementById("bookLine"); if (book) book.classList.add("hidden");
        document.querySelector(".steps").classList.add("hidden");
        document.getElementById("done").classList.remove("hidden");
        window.scrollTo({ top: 0, behavior: "smooth" });
        if (window.gtag) { try { gtag("event", "diagnostic_submit", { source: data.heard || "" }); } catch (e) {} }
      })
      .catch(function () {
        btn.disabled = false; btn.textContent = "Send me my Diagnostic";
        status.textContent = "That didn't go through. Try again, or email senseijay@scoresamurai.com and we'll take it from there.";
      });
  });

  /* DIAGPAGE, Nov 9 2026: the optional Calendly booking under the form no longer loads with the page. It loads on the
     visitor's first scroll, tap or key, when the box is already on screen, 4 s after the page is ready, or on a
     successful submit (above), whichever comes first. Its iframe was the heaviest thing on the page and held the load
     event for about 2 s. Same box, same place, same words. */
  var calEl = document.getElementById("cal");
  if (calEl && !calEl.getAttribute("src") && calEl.getAttribute("data-src")) {
    var calEvents = ["scroll", "pointerdown", "keydown", "touchstart"];
    var calLoad = function () {
      if (!calEl.getAttribute("src")) calEl.setAttribute("src", calEl.getAttribute("data-src"));
      calEvents.forEach(function (t) { window.removeEventListener(t, calLoad, true); });
    };
    calEvents.forEach(function (t) { window.addEventListener(t, calLoad, { capture: true, passive: true }); });
    var calBox = calEl.getBoundingClientRect();
    if (calBox.top < window.innerHeight) calLoad();
    setTimeout(calLoad, 4000);
  }

  show(0, false);
  var firstField = document.getElementById("meFirst");
  if (firstField) { try { firstField.focus({ preventScroll: true }); } catch (e) {} }
})();
