(function () {
'use strict';
function $(id) { return document.getElementById(id); }
function chars(s) { return s.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[\s\S]/g) || []; } // Unicode-safe split
function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function r1(x) { return Math.round(x * 10) / 10; }
var clock = (window.performance && performance.now) ? function () { return performance.now(); } : function () { return +new Date(); };

/* ================= TYPING ENGINE (no DOM access) ================= */
var Engine = {
  create: function (text, duration) {
    var t = chars(text), typed = [], t0 = null, t1 = null, keys = 0, errs = 0;
    return {
      length: function () { return t.length; },
      at: function (i) { return t[i]; },
      extend: function (more) { t = t.concat(chars(more)); },
      typedChars: function () { return typed; },
      input: function (value) {
        if (t0 === null) t0 = clock();
        var c = chars(value);
        for (var i = typed.length; i < c.length; i++) { keys++; if (c[i] !== t[i]) errs++; }
        typed = c;
      },
      finish: function () { if (t1 === null && t0 !== null) t1 = clock(); },
      stats: function () {
        var el = t0 === null ? 0 : ((t1 === null ? clock() : t1) - t0) / 1000;
        if (duration && el > duration) el = duration;
        var ok = 0, i;
        for (i = 0; i < typed.length; i++) if (typed[i] === t[i]) ok++;
        var cpm = el >= 1 ? ok / el * 60 : 0;
        return { elapsed: el, left: duration ? Math.max(0, duration - el) : null, typed: typed.length, correct: ok,
          errors: errs, acc: keys ? (keys - errs) / keys * 100 : 100, cpm: cpm, wpm: cpm / 5,
          progress: t.length ? typed.length / t.length * 100 : 0, complete: typed.length >= t.length };
      }
    };
  }
};

/* ================= STORAGE ================= */
var KEY = 'keyquest_v1', D = { history: [] };
try { var raw = JSON.parse(localStorage.getItem(KEY)); if (raw && raw.history instanceof Array) D = raw; } catch (e) {}
function save() { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) {} }

