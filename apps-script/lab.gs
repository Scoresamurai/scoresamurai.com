/**
 * Dojo Score Lab capture: add-on for the Diagnostic intake Web App (apps-script/Code.gs). DEPLOYED v5 Oct 20 (sitepro).
 * v2, branch preview-lab, Oct 14 2026 (labpress). Replaces the Oct 12 draft.
 *
 * Turn it on, in this order, only after Sensei's "go":
 *  1. Paste this file into the intake Apps Script project as a second file, lab.gs.
 *  2. In Code.gs doPost, directly after the honeypot line, add:
 *       if (data.source === "lab") return out(lab_(data));
 *     It must sit BEFORE the "missing" check. The Lab sends lab_first, lab_email and lab_parent_email, never
 *     student_first, student_email or parent_email, so until this line is live the intake script rejects a Lab
 *     post as "missing" and nothing is logged or emailed. A Lab post can never become a Diagnostic intake.
 *  3. Deploy > Manage deployments > pencil > Version: New version > Deploy. The /exec URL stays the same.
 *  4. Send one test from the Lab with CAPTURE_LIVE = true in a local copy, to senseijay+lab1@scoresamurai.com,
 *     ticking the parent copy with senseijay+lab2@scoresamurai.com. Check the row and both emails.
 *  5. Then set CAPTURE_LIVE = true in /lab/lab.js on the branch, and publish.
 *
 * What it does: one row in a "Lab Scorecards" tab of the Results Tracker; the student gets the scorecard;
 * a parent gets one copy only if the student ticked it and gave the address. Nobody is added to Kit or any
 * list (ruling labpress, Oct 14 2026: Kit's policy needs direct permission for marketing email, the Lab asks
 * for none, and most Lab users are under 18). It never sends the Diagnostic confirmation.
 */

var LAB_TAB = "Lab Scorecards";
var LAB_HEAD = ["received_at", "lab_first", "lab_email", "lab_parent_email", "total_about", "total_range", "rw_range", "math_range",
  "rw_m1", "rw_m2", "math_m1", "math_m2", "rw_route", "math_route", "traps", "school", "school_unitid", "school_mid50", "verdict",
  "psat_state", "psat_si", "curve_version", "emails", "utm_source", "utm_medium", "utm_campaign", "page",
  "utm_content", "utm_term", "gclid", "fbclid"];
var LAB_DIAG = "https://scoresamurai.com/diagnostic/";
var LAB_ROUTE = { harder: "harder", easier: "easier", either: "could be either" };

function lab_(d) {
  var okMail = function (a) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(a || "").trim()); };
  if (!okMail(d.lab_email) || !d.total_range) return { ok: false, error: "missing" };
  var first = String(d.lab_first || "").trim().slice(0, 40);
  var sent = [];

  MailApp.sendEmail({ to: d.lab_email, replyTo: SENSEI, name: FROM_NAME,
    subject: "Your Dojo Score Lab scorecard", body: labStudentBody_(d, first) });
  sent.push("student");

  if (okMail(d.lab_parent_email)) {
    MailApp.sendEmail({ to: d.lab_parent_email, replyTo: SENSEI, name: FROM_NAME,
      subject: (first ? first + "'s" : "An") + " SAT scorecard from the Dojo Score Lab", body: labParentBody_(d, first) });
    sent.push("parent");
  }
  var row = LAB_HEAD.map(function (k) {
    if (k === "received_at") return new Date();
    if (k === "emails") return sent.join(", ");
    return String(d[k] == null ? "" : d[k]).slice(0, 300);
  });
  labTab_().appendRow(row);
  return { ok: true };
}

function labTab_() {
  var ss = SpreadsheetApp.openById(RESULTS_TRACKER_ID), sh = ss.getSheetByName(LAB_TAB);
  if (!sh) { sh = ss.insertSheet(LAB_TAB); sh.appendRow(LAB_HEAD); sh.setFrozenRows(1); }
  head_(sh, LAB_HEAD);
  return sh;
}

function labLines_(d) {
  var tr = String(d.total_range || "").split("-");
  var out = [
    "Estimated total: about " + d.total_about + ", likely between " + tr[0] + " and " + tr[1] + ".",
    "Reading and Writing: " + String(d.rw_range).replace("-", " to ") + ". Math: " + String(d.math_range).replace("-", " to ") + ".",
    "Module 2 route: Reading and Writing " + (LAB_ROUTE[d.rw_route] || d.rw_route) + ", Math " + (LAB_ROUTE[d.math_route] || d.math_route) + "."
  ];
  return out;
}

/* STUDENT SCORECARD. plain_gate --student. */
function labStudentBody_(d, first) {
  return [
    "Hi " + (first || "there") + ",",
    "",
    "Here is your scorecard from the Dojo Score Lab.",
    ""
  ].concat(labLines_(d)).concat([
    "",
    "Module 1 sets the ceiling. The harder Module 2 opens the top of the scale.",
    "",
    "The patterns you ticked: " + (d.traps || "none") + ".",
    d.school ? "College check, " + d.school + ": " + d.verdict + "." : "",
    "",
    "These are estimates from practice-test inputs, not official scores. Even a real score can move about 40 points on a retake.",
    "",
    "Want the full read? The Dojo Diagnostic is free and written. Sensei Jay reads the questions you missed and writes back within 24 hours. Start it here: " + LAB_DIAG,
    "",
    "Sensei Jay",
    "Score Samurai LLC",
    "Score Samurai is not affiliated with or endorsed by College Board."
  ]).join("\n");
}

/* PARENT COPY. plain_gate --parent. One email, sent only because the student asked; no list, no follow-up. */
function labParentBody_(d, first) {
  return [
    "Hello,",
    "",
    (first || "A student") + " asked us to send you this copy of a scorecard from the Dojo Score Lab on scoresamurai.com. This is the only email you will get from us unless you write back.",
    ""
  ].concat(labLines_(d)).concat([
    "",
    "It is an estimate from a practice test, not an official score. In each section, the first module decides which second module a student gets, and the harder one opens the top of the scale.",
    "",
    "Patterns marked as costing points: " + (d.traps || "none marked") + ".",
    d.school ? "College check, " + d.school + ": " + d.verdict + "." : "",
    "",
    "If you want the full read, the Dojo Diagnostic is free and written. Sensei Jay reads the missed questions himself and replies within 24 hours: " + LAB_DIAG,
    "",
    "Sensei Jay",
    "Score Samurai LLC",
    "Score Samurai is not affiliated with or endorsed by College Board."
  ]).join("\n");
}
