/* Score Samurai: the live trap on the home page.
   Every question here is from The Trap Map (Sensei-solved, keys confirmed). Do not add questions
   that have not been solved by Sensei personally. */
(function () {
  var TRAPS = [
    {
      section: "Reading and Writing", num: 3, trap: "The Answer to a Different Question",
      passage: "Urban beekeepers in Chicago have reported that rooftop hives produce more honey per colony than hives in the farmland outside the city. Entomologist Dana Whitfield attributes the difference to the city's ornamental plantings, which bloom in staggered waves from March through October and give urban bees a longer foraging season than single-crop fields provide. She cautions, though, that her team measured only honey yield and did not follow the colonies through the winter.",
      stem: "According to the text, what does Whitfield identify as the cause of the difference in honey production?",
      choices: ["Rooftop hives produce more honey per colony than farmland hives.", "Ornamental plantings extend the foraging season for urban bees.", "Her team did not follow the colonies through the winter.", "Farmland outside the city supports larger colonies."],
      key: 1,
      why: { 0: "A is the finding, and it is true. The question asked for the cause.", 2: "C is the caveat, and it is true. The question asked for the cause.", 3: "D fills in a detail the passage never gave." },
      rule: "Reread the question before you touch the choices. On this test the wrong answers are usually true, and only one of them answers what was asked."
    },
    {
      section: "Reading and Writing", num: 1, trap: "Can Each Half Stand Alone",
      passage: "Marine biologist Ayana Reyes spent three summers tagging leatherback turtles off the coast of Trinidad ______ her data showed that the same females returned to nest within a few hundred meters of their earlier sites.",
      stem: "Which choice completes the text so that it conforms to the conventions of Standard English?",
      choices: ["Trinidad, her data", "Trinidad her data", "Trinidad, however, her data", "Trinidad; her data"],
      key: 3,
      why: { 0: "A sounds fine out loud. Both halves are complete sentences, and a lone comma has never been allowed to hold two of those together.", 1: "B runs two complete sentences together with nothing between them.", 2: "C catches the strongest students, because however feels like but. It is not a conjunction, so the commas around it do not count." },
      rule: "Test each half on its own. If both could stand as sentences, the join needs a period, a semicolon, or a comma with a conjunction."
    },
    {
      section: "Math", num: 4, trap: "The Half-Finished Move",
      passage: "If 3(x − 4) = 2x + 5, what is the value of 2x − 3?",
      stem: "",
      choices: ["14", "17", "31", "34"],
      key: 2,
      why: { 1: "B is x. The work was right and the number is there, which is exactly how this one was built. The question asked for 2x − 3.", 3: "D is x doubled with the last step missing.", 0: "A subtracts before doubling." },
      rule: "The procedure has a defined end, and the question names it. Finish every step, then check that the number you have is the one that was asked for."
    },
    {
      section: "Reading and Writing", num: 2, trap: "The Familiar Meaning Ambush",
      passage: "Early reviews of the new bridge praised its elegance, but the chief engineer's own assessment was more qualified: the span would hold, she wrote, provided the river never rose past the flood levels recorded in the previous century.",
      stem: "As used in the text, what does the word “qualified” most nearly mean?",
      choices: ["certified", "conditional", "enthusiastic", "technical"],
      key: 1,
      why: { 0: "A is the meaning you have heard a thousand times, and it even seems to fit, since she is an engineer. That is the ambush. She is hedging, and the word has to carry the hedge.", 2: "C is the opposite of what she is doing.", 3: "D is a guess from the setting, not the sentence." },
      rule: "The first meaning that comes to mind is the one under suspicion. Check it against what the sentence is doing before you trust it."
    },
    {
      section: "Math", num: 5, trap: "The Region Has to Be Checked, Not Eyeballed",
      passage: "Which table gives three values of x and their corresponding values of y that all satisfy the inequality y > 2x − 5?",
      stem: "",
      choices: ["x: 0, 2, 4    y: 0, 1, 3", "x: 0, 1, 3    y: 0, −2, 0", "x: 0, 2, 4    y: −6, −2, 2", "x: 0, 2, 4    y: 0, 1, 5"],
      key: 3,
      why: { 0: "A survives two rows and fails on the third: its last point lands exactly on the line, and a strict inequality does not include the line.", 1: "B survives two rows and fails on the third.", 2: "C is every point just below the line, for the student who compared in the wrong direction." },
      rule: "An inequality is settled by substitution, not by inspection. A table qualifies only if every row passes, so check the last row before the first."
    }
  ];

  var root = document.getElementById("ss-trap");
  if (!root) return;
  var el = function (id) { return document.getElementById(id); };
  var idx = 0, answered = false;
  var LET = ["A", "B", "C", "D"];

  function render() {
    var t = TRAPS[idx];
    answered = false;
    el("ss-trap-label").textContent = t.section;
    el("ss-trap-num").textContent = String(idx + 1);
    el("ss-trap-passage").textContent = t.passage;
    el("ss-trap-stem").textContent = t.stem;
    el("ss-trap-note").className = "note";
    el("ss-trap-note").textContent = "Tap the answer you would pick. There is no clock.";
    el("ss-trap-count").textContent = (idx + 1) + " of " + TRAPS.length;
    root.querySelector(".chip").textContent = "Pick an answer";
    var box = el("ss-trap-choices");
    box.innerHTML = "";
    t.choices.forEach(function (c, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "qrow btnrow";
      b.setAttribute("data-i", String(i));
      b.innerHTML = '<span class="qlet">' + LET[i] + "</span><span></span>";
      b.lastChild.textContent = c;
      b.addEventListener("click", function () { pick(i, b); });
      box.appendChild(b);
    });
  }

  function pick(i, btn) {
    if (answered) return;
    answered = true;
    var t = TRAPS[idx];
    var rows = el("ss-trap-choices").querySelectorAll(".qrow");
    rows.forEach(function (r, j) {
      r.disabled = true;
      if (j === t.key) r.classList.add("correct");
      if (j === i && i !== t.key) r.classList.add("wrong");
    });
    var note = el("ss-trap-note");
    note.className = "note reveal";
    var chip = root.querySelector(".chip");
    if (i === t.key) {
      chip.textContent = "Clean";
      note.innerHTML = "<b>Clean.</b> " + LET[t.key] + " is right, and most students who get it right can say why. The rule: " + t.rule;
    } else {
      chip.textContent = "Trap " + t.num;
      var why = t.why[i] || (LET[i] + " is the one built for the clock.");
      note.innerHTML = "<b>" + t.trap + ".</b> " + why + " The answer is " + LET[t.key] + ". The rule: " + t.rule;
    }
    if (window.gtag) { try { gtag("event", "trap_pick", { trap: t.trap, correct: i === t.key }); } catch (e) {} }
  }

  el("ss-trap-next").addEventListener("click", function () {
    idx = (idx + 1) % TRAPS.length;
    render();
  });

  render();
})();
