/*
 * The Dojo family page (DOJOBUILD, Nov 5 2026: rebuilt to the Nov 4 design, Content / Dojo design Nov 4).
 * Reads one family's data from the Families workbook through the Apps Script web app. The page writes nothing
 * to the workbook. Sign-in is a one-time link (token in the URL fragment, never sent to a server except the
 * script); the script trades it for a 30-day session kept in this browser only. Sign-in, sessions, cache and
 * billing logic are as shipped in PHASE2LIVE. Everything is rendered with textContent, never innerHTML.
 * Every number comes from the API; an element whose data is empty is not drawn.
 */
(function () {
  'use strict';

  var API = 'https://script.google.com/macros/s/AKfycbxEGoKdBf3azMyoa5kMxrXKTV8m0nMrCI3Vt_lzU_lH3IGe5yPDh1Wuhjx-LtzHtH2f/exec';
  var KEY = 'ss_family_v1';
  var CONTACT = 'senseijay@scoresamurai.com';
  var TZ = 'America/New_York';
  var WARRIOR = 'warrior-dojo.webp';
  // Belt colours from the Nov 4 design. Which belts exist, and their floors, come from the engine through the API.
  var BELT_COLOR = { White: '#f8f3e7', Yellow: '#e2b93b', Green: '#2f8f4e', Blue: '#1f4e9c', Brown: '#6b3f23', Black: '#1f1512' };
  var SIGNIN_BELTS = ['White', 'Green', 'Blue', 'Brown', 'Black']; // the engine's BELT_ORDER, for the sign-in screen before any data loads
  var NUM = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
  var ORD = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var SIGNED_OUT = 'Your session has ended. Enter your email for a new sign-in link.';

  var app = document.getElementById('app');
  // See The Dojo (/dojo/see/, DOJODEMO): sample.js sets DOJO_SAMPLE before this file. The page then renders that
  // read-only parent view, with the clock held at the sample's day, and never calls the API or touches a session.
  var SAMPLE = window.DOJO_SAMPLE || null;

  /* ---------------------------------------------------------------- helpers */

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (attrs[k] === null || attrs[k] === undefined || attrs[k] === false) return;
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'class') n.className = attrs[k];
      else if (k === 'on') Object.keys(attrs.on).forEach(function (e) { n.addEventListener(e, attrs.on[e]); });
      else n.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }

  function https(u) { return typeof u === 'string' && /^https:\/\/[^\s"'<>]+$/.test(u) ? u : ''; }
  function money(n) { return '$' + Number(n || 0).toLocaleString('en-US'); }
  function plural(n, one, many) { return n === 1 ? one : many; }
  function word(n) { return NUM[n] || String(n); }
  function has(v) { return v !== null && v !== undefined && v !== ''; }

  // Dates: 'yyyy-mm-dd' strings are calendar days (no time zone); ISO date-times are shown in Eastern time.
  function day(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12)) : null;
  }
  function addDays(d, n) { return new Date(d.getTime() + n * 86400000); }
  function short(d) { return MON[d.getUTCMonth()] + ' ' + d.getUTCDate(); }
  function long(d) { return MONTH[d.getUTCMonth()] + ' ' + d.getUTCDate(); }
  function weekday(d) { return DAY[d.getUTCDay()]; }
  function todayET() { if (SAMPLE && SAMPLE.today) return day(SAMPLE.today); return day(new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())); }
  function daysUntil(d) { return Math.round((d - todayET()) / 86400000); }
  function range(a, b) { return a.getUTCMonth() === b.getUTCMonth() ? short(a) + ' to ' + b.getUTCDate() : short(a) + ' to ' + short(b); }
  function finalWindow(test) { return { from: addDays(test, -12), to: addDays(test, -10) }; } // last full practice test 10 to 12 days out
  function et(isoTime, opts) { return new Intl.DateTimeFormat('en-US', Object.assign({ timeZone: TZ }, opts)).format(new Date(isoTime)); }
  function whenLong(isoTime) {
    return et(isoTime, { weekday: 'long' }) + ', ' + et(isoTime, { month: 'short', day: 'numeric' }) + ' · ' + et(isoTime, { hour: 'numeric', minute: '2-digit' }) + ' ET';
  }
  function whenShort(isoTime) {
    return et(isoTime, { weekday: 'short' }) + ' ' + et(isoTime, { month: 'short', day: 'numeric' }) + ' · ' + et(isoTime, { hour: 'numeric', minute: '2-digit' });
  }
  function sentence(s) { s = String(s || '').trim(); return s && !/[.!?]$/.test(s) ? s + '.' : s; }

  function store(v) {
    try {
      if (v) localStorage.setItem(KEY, JSON.stringify(v));
      else localStorage.removeItem(KEY);
    } catch (e) { /* private mode: the session lasts this tab only */ }
    memory = v || null;
  }
  var memory = null;
  function stored() {
    var v = memory;
    try { v = JSON.parse(localStorage.getItem(KEY) || 'null') || memory; } catch (e) { /* keep memory */ }
    if (!v || !/^[0-9a-f]{64}$/.test(v.s || '')) return null;
    if (v.exp && Date.parse(v.exp) <= Date.now()) { store(null); return null; }
    return v;
  }

  function call(action, extra) {
    var body = { portal: 'v1', action: action };
    Object.keys(extra || {}).forEach(function (k) { body[k] = extra[k]; });
    return fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
      redirect: 'follow',
      credentials: 'omit',
      cache: 'no-store'
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  function show(nodes, cls) {
    document.body.className = cls || '';
    app.textContent = '';
    nodes.forEach(function (n) { if (n) app.appendChild(n); });
    window.scrollTo(0, 0);
  }

  function warrior(cls) { return el('img', { src: WARRIOR, alt: '', 'aria-hidden': 'true', class: cls || null, width: '680', height: '912', decoding: 'async' }); }
  function wordmark() { return el('span', { class: 'wordmark', text: 'Score Samurai' }); }
  function brandline() { return el('span', { class: 'brandline', text: 'The SAT is a discipline. Master it in The Dojo.' }); }

  /* ---------------------------------------------------------------- sign-in screens (Main) */

  function gate(cardKids) {
    var chips = el('div', { class: 'chips', 'aria-hidden': 'true' }, SIGNIN_BELTS.map(function (b) {
      var c = el('span', { class: 'c' });
      c.style.background = BELT_COLOR[b];
      if (b === 'Black') c.style.border = '1px solid #c9a24a';
      return c;
    }).concat([el('span', { class: 't', text: word(SIGNIN_BELTS.length) + ' belts. One test.' })]));
    return el('div', { class: 'gate floor' }, [
      el('div', { class: 'frame', 'aria-hidden': 'true' }),
      el('div', { class: 'gate-top' }, [
        el('div', { class: 'brand' }, [wordmark(), brandline()]),
        el('span', { class: 'who', text: 'Families and students' })
      ]),
      el('div', { class: 'gate-body' }, [
        el('div', { class: 'gate-pitch' }, [
          el('h2', null, ['Enter', el('br'), 'The Dojo.']),
          el('p', { text: 'Sessions, belt, Roadmap, the Friday update and billing. The Dojo, built from the Diagnostic and rewritten as belts are earned.' }),
          chips
        ]),
        el('div', { class: 'card' }, cardKids),
        el('div', { class: 'gate-warrior' }, [warrior()])
      ]),
      el('div', { class: 'gate-foot' }, [
        el('span', null, ['Sensei Jay. ', el('a', { href: 'mailto:' + CONTACT, text: CONTACT })]),
        el('span', { class: 'see', text: 'See you in The Dojo.' })
      ])
    ]);
  }

  function signInScreen(notice) {
    document.title = 'The Dojo | Score Samurai';
    var input = el('input', { type: 'email', id: 'email', name: 'email', autocomplete: 'email', required: true, inputmode: 'email', spellcheck: 'false', placeholder: 'you@example.com' });
    var btn = el('button', { type: 'submit', class: 'btn', text: 'Send my link' });
    var form = el('form', { novalidate: true, on: { submit: function (e) {
      e.preventDefault();
      var email = input.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { input.focus(); input.setAttribute('aria-invalid', 'true'); return; }
      btn.disabled = true;
      btn.textContent = 'Sending';
      call('requestLink', { email: email })
        .then(function () { inboxScreen(email); })
        .catch(function () { btn.disabled = false; btn.textContent = 'Send my link'; errorScreen(function () { signInScreen(); }); });
    } } }, [
      notice ? el('p', { class: 'note', role: 'status', text: notice }) : null,
      el('div', { class: 'head' }, [
        el('h1', { text: 'Sign in' }),
        el('p', { text: 'Enter the email Sensei Jay has on file. A one-time link lands in your inbox and works for 30 minutes. No password, ever.' })
      ]),
      el('div', { class: 'field' }, [el('label', { for: 'email', text: 'Email' }), input]),
      btn,
      el('p', { class: 'small', text: 'Students use the email from the intake and get Your Dojo: sessions, belt and Roadmap, no billing.' }),
      el('p', { class: 'fine' }, ['Not a family yet? ', el('a', { href: 'https://scoresamurai.com/diagnostic/', text: 'Start with the free Diagnostic.' })])
    ]);
    show([gate([form])], 'signin');
  }

  function inboxScreen(email) {
    show([gate([el('div', { class: 'stack' }, [
      el('div', { class: 'head' }, [
        el('h1', { text: 'Check your inbox' }),
        el('p', { text: 'If ' + email + ' is on file, a sign-in link is on its way. It works once and expires in 30 minutes.' })
      ]),
      el('p', { class: 'small' }, ['Nothing after a few minutes? Check spam, or email ', el('a', { href: 'mailto:' + CONTACT, text: CONTACT }), '.']),
      el('button', { type: 'button', class: 'btn line', text: 'Use a different email', on: { click: function () { signInScreen(); } } })
    ])])], 'signin');
  }

  function errorScreen(retry) {
    show([gate([el('div', { class: 'stack' }, [
      el('div', { class: 'head' }, [
        el('h1', { text: "The Dojo didn't load" }),
        el('p', { text: 'Check your connection and try again.' })
      ]),
      el('button', { type: 'button', class: 'btn', text: 'Try again', on: { click: retry } })
    ])])], 'signin');
  }

  /* ---------------------------------------------------------------- the board */

  function load() {
    var s = stored();
    if (!s) return signInScreen();
    call('family', { session: s.s }).then(function (d) {
      if (!d.ok) { store(null); return signInScreen(SIGNED_OUT); }
      render(d, s);
    }).catch(function () { errorScreen(load); });
  }

  function signOut() {
    var s = stored();
    store(null);
    if (s) call('signOut', { session: s.s }).catch(function () { /* already cleared here */ });
    signInScreen("You're signed out.");
  }

  function outButton() { if (SAMPLE) return null; return el('button', { type: 'button', class: 'out', text: 'Sign out', on: { click: signOut } }); }

  function beltState(d) {
    var order = (d.belt && d.belt.order) || [];
    var floors = (d.belt && d.belt.floors) || {};
    var cur = order.indexOf(d.belt.current);
    var placed = order.indexOf(d.belt.placed);
    var earnedOn = {};
    (d.belt.earned || []).forEach(function (e) { if (e.on) earnedOn[e.belt] = e.on; });
    var today = has(d.belt.today) ? Number(d.belt.today) : null;
    return order.map(function (b, i) {
      var st = cur < 0 ? 'ahead' : i <= cur ? (placed >= 0 && i < placed ? 'skipped' : 'earned') : i === cur + 1 ? 'next' : 'ahead';
      return { belt: b, state: st, floor: floors[b], on: earnedOn[b] || '', placed: b === d.belt.placed, last: i === order.length - 1,
        away: st === 'next' && today !== null && floors[b] - today > 0 ? floors[b] - today : null };
    });
  }

  function movesFor(d, belt) {
    var nums = (d.roadmap || []).filter(function (m) { return m.getsBelt === belt; }).map(function (m) { return m.order; });
    if (!nums.length) return '';
    var list = nums.length === 1 ? String(nums[0]) : nums.slice(0, -1).join(', ') + ' and ' + nums[nums.length - 1];
    return (nums.length === 1 ? 'Move ' : 'Moves ') + list + (nums.length === 1 ? ' gets it.' : ' get it.');
  }

  function beltTile(t, d, student) {
    var band = el('span', { class: 'band' });
    band.style.background = BELT_COLOR[t.belt] || 'transparent';
    if (t.belt === 'Black') band.style.border = '1px solid #c9a24a';
    var s = '';
    if (t.state === 'earned' && t.on) s = student ? short(day(t.on)) : 'Earned ' + short(day(t.on)) + (t.placed ? '\non the Diagnostic' : '');
    else if (t.state === 'skipped') s = student ? 'Skipped' : 'Already past it.\nSkipped on the way up.';
    else if (t.state === 'next') {
      if (student) s = t.away !== null ? t.away + ' pts away' : '';
      else {
        var g = movesFor(d, t.belt);
        s = 'Next.' + (t.away !== null ? ' ' + t.away + ' points away.' : '') + (g ? '\n' + g : '');
      }
    } else if (t.state === 'ahead' && has(t.floor)) s = t.last ? t.floor + (student ? '+' : ' and up') : String(t.floor);
    return el('div', { class: 'belt ' + t.state }, [band, el('span', { class: 'n', text: t.belt }), s ? el('span', { class: 's', text: s }) : null]);
  }

  function wallSection(d, student) {
    var tiles = beltState(d);
    if (!tiles.length) return null;
    var moves = d.roadmap || [];
    var struck = moves.filter(function (m) { return m.status === 'Closed'; }).length;
    var head;
    if (student) {
      var up = tiles.filter(function (t) { return t.state === 'earned'; }).length;
      var togo = tiles.filter(function (t) { return t.state === 'next' || t.state === 'ahead'; }).length;
      var ttl = up ? word(up) + ' ' + plural(up, 'belt', 'belts') + ' up.' + (togo ? ' ' + word(togo) + ' to go.' : '') : '';
      head = el('div', { class: 'hd' }, [el('div', { class: 't' }, [el('span', { class: 'eyebrow', text: 'The Wall' }), ttl ? el('span', { class: 'ttl', text: ttl }) : null])]);
    } else {
      head = el('div', { class: 'hd' }, [
        el('div', { class: 't' }, [el('span', { class: 'eyebrow', text: 'The Wall' }), el('span', { class: 'ttl', text: 'Belts earned. Belts ahead.' })]),
        el('span', { class: 'why', text: "A belt is earned each time a set of the test's moves stops working on " + d.student + '.' })
      ]);
    }
    var foot = null;
    if (!student) {
      var bits = [];
      if (struck) {
        var work = moves.filter(function (m) { return m.status === 'Working'; })[0];
        var idx = work ? moves.indexOf(work) + 1 : 0;
        bits.push(el('span', null, [el('b', { text: 'Moves struck: ' + struck + '.' }), ' ' + word(struck) + " of the test's moves no longer " + plural(struck, 'works', 'work') + ' on ' + d.student + '.' +
          (work && ORD[idx] ? ' The ' + ORD[idx] + ' is in the work.' : '')]));
      }
      var test = day(d.plan.testDate);
      if (d.belt.target && test) bits.push(el('span', { text: 'Target belt for ' + long(test) + ': ' + sentence(d.belt.target) }));
      if (bits.length) foot = el('div', { class: 'ft' }, bits);
    }
    return el('section', { id: 'wall', class: 'wall floor', 'aria-label': 'The Wall' }, [head, el('div', { class: 'belts' }, tiles.map(function (t) { return beltTile(t, d, student); })), foot]);
  }

  function planLine(d) {
    var lede = [];
    var tu = Number(d.plan.topUps) || 0;
    if (d.plan.name) lede.push(d.plan.name + ' Plan' + (d.plan.sessions ? ', ' + d.plan.sessions + ' sessions' : '') +
      (tu ? ', plus ' + tu + ' Top-Up ' + plural(tu, 'Session', 'Sessions') : '') + '.');
    if (d.plan.startedLabel) lede.push('Started ' + d.plan.startedLabel + '.');
    var test = day(d.plan.testDate);
    if (test) lede.push('Test date: ' + weekday(test) + ', ' + long(test) + '.');
    return lede.join(' ');
  }

  function beltCard(d) {
    if (!d.belt.current) return null;
    var sw = el('span', { class: 'sw', 'aria-hidden': 'true' });
    sw.style.background = BELT_COLOR[d.belt.current] || 'transparent';
    var line = [];
    if (has(d.belt.today)) line.push(d.belt.today + ' today.');
    if (d.belt.next) line.push(d.belt.next + ' at ' + d.belt.nextFloor + '.');
    return el('div', { class: 'beltcard' }, [sw, el('div', null, [el('b', { text: d.belt.current + ' Belt' }), line.length ? el('span', { class: 's', text: line.join(' ') }) : null])]);
  }

  function nextSessionNo(d) { return d.sessions.bought ? 'Session ' + (d.sessions.used + 1) + ' of ' + d.sessions.bought : ''; }

  function zoomLink(d, cls) {
    var z = https(d.zoom);
    return z ? el('a', { class: cls, href: z, target: '_blank', rel: 'noopener noreferrer', text: 'Join Zoom' }) : null;
  }

  function trio(d) {
    var cards = [];
    var s = d.sessions;
    var bars = null;
    if (s.bought) {
      bars = el('div', { class: 'bars', 'aria-hidden': 'true' });
      for (var i = 0; i < Math.min(s.bought, 24); i++) bars.appendChild(el('span', { class: i < s.remaining ? 'on' : '' }));
    }
    var c = (s.credits || []).length;
    var valid = day(d.validUntil);
    cards.push(el('div', { class: 'stat left' }, [
      el('span', { class: 'eyebrow', text: 'Sessions left' }),
      el('span', { class: 'big' }, [String(s.remaining), s.bought ? el('small', { text: ' of ' + s.bought }) : null]),
      bars,
      el('span', { class: 'sub', text: (valid ? 'Valid until ' + long(valid) + '. ' : '') + c + ' make-up ' + plural(c, 'credit', 'credits') + '.' })
    ]));
    var test = day(d.plan.testDate);
    if (test && daysUntil(test) >= 0) {
      var n = daysUntil(test), w = finalWindow(test);
      cards.push(el('div', { class: 'stat' }, [
        el('span', { class: 'eyebrow', text: 'Test day' }),
        el('span', { class: 'big' }, [String(n), el('small', { text: ' ' + plural(n, 'day', 'days') })]),
        el('span', { class: 'sub', text: weekday(test) + ', ' + long(test) + '.' + (todayET() <= w.to ? ' Last full practice test lands ' + range(w.from, w.to) + ', never the week of.' : '') })
      ]));
    }
    var scored = (d.scores || []).filter(function (x) { return has(x.total) && x.date; });
    if (scored.length) {
      var l = scored[scored.length - 1];
      var plan = (d.scores || []).filter(function (x) { return !has(x.total) && x.due && day(x.due) >= todayET(); })[0];
      var sub = [l.kind, l.test, short(day(l.date))].filter(Boolean).join(', ') + '.';
      if (has(l.math) && has(l.rw)) sub += ' Math ' + l.math + ', Reading and Writing ' + l.rw + '.';
      if (plan) sub += ' ' + (plan.kind ? plan.kind + ' test' : 'Next test') + ' due ' + short(day(plan.due)) + '.';
      cards.push(el('div', { class: 'stat' }, [el('span', { class: 'eyebrow', text: 'Score log' }), el('span', { class: 'big', text: String(l.total) }), el('span', { class: 'sub', text: sub })]));
    }
    return el('section', { class: 'trio' }, cards);
  }

  function sessionsSection(d) {
    var n = (d.next || [])[0];
    var next;
    if (n) {
      var sub = [nextSessionNo(d), n.minutes + ' minutes on Zoom'].filter(Boolean).join(' · ');
      next = el('div', { class: 'box ses nextup' }, [
        el('div', { class: 't' }, [el('span', { class: 'eyebrow', text: 'Next' }), el('span', { class: 'w', text: whenLong(n.start) }), el('span', { class: 's', text: sub })]),
        zoomLink(d, 'btn sm')
      ]);
    } else {
      next = el('div', { class: 'box ses nextup' }, [el('div', { class: 't' }, [
        el('span', { class: 'eyebrow', text: 'Next' }),
        el('span', { class: 'w', text: 'No sessions on the calendar yet' }),
        el('span', { class: 's', text: 'Sensei Jay adds them as soon as the next sessions are set.' })
      ])]);
    }
    var last = null;
    if (d.last && d.last.start) {
      last = el('div', { class: 'box ses' }, [el('div', { class: 't' }, [
        el('span', { class: 'eyebrow dim', text: 'Last' }),
        el('span', { class: 'w', text: whenLong(d.last.start) }),
        el('span', { class: 's', text: 'Session ' + d.last.number + '.' + (d.last.summary ? ' ' + d.last.summary : '') })
      ])]);
    }
    return el('section', { id: 'sessions', class: 'sec' }, [el('h2', { text: 'Sessions' }), el('div', { class: 'pair' }, [next, last])]);
  }

  var PILL = { Closed: ['Struck', 'struck'], Working: ['In the work', 'work'], Next: ['Up next', ''] };

  function movesSection(d) {
    var moves = d.roadmap || [];
    var kids = [el('div', { class: 'sec-head' }, [el('h2', { text: 'Moves' }), el('span', { class: 'aside', text: 'The Roadmap: the test\'s moves in the order they cost points. Rewritten as belts are earned.' })])];
    if (!moves.length) {
      kids.push(el('p', { class: 'empty', text: "Sensei Jay builds the Roadmap from the Diagnostic. It shows here once it's set." }));
    } else {
      kids.push(el('div', { class: 'moves' }, moves.map(function (m) {
        var p = PILL[m.status] || [m.status, ''];
        var dates = m.status === 'Closed' && m.struck ? ' Fixed ' + short(day(m.struck)) + (m.checked ? ', checked ' + short(day(m.checked)) : '') + '.' : '';
        return el('div', { class: 'box move' }, [
          el('span', { class: 'num', text: String(m.order) }),
          el('div', { class: 't' }, [el('b', { text: m.move }), el('span', { text: sentence(m.section) + (m.description ? ' ' + sentence(m.description) : '') + dates })]),
          p[0] ? el('span', { class: 'pill ' + p[1], text: p[0] }) : null
        ]);
      })));
    }
    return el('section', { id: 'roadmap', class: 'sec' }, kids);
  }

  function updateSection(d) {
    var u = (d.updates || [])[0];
    var kids = [el('h2', { text: 'Friday update' })];
    if (!u) {
      kids.push(el('p', { class: 'empty', text: 'The first weekly update lands here on the Friday after the first sessions.' }));
    } else {
      var paras = String(u.text || '').replace(/\r\n/g, '\n').split(/\n\s*\n/).map(function (p) { return p.trim(); }).filter(Boolean);
      // The page sets its own sign-off, so a sign-off at the end of the captured text is dropped, never doubled.
      var lines = paras.join('\n\n').split('\n');
      while (lines.length && /^\s*(sensei jay|see you in the dojo\.?|)\s*$/i.test(lines[lines.length - 1])) lines.pop();
      paras = lines.join('\n').split(/\n\s*\n/).map(function (p) { return p.trim(); }).filter(Boolean);
      var sent = day(u.sent);
      kids.push(el('article', { class: 'box update' }, [
        el('div', { class: 'meta' }, [el('span', { class: 'eyebrow', text: sent ? weekday(sent) + ', ' + long(sent) : '' }), el('span', { text: 'Every Friday, written by Sensei Jay' })])
      ].concat(paras.map(function (p) { return el('p', { text: p }); })).concat([
        el('span', { class: 'so', text: 'See you in The Dojo.' }), el('span', { class: 'by', text: 'Sensei Jay' })
      ])));
    }
    return el('section', { id: 'update', class: 'sec' }, kids);
  }

  function purchaseTitle(p) {
    if (p.item === 'Top-Up') return p.sessions === 1 ? 'Top-Up Session' : 'Top-Up, ' + p.sessions + ' sessions';
    return p.item + ' Plan, ' + p.sessions + ' sessions';
  }

  function billingSection(d) {
    var b = d.billing, rows = [];
    b.purchases.forEach(function (p) {
      var kids = [el('span', { class: 'it', text: purchaseTitle(p) })];
      if (p.status === 'Paid') {
        kids.push(el('span', { class: 'st paid', text: 'Paid' + (day(p.paid) ? ' ' + short(day(p.paid)) : '') }));
      } else if (p.status === 'Open') {
        kids.push(https(p.payUrl) ? el('a', { class: 'btn sm act', href: https(p.payUrl), target: '_blank', rel: 'noopener noreferrer', text: 'Pay invoice' })
          : el('span', { class: 'st', text: 'Open' }));
      } else if (p.status === 'Failed') {
        kids.push(el('span', { class: 'st bad', text: 'Not paid' }));
        kids.push(el('span', { class: 'msg', text: "The payment didn't go through. Email Sensei Jay to update the card." }));
      } else {
        return; // drafts are not shown
      }
      kids.splice(1, 0, el('span', { class: 'amt', text: money(p.amount) }));
      rows.push(el('div', { class: 'row' }, kids));
    });

    var msg = el('p', { class: 'status', role: 'status', hidden: true });
    var portalBtn = el('button', { type: 'button', class: 'btn line sm', text: 'Invoices and card' });
    portalBtn.addEventListener('click', function () {
      var s = stored();
      if (!s) return signInScreen(SIGNED_OUT);
      portalBtn.disabled = true;
      msg.hidden = true;
      call('billing', { session: s.s }).then(function (r) {
        var u = r.ok && https(r.url);
        if (u && /^https:\/\/billing\.stripe\.com\//.test(u)) { window.location.assign(u); return; }
        if (r.reason === 'signed_out') { store(null); return signInScreen(SIGNED_OUT); }
        portalBtn.disabled = false;
        msg.textContent = "The billing page isn't available right now. Email Sensei Jay and he'll send what you need.";
        msg.hidden = false;
      }).catch(function () {
        portalBtn.disabled = false;
        msg.textContent = "The billing page didn't open. Check your connection and try again.";
        msg.hidden = false;
      });
    });
    var inFoot = !!b.portal;
    if (d.sessions.used >= 7) {
      // The Top-Up offer shows once 7 sessions are used, just before the session 8 conversation (Sensei, Nov 4 2026).
      rows.push(el('div', { class: 'row offer' }, [
        el('span', { class: 'it', text: 'Top-Up Sessions, $250 each' }),
        b.portal ? el('span', { class: 'act' }, [portalBtn]) : null,
        el('span', { class: 'msg', text: 'Offered at session 8 if ' + d.student + ' wants more time' + (d.plan.testDateLabel ? ' before ' + d.plan.testDateLabel : '') + '.' })
      ]));
      inFoot = false;
    }
    var foot = null;
    if (b.card || inFoot) {
      foot = el('div', { class: 'foot' }, [
        b.card ? el('span', { text: 'Card on file: ' + b.card + '. Top-Up Sessions are charged to it automatically.' }) : el('span'),
        inFoot ? portalBtn : null
      ]);
    }
    return el('section', { id: 'billing', class: 'sec' }, [el('h2', { text: 'Billing' }), el('div', { class: 'box bill' }, rows.concat([foot, msg]))]);
  }

  /* ---------- student only */

  function openHomework(d) {
    var hw = d.homework || [];
    return hw.filter(function (h) { return !(has(h.done) && has(h.total) && h.done >= h.total); })[0] || hw[hw.length - 1] || null;
  }

  function studentNext(d) {
    var n = (d.next || [])[0];
    if (!n) return null;
    var hw = openHomework(d);
    var sub = [nextSessionNo(d) ? nextSessionNo(d) + '.' : '', hw && hw.due ? 'Homework due before.' : ''].filter(Boolean).join(' ');
    return el('section', { id: 'next', class: 'snext' }, [
      el('div', { class: 't' }, [el('span', { class: 'eyebrow', text: 'Next session' }), el('span', { class: 'w', text: whenShort(n.start) }), sub ? el('span', { class: 's', text: sub }) : null]),
      zoomLink(d, 'btn gold')
    ]);
  }

  function studentMoves(d) {
    var moves = d.roadmap || [];
    if (!moves.length) return null;
    var struck = moves.filter(function (m) { return m.status === 'Closed'; }).length;
    return el('section', { class: 'sec' }, [
      el('div', { class: 'sec-head' }, [el('h2', { text: 'Moves struck' }), el('span', { class: 'count' }, [String(struck), el('small', { text: ' of ' + moves.length })])]),
      el('p', { class: 'lead', text: "Each move is a trick the test runs on you. Struck means it doesn't work on you any more." })
    ].concat(moves.map(function (m) {
      var cls = m.status === 'Closed' ? 'struck' : m.status === 'Working' ? 'work' : '';
      var sub = sentence(m.section);
      if (m.status === 'Closed') sub += m.struck ? ' Struck ' + short(day(m.struck)) + (m.checked ? ', checked ' + short(day(m.checked)) : '') + '.' : '';
      else if (m.status === 'Working') {
        sub += ' In the work.';
        var hw = (d.homework || []).filter(function (h) { return h.move === m.move && has(h.total) && !(has(h.done) && h.done >= h.total); })[0];
        if (hw) sub += ' ' + hw.total + ' ' + plural(hw.total, 'question', 'questions') + (hw.due ? ' due ' + weekday(day(hw.due)) : '') + '.';
      } else if (m.status === 'Next') sub += ' Up next.';
      var label = (PILL[m.status] || [''])[0];
      return el('div', { class: 'box smove ' + cls }, [
        el('span', { class: 'dot ' + cls, text: String(m.order), 'aria-label': label || null }),
        el('div', { class: 't' }, [el('b', { text: m.move }), el('span', { text: sub })])
      ]);
    })));
  }

  function studentHomework(d) {
    var h = openHomework(d);
    if (!h) return null;
    var due = day(h.due);
    var prog = has(h.done) && has(h.total) && h.total > 0;
    var bar = null;
    if (prog) {
      bar = el('div', { class: 'track', role: 'img', 'aria-label': h.done + ' of ' + h.total + ' done' }, [el('span')]);
      bar.firstChild.style.width = Math.max(0, Math.min(100, Math.round(100 * h.done / h.total))) + '%';
    }
    var link = https(h.link);
    return el('section', { id: 'homework', class: 'sec' }, [el('h2', { text: 'Homework' }), el('div', { class: 'box hw' }, [
      el('div', { class: 'r' }, [
        el('div', { class: 't' }, [el('b', { text: h.title }), due ? el('span', { class: 's', text: 'Due before ' + weekday(due) + "'s session" }) : null]),
        prog ? el('span', { class: 'pill work', text: h.done + ' of ' + h.total + ' done' }) : null
      ]),
      bar,
      link ? el('a', { class: 'btn line sm', href: link, target: '_blank', rel: 'noopener noreferrer', text: 'Open the set' }) : null
    ])]);
  }

  function studentScores(d) {
    var sc = d.scores || [];
    if (!sc.length) return null;
    var test = day(d.plan.testDate);
    var rows = sc.map(function (x) {
      if (has(x.total) && x.date) {
        return el('div', { class: 'r' }, [el('span', null, [el('b', { text: String(x.total) }), [x.test ? ' · ' + x.test : '', ' · ' + short(day(x.date))].join('')]),
          el('span', { text: has(x.math) ? String(x.math) : '·' }), el('span', { text: has(x.rw) ? String(x.rw) : '·' })]);
      }
      var when = x.due ? 'due ' + short(day(x.due)) : /^final$/i.test(x.kind) && test ? range(finalWindow(test).from, finalWindow(test).to) : '';
      var label = [x.kind || x.test, when].filter(Boolean).join(' · ');
      if (!label) return null;
      return el('div', { class: 'r plan' }, [el('span', { text: label }), el('span', { text: '·' }), el('span', { text: '·' })]);
    });
    return el('section', { class: 'sec' }, [el('h2', { text: 'Score log' }), el('div', { class: 'box slog' }, [
      el('div', { class: 'r h' }, [el('span', { text: 'Test' }), el('span', { text: 'Math' }), el('span', { text: 'R&W' })])
    ].concat(rows))]);
  }

  /* ---------- the two boards */

  function footer() {
    return el('footer', { class: 'foot' }, [
      el('span', { class: 'line', text: 'The SAT is a discipline. Master it in The Dojo.' }),
      el('span', null, ['Sensei Jay. ', el('a', { href: 'mailto:' + CONTACT, text: CONTACT })])
    ]);
  }

  function parentBoard(d) {
    var nav = el('nav', { 'aria-label': 'The Dojo' }, [
      el('a', { href: '#wall', text: 'The Wall' }), el('a', { href: '#roadmap', text: 'Moves' }), el('a', { href: '#sessions', text: 'Sessions' }),
      el('a', { href: '#update', text: 'Friday update' }), d.billing ? el('a', { href: '#billing', text: 'Billing' }) : null, outButton()
    ]);
    var plan = planLine(d);
    return [
      el('header', { class: 'top floor' }, [
        el('div', { class: 'bar' }, [el('div', { class: 'brand' }, [wordmark(), brandline()]), outButton()]),
        nav,
        SAMPLE ? el('div', { class: 'sample' }, [
          el('span', { class: 'tag', text: 'Sample family' }),
          el('p', null, ['Every family gets The Dojo. ', el('a', { href: 'https://scoresamurai.com/diagnostic/', text: 'Start with the free Diagnostic.' })])
        ]) : null
      ]),
      el('main', { class: 'board' }, [
        el('section', { class: 'phero' }, [
          el('div', { class: 'txt' }, [el('span', { class: 'eyebrow', text: 'The Dojo' }), el('h1', { text: d.student + "'s Dojo" }), plan ? el('p', { class: 'plan', text: plan }) : null]),
          beltCard(d)
        ]),
        wallSection(d, false),
        trio(d),
        sessionsSection(d),
        movesSection(d),
        updateSection(d),
        d.billing ? billingSection(d) : null
      ]),
      footer()
    ];
  }

  function studentBoard(d) {
    var l1 = [];
    if (d.belt.current) l1.push(d.belt.current + ' Belt');
    if (has(d.belt.today)) l1.push(String(d.belt.today));
    if (d.belt.next) l1.push(d.belt.next + ' at ' + d.belt.nextFloor);
    var test = day(d.plan.testDate), l2 = '';
    if (test && daysUntil(test) >= 0) l2 = 'Test day ' + short(test) + ' · ' + daysUntil(test) + ' ' + plural(daysUntil(test), 'day', 'days');
    return [
      el('header', { class: 'top floor' }, [
        el('div', { class: 'bar' }, [wordmark(), outButton()]),
        el('div', { class: 'hero' }, [
          el('div', { class: 'txt' }, [
            el('span', { class: 'eyebrow', text: 'The Dojo' }),
            el('h1', { text: 'Your Dojo' }),
            l1.length ? el('span', { class: 'l1', text: l1.join(' · ') }) : null,
            l2 ? el('span', { class: 'l2', text: l2 }) : null
          ]),
          warrior()
        ])
      ]),
      el('main', { class: 'board' }, [studentNext(d), wallSection(d, true), studentMoves(d), studentHomework(d), studentScores(d)]),
      footer()
    ];
  }

  function render(d) {
    document.title = (d.role === 'student' ? 'Your Dojo' : d.student + "'s Dojo") + ' | Score Samurai';
    show(d.role === 'student' ? studentBoard(d) : parentBoard(d), d.role === 'student' ? 'student' : 'parent');
  }

  /* ---------------------------------------------------------------- start */

  function start() {
    if (SAMPLE) { document.title = 'See The Dojo | Score Samurai'; return show(parentBoard(SAMPLE.family), 'parent sample'); }
    var m = /(?:^#|&)t=([^&]*)/.exec(location.hash || '');
    if (!m) return load();
    var token = m[1];
    history.replaceState(null, '', location.pathname + location.search); // the link is single-use; keep it out of history
    if (!/^[0-9a-f]{64}$/.test(token)) return signInScreen('That sign-in link has expired or was already used. Enter your email for a new one.');
    call('exchange', { token: token }).then(function (r) {
      if (!r.ok || !/^[0-9a-f]{64}$/.test(r.session || '')) {
        return stored() ? load() : signInScreen('That sign-in link has expired or was already used. Enter your email for a new one.');
      }
      store({ s: r.session, role: r.role, exp: r.expires });
      load();
    }).catch(function () { errorScreen(function () { location.reload(); }); });
  }

  // A sign-in link opened in a tab that already shows this page changes only the fragment; handle it too.
  if (!SAMPLE) window.addEventListener('hashchange', function () { if (/(?:^#|&)t=/.test(location.hash)) start(); });
  start();
})();
