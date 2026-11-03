/**
 * Score Samurai: Diagnostic intake endpoint. DEPLOYED Oct 22 2026 (catchup-site hardening on top of optcall v8), same deployment and /exec URL.
 * Deploy as a Web App from senseijay@scoresamurai.com: Execute as Me, Who has access: Anyone.
 * Paste the deployment URL into diag.js ENDPOINT and the copy inside index.html.
 *
 * What it does on every submission:
 *  1. Appends one row to the "Diagnostic Intake" sheet (created on first run) in the Results Tracker,
 *     so the Funnel sheet has a source of truth for every lead. New columns are added to the header on their own.
 *  2. Emails Sensei the full intake so the per-lead Cowork prompt can build the Brief.
 *  3. Sends the student the confirmation, and sends the parent a separate confirmation written to the parent.
 *  4. Phone alert: runs alert_() when an alert.gs file defines it (ntfy needs a one-time authorization by Sensei first).
 *  5. Funnel: opens a lead row (Date, Lead Name, Source) in the Funnel tab for every real intake; senseijay+ test addresses are skipped (DIAGALEXA Nov 2 2026).
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

/* HARDENING, catchup-site Oct 22 2026: 8 KB body cap, strict address check, 3 per address per hour, formula-safe cells. */
var MAX_BODY_BYTES = 8192;
var RATE_LIMIT = 3, RATE_WINDOW_MS = 3600 * 1000;

/* One address, plain format only: no commas, spaces, quotes or angle brackets, so one submitted address can only ever be one recipient. */
function okMail_(a) {
  a = String(a == null ? "" : a).trim();
  return a.length <= 254 && /^[A-Za-z0-9._%+'\-]+@[A-Za-z0-9\-]+(\.[A-Za-z0-9\-]+)*\.[A-Za-z]{2,}$/.test(a);
}

/* A cell that starts with = + - @ (or tab / carriage return) would be read as a formula. A leading apostrophe makes it text. */
function cell_(v) {
  var s = String(v == null ? "" : v);
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

/* True when every address in the list has fewer than RATE_LIMIT accepted requests in the last hour; then counts this request for each.
   Counts live in CacheService (script cache), keyed by a hash of the lower-cased address. */
function allow_(addrs) {
  var cache = CacheService.getScriptCache(), now = Date.now(), keys = [], seen = {};
  addrs.forEach(function (a) {
    var k = "rl:" + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(a).trim().toLowerCase()));
    if (!seen[k]) { seen[k] = 1; keys.push(k); }
  });
  var lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    var stored = cache.getAll(keys), fresh = {};
    for (var i = 0; i < keys.length; i++) {
      var hits = [];
      try { hits = JSON.parse(stored[keys[i]] || "[]"); } catch (err) { hits = []; }
      hits = hits.filter(function (t) { return now - t < RATE_WINDOW_MS; });
      if (hits.length >= RATE_LIMIT) return false;
      hits.push(now);
      fresh[keys[i]] = JSON.stringify(hits);
    }
    cache.putAll(fresh, 3600);
    return true;
  } finally { lock.releaseLock(); }
}

function doPost(e) {
  var raw = (e && e.postData && e.postData.contents) || "";
  if (Utilities.newBlob(raw).getBytes().length > MAX_BODY_BYTES) return out({ ok: false, error: "too large" });
  var data = {};
  try { data = JSON.parse(raw || "{}"); } catch (err) { return out({ ok: false, error: "bad json" }); }
  if (!data || typeof data !== "object" || Array.isArray(data)) return out({ ok: false, error: "bad json" });
  if (data.website) return out({ ok: true }); // honeypot
  if (data.source === "lab") return out(lab_(data));
  if (!data.student_first || !data.student_email || !data.parent_email) return out({ ok: false, error: "missing" });
  if (!okMail_(data.student_email) || !okMail_(data.parent_email)) return out({ ok: false, error: "email" });
  data.student_email = String(data.student_email).trim();
  data.parent_email = String(data.parent_email).trim();
  if (!allow_([data.student_email, data.parent_email])) return out({ ok: false, error: "rate" });

  data.alert = typeof alert_ === "function" ? alert_(data) : "not set up";
  var row = FIELDS.map(function (k) { return cell_(String(data[k] == null ? "" : data[k]).slice(0, 2000)); });
  var sh = sheet_();
  sh.appendRow(row);
  funnel_(data);

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
      subject: "Your Diagnostic is on its way",
      body: studentBody_(data),
      name: FROM_NAME
    });
  }
  MailApp.sendEmail({
    to: data.parent_email,
    replyTo: SENSEI,
    subject: "Your Diagnostic is on its way",
    body: parentBody_(data),
    name: FROM_NAME
  });

  return out({ ok: true });
}

