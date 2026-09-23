/* Score Samurai: Which belt are you. The ten Mini Diagnostic questions from The Trap Map,
   Sensei-solved, keys confirmed. Misses map to traps exactly as the Trap Map's answer key says. */
(function () {
  var Q = [
    { s: "Reading and Writing", trap: 1, passage: "Before the 1912 expedition, cartographer Elin Marsh had drafted maps of the Svalbard coast from ship logs alone ______ the survey that followed corrected her shoreline by several kilometers in places.", stem: "Which choice completes the text so that it conforms to the conventions of Standard English?", c: ["alone, the survey", "alone the survey", "alone; the survey", "alone, therefore, the survey"], k: 2 },
    { s: "Reading and Writing", trap: 2, passage: "Critics who had admired the first volume found the second wanting: it repeated the earlier arguments nearly word for word but left out the evidence that had made them persuasive.", stem: "As used in the text, what does the word “wanting” most nearly mean?", c: ["eager", "lacking", "repetitive", "scholarly"], k: 1 },
    { s: "Reading and Writing", trap: 3, passage: "A 2019 survey of community gardens in Detroit found that plots tended by families with young children were weeded more consistently than plots tended by adults living alone. Sociologist Marcus Bell argues that the difference reflects scheduling rather than diligence. Parents visited the gardens on a fixed after-school routine, while gardeners living alone came whenever time allowed and often let weeks pass between visits. Bell notes that his data did not include plots tended by retirees, whose schedules may differ from both groups.", stem: "According to the text, what does Bell identify as the reason for the difference in weeding?", c: ["Plots tended by families with young children were weeded more consistently than plots tended by adults living alone.", "Parents visited on a fixed routine, while gardeners living alone visited irregularly.", "The survey did not include plots tended by retirees.", "Families with young children were more diligent gardeners than adults living alone."], k: 1 },
    { s: "Reading and Writing", trap: 3, passage: "For decades, historians dated the earliest use of the water-powered trip hammer in Europe to the twelfth century, on the strength of monastery records from Burgundy. A 2021 excavation in the Basque Country, however, uncovered a hammer site with charcoal that radiocarbon dating places in the late ninth century. The Burgundian records remain the earliest written evidence of the technology. They are simply no longer the earliest evidence.", stem: "Which choice best states the main purpose of the text?", c: ["To describe how radiocarbon dating is used at excavation sites.", "To report that the trip hammer was in use in Europe earlier than historians had believed.", "To explain why the monks of Burgundy kept such careful records.", "To show that the earliest written evidence of a technology is usually wrong."], k: 1 },
    { s: "Reading and Writing", trap: 1, passage: "Although the 1938 hurricane destroyed most of the boardwalk at Misquamicut ______ the pavilion at its center survived with only its roof missing.", stem: "Which choice completes the text so that it conforms to the conventions of Standard English?", c: ["Misquamicut; the pavilion", "Misquamicut, the pavilion", "Misquamicut. The pavilion", "Misquamicut, and the pavilion"], k: 1 },
    { s: "Math", trap: 4, passage: "If 5(x + 2) = 3x + 26, what is the value of 3x + 4?", stem: "", c: ["8", "12", "24", "28"], k: 3 },
    { s: "Math", trap: 4, passage: "If 2x + y = 11 and x − y = 4, what is the value of 2x + 2y?", stem: "", c: ["1", "5", "6", "12"], k: 3 },
    { s: "Math", trap: 5, passage: "Which table gives three values of x and their corresponding values of y that all satisfy the inequality y < 3x + 1?", stem: "", c: ["x: 0, 1, 2    y: 0, 2, 7", "x: 0, 1, 2    y: 0, 2, 5", "x: 0, 1, 2    y: 2, 5, 8", "x: 0, 1, 2    y: 0, 3, 9"], k: 1 },
    { s: "Math", trap: 4, passage: "A climbing gym charges a $40 enrollment fee plus $25 for each month of membership. A member who has paid $265 in total has been a member for m months, where 40 + 25m = 265. What is the total amount the member has paid in monthly fees?", stem: "", c: ["$9", "$10.60", "$225", "$265"], k: 2 },
    { s: "Math", trap: 5, passage: "Which of the following ordered pairs (x, y) satisfies both y ≥ x − 2 and y < −x + 6?", stem: "", c: ["(0, −3)", "(1, 5)", "(2, 1)", "(5, 3)"], k: 2 }
  ];
  var TRAPS = {
    1: { name: "Can Each Half Stand Alone", section: "Reading and Writing", means: "punctuation is still being chosen by ear, and the ear cannot hear that both halves are complete sentences." },
    2: { name: "The Familiar Meaning Ambush", section: "Reading and Writing", means: "the first meaning that came to mind was trusted before the sentence had been read to the end." },
    3: { name: "The Answer to a Different Question", section: "Reading and Writing", means: "the choices were judged against the passage rather than against the question." },
    4: { name: "The Half-Finished Move", section: "Math", means: "the procedure was checked against the choices rather than against the question, and the number that appeared first was taken for the one that was asked for." },
    5: { name: "The Region Has to Be Checked, Not Eyeballed", section: "Math", means: "the checking stopped once the answer looked settled, or one condition was checked and the second assumed." }
  };
  var LET = ["A", "B", "C", "D"];
  var el = function (id) { return document.getElementById(id); };
  var i = 0, picks = [];

  function render() {
    var q = Q[i];
    el("bar").style.width = Math.round((i / Q.length) * 100) + "%";
    el("qmeta").textContent = "Question " + (i + 1) + " of " + Q.length + " · " + q.s;
    el("qpassage").textContent = q.passage;
    el("qstem").textContent = q.stem;
    el("qstem").style.display = q.stem ? "" : "none";
    var box = el("qchoices"); box.innerHTML = "";
    q.c.forEach(function (c, j) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "choice"; b.setAttribute("aria-pressed", picks[i] === j ? "true" : "false");
      b.innerHTML = '<span class="qlet">' + LET[j] + "</span><span></span>";
      b.lastChild.textContent = c;
      b.addEventListener("click", function () {
        picks[i] = j;
        box.querySelectorAll(".choice").forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
        b.setAttribute("aria-pressed", "true");
        el("next").disabled = false;
      });
      box.appendChild(b);
    });
    el("next").disabled = picks[i] === undefined;
    el("next").textContent = i === Q.length - 1 ? "See my belt" : "Next";
    el("back").style.visibility = i === 0 ? "hidden" : "visible";
  }

  function finish() {
    el("bar").style.width = "100%";
    var misses = {};
    Q.forEach(function (q, j) { if (picks[j] !== q.k) misses[q.trap] = (misses[q.trap] || 0) + 1; });
    // Trap Map answer key: a trap "points" when both of its two questions miss (trap 2 has one question); trap 4 needs two or more of three.
    var firing = [];
    if ((misses[1] || 0) >= 2) firing.push(1);
    if ((misses[2] || 0) >= 1) firing.push(2);
    if ((misses[3] || 0) >= 2) firing.push(3);
    if ((misses[4] || 0) >= 2) firing.push(4);
    if ((misses[5] || 0) >= 2) firing.push(5);
    var single = Object.keys(misses).map(Number).filter(function (t) { return firing.indexOf(t) < 0; });
    var correct = Q.filter(function (q, j) { return picks[j] === q.k; }).length;

    var belt, color, border, summary;
    if (firing.length === 0 && correct === Q.length) {
      belt = "Green, working toward Blue"; color = "#3F7A3E"; border = "#3F7A3E";
      summary = "Ten for ten. None of the five Trap Map traps fired today, which is what Green means on the Dojo ladder. The points you are losing on a real test are in the timed patterns, which is Blue's work, and only a full set of misses can name them.";
    } else if (firing.length === 0) {
      belt = "White, close to Green"; color = "#F3ECDD"; border = "#C9BFA8";
      summary = correct + " of ten. No trap fired twice, which is the bar, but " + (Q.length - correct) + (Q.length - correct === 1 ? " miss" : " misses") + " on one afternoon is a habit waiting to be named. Green is a term of work away.";
    } else {
      belt = "White"; color = "#F3ECDD"; border = "#C9BFA8";
      summary = correct + " of ten. " + (firing.length === 1 ? "One trap" : firing.length + " traps") + " fired the way the test is built to make " + (firing.length === 1 ? "it" : "them") + " fire. Every student starts here. A belt moves when a named trap stops costing points across two straight practice tests, and the first one is usually the fastest.";
    }
    el("rbelt").textContent = belt;
    el("rline").style.background = color; el("rline").style.borderColor = border;
    el("rsummary").textContent = summary;
    var box = el("rtraps"); box.innerHTML = "";
    firing.forEach(function (t) {
      var d = document.createElement("div");
      d.className = "step"; d.style.gap = "10px";
      d.innerHTML = '<div class="num" style="font-size:22px;width:auto">Trap ' + t + '</div><div><strong></strong><div class="muted" style="font-size:14px"></div></div>';
      d.querySelector("strong").textContent = TRAPS[t].name + " · " + TRAPS[t].section;
      d.querySelector(".muted").textContent = "A miss here means " + TRAPS[t].means;
      box.appendChild(d);
    });
    if (single.length) {
      var p = document.createElement("p"); p.className = "muted";
      p.textContent = "One miss each on " + single.map(function (t) { return TRAPS[t].name; }).join(", ") + ". One miss is information. Two on the same trap is a pattern.";
      box.appendChild(p);
    }
    el("quiz").classList.add("hidden");
    el("result").classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (window.gtag) { try { gtag("event", "belt_result", { correct: correct, traps: firing.join(",") }); } catch (e) {} }
  }

  el("next").addEventListener("click", function () { if (i < Q.length - 1) { i++; render(); } else { finish(); } });
  el("back").addEventListener("click", function () { if (i > 0) { i--; render(); } });
  el("again").addEventListener("click", function () { i = 0; picks = []; el("result").classList.add("hidden"); el("quiz").classList.remove("hidden"); render(); });
  render();
})();