/* ================= CONTENT ================= */
var EN = 'the be to of and a in that have it for not on with he as you do at this but his by from they we say her she or an will my one all would there their what so up out if about who get which go me when make can like time no just him know take people into year your good some could them see other than then now look only come its over think also back after use two how our work first well way even new want because any these give day most us keyboard practice speed accuracy rhythm focus steady finger home row posture screen window letter sentence quick brown fox jumps lazy'.split(' ');
var HI = 'भारत देश नदी किताब विद्यालय परिवार मित्र समय सुबह शाम खुशी मेहनत सफलता ज्ञान प्रेम शांति जीवन संसार पानी हवा आकाश धरती सूरज तारे फूल वृक्ष बगीचा मौसम बारिश गर्मी सर्दी भोजन रोटी चावल दाल सब्जी फल दूध घर दरवाजा कमरा बाजार दुकान रास्ता गाड़ी रेल यात्रा कहानी कविता संगीत नृत्य खेल शिक्षक विद्यार्थी कंप्यूटर कीबोर्ड अभ्यास'.replace('गाड़ी', 'गाडी').split(' ');
var CODE = {
  python: ['def add(a, b):\n  return a + b\n\nprint(add(2, 3))', 'for i in range(5):\n  if i % 2 == 0:\n    print(i)', 'nums = [x * x for x in range(10)]\nprint(sum(nums))'],
  javascript: ['const sum = (a, b) => a + b;\nconsole.log(sum(2, 3));', 'function greet(name) {\n  return `Hello, ${name}!`;\n}', 'const ids = items.map(i => i.id);\nconsole.log(ids.length);'],
  cpp: ['#include <iostream>\nint main() {\n  std::cout << "Hi";\n  return 0;\n}', 'for (int i = 0; i < 5; i++) {\n  sum += i * 2;\n}', 'vector<int> v = {1, 2, 3};\nsort(v.begin(), v.end());'],
  java: ['public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hi");\n  }\n}', 'int[] a = new int[5];\nfor (int i = 0; i < a.length; i++) {\n  a[i] = i * i;\n}', 'List<String> names = new ArrayList<>();\nnames.add("Asha");'],
  html: ['<div class="card">\n  <h2>Title</h2>\n  <p>Hello world</p>\n</div>', '<form action="/save" method="post">\n  <input type="text" name="user">\n  <button>Send</button>\n</form>', '<ul>\n  <li><a href="#home">Home</a></li>\n  <li><a href="#about">About</a></li>\n</ul>'],
  css: ['.card {\n  display: flex;\n  padding: 16px;\n  border-radius: 8px;\n}', 'body {\n  margin: 0;\n  font-family: sans-serif;\n  background: #111;\n}', 'a:hover {\n  color: #8b5cf6;\n  transition: 0.3s;\n}'],
  sql: ['SELECT name, age\nFROM users\nWHERE age > 18\nORDER BY name;', 'INSERT INTO orders (id, total)\nVALUES (1, 499.50);', 'SELECT city, COUNT(*)\nFROM users\nGROUP BY city;']
};
var CNAME = { python: 'Python', javascript: 'JavaScript', cpp: 'C++', java: 'Java', html: 'HTML', css: 'CSS', sql: 'SQL' };
var MODES = {
  english: { t: 'English typing test', h: 'Type the words below. WPM = (correct characters ÷ 5) ÷ minutes.', d: [15, 30, 60, 120], def: 60 },
  hindi: { t: 'हिन्दी typing practice', h: 'Use a Hindi (Devanagari) keyboard or IME. CPM is the main score; WPM is an estimate (CPM ÷ 5) and is labelled as such.', d: [30, 60, 120], def: 60 },
  numbers: { t: 'Number typing', h: 'Type the digit groups. Use the top row or the numeric keypad.', d: [15, 30, 60], def: 30 },
  code: { t: 'Coding practice', h: 'Type the snippet exactly, including spaces and line breaks (↵ = Enter). Scored in characters per minute and accuracy.', l: ['python', 'javascript', 'cpp', 'java', 'html', 'css', 'sql'], def: 'python' }
};
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
function gen(mode, n) {
  var o = [], i, g, k;
  if (mode === 'code') { var l = CODE[S.sub], s; do { s = pick(l); } while (l.length > 1 && s === S.text); return s; }
  for (i = 0; i < n; i++) {
    if (mode === 'numbers') { g = ''; for (k = 1 + Math.floor(Math.random() * 6); k > 0; k--) g += Math.floor(Math.random() * 10); o.push(g); }
    else o.push(pick(mode === 'hindi' ? HI : EN));
  }
  return o.join(' ');
}

/* ================= UI STATE ================= */
var S = { mode: 'english', sub: 60, subs: {}, eng: null, tm: null, spans: [], shown: 0, composing: false, compUsed: false, lastVal: '', running: false, done: false, text: '', timed: true, dur: 60 };
var inp = $('inp'), KEYS = {}, hl = [];

function fmt(sec) { sec = Math.max(0, Math.round(sec)); var m = Math.floor(sec / 60), s = sec % 60; return m + ':' + (s < 10 ? '0' : '') + s; }
function pair(mode, s) {
  if (mode === 'hindi') return [['CPM', Math.round(s.cpm)], ['WPM (CPM÷5, est.)', r1(s.wpm)]];
  if (mode === 'code') return [['Chars/min', Math.round(s.cpm)], ['Progress', Math.round(s.progress) + '%']];
  return [['WPM', r1(s.wpm)], ['CPM', Math.round(s.cpm)]];
}
function showStats(s) {
  var p = pair(S.mode, s);
  $('lA').textContent = p[0][0]; $('sA').textContent = p[0][1];
  $('lB').textContent = p[1][0]; $('sB').textContent = p[1][1];
  $('sT').textContent = S.timed ? Math.ceil(s.left === null ? S.dur : s.left) + 's' : fmt(s.elapsed);
  $('sAcc').textContent = Math.round(s.acc) + '%'; $('sE').textContent = s.errors;
  $('bar').style.width = (S.timed ? Math.min(100, s.elapsed / S.dur * 100) : Math.min(100, s.progress)) + '%';
}
function note(m) { $('note').textContent = m; if (m) setTimeout(function () { if ($('note').textContent === m) $('note').textContent = ''; }, 2500); }