function studentBody_(d) {
  return "Hi " + d.student_first + ",\n\n" +
    "Your Diagnostic is on its way. I read every one personally and write back within 24 hours, to this address and to " + d.parent_email + ".\n\n" +
    "If you have a recent Bluebook practice test, reply to this email with a screenshot of the results page, or the questions you missed, and the read gets sharper.\n\n" +
    "If you'd like to talk it through, you can book an optional 15-minute Zoom with me here: " + BOOK + ". Your written Diagnostic is on its way within 24 hours either way.\n\n" +
    "Sensei Jay\nScore Samurai\nscoresamurai.com";
}

/* PARENT CONFIRMATION. Written to the parent, not a copy of the student's email. plain_gate --parent. */
function parentBody_(d) {
  var s = String(d.student_first || "").trim() || "your student";
  var hi = String(d.parent_first || "").trim();
  return (hi ? "Hello " + hi + "," : "Hello,") + "\n\n" +
    (d.role === "parent" ? "Thank you for requesting a Diagnostic for " + s + "." : s + " has requested a Diagnostic and listed you as the parent to copy.") +
    " I read every request myself, and the written Diagnostic will reach you and " + s + " within 24 hours.\n\n" +
    "It shows where " + s + "'s score stands, where it needs to be and what to fix first.\n\n" +
    "If " + s + " has taken a recent practice test in Bluebook, the College Board's testing app, a screenshot of the results page makes the read sharper. Reply to this email with it.\n\n" +
    "If you'd like to talk it through, you can book an optional 15-minute Zoom with me here: " + BOOK + ". Your written Diagnostic is on its way within 24 hours either way.\n\n" +
    "Sensei Jay\nScore Samurai LLC\nscoresamurai.com";
}

/* FUNNEL, DIAGALEXA Nov 2 2026. Every real intake also opens a lead row in the Funnel tab: A Date, B Lead Name, C Source.
   D to F (Diagnostic Email Sent, Call Booked, Package Purchased) stay Sensei's to fill. Intakes from senseijay+ test
   addresses are skipped. The row goes in the first empty A cell, because the tab's summary block (I1:J5) would push
   appendRow below it. A failure here is logged and never blocks the intake. */
var FUNNEL_SHEET = "Funnel";

function isTest_(d) {
  return /^senseijay\+/i.test(String(d.student_email || "")) || /^senseijay\+/i.test(String(d.parent_email || ""));
}

function funnelSource_(d) {
  var bits = [];
  if (d.utm_source) bits.push(String(d.utm_source) + (d.utm_medium ? " / " + d.utm_medium : "") + (d.utm_content ? " (" + d.utm_content + ")" : ""));
  if (d.heard) bits.push("heard: " + d.heard);
  return bits.join("; ") || "site";
}

function funnel_(d) {
  try {
    if (isTest_(d)) return "test, skipped";
    var sh = SpreadsheetApp.openById(RESULTS_TRACKER_ID).getSheetByName(FUNNEL_SHEET);
    if (!sh) return "no Funnel tab";
    var name = (String(d.student_first || "").trim() + " " + String(d.student_last || "").trim()).trim();
    var when = d.submitted_at ? new Date(d.submitted_at) : new Date();
    if (isNaN(when.getTime())) when = new Date();
    var ab = sh.getRange(2, 1, Math.max(sh.getLastRow(), 2), 2).getValues();
    var r = 2;
    for (var i = 0; i < ab.length; i++) {
      if (ab[i][0] === "" && ab[i][1] === "") { r = i + 2; break; }
      if (String(ab[i][1]) === name && ab[i][0] instanceof Date && Math.abs(ab[i][0] - when) < 86400000) return "already there, row " + (i + 2);
      r = i + 3;
    }
    sh.getRange(r, 1, 1, 3).setValues([[when, cell_(name), cell_(funnelSource_(d))]]);
    sh.getRange(r, 1).setNumberFormat("m/d/yyyy");
    return "row " + r;
  } catch (err) {
    console.error("funnel_: " + err);
    return "error";
  }
}

/* Run by hand from the editor (pick backfillFunnel, then Run): opens a Funnel row for every real Diagnostic Intake row
   that has none yet. Safe to re-run; a lead already in the Funnel is left alone. */
function backfillFunnel() {
  var sh = sheet_(), vals = sh.getDataRange().getValues(), head = vals[0], out = [];
  for (var i = 1; i < vals.length; i++) {
    var d = {};
    head.forEach(function (k, j) { d[k] = vals[i][j]; });
    if (!d.student_first) continue;
    out.push(d.student_first + " " + d.student_last + ": " + funnel_(d));
  }
  console.log(out.join("\n"));
  return out;
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
