/**
 * Score Samurai: Dojo Diagnostic intake endpoint. DEPLOYED v8 Oct 22 2026 (optcall), same deployment and /exec URL.
 * Deploy as a Web App from senseijay@scoresamurai.com: Execute as Me, Who has access: Anyone.
 * Paste the deployment URL into diag.js ENDPOINT and the copy inside index.html.
 *
 * What it does on every submission:
 *  1. Appends one row to the "Diagnostic Intake" sheet (created on first run) in the Results Tracker,
 *     so the Funnel sheet has a source of truth for every lead. New columns are added to the header on their own.
 *  2. Emails Sensei the full intake so the per-lead Cowork prompt can build the Brief.
 *  3. Sends the student the confirmation, and sends the parent a separate confirmation written to the parent.
 *  4. Phone alert: runs alert_() when an alert.gs file defines it (ntfy needs a one-time authorization by Sensei first).
 * Replies {ok:true} only after all of that ran, so the site shows "Sent" only when the request landed.
 * Lab posts (source "lab") go to lab_() in lab.gs.
 */

var RESULTS_TRACKER_ID = "1IEXgAuqVQFz3EFHuzgajrlMORgsHR7EB9zHTT69cmgY"; // Results Tracker (Funnel sheet is tab 2)
var INTAKE_SHEET = "Diagnostic Intake";
var SENSEI = "senseijay@scoresamurai.com";
var FROM_NAME = "Sensei Jay, Score Samurai";
var BOOK = "https://calendly.com/senseijay-scoresamurai/dojo-diagnostic";

var FIELDS = [
  "submitted_at", "student_first", "student_last", "student_email", "grade", "school",
  "target_test_date", "recent_score", "math_score", "rw_score", "target_score", "target_colleges", "frustration", "heard",
  "parent_first", "parent_last", "parent_email", "parent_phone",
  "utm_source", "utm_medium", "utm_campaign", "page",
  "role", "utm_content", "utm_term", "gclid", "fbclid", "alert"
];

function doPost(e) {
  var data = {};
  try { data = JSON.parse(e.postData.contents || "{}"); } catch (err) { return out({ ok: false, error: "bad json" }); }
  if (data.website) return out({ ok: true }); // honeypot
  if (data.source === "lab") return out(lab_(data));
  if (!data.student_first || !data.student_email || !data.parent_email) return out({ ok: false, error: "missing" });

  data.alert = typeof alert_ === "function" ? alert_(data) : "not set up";
  var row = FIELDS.map(function (k) { return String(data[k] == null ? "" : data[k]).slice(0, 2000); });
  var sh = sheet_();
  sh.appendRow(row);

  MailApp.sendEmail({
    to: SENSEI,
    subject: "Diagnostic intake: " + data.student_first + " " + data.student_last + " (" + (data.recent_score || "no score") + " to " + (data.target_score || "?") + ")" + (data.role === "parent" ? ", sent by a parent" : ""),
    body: FIELDS.map(function (k) { return k + ": " + (data[k] || ""); }).join("\n"),
    name: "Score Samurai intake"
  });

  var same = String(data.student_email).trim().toLowerCase() === String(data.parent_email).trim().toLowerCase();
  if (!same) {
    MailApp.sendEmail({
      to: data.student_email,
      replyTo: SENSEI,
      subject: "Your Dojo Diagnostic is on its way",
      body: studentBody_(data),
      name: FROM_NAME
    });
  }
  MailApp.sendEmail({
    to: data.parent_email,
    replyTo: SENSEI,
    subject: "Your Dojo Diagnostic is on its way",
    body: parentBody_(data),
    name: FROM_NAME
  });

  return out({ ok: true });
}

function studentBody_(d) {
  return "Hi " + d.student_first + ",\n\n" +
    "Your Dojo Diagnostic is on its way. I read every one personally and write back within 24 hours, to this address and to " + d.parent_email + ".\n\n" +
    "If you have a recent Bluebook practice test, reply to this email with a screenshot of the results page, or the questions you missed, and the read gets sharper.\n\n" +
    "If you'd like to talk it through, you can book an optional 15-minute Zoom with me here: " + BOOK + ". Your written Diagnostic is on its way within 24 hours either way.\n\n" +
    "Sensei Jay\nScore Samurai\nscoresamurai.com";
}

/* PARENT CONFIRMATION. Written to the parent, not a copy of the student's email. plain_gate --parent. */
function parentBody_(d) {
  var s = String(d.student_first || "").trim() || "your student";
  var hi = String(d.parent_first || "").trim();
  return (hi ? "Hello " + hi + "," : "Hello,") + "\n\n" +
    (d.role === "parent" ? "Thank you for requesting a Dojo Diagnostic for " + s + "." : s + " has requested a Dojo Diagnostic and listed you as the parent to copy.") +
    " I read every request myself, and the written Diagnostic will reach you and " + s + " within 24 hours.\n\n" +
    "It shows where " + s + "'s score stands, where it needs to be and what to fix first.\n\n" +
    "If " + s + " has taken a recent practice test in Bluebook, the College Board's testing app, a screenshot of the results page makes the read sharper. Reply to this email with it.\n\n" +
    "If you'd like to talk it through, you can book an optional 15-minute Zoom with me here: " + BOOK + ". Your written Diagnostic is on its way within 24 hours either way.\n\n" +
    "Sensei Jay\nScore Samurai LLC\nscoresamurai.com";
}

function doGet() { return out({ ok: true, service: "Score Samurai intake" }); }

function sheet_() {
  var ss = SpreadsheetApp.openById(RESULTS_TRACKER_ID);
  var sh = ss.getSheetByName(INTAKE_SHEET);
  if (!sh) {
    sh = ss.insertSheet(INTAKE_SHEET);
    sh.appendRow(FIELDS);
    sh.setFrozenRows(1);
  }
  head_(sh, FIELDS);
  return sh;
}

/* Adds any new column names to the end of the header row. Existing columns never move.
   The sheet grows first when it is narrower than the header (Lab Scorecards was 27 columns wide). */
function head_(sh, names) {
  var maxc = sh.getMaxColumns();
  if (maxc < names.length) sh.insertColumnsAfter(maxc, names.length - maxc);
  if (sh.getLastColumn() < names.length) sh.getRange(1, 1, 1, names.length).setValues([names]);
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