/* keyboard visualisation */
var ROWS = ['`1234567890-=', 'qwertyuiop[]\\', "asdfghjkl;'", 'zxcvbnm,./'];
var SF = '~!@#$%^&*()_+{}|:"<>?', ST = "`1234567890-=[]\\;',./", SM = {};
(function () { for (var i = 0; i < SF.length; i++) SM[SF.charAt(i)] = ST.charAt(i); })();
function buildKb() {
  var kb = $('kb');
  function key(k, label, cls) { var e = document.createElement('i'); e.textContent = label; if (cls) e.className = cls; KEYS[k] = e; return e; }
  ROWS.forEach(function (r, ri) {
    var d = document.createElement('div');
    if (ri === 3) d.appendChild(key('shift', 'Shift', 'wide'));
    r.split('').forEach(function (c) { d.appendChild(key(c, c)); });
    if (ri === 2) d.appendChild(key('enter', 'Enter', 'wide'));
    kb.appendChild(d);
  });
  var d = document.createElement('div'); d.appendChild(key('space', 'Space', 'sp')); kb.appendChild(d);
}
function hint(ch) {
  hl.forEach(function (e) { e.classList.remove('next'); }); hl = [];
  if (ch === undefined) { $('next').textContent = ''; return; }
  $('next').textContent = 'Next: ' + (ch === '\n' ? 'Enter' : ch === ' ' ? 'Space' : ch);
  var k = ch, sh = false;
  if (ch === '\n') k = 'enter'; else if (ch === ' ') k = 'space';
  else if (SM[ch]) { k = SM[ch]; sh = true; }
  else if (ch >= 'A' && ch <= 'Z') { k = ch.toLowerCase(); sh = true; }
  if (KEYS[k]) { KEYS[k].classList.add('next'); hl.push(KEYS[k]); }
  if (sh) { KEYS.shift.classList.add('next'); hl.push(KEYS.shift); }
}
function flash(e) {
  var k = e.key === ' ' ? 'space' : e.key === 'Enter' ? 'enter' : (e.key || '').toLowerCase(), el = KEYS[k];
  if (el) { el.classList.add('press'); setTimeout(function () { el.classList.remove('press'); }, 120); }
}

/* text rendering */
function addSpans(text) {
  var f = document.createDocumentFragment(), c = chars(text), i, s;
  for (i = 0; i < c.length; i++) {
    s = document.createElement('span'); s._b = '';
    if (c[i] === '\n') { s.textContent = '↵'; s._b = 'nl '; s.className = 'nl'; f.appendChild(s); f.appendChild(document.createTextNode('\n')); }
    else { s.textContent = c[i]; f.appendChild(s); }
    S.spans.push(s);
  }
  $('text').appendChild(f);
}
function paint() {
  var ty = S.eng.typedChars(), n = ty.length, lo = Math.max(0, Math.min(S.shown, n) - 1), hi = Math.min(S.spans.length - 1, Math.max(S.shown, n)), i;
  for (i = lo; i <= hi; i++) S.spans[i].className = S.spans[i]._b + (i < n ? (ty[i] === S.eng.at(i) ? 'ok' : 'bad') : i === n ? 'cur' : '');
  S.shown = n;
  var c = S.spans[n], b = $('text');
  if (c) b.scrollTop = Math.max(0, c.offsetTop - b.clientHeight / 3);
  hint(S.eng.at(n));
}

