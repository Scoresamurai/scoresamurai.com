/*
 * The Dojo family page. Reads one family's data from the Families workbook through the Apps Script web app.
 * The page writes nothing to the workbook. Sign-in is a one-time link (token in the URL fragment, never sent
 * to a server except the script); the script trades it for a 30-day session kept in this browser only.
 * Everything is rendered with textContent, never innerHTML.
 */
(function () {
  'use strict';

  var API = 'https://script.google.com/macros/s/AKfycbwxTt83a8UyDDjwoBpXzX3sKGfdfAsU9xoTngUYSU8wBmrwm9WB7ovJ2mQIOWZ08AQU/exec';
  var KEY = 'ss_family_v1';
  var CONTACT = 'senseijay@scoresamurai.com';
  var BELT_COLOR = { White: '#F7F2E6', Green: '#2E6B3A', Blue: '#25457A', Brown: '#7A4A2B', Black: '#141110' };
  var NUM = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

  var app = document.getElementById('app');
  var who = document.getElementById('who');

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

  function show(nodes) {
    app.textContent = '';
    nodes.forEach(function (n) { if (n) app.appendChild(n); });
    window.scrollTo(0, 0);
  }

  /* ---------------------------------------------------------------- sign-in screens */

  function signInScreen(notice) {
    who.hidden = true;
    var input = el('input', { type: 'email', id: 'email', name: 'email', autocomplete: 'email', required: true, inputmode: 'email', spellcheck: 'false' });
    var btn = el('button', { type: 'submit', class: 'act primary', text: 'Send my link' });
    var form = el('form', { class: 'signin', novalidate: true, on: { submit: function (e) {
      e.preventDefault();
      var email = input.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { input.focus(); input.setAttribute('aria-invalid', 'true'); return; }
      btn.disabled = true;
      btn.textContent = 'Sending';
      call('requestLink', { email: email })
        .then(function () { inboxScreen(email); })
        .catch(function () { btn.disabled = false; btn.textContent = 'Send my link'; errorScreen(function () { signInScreen(); }); });
    } } }, [
      el('label', { for: 'email', text: 'Email' }), input, btn
    ]);
    show([
      notice ? el('p', { class: 'note', role: 'status', text: notice }) : null,
      el('section', null, [
        el('p', { class: 'eyebrow', text: 'The Dojo' }),
        el('h1', { text: 'Sign in to The Dojo' }),
        el('p', { class: 'lede', text: "Enter the email Sensei Jay has on file. You'll get a sign-in link that works once and expires in 30 minutes." })
      ]),
      form
    ]);
  }

  function inboxScreen(email) {
    show([
      el('section', null, [
        el('p', { class: 'eyebrow', text: 'The Dojo' }),
        el('h1', { text: 'Check your inbox' }),
        el('p', { class: 'lede', text: 'If ' + email + ' is on file, a sign-in link is on its way. It works once and expires in 30 minutes.' })
      ]),
      el('p', { class: 'small' }, [
        'Nothing after a few minutes? Check spam, or email ',
        el('a', { href: 'mailto:' + CONTACT, text: CONTACT }), '.'
      ]),
      el('button', { type: 'button', class: 'act', text: 'Use a different email', on: { click: function () { signInScreen(); } } })
    ]);
  }

  function errorScreen(retry) {
    show([
      el('section', null, [
        el('h1', { text: "The Dojo didn't load" }),
        el('p', { class: 'lede', text: 'Check your connection and try again.' })
      ]),
      el('button', { type: 'button', class: 'act', text: 'Try again', on: { click: retry } })
    ]);
  }

  /* ---------------------------------------------------------------- the family page */

  function load() {
    var s = stored();
    if (!s) return signInScreen();
    call('family', { session: s.s }).then(function (d) {
      if (!d.ok) { store(null); return signInScreen('Your session has ended. Enter your email for a new sign-in link.'); }
      render(d, s);
    }).catch(function () { errorScreen(load); });
  }

  function signOut() {
    var s = stored();
    store(null);
    if (s) call('signOut', { session: s.s }).catch(function () { /* already cleared here */ });
    signInScreen("You're signed out.");
  }

  function header(d) {
    who.textContent = '';
    who.appendChild(el('span', null, [
      'Signed in as ', el('b', { text: d.viewer }),
      d.role === 'parent' ? ' (parent of ' + d.student + ')' : ''
    ]));
    who.appendChild(el('button', { type: 'button', text: 'Sign out', on: { click: signOut } }));
    who.hidden = false;
  }

  function topSection(d) {
    var lede = [];
    if (d.plan.name) lede.push(d.plan.name + ' Plan' + (d.plan.sessions ? ', ' + d.plan.sessions + ' sessions' : '') + '.');
    if (d.plan.startedLabel) lede.push('Started ' + d.plan.startedLabel + '.');
    if (d.plan.testDateLabel) lede.push('Test date: ' + d.plan.testDateLabel + '.');
    var belt = null;
    if (d.belt.current) {
      var line = [];
      if (d.belt.score) line.push(d.belt.placed && d.belt.placed !== d.belt.current
        ? 'Placed ' + d.belt.placed + ' at the Diagnostic, ' + d.belt.score + '.'
        : 'Placed at the Diagnostic, ' + d.belt.score + '.');
      if (d.belt.next) line.push('Next: ' + d.belt.next + ', ' + d.belt.nextFloor + '.');
      var sw = el('span', { class: 'swatch', 'aria-hidden': 'true' });
      sw.style.background = BELT_COLOR[d.belt.current] || 'transparent';
      belt = el('div', { class: 'belt' }, [sw, el('div', null, [el('b', { text: d.belt.current + ' Belt' }), el('span', { text: line.join(' ') })])]);
    }
    return el('section', { class: 'top' }, [
      el('div', null, [
        el('p', { class: 'eyebrow', text: 'The Dojo' }),
        el('h1', { text: d.student + "'s Dojo" }),
        lede.length ? el('p', { class: 'lede', text: lede.join(' ') }) : null
      ]),
      belt
    ]);
  }

  function dots(n, filled, cls, label) {
    var box = el('div', { class: 'dots', role: 'img', 'aria-label': label });
    for (var i = 0; i < n; i++) box.appendChild(el('span', { class: 'dot' + (i < filled ? ' used' : '') + (cls ? ' ' + cls : '') }));
    return box;
  }

  function sessionsSection(d) {
    var s = d.sessions, c = s.credits || [];
    var tiles = [
      el('div', { class: 'tile' }, [
        el('div', { class: 'n', text: String(s.remaining) }),
        el('div', { class: 'l', text: plural(s.remaining, 'session', 'sessions') + ' left of ' + s.bought }),
        s.bought ? dots(s.bought, Math.min(s.used, s.bought), '', s.used + ' used, ' + s.remaining + ' remaining') : null
      ]),
      el('div', { class: 'tile' }, [
        el('div', { class: 'n', text: String(c.length) }),
        el('div', { class: 'l', text: c.length === 0 ? 'make-up credits'
          : c.length === 1 ? 'make-up credit, good until ' + c[0].label
          : 'make-up credits, the first good until ' + c[0].label }),
        c.length ? dots(c.length, 0, 'credit', c.length + ' make-up ' + plural(c.length, 'credit', 'credits')) : null
      ])
    ];
    if (d.validUntilLabel) tiles.push(el('div', { class: 'tile' }, [
      el('div', { class: 'n', text: d.validUntilLabel }), el('div', { class: 'l', text: 'plan valid until' })
    ]));

    var zoom = https(d.zoom);
    var rows = (d.next || []).map(function (n) {
      return el('div', { class: 'row' }, [
        el('div', null, [el('div', { class: 'd', text: n.when }), el('div', { class: 's', text: n.minutes + ' minutes on Zoom' })]),
        zoom ? el('a', { class: 'act', href: zoom, target: '_blank', rel: 'noopener noreferrer', text: 'Join Zoom' }) : null
      ]);
    });
    if (!rows.length) rows.push(el('div', { class: 'row' }, [
      el('div', null, [el('div', { class: 'd', text: 'No sessions on the calendar yet' }),
        el('div', { class: 's', text: 'Sensei Jay adds them as soon as the next sessions are set.' })])
    ]));
    rows.push(el('div', { class: 'row' }, [
      el('div', null, [el('div', { class: 'd', text: 'Need to move one?' }),
        el('div', { class: 's', text: "24 hours' notice keeps the session as a make-up credit." })]),
      el('a', { class: 'act', href: 'mailto:' + (d.contact || CONTACT), text: 'Email Sensei Jay' })
    ]));

    return el('section', null, [
      el('h2', { text: 'Sessions' }),
      el('div', { class: 'tokens' }, tiles),
      el('h2', { style: 'margin-top:22px', text: 'Next up' }),
      el('div', { class: 'list' }, rows)
    ]);
  }

  function roadmapSection(d) {
    var moves = d.roadmap || [];
    var kids = [el('h2', { text: 'The Roadmap' })];
    if (!moves.length) {
      kids.push(el('p', { class: 'lede', style: 'margin:0', text: "Sensei Jay builds the Roadmap from the Diagnostic. It shows here once it's set." }));
    } else {
      kids.push(el('p', { class: 'lede', style: 'margin:0 0 14px', text: moves.length === 1
        ? 'One move, with the points it is worth back. The Roadmap updates after every session.'
        : (NUM[moves.length] || String(moves.length)) + ' moves in order, with the points each one is worth back. The Roadmap updates after every session.' }));
      kids.push(el('div', { class: 'road' }, moves.map(function (m) {
        return el('div', { class: 'move' }, [
          el('div', { class: 'k', text: 'Move ' + m.order + ', ' + m.section }),
          el('div', { class: 't', text: m.move }),
          el('p', { class: 'p', text: m.description }),
          el('div', { class: 'st' }, [el('span', { class: 'pill' + (m.status === 'Closed' ? ' good' : ''), text: m.note || m.status })])
        ]);
      })));
    }
    var link = https(d.roadmapLink);
    if (link) kids.push(el('p', { class: 'more' }, [el('a', { href: link, target: '_blank', rel: 'noopener noreferrer', text: 'Open the full Roadmap' })]));
    return el('section', null, kids);
  }

  function updatesSection(d) {
    var ups = d.updates || [];
    var list = el('div', { class: 'list' });
    if (!ups.length) list.appendChild(el('p', { class: 'empty', text: 'The first weekly update lands here on the Friday after the first sessions.' }));
    ups.forEach(function (u, i) {
      var id = 'up' + i;
      var full = el('div', { class: 'uptext', id: id, hidden: true, text: u.text });
      var btn = el('button', { type: 'button', class: 'act', 'aria-expanded': 'false', 'aria-controls': id, text: 'Read' });
      btn.addEventListener('click', function () {
        var open = full.hidden;
        full.hidden = !open;
        btn.setAttribute('aria-expanded', String(open));
        btn.textContent = open ? 'Close' : 'Read';
      });
      list.appendChild(el('div', { class: 'row' }, [
        el('span', { class: 'date', text: u.sentLabel }),
        el('div', null, [el('div', { class: 'd', text: u.title }), u.summary ? el('div', { class: 's', text: u.summary }) : null]),
        btn, full
      ]));
    });
    return el('section', { class: 'updates' }, [el('h2', { text: 'Weekly updates' }), list]);
  }

  function purchaseTitle(p) {
    if (p.item === 'Top-Up') return p.sessions === 1 ? 'Top-Up Session, ' + money(p.amount) : 'Top-Up, ' + p.sessions + ' sessions, ' + money(p.amount);
    return p.item + ' Plan, ' + p.sessions + ' sessions, ' + money(p.amount);
  }

  function billingSection(d) {
    var b = d.billing, rows = [];
    var lastPaid = -1;
    b.purchases.forEach(function (p, i) { if (p.status === 'Paid') lastPaid = i; });
    b.purchases.forEach(function (p, i) {
      var sub, right;
      if (p.status === 'Paid') {
        sub = 'Paid ' + p.paidLabel + '.' + (i === lastPaid && b.card ? ' ' + b.card + ' on file for Auto Pay.' : '');
        right = el('span', { class: 'pill good', text: 'Paid' });
      } else if (p.status === 'Open') {
        sub = 'Invoice sent.';
        right = https(p.payUrl) ? el('a', { class: 'act primary', href: https(p.payUrl), target: '_blank', rel: 'noopener noreferrer', text: 'Pay invoice' })
          : el('span', { class: 'pill', text: 'Open' });
      } else if (p.status === 'Failed') {
        sub = "The payment didn't go through. Email Sensei Jay to update the card.";
        right = el('span', { class: 'pill warn', text: 'Not paid' });
      } else {
        return; // drafts are not shown
      }
      rows.push(el('div', { class: 'row' }, [el('div', null, [el('div', { class: 'd', text: purchaseTitle(p) }), el('div', { class: 's', text: sub })]), right]));
    });

    var msg = el('p', { class: 'small', role: 'status', hidden: true });
    var portalBtn = el('button', { type: 'button', class: 'act', text: 'Invoices and card' });
    portalBtn.addEventListener('click', function () {
      var s = stored();
      if (!s) return signInScreen('Your session has ended. Enter your email for a new sign-in link.');
      portalBtn.disabled = true;
      msg.hidden = true;
      call('billing', { session: s.s }).then(function (r) {
        var u = r.ok && https(r.url);
        if (u && /^https:\/\/billing\.stripe\.com\//.test(u)) { window.location.assign(u); return; }
        if (r.reason === 'signed_out') { store(null); return signInScreen('Your session has ended. Enter your email for a new sign-in link.'); }
        portalBtn.disabled = false;
        msg.textContent = "The billing page isn't available right now. Email Sensei Jay and he'll send what you need.";
        msg.hidden = false;
      }).catch(function () {
        portalBtn.disabled = false;
        msg.textContent = "The billing page didn't open. Check your connection and try again.";
        msg.hidden = false;
      });
    });
    rows.push(el('div', { class: 'row' }, [
      el('div', null, [el('div', { class: 'd', text: 'Top-Up Sessions, $250 each' }),
        el('div', { class: 's', text: 'Offered at session 8 if ' + d.student + ' wants more time' + (d.plan.testDateLabel ? ' before ' + d.plan.testDateLabel : '') + '.' })]),
      b.portal ? portalBtn : null
    ]));
    return el('section', null, [el('h2', { text: 'Billing' }), el('div', { class: 'list' }, rows), msg]);
  }

  function render(d, s) {
    header(d);
    document.title = d.student + "'s Dojo | Score Samurai";
    show([
      topSection(d),
      sessionsSection(d),
      roadmapSection(d),
      updatesSection(d),
      d.role === 'parent' && d.billing ? billingSection(d) : null
    ]);
  }

  /* ---------------------------------------------------------------- start */

  function start() {
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

  start();
})();
