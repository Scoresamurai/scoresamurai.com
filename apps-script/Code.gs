/**
 * Score Samurai: Dojo Diagnostic intake endpoint.
 * Deploy as a Web App from senseijay@scoresamurai.com: Execute as Me, Who has access: Anyone.
 * Paste the deployment URL into diag.js ENDPOINT.
 *
 * What it does on every submission:
 *  1. Appends one row to the "Diagnostic Intake" sheet (created on first run) in the Results Tracker,
 *     so the Funnel sheet has a source of truth for every lead.
 *  2. Emails Sensei the full intake so the per-lead Cowork prompt can build the Brief.
 *  3. Sends the family the confirmation email (student and parent), same promise as the site: within one business day.
 * Nothing else. No third parties.
 */

var RESULTS_TRACKER_ID = "1IEXgAuqVQFz3EFHuzgajrlMORgsHR7EB9zHTT69cmgY"; // Results Tracker (Funnel sheet is tab 2)
var INTAKE_SHEET = "Diagnostic Intake";
var SENSEI = "senseijay@scoresamurai.com";
var FROM_NAME = "Sensei Jay, Score Samurai";

var FIELDS = [
  "submitted_at", "student_first", "student_last", "student_email", "grade", "school",
  "target_test_date", "recent_score", "math_score", "rw_score", "target_score", "target_colleges", "frustration", "heard",
  "parent_first", "parent_last", "parent_email", "parent_phone",
  "utm_source", "utm_medium", "utm_campaign", "page"
];

function doPost(e) {
  var data = {};
  try { data = JSON.parse(e.postData.contents || "{}"); } catch (err) { return out({ ok: false, error: "bad json" }); }
  if (data.website) return out({ ok: true }); // honeypot
  if (!data.student_first || !data.student_email || !data.parent_email) return out({ ok: false, error: "missing" });

  var row = FIELDS.map(function (k) { return data[k] || ""; });
  var sh = sheet_();
  sh.appendRow(row);

  MailApp.sendEmail({
    to: SENSEI,
    subject: "Diagnostic intake: " + data.student_first + " " + data.student_last + " (" + (data.recent_score || "no score") + " to " + (data.target_score || "?") + ")",
    body: FIELDS.map(function (k) { return k + ": " + (data[k] || ""); }).join("\n"),
    name: "Score Samurai intake"
  });

  var greeting = "Hi " + data.student_first + ",";
  var body = greeting + "\n\n" +
    "Your Dojo Diagnostic is on its way. I read every one personally and write back within one business day, to this address and to " + data.parent_email + ".\n\n" +
    "If you have a recent Bluebook practice test, reply to this email with a screenshot of the results page, or the questions you missed, and the read gets sharper.\n\n" +
    "If you would rather talk it through, there is a free fifteen-minute call on Zoom: https://calendly.com/senseijay-scoresamurai/dojo-diagnostic\n\n" +
    "Sensei Jay\nScore Samurai\nscoresamurai.com";

  MailApp.sendEmail({
    to: data.student_email,
    cc: data.parent_email,
    replyTo: SENSEI,
    subject: "Your Dojo Diagnostic is on its way",
    body: body,
    name: FROM_NAME
  });

  return out({ ok: true });
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
  return sh;
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