/* ================= TEST FLOW ================= */
function openPractice(mode) {
  S.mode = mode; var m = MODES[mode];
  S.sub = S.subs[mode] !== undefined ? S.subs[mode] : m.def;
  $('pTitle').textContent = m.t; $('pHint').textContent = m.h;
  var o = $('opts'); o.innerHTML = '';
  (m.d || m.l).forEach(function (v) {
    var b = document.createElement('button'); b.type = 'button'; b.textContent = m.d ? v + 's' : CNAME[v];
    if (v === S.sub) b.className = 'on';
    b.onclick = function () { S.sub = v; S.subs[mode] = v; Array.prototype.forEach.call(o.children, function (x) { x.className = ''; }); b.className = 'on'; begin(true); };
    o.appendChild(b);
  });
  begin(true);
}
function begin(fresh) {
  clearInterval(S.tm); S.running = false; S.done = false; S.composing = false; S.compUsed = false; S.shown = 0; S.lastVal = '';
  if (fresh) S.text = gen(S.mode, S.mode === 'numbers' ? 90 : 120);
  S.timed = S.mode !== 'code'; S.dur = S.timed ? S.sub : 0;
  S.eng = Engine.create(S.text, S.dur);
  var t = $('text'); t.innerHTML = ''; t.scrollTop = 0; S.spans = [];
  t.className = 'text' + (S.mode === 'hindi' ? ' hi' : S.mode === 'code' ? ' code' : '');
  addSpans(S.text);
  inp.disabled = false; inp.value = ''; $('result').hidden = true;
  showStats(S.eng.stats()); paint();
  setTimeout(function () { try { inp.focus(); } catch (e) {} }, 30);
}
function tick() {
  var s = S.eng.stats(); showStats(s);
  if (S.timed && s.elapsed >= S.dur && !S.done) finish();
}
function onInput(e, fromIME) {
  if (S.done || S.composing) return;
  var v = inp.value;
  if (!fromIME && ((e && e.inputType && /Paste|Drop/.test(e.inputType)) || (!S.compUsed && chars(v).length - chars(S.lastVal).length > 2))) {
    inp.value = S.lastVal; note('Pasting is disabled. Type it yourself!'); return;
  }
  S.lastVal = v;
  if (!S.running) { S.running = true; S.tm = setInterval(tick, 100); }
  S.eng.input(v);
  if (S.timed && S.eng.typedChars().length > S.eng.length() - 80) { var more = ' ' + gen(S.mode, 60); S.eng.extend(more); addSpans(more); }
  paint(); tick();
  if (!S.timed && !S.done && S.eng.stats().complete) finish();
}
function finish() {
  if (S.done) return; S.done = true; clearInterval(S.tm); S.eng.finish();
  var s = S.eng.stats(); showStats(s); inp.blur(); inp.disabled = true;
  var prior = 0, saved = s.typed > 0 && s.elapsed >= 1, i, h;
  if (saved) {
    for (i = 0; i < D.history.length; i++) { h = D.history[i]; if (h.mode === S.mode && String(h.sub) === String(S.sub) && h.cpm > prior) prior = h.cpm; }
    D.history.push({ t: Date.now(), mode: S.mode, sub: S.sub, wpm: r1(s.wpm), cpm: Math.round(s.cpm), acc: r1(s.acc), err: s.errors, chars: s.correct, secs: r1(s.elapsed) });
    if (D.history.length > 500) D.history = D.history.slice(-500);
    save();
  }
  var p = pair(S.mode, s), items = [p[0], p[1], ['Accuracy', r1(s.acc) + '%'], ['Mistakes', s.errors], ['Time', fmt(s.elapsed)], ['Correct characters', s.correct]];
  $('resBody').innerHTML = '<div class="stats">' + items.map(function (x) { return '<div class="st"><span>' + esc(x[0]) + '</span><b>' + esc(x[1]) + '</b></div>'; }).join('') + '</div>';
  $('resBadge').textContent = !saved ? '' : !prior ? 'First result saved for this setting.' : s.cpm > prior ? 'New personal best!' : 'Your best here is ' + prior + ' CPM.';
  $('resNote').textContent = !saved ? 'Too short to record. Type for at least one second.' : S.mode === 'hindi' ? 'Hindi WPM is an estimate (correct characters ÷ 5 per minute). Use CPM to compare your progress.' : '';
  $('result').hidden = false; $('resRetry').focus();
}

