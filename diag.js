/* Score Samurai: the three-screen Dojo Diagnostic form. Seventeen fields, same as the TutorBird intake,
   posted to the Apps Script endpoint (apps-script/Code.gs). Set ENDPOINT before deploy. */
(function () {
  var ENDPOINT = "https://script.google.com/macros/s/AKfycbwNXGTg_7VgI6U7ejrx6dM9QeX8ObhIZ7br0v9_R0IL8U0SfCiPjL6Mcpcv-fjUFgpdrg/exec";
  var form = document.getElementById("dx");
  if (!form) return;
  var screens = Array.prototype.slice.call(form.querySelectorAll("[data-screen]"));
  var bars = form.querySelectorAll(".steps i");
  var cur = 0;

  function show(n) {
    cur = n;
    screens.forEach(function (s, i) { s.classList.toggle("hidden", i !== n); });
    bars.forEach(function (b, i) { b.classList.toggle("on", i <= n); });
    document.getElementById("stepLabel").textContent = "Step " + (n + 1) + " of 3";
    var first = screens[n].querySelector("input,select,textarea");
    if (first) first.focus({ preventScroll: true });
    window.scrollTo({ top: form.offsetTop - 80, behavior: "smooth" });
    if (window.gtag) { try { gtag("event", "diagnostic_step", { step: n + 1 }); } catch (e) {} }
  }

  function valid(n) {
    var ok = true;
    screens[n].querySelectorAll("[required]").forEach(function (f) {
      var field = f.closest(".field");
      var good = f.value.trim() !== "" && (f.type !== "email" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.value.trim()));
      field.classList.toggle("err", !good);
      if (!good && ok) { ok = false; f.focus(); }
    });
    return ok;
  }

  form.addEventListener("click", function (e) {
    if (e.target.matches("[data-next]")) { if (valid(cur)) show(cur + 1); }
    if (e.target.matches("[data-back]")) { show(cur - 1); }
  });
  form.querySelectorAll("input,select,textarea").forEach(function (f) {
    f.addEventListener("input", function () { f.closest(".field") && f.closest(".field").classList.remove("err"); });
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!valid(2)) return;
    if (form.website.value) return; // honeypot
    var btn = document.getElementById("submit");
    var status = document.getElementById("status");
    btn.disabled = true; btn.textContent = "Sending";
    status.textContent = "";
    var data = {};
    new FormData(form).forEach(function (v, k) { data[k] = String(v).trim(); });
    data.page = location.href; data.submitted_at = new Date().toISOString();
    var params = new URLSearchParams(location.search);
    ["utm_source", "utm_medium", "utm_campaign"].forEach(function (k) { if (params.get(k)) data[k] = params.get(k); });

    fetch(ENDPOINT, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(data) })
      .then(function () {
        form.classList.add("hidden");
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

  show(0);
})();
