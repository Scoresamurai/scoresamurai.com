/*
 * The Wall share card (WALLCARD, Nov 5 2026). A 1080 x 1350 PNG drawn in the browser, the way the Daily Strike card is:
 * the dojo floor, the Warrior, the belt earned with its date, the student's first name only, the brand line, the
 * wordmark with its belt line, scoresamurai.com. Never a score, never a parent name, never a Codex name.
 * The Warrior is the strike pose from the Daily Strike card (WALLFIX).
 * The PNG is built before the tap, so the share sheet opens inside the tap on a phone. On a desktop the image is
 * copied; where copying images isn't allowed it is saved instead.
 * GA4: wall_share {method, view, belt}. gtag loads on scoresamurai.com only, on the first share, with no page view.
 * Anywhere else the events go to window.__wallEvents.
 */
(function () {
  'use strict';

  var W = 1080, H = 1350;
  var GRID = 48, GRID_A = 0.07;
  var GA = 'G-LYZRWG13P3';
  var MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var BELT = {
    White: { fill: '#f8f3e7', edge: '#b9ae96' }, Green: { fill: '#2f8f4e', edge: '#1f5e34' }, Blue: { fill: '#1f4e9c', edge: '#163a75' },
    Brown: { fill: '#6b3f23', edge: '#4a2b17' }, Black: { fill: '#1f1512', edge: '#c9a24a' }
  };
  var CREAM = '#f8f3e7', GOLD = '#c9a24a', GOLDTEXT = '#e9d9b6';
  var BRAND = 'The SAT is a discipline. Master it in The Dojo.';

  /* ---------- analytics */
  var live = /(^|\.)scoresamurai\.com$/.test(location.hostname);
  window.__wallEvents = window.__wallEvents || [];
  function track(name, params) {
    if (!live) { window.__wallEvents.push([name, params]); return; }
    try {
      if (!window.gtag) {
        window.dataLayer = window.dataLayer || [];
        window.gtag = function () { window.dataLayer.push(arguments); };
        window.gtag('js', new Date());
        // no page view and no fragment: the page only reports the share
        window.gtag('config', GA, { send_page_view: false, page_location: location.origin + location.pathname });
        var s = document.createElement('script');
        s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA;
        document.head.appendChild(s);
      }
      window.gtag('event', name, params);
    } catch (e) { /* analytics never blocks the share */ }
  }

  /* ---------- what goes on the card */
  function firstName(s) { return String(s || '').trim().split(/\s+/)[0] || ''; }
  function dateLong(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
    return m ? MONTH[Number(m[2]) - 1] + ' ' + Number(m[3]) + ', ' + m[1] : '';
  }
  // The belt on the card is the highest belt earned that has a date. Nothing is drawn without one.
  function pick(d) {
    if (!d || !d.belt || !d.belt.current || !BELT[d.belt.current]) return null;
    var on = '';
    (d.belt.earned || []).forEach(function (e) { if (e && e.belt === d.belt.current && e.on) on = e.on; });
    var name = firstName(d.student);
    if (!on || !dateLong(on) || !name) return null;
    return { belt: d.belt.current, on: dateLong(on), name: name };
  }

  /* ---------- drawing */
  function img(src) {
    return new Promise(function (ok, no) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = no; i.src = src; });
  }
  function fonts() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.all(['700 120px "Playfair Display"', 'italic 700 34px "Playfair Display"', '400 44px "Playfair Display SC"',
      '400 34px "DM Sans"', '700 28px "DM Sans"'].map(function (f) { return document.fonts.load(f).catch(function () {}); }));
  }
  function spaced(ctx, text, x, y, track) { // letter-spaced text, centred on x
    var w = 0, i;
    for (i = 0; i < text.length; i++) w += ctx.measureText(text[i]).width + (i < text.length - 1 ? track : 0);
    var cx = x - w / 2;
    ctx.textAlign = 'left';
    for (i = 0; i < text.length; i++) { ctx.fillText(text[i], cx, y); cx += ctx.measureText(text[i]).width + track; }
    ctx.textAlign = 'center';
    return w;
  }
  function fit(ctx, text, font, size, max) { // shrink a line until it fits
    do { ctx.font = font.replace('{s}', size); size -= 2; } while (ctx.measureText(text).width > max && size > 20);
  }
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function floor(ctx) {
    // the floor's glow as flat rings rather than a smooth gradient: canvas dithers gradients, and the noise
    // made the PNG three times the size. 28 rings of about 2 colour levels each read as one smooth glow.
    var R = H * 0.62, N = 28, a = [92, 10, 14], b = [151, 28, 34];
    ctx.fillStyle = 'rgb(' + a.join(',') + ')'; ctx.fillRect(0, 0, W, H);
    for (var i = 0; i < N; i++) {
      var t = i / (N - 1);
      ctx.fillStyle = 'rgb(' + a.map(function (v, j) { return Math.round(v + (b[j] - v) * t); }).join(',') + ')';
      ctx.beginPath(); ctx.arc(W / 2, H * 0.45, R * (1 - t) + 1, 0, Math.PI * 2); ctx.fill();
    }
    // the mat grid, lighter than the page's so the PNG stays small (WALLFIX): a line every GRID px
    ctx.fillStyle = 'rgba(0,0,0,' + GRID_A + ')'; for (var x = 0; x < W; x += GRID) ctx.fillRect(x, 0, 2, H);
    for (var y = 0; y < H; y += GRID) ctx.fillRect(0, y, W, 2);
    ctx.strokeStyle = 'rgba(201,162,74,0.55)'; ctx.lineWidth = 2; ctx.strokeRect(36, 36, W - 72, H - 72);
    ctx.strokeStyle = 'rgba(201,162,74,0.25)'; ctx.strokeRect(50, 50, W - 100, H - 100);
  }
  function belt(ctx, name, cx, cy) { // the belt itself, tied, in the belt's colour
    var c = BELT[name], w = 720, h = 64;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 10;
    ctx.fillStyle = c.fill; rr(ctx, cx - w / 2, cy - h / 2, w, h, 10); ctx.fill();
    ctx.restore();
    ctx.lineWidth = 3; ctx.strokeStyle = c.edge; rr(ctx, cx - w / 2, cy - h / 2, w, h, 10); ctx.stroke();
    [[-1, 16], [1, -14]].forEach(function (t) { // the two tails, hanging from the knot
      ctx.save(); ctx.translate(cx + t[0] * 22, cy + 30); ctx.rotate(t[1] * Math.PI / 180);
      ctx.fillStyle = c.fill; rr(ctx, -13, 0, 26, 82, 6); ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = c.edge; rr(ctx, -13, 0, 26, 82, 6); ctx.stroke();
      ctx.restore();
    });
    ctx.fillStyle = c.fill; rr(ctx, cx - 40, cy - 46, 80, 92, 10); ctx.fill(); // the knot
    ctx.lineWidth = 3; ctx.strokeStyle = c.edge; rr(ctx, cx - 40, cy - 46, 80, 92, 10); ctx.stroke();
  }

  function draw(card, warrior) {
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d');
    floor(ctx);
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    // wordmark with its belt line
    ctx.fillStyle = CREAM; ctx.font = '400 44px "Playfair Display SC", Georgia, serif';
    var ww = spaced(ctx, 'SCORE SAMURAI', W / 2, 132, 7);
    ctx.fillStyle = GOLD; ctx.fillRect(W / 2 - ww / 2, 152, ww, 4);
    // the Warrior
    // the Warrior in the strike pose, the same figure as the Daily Strike card
    var wh = 540, wwid = Math.round(warrior.width * wh / warrior.height);
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 26;
    ctx.drawImage(warrior, W / 2 - wwid / 2, 186, wwid, wh); ctx.restore();
    // the belt
    belt(ctx, card.belt, W / 2, 792);
    // the belt name, the date, the first name
    ctx.fillStyle = GOLD; ctx.font = '700 26px "DM Sans", Arial, sans-serif';
    spaced(ctx, 'BELT EARNED', W / 2, 948, 6);
    ctx.fillStyle = CREAM; fit(ctx, card.belt + ' Belt', '700 {s}px "Playfair Display", Georgia, serif', 112, W - 200);
    ctx.fillText(card.belt + ' Belt', W / 2, 1060);
    ctx.fillStyle = GOLDTEXT; fit(ctx, card.name + ', ' + card.on, '400 {s}px "DM Sans", Arial, sans-serif', 40, W - 220);
    ctx.fillText(card.name + ', ' + card.on, W / 2, 1122);
    // the brand line and the address
    ctx.fillStyle = GOLD; ctx.fillRect(W / 2 - 60, 1168, 120, 2);
    ctx.fillStyle = GOLDTEXT; ctx.font = 'italic 700 34px "Playfair Display", Georgia, serif';
    ctx.fillText(BRAND, W / 2, 1226);
    ctx.fillStyle = GOLD; ctx.font = '700 28px "DM Sans", Arial, sans-serif';
    spaced(ctx, 'SCORESAMURAI.COM', W / 2, 1278, 5);
    return cv;
  }

  function make(d, warriorSrc) {
    var card = pick(d);
    if (!card) return Promise.resolve(null);
    return Promise.all([fonts(), img(warriorSrc)]).then(function (r) {
      var cv = draw(card, r[1]);
      return new Promise(function (ok) { cv.toBlob(function (b) { ok(b); }, 'image/png'); }).then(function (blob) {
        if (!blob) return null;
        var fname = 'score-samurai-' + card.belt.toLowerCase() + '-belt.png';
        var file = null;
        try { file = new File([blob], fname, { type: 'image/png' }); } catch (e) { file = null; }
        return { card: card, blob: blob, file: file, name: fname, canvas: cv };
      });
    });
  }

  /* ---------- sharing */
  function phone() { return !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches); }
  function canSheet(p) {
    try { return phone() && p.file && navigator.canShare && navigator.canShare({ files: [p.file] }) && !!navigator.share; } catch (e) { return false; }
  }
  function save(p) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(p.blob); a.download = p.name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }
  // Called straight from the tap. Resolves with what happened: 'sheet', 'copy', 'download' or 'cancel'.
  function share(p, view) {
    var ev = { belt: p.card.belt, view: view };
    if (canSheet(p)) {
      var t = navigator.share({ files: [p.file], title: p.card.belt + ' Belt', text: p.card.belt + ' Belt, earned in The Dojo. scoresamurai.com' });
      return t.then(function () { ev.method = 'sheet'; track('wall_share', ev); return 'sheet'; }, function (e) {
        if (e && e.name === 'AbortError') return 'cancel';
        save(p); ev.method = 'download'; track('wall_share', ev); return 'download';
      });
    }
    if (navigator.clipboard && navigator.clipboard.write && window.ClipboardItem) {
      var w;
      try { w = navigator.clipboard.write([new window.ClipboardItem({ 'image/png': p.blob })]); } catch (e) { w = Promise.reject(e); }
      return w.then(function () { ev.method = 'copy'; track('wall_share', ev); return 'copy'; }, function () {
        save(p); ev.method = 'download'; track('wall_share', ev); return 'download';
      });
    }
    save(p); ev.method = 'download'; track('wall_share', ev);
    return Promise.resolve('download');
  }

  window.ssWallCard = { make: make, share: share, pick: pick, phone: phone };
})();