/* ================= DASHBOARD ================= */
function lab(mode, sub) { return mode === 'code' ? 'Code · ' + (CNAME[sub] || esc(sub)) : mode === 'hindi' ? 'Hindi · ' + esc(sub) + 's' : (mode === 'english' ? 'English' : 'Numbers') + ' · ' + esc(sub) + 's'; }
function chart(vals, unit, maxv) {
  if (!vals.length) return '<p class="mut">No sessions for this filter yet.</p>';
  var W = 600, H = 170, p = 30, n = vals.length, mx = maxv || Math.max.apply(null, vals) * 1.15 || 1;
  function X(i) { return p + (n === 1 ? (W - 2 * p) / 2 : i * (W - 2 * p) / (n - 1)); }
  function Y(v) { return H - p - (v / mx) * (H - 2 * p); }
  var g = '', k, y;
  for (k = 0; k <= 3; k++) { y = H - p - k * (H - 2 * p) / 3; g += '<line x1="' + p + '" x2="' + (W - p) + '" y1="' + y + '" y2="' + y + '"/><text x="0" y="' + (y + 4) + '">' + Math.round(mx * k / 3) + '</text>'; }
  return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '"><g class="grid">' + g + '</g><polyline points="' + vals.map(function (v, i) { return X(i).toFixed(1) + ',' + Y(v).toFixed(1); }).join(' ') + '"/>' +
    vals.map(function (v, i) { return '<circle cx="' + X(i).toFixed(1) + '" cy="' + Y(v).toFixed(1) + '" r="3.5"><title>' + r1(v) + unit + '</title></circle>'; }).join('') + '</svg>';
}
function charts() {
  var f = $('fMode').value, H = D.history.filter(function (h) { return f === 'all' || h.mode === f; }).slice(-20);
  $('chSpeed').innerHTML = chart(H.map(function (h) { return h.cpm; }), ' CPM');
  $('chAcc').innerHTML = chart(H.map(function (h) { return h.acc; }), '%', 100);
}
function dash() {
  var H = D.history; $('dashEmpty').hidden = H.length > 0; $('dashFull').hidden = !H.length;
  if (!H.length) return;
  var secs = 0, acc = 0, best = 0, bests = {}, i, h, k;
  for (i = 0; i < H.length; i++) {
    h = H[i]; secs += h.secs; acc += h.acc; if (h.cpm > best) best = h.cpm;
    k = h.mode + '|' + h.sub; if (!bests[k] || h.cpm > bests[k].cpm) bests[k] = h;
  }
  var cards = [['Sessions', H.length], ['Practice time', Math.round(secs / 60) + ' min'], ['Best speed', best + ' CPM'], ['Average accuracy', r1(acc / H.length) + '%']];
  $('summary').innerHTML = cards.map(function (c) { return '<div class="st"><span>' + c[0] + '</span><b>' + c[1] + '</b></div>'; }).join('');
  charts();
  var rows = Object.keys(bests).sort().map(function (k) { var b = bests[k]; return '<tr><td>' + lab(b.mode, b.sub) + '</td><td>' + b.cpm + '</td><td>' + (b.mode === 'hindi' ? '~' : '') + b.wpm + '</td><td>' + b.acc + '%</td></tr>'; }).join('');
  $('bests').innerHTML = '<table><tr><th>Setting</th><th>Best CPM</th><th>WPM</th><th>Accuracy</th></tr>' + rows + '</table>';
  var hr = H.slice(-15).reverse().map(function (h) { return '<tr><td>' + new Date(h.t).toLocaleString() + '</td><td>' + lab(h.mode, h.sub) + '</td><td>' + h.cpm + '</td><td>' + (h.mode === 'hindi' ? '~' : '') + h.wpm + '</td><td>' + h.acc + '%</td><td>' + h.err + '</td></tr>'; }).join('');
  $('history').innerHTML = '<table><tr><th>Date</th><th>Mode</th><th>CPM</th><th>WPM</th><th>Accuracy</th><th>Mistakes</th></tr>' + hr + '</table>';
}

