/** Phone alert for every Dojo Diagnostic request, through the Pushover e-mail alias. No API key needed. Oct 20 2026. */
var PUSHOVER_EMAIL = 'PUSHOVER_ALIAS_REDACTED';

function alert_(d) {
  try {
    MailApp.sendEmail({ to: PUSHOVER_EMAIL, subject: 'New Dojo Diagnostic request', body: 'Grade: ' + (d.grade || '?') + '\nTest date: ' + (d.target_test_date || '?') + '\nTarget score: ' + (d.target_score || '?') });
    return 'pushover email';
  } catch (err) { return 'pushover error: ' + String(err).slice(0, 120); }
}

function authorizeAlert() {
  Logger.log(alert_({ grade: 'test', target_test_date: 'test', target_score: 'test' }));
}
