/*
 * See The Dojo (DOJODEMO, Nov 5 2026): the sample family from Content / Dojo design Nov 4 (Parent.dc.html),
 * in the shape the family API sends. family.js renders it read-only: no sign-in, no billing, no API call.
 * The clock is held at the design's day (Nov 4 2026) so every count matches the design.
 * Belt order and floors are the engine's (Code.gs BELT_ORDER and BELT_FLOOR).
 */
window.DOJO_SAMPLE = {
  today: '2026-11-04',
  family: {
    ok: true, role: 'parent', viewer: 'Sample', student: 'Maya',
    plan: { name: 'Build', sessions: 9, started: '2026-11-03', startedLabel: 'November 3', testDate: '2026-12-05', testDateLabel: 'December 5', topUps: 1 },
    belt: {
      current: 'White', placed: 'White', score: 1060, next: 'Green', nextFloor: 1100,
      order: ['White', 'Green', 'Blue', 'Brown', 'Black'],
      floors: { White: 0, Green: 1100, Blue: 1250, Brown: 1350, Black: 1450 },
      earned: [{ belt: 'White', on: '2026-11-03' }], target: 'Green, then Blue in the spring', today: 1060
    },
    scores: [
      { kind: 'Baseline', test: 'Bluebook Test 6', date: '2026-11-01', total: 1060, math: 540, rw: 520, due: '' },
      { kind: 'Midpoint', test: '', date: '', total: null, math: null, rw: null, due: '2026-11-16' },
      { kind: 'Final', test: '', date: '', total: null, math: null, rw: null, due: '' }
    ],
    last: { start: '2026-11-04T21:00:00.000Z', number: 5, summary: 'Worked the top two Roadmap moves. Homework: 12 questions, due before Monday.' },
    sessions: { bought: 10, used: 5, remaining: 5, credits: [] },
    validUntil: '2027-03-02', validUntilLabel: 'Mar 2',
    next: [{ start: '2026-11-09T21:00:00.000Z', minutes: 50 }],
    zoom: '',
    roadmap: [
      { order: 1, section: 'Reading and Writing', move: "What's Left Standing", description: 'A ruled-out answer coming back in new words. Was costing about 30 points.', status: 'Closed', note: '', struck: '2026-11-04', checked: '2026-11-13', getsBelt: 'Green' },
      { order: 2, section: 'Math', move: 'What the Slopes Are Doing', description: 'A system solved when the slopes already answered it. Desmos, Technique 2. Costing about 20 points.', status: 'Working', note: '', struck: '', checked: '', getsBelt: 'Green' },
      { order: 3, section: 'Reading and Writing', move: 'The Tense Frame', description: 'A verb that sounds fine but breaks the time frame. Costing about 20 points.', status: 'Next', note: '', struck: '', checked: '', getsBelt: '' }
    ],
    roadmapLink: '',
    updates: [{
      sent: '2026-11-06', sentLabel: 'Nov 6', title: "Maya's week at The Dojo", summary: '',
      text: 'Two sessions this week, both on the first Roadmap move. By Wednesday Maya was catching the ruled-out answer before it came back in new words, which is the whole move. The check lands next week, eight to twelve days after the fix, which is when it sticks.\n\nHomework came in complete. Next week: the slopes move in Math, with the midpoint practice test due Nov 16.'
    }],
    contact: 'senseijay@scoresamurai.com'
  }
};