/* ================= ROUTER / THEME / EVENTS ================= */
function route() {
  var r = (location.hash || '#/home').replace(/^#\/?/, '') || 'home';
  clearInterval(S.tm); $('result').hidden = true; $('menu').className = '';
  var page = MODES[r] ? 'practice' : r === 'dashboard' ? 'dashboard' : 'home';
  ['home', 'practice', 'dashboard'].forEach(function (p) { $('page-' + p).hidden = p !== page; });
  Array.prototype.forEach.call(document.querySelectorAll('#menu a'), function (a) { a.className = a.getAttribute('data-r') === (page === 'practice' ? r : page) ? 'on' : ''; });
  if (page === 'practice') openPractice(r);
  if (page === 'dashboard') dash();
  if (page === 'home') $('homeStats').textContent = D.history.length ? 'You have finished ' + D.history.length + ' session' + (D.history.length > 1 ? 's' : '') + '. Open the dashboard to see your progress.' : 'New here? Pick a mode and finish one test to start your progress chart.';
  window.scrollTo(0, 0);
}
function theme(t) {
  document.documentElement.setAttribute('data-theme', t);
  $('themeBtn').textContent = t === 'dark' ? 'Light' : 'Dark';
  try { localStorage.setItem('keyquest_theme', t); } catch (e) {}
}
var saved = null; try { saved = localStorage.getItem('keyquest_theme'); } catch (e) {}
theme(saved === 'light' ? 'light' : 'dark');
$('themeBtn').onclick = function () { theme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'); };
$('menuBtn').onclick = function () { $('menu').className = $('menu').className ? '' : 'open'; };

buildKb();
inp.addEventListener('input', function (e) { onInput(e, false); });
inp.addEventListener('compositionstart', function () { S.composing = true; S.compUsed = true; $('note').textContent = 'Composing…'; });
inp.addEventListener('compositionend', function () { S.composing = false; $('note').textContent = ''; onInput(null, true); });
inp.addEventListener('keydown', function (e) { if (e.key === 'Escape') { begin(false); return; } flash(e); });
inp.addEventListener('focus', function () { $('box').className = 'typebox focus'; $('focusMsg').className = 'focusmsg off'; });
inp.addEventListener('blur', function () { $('box').className = 'typebox'; if (!S.done) $('focusMsg').className = 'focusmsg'; });
['paste', 'drop', 'cut', 'copy', 'contextmenu'].forEach(function (ev) {
  inp.addEventListener(ev, function (e) { e.preventDefault(); if (ev === 'paste' || ev === 'drop') note('Pasting is disabled. Type it yourself!'); });
});
$('box').onclick = function () { if (!S.done) inp.focus(); };
$('restart').onclick = function () { begin(false); };
$('newText').onclick = function () { begin(true); };
$('resRetry').onclick = function () { begin(false); };
$('resNew').onclick = function () { begin(true); };
$('fMode').onchange = charts;
$('clearBtn').onclick = function () { if (confirm('Delete all saved practice history? This cannot be undone.')) { D = { history: [] }; save(); dash(); } };
window.addEventListener('hashchange', route);
route();
})();
