// 외국어 공부 — 화면
(function () {
  "use strict";
  var LANGS = window.FL_LANGS || [];
  var BANK = window.FL_BANK || [];
  var FL = window.FL;
  var $app = document.getElementById("app");
  var LBY = {}; LANGS.forEach(function (l) { LBY[l.id] = l; });

  // ---------- 저장 ----------
  function load(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  var SET = load("fl_set", {});
  SET.helper = SET.helper || {}; LANGS.forEach(function (l) { if (SET.helper[l.id] == null) SET.helper[l.id] = l.helper.def; });
  if (!SET.speed) SET.speed = 1;
  if (SET.tr == null) SET.tr = true;
  function saveSet() { save("fl_set", SET); }
  var PROG = load("fl_prog", {});
  function prog(lang, day) { var k = lang + "-" + day; return PROG[k] || (PROG[k] = {}); }
  function saveProg() { save("fl_prog", PROG); }
  var WRONG = load("fl_wrong", {});
  function wrongOf(lang) { return WRONG[lang] || (WRONG[lang] = {}); }
  function saveWrong() { save("fl_wrong", WRONG); }

  // ---------- 도움 ----------
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function pick(a, n) { return shuffle(a).slice(0, n); }
  function days(lang) { return BANK.filter(function (d) { return d.lang === lang; }).sort(function (a, b) { return a.day - b.day; }); }
  function dayOf(lang, n) { return BANK.find(function (d) { return d.lang === lang && d.day === n; }); }
  function wkey(day, w) { return day + ":" + FL.plain(w.w); }

  // ---------- 글 그리기 ----------
  // helper: 읽기 도움 단계(0=끔). 시험에서는 0을 넘긴다.
  function segs(text) {
    var t = String(text == null ? "" : text), out = [], last = 0, m, re = /\{([^{}|]+)\|([^{}]+)\}/g;
    while ((m = re.exec(t))) { if (m.index > last) out.push({ b: t.slice(last, m.index) }); out.push({ b: m[1], r: m[2] }); last = re.lastIndex; }
    if (last < t.length) out.push({ b: t.slice(last) });
    return out;
  }
  function rubyHTML(b, r) { return "<ruby>" + esc(b) + "<rt>" + esc(r) + "</rt></ruby>"; }
  var ACUTE = "́";
  function renderBody(text, lang, helper) {
    var html = "";
    segs(text).forEach(function (s) {
      if (lang === "ja") {
        html += s.r && helper ? rubyHTML(s.b, s.r) : esc(s.b);
      } else if (lang === "zh") {
        if (!helper) { html += esc(s.b); return; }
        if (s.r) {
          var chars = Array.from(s.b), sy = s.r.trim().split(/\s+/);
          if (sy.length === chars.length) chars.forEach(function (c, i) { html += rubyHTML(c, sy[i]); });
          else html += rubyHTML(s.b, s.r);
          return;
        }
        // 한자 구간만 병음
        s.b.split(/([㐀-鿿]+)/).forEach(function (part, i) {
          if (!part) return;
          if (i % 2 === 0) { html += esc(part); return; }
          FL.zhPinyin(part).forEach(function (x) { html += x.p ? rubyHTML(x.c, x.p) : esc(x.c); });
        });
      } else if (lang === "ru") {
        var b = helper >= 1 ? s.b : s.b.split(ACUTE).join("");
        if (helper >= 2) {
          if (s.r) { html += rubyHTML(b, s.r); return; }
          html += b.split(/([А-Яа-яЁё́]+(?:-[А-Яа-яЁё́]+)*)/).map(function (part, i) {
            if (i % 2 === 0) return esc(part);
            return rubyHTML(part, FL.ruRomanWord(part));
          }).join("");
        } else html += esc(b);
      } else html += esc(s.b);
    });
    return html.replace(/\n/g, "<br>");
  }
  // 대상 언어 글
  function T(text, lang, helper) {
    var L = LBY[lang], h = helper == null ? SET.helper[lang] : helper;
    return '<span lang="' + L.tag + '" class="tl' + (h ? " rb" : "") + '">' + renderBody(text, lang, h) + "</span>";
  }
  // 한국어 설명 속에 섞인 대상 언어 글자에 lang을 붙인다
  var RUNS = { ja: /([぀-ヿ㐀-鿿々〆〜ー「」『』（）・]+(?:[぀-ヿ㐀-鿿々〆〜ー「」『』（）・\s]*[぀-ヿ㐀-鿿々〆〜ー」』）])?)/,
    zh: /([㐀-鿿，。？！、“”：；]+)/, ru: /([А-Яа-яЁё́]+(?:[\s,.!?—-]+[А-Яа-яЁё́]+)*[.!?]?)/ };
  function K(text, lang, helper) {
    if (!lang) return esc(text).replace(/\n/g, "<br>");
    var L = LBY[lang], h = helper == null ? SET.helper[lang] : helper;
    var out = "";
    segs(text).forEach(function (s) {
      if (s.r) { out += '<span lang="' + L.tag + '" class="tl' + (h ? " rb" : "") + '">' + renderBody("{" + s.b + "|" + s.r + "}", lang, h) + "</span>"; return; }
      s.b.split(new RegExp(RUNS[lang].source, "g")).forEach(function (p, i) {
        if (!p) return;
        if (i % 2 === 0) out += esc(p).replace(/\n/g, "<br>");
        else out += '<span lang="' + L.tag + '" class="tl' + (h ? " rb" : "") + '">' + renderBody(p, lang, h) + "</span>";
      });
    });
    // 강세 끔이면 설명 속 강세도 지운다
    return out;
  }

  // ---------- 음성 ----------
  var AU = new Audio(); AU.preload = "auto";
  var seqId = 0, curBtn = null;
  function voiceName(lang, v) { var L = LBY[lang]; return L.voices[v] || L.voices.F; }
  function audioPath(lang, v, text) { return "audio/" + lang + "/" + FL.sayKey(voiceName(lang, v), text) + ".mp3"; }
  function webSpeak(text, lang, v) {
    return new Promise(function (res) {
      if (!window.speechSynthesis) return res();
      var u = new SpeechSynthesisUtterance(FL.speech(text)); u.lang = LBY[lang].tag; u.rate = SET.speed;
      var vs = speechSynthesis.getVoices().filter(function (x) { return x.lang && x.lang.toLowerCase().indexOf(lang) === 0; });
      if (vs.length) u.voice = vs[(v || "").charAt(0) === "M" && vs.length > 1 ? 1 : 0];
      u.onend = u.onerror = function () { res(); };
      speechSynthesis.speak(u);
    });
  }
  function playOne(text, lang, v) {
    return new Promise(function (res) {
      var path = audioPath(lang, v, text);
      var get = window.FL_AUDIO_URL ? window.FL_AUDIO_URL(path) : Promise.resolve(path);
      get.then(function (url) {
        if (!url) throw new Error("no audio");
        var done = false;
        AU.onended = function () { if (!done) { done = true; res(); } };
        AU.onerror = function () { if (!done) { done = true; webSpeak(text, lang, v).then(res); } };
        AU.src = url; AU.playbackRate = SET.speed;
        var p = AU.play(); if (p && p.catch) p.catch(function () { if (!done) { done = true; res(); } });
      }).catch(function () { webSpeak(text, lang, v).then(res); });
    });
  }
  function stopAudio() { seqId++; try { AU.pause(); } catch (e) {} if (window.speechSynthesis) speechSynthesis.cancel(); markPlaying(null); }
  function markPlaying(el) {
    if (curBtn) curBtn.classList.remove("playing");
    curBtn = el; if (el) el.classList.add("playing");
  }
  // 차례로 읽기. items: [{t, v, el}]
  function playSeq(items, lang) {
    stopAudio(); var my = ++seqId, i = 0;
    (function next() {
      if (my !== seqId || i >= items.length) { if (my === seqId) markPlaying(null); return; }
      var it = items[i++];
      markPlaying(it.el || null);
      if (it.el && it.el.scrollIntoView) it.el.scrollIntoView({ block: "nearest", behavior: "smooth" });
      playOne(it.t, lang, it.v).then(function () { if (my === seqId) setTimeout(next, 350); });
    })();
  }
  var SAY = []; // 버튼 → {t, v, lang}
  function spk(text, lang, v, cls) {
    SAY.push({ t: text, v: v || "F", lang: lang });
    return '<button type="button" class="spk ' + (cls || "") + '" data-say="' + (SAY.length - 1) + '" aria-label="듣기" title="듣기">' + ICON.spk + "</button>";
  }
  var ICON = {
    spk: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M3 10v4a1 1 0 0 0 1 1h3l4 4V5L7 9H4a1 1 0 0 0-1 1zm13.5 2a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg>',
    play: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>',
    stop: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M6 6h12v12H6z"/></svg>',
    check: '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>'
  };

  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-say]");
    if (b) { var s = SAY[+b.getAttribute("data-say")]; if (s) { stopAudio(); var my = ++seqId; markPlaying(b); playOne(s.t, s.lang, s.v).then(function () { if (my === seqId) markPlaying(null); }); } }
  });

  // ---------- 상단 ----------
  var ROUTE = { lang: null, day: null, tab: null };
  function topControls() {
    var box = document.getElementById("topCtl");
    var h = "";
    if (ROUTE.lang) {
      var L = LBY[ROUTE.lang];
      h += '<button type="button" class="chip" id="helperBtn" title="읽기 도움 바꾸기">' + esc(L.helper.label) + " · " + esc(L.helper.modes[SET.helper[L.id]]) + "</button>";
    }
    h += '<button type="button" class="chip" id="speedBtn" title="음성 빠르기">' + SET.speed + "×</button>";
    if (window.FL_LOGOUT) h += '<button type="button" class="chip" id="lockBtn" title="이 기기에서 비밀번호 잊기">잠그기</button>';
    box.innerHTML = h;
    var lb = document.getElementById("lockBtn"); if (lb) lb.onclick = function () { if (confirm("이 기기에 저장된 열쇠를 지우고 잠글까요?")) window.FL_LOGOUT(); };
    var hb = document.getElementById("helperBtn");
    if (hb) hb.onclick = function () { var L = LBY[ROUTE.lang]; SET.helper[L.id] = (SET.helper[L.id] + 1) % L.helper.modes.length; saveSet(); rerender(); };
    document.getElementById("speedBtn").onclick = function () { var sp = [1, 0.85, 0.7]; SET.speed = sp[(sp.indexOf(SET.speed) + 1) % sp.length]; saveSet(); AU.playbackRate = SET.speed; topControls(); };
  }
  (function theme() {
    var b = document.getElementById("themeBtn");
    function apply() { var t = load("fl_theme", "auto"); if (t === "auto") document.documentElement.removeAttribute("data-theme"); else document.documentElement.setAttribute("data-theme", t); b.title = "화면: " + ({ auto: "자동", light: "밝게", dark: "어둡게" })[t]; }
    b.onclick = function () { var o = ["auto", "light", "dark"]; save("fl_theme", o[(o.indexOf(load("fl_theme", "auto")) + 1) % 3]); apply(); };
    apply();
  })();

  // ---------- 길 ----------
  function go(h) { if (location.hash === h) route(); else location.hash = h; }
  window.addEventListener("hashchange", route);
  var keepScroll = false;
  function rerender() { keepScroll = true; route(); }
  var TABS = [["words", "단어"], ["wtest", "단어 테스트"], ["grammar", "문법"], ["dialogue", "대화"], ["reading", "독해"], ["review", "정리 테스트"]];
  function route() {
    stopAudio(); SAY = []; QZ = null;
    var p = location.hash.replace(/^#\/?/, "").split("/");
    ROUTE.lang = LBY[p[0]] ? p[0] : null;
    ROUTE.day = ROUTE.lang && p[1] && /^\d+$/.test(p[1]) ? +p[1] : null;
    ROUTE.tab = ROUTE.day ? (TABS.some(function (t) { return t[0] === p[2]; }) ? p[2] : "words") : null;
    var sy = window.scrollY;
    document.body.setAttribute("data-lang", ROUTE.lang || "");
    topControls();
    if (!ROUTE.lang) viewHome();
    else if (p[1] === "wrong") viewWrong(ROUTE.lang);
    else if (!ROUTE.day) viewLang(ROUTE.lang);
    else viewDay(ROUTE.lang, ROUTE.day, ROUTE.tab);
    if (keepScroll) window.scrollTo(0, sy); else window.scrollTo(0, 0);
    keepScroll = false;
  }

  // ---------- 첫 화면 ----------
  function dayDone(lang, d) {
    var g = prog(lang, d.day), n = 0;
    ["words", "grammar", "dialogue"].forEach(function (k) { if (g[k]) n++; });
    ["wtest", "reading", "review"].forEach(function (k) { if (g[k]) n++; });
    return n;
  }
  function viewHome() {
    var h = '<section class="hero"><h1>외국어 공부</h1><p class="sub">일차별로 단어 → 문법 → 대화 → 독해 → 정리 테스트 순서로 공부합니다.</p></section><div class="langs">';
    LANGS.forEach(function (L) {
      var ds = days(L.id), full = ds.filter(function (d) { return dayDone(L.id, d) === 6; }).length;
      var nw = Object.keys(wrongOf(L.id)).length;
      h += '<a class="lang-card" href="#/' + L.id + '" data-l="' + L.id + '"><span class="lang-name" lang="' + L.tag + '">' + esc(L.name) + "</span>" +
        '<span class="lang-ko">' + esc(L.ko) + ' · 목표 ' + esc(L.goal) + "</span>" +
        '<span class="lang-meta">Day ' + ds.length + "개 · 끝낸 날 " + full + (nw ? " · 오답 " + nw : "") + "</span>" +
        '<span class="bar"><i style="width:' + (ds.length ? Math.round(full / ds.length * 100) : 0) + '%"></i></span></a>';
    });
    $app.innerHTML = h + "</div>";
  }

  // ---------- 언어 화면 ----------
  function viewLang(lang) {
    var L = LBY[lang], ds = days(lang), nw = Object.keys(wrongOf(lang)).length;
    var h = '<nav class="crumb"><a href="#/">처음</a> / <span>' + esc(L.ko) + "</span></nav>" +
      '<section class="hero small"><h1 lang="' + L.tag + '">' + esc(L.name) + '</h1><p class="sub">' + esc(L.ko) + " · 목표 " + esc(L.goal) + "</p></section>";
    h += '<div class="row-actions"><a class="btn ghost" href="#/' + lang + '/wrong">오답 노트' + (nw ? " (" + nw + ")" : "") + "</a></div>";
    h += '<div class="day-list">';
    ds.forEach(function (d) {
      var g = prog(lang, d.day);
      var st = TABS.map(function (t) {
        var v = g[t[0]], on = !!v, sc = v && v.n ? " " + v.s + "/" + v.n : "";
        return '<span class="pill' + (on ? " on" : "") + '">' + (on ? ICON.check : "") + esc(t[1]) + esc(sc) + "</span>";
      }).join("");
      h += '<a class="day-card" href="#/' + lang + "/" + d.day + '"><div class="day-head"><span class="day-no">Day ' + d.day + '</span><span class="day-title">' + K(d.title, lang, 0) + "</span></div>" +
        (d.theme ? '<div class="day-theme">' + K(d.theme, lang, 0) + "</div>" : "") + '<div class="pills">' + st + "</div></a>";
    });
    $app.innerHTML = h + "</div>";
  }

  // ---------- Day ----------
  function viewDay(lang, n, tab) {
    var L = LBY[lang], d = dayOf(lang, n);
    if (!d) { $app.innerHTML = '<p class="sub">없는 날입니다. <a href="#/' + lang + '">돌아가기</a></p>'; return; }
    var ds = days(lang), idx = ds.indexOf(d);
    var h = '<nav class="crumb"><a href="#/">처음</a> / <a href="#/' + lang + '">' + esc(L.ko) + "</a> / <span>Day " + n + "</span></nav>";
    h += '<header class="day-hd"><div><div class="day-no">Day ' + n + '</div><h1>' + K(d.title, lang, 0) + "</h1>" + (d.theme ? '<p class="sub">' + K(d.theme, lang, 0) + "</p>" : "") + "</div>" +
      '<div class="day-nav">' + (idx > 0 ? '<a class="btn ghost sm" href="#/' + lang + "/" + ds[idx - 1].day + "/" + tab + '">← Day ' + ds[idx - 1].day + "</a>" : "") +
      (idx < ds.length - 1 ? '<a class="btn ghost sm" href="#/' + lang + "/" + ds[idx + 1].day + "/" + tab + '">Day ' + ds[idx + 1].day + " →</a>" : "") + "</div></header>";
    var g = prog(lang, n);
    h += '<nav class="tabs">' + TABS.map(function (t) {
      return '<a class="tab' + (t[0] === tab ? " on" : "") + (g[t[0]] ? " done" : "") + '" href="#/' + lang + "/" + n + "/" + t[0] + '">' + esc(t[1]) + "</a>";
    }).join("") + "</nav>";
    h += '<div id="pane"></div>';
    $app.innerHTML = h;
    var pane = document.getElementById("pane");
    ({ words: paneWords, wtest: paneWTest, grammar: paneGrammar, dialogue: paneDialogue, reading: paneReading, review: paneReview })[tab](pane, d, L);
  }
  function doneBtn(lang, day, key, label) {
    var on = !!prog(lang, day)[key];
    return '<div class="done-row"><button type="button" class="btn ' + (on ? "ghost" : "") + '" data-done="' + key + '">' + (on ? ICON.check + " 학습 완료" : esc(label || "학습 완료로 표시")) + "</button></div>";
  }
  function wireDone(pane, lang, day) {
    pane.querySelectorAll("[data-done]").forEach(function (b) {
      b.onclick = function () { var g = prog(lang, day), k = b.getAttribute("data-done"); if (g[k]) delete g[k]; else g[k] = 1; saveProg(); rerender(); };
    });
  }

  // ----- 단어 -----
  function paneWords(pane, d, L) {
    var lang = L.id, hideM = !!SET.hideMean;
    var h = '<div class="toolbar"><button type="button" class="btn sm" id="playAll">' + ICON.play + ' 전체 듣기</button>' +
      '<button type="button" class="btn sm ghost" id="stopAll">' + ICON.stop + ' 멈춤</button>' +
      '<label class="tgl"><input type="checkbox" id="hideMean"' + (hideM ? " checked" : "") + '> 뜻 가리기</label>' +
      '<label class="tgl"><input type="checkbox" id="showEx"' + (SET.hideEx ? "" : " checked") + '> 예문</label>' +
      '<span class="count">' + d.words.length + "개</span></div>";
    h += '<ol class="words' + (hideM ? " hide-m" : "") + (SET.hideEx ? " hide-ex" : "") + '">';
    d.words.forEach(function (w, i) {
      h += '<li class="word" id="w' + i + '"><div class="w-main"><span class="w-no">' + (i + 1) + "</span>" +
        '<span class="w-word">' + T(w.w, lang) + "</span>" + spk(w.say || w.w, lang, "F", "w-spk") +
        (w.pos ? '<span class="w-pos">' + esc(w.pos) + "</span>" : "") + "</div>" +
        '<div class="w-mean" tabindex="0">' + K(w.m, lang) + "</div>" +
        (w.note ? '<div class="w-note">' + K(w.note, lang) + "</div>" : "") +
        (w.ex ? '<div class="w-ex"><div class="ex-t">' + T(w.ex, lang) + spk(w.ex, lang, "M") + '</div><div class="ex-k">' + K(w.exk, lang) + "</div></div>" : "") +
        "</li>";
    });
    h += "</ol>" + doneBtn(L.id, d.day, "words");
    pane.innerHTML = h;
    pane.querySelector("#hideMean").onchange = function (e) { SET.hideMean = e.target.checked; saveSet(); pane.querySelector(".words").classList.toggle("hide-m", SET.hideMean); };
    pane.querySelector("#showEx").onchange = function (e) { SET.hideEx = !e.target.checked; saveSet(); pane.querySelector(".words").classList.toggle("hide-ex", SET.hideEx); };
    pane.querySelectorAll(".w-mean").forEach(function (m) { m.onclick = function () { m.classList.toggle("peek"); }; });
    pane.querySelector("#playAll").onclick = function () {
      var items = [];
      d.words.forEach(function (w, i) {
        var el = document.getElementById("w" + i);
        items.push({ t: w.say || w.w, v: "F", el: el });
        if (w.ex && !SET.hideEx) items.push({ t: w.ex, v: "M", el: el });
      });
      playSeq(items, lang);
    };
    pane.querySelector("#stopAll").onclick = stopAudio;
    wireDone(pane, lang, d.day);
  }

  // ----- 문제 만들기 -----
  function jaReading(w) { return segs(w).map(function (s) { return s.r || s.b; }).join(""); }
  function hasRuby(w) { return /\{[^{}|]+\|/.test(w); }
  var DAKU = { "か": "が", "き": "ぎ", "く": "ぐ", "け": "げ", "こ": "ご", "さ": "ざ", "し": "じ", "す": "ず", "せ": "ぜ", "そ": "ぞ", "た": "だ", "ち": "ぢ", "つ": "づ", "て": "で", "と": "ど", "は": "ば", "ひ": "び", "ふ": "ぶ", "へ": "べ", "ほ": "ぼ" };
  var UNDAKU = {}; Object.keys(DAKU).forEach(function (k) { UNDAKU[DAKU[k]] = k; });
  function jaVariants(r) {
    var out = {}, a = Array.from(r);
    function add(x) { if (x && x !== r) out[x] = 1; }
    // 장음 넣고 빼기
    for (var i = 0; i < a.length; i++) {
      if ((a[i] === "う" || a[i] === "い") && i > 0 && "おこそとのほもよろごぞどぼぽょうくすつぬふむゆるぐずづぶぷゅえけせてねへめれげぜでべぺ".indexOf(a[i - 1]) >= 0) add(a.slice(0, i).concat(a.slice(i + 1)).join(""));
      if ("こそとのほもよろごぞどぼょ".indexOf(a[i]) >= 0 && a[i + 1] !== "う" && i < a.length - 1) add(a.slice(0, i + 1).concat(["う"], a.slice(i + 1)).join(""));
      if (a[i] === "っ") add(a.slice(0, i).concat(a.slice(i + 1)).join(""));
      if (i > 0 && i < a.length && "かきくけこさしすせそたちつてとぱぴぷぺぽ".indexOf(a[i]) >= 0 && a[i - 1] !== "っ" && i >= 1) add(a.slice(0, i).concat(["っ"], a.slice(i)).join(""));
      if (DAKU[a[i]]) { var b = a.slice(); b[i] = DAKU[a[i]]; add(b.join("")); }
      if (UNDAKU[a[i]]) { var c = a.slice(); c[i] = UNDAKU[a[i]]; add(c.join("")); }
      if ("ゃゅょ".indexOf(a[i]) >= 0) add(a.slice(0, i).concat(a.slice(i + 1)).join(""));
    }
    return Object.keys(out);
  }
  var TONES = { a: "āáǎà", e: "ēéěè", i: "īíǐì", o: "ōóǒò", u: "ūúǔù", "ü": "ǖǘǚǜ" };
  function zhSyl(w) { return segs(w).map(function (s) { return s.r ? s.r.trim().split(/\s+/) : FL.zhPinyin(s.b).filter(function (x) { return x.p; }).map(function (x) { return x.p; }); }).reduce(function (a, b) { return a.concat(b); }, []); }
  function retone(syl, t) { // t: 0~3
    for (var v in TONES) { var m = TONES[v]; for (var k = 0; k < 4; k++) { var ch = m.charAt(k); if (syl.indexOf(ch) >= 0) return syl.replace(ch, m.charAt(t)); } }
    // 경성 → 주모음에 성조
    var order = ["a", "e", "ou", "o", "iu", "ui", "i", "u", "ü"];
    for (var j = 0; j < order.length; j++) {
      var p = syl.indexOf(order[j]); if (p >= 0) { var vv = order[j].length === 2 ? order[j].charAt(1) : order[j]; var pos = order[j].length === 2 ? p + 1 : p; return syl.slice(0, pos) + TONES[vv].charAt(t) + syl.slice(pos + 1); }
    }
    return syl;
  }
  function toneOf(syl) { for (var v in TONES) for (var k = 0; k < 4; k++) if (syl.indexOf(TONES[v].charAt(k)) >= 0) return k; return -1; }
  function zhVariants(sy) {
    var out = {}, base = sy.join(" ");
    for (var tries = 0; tries < 40 && Object.keys(out).length < 6; tries++) {
      var s = sy.slice(), n = Math.random() < 0.5 && s.length > 1 ? 2 : 1;
      for (var k = 0; k < n; k++) { var i = Math.floor(Math.random() * s.length), t = toneOf(s[i]), nt; do { nt = Math.floor(Math.random() * 4); } while (nt === t); s[i] = retone(s[i], nt); }
      var j = s.join(" "); if (j !== base) out[j] = 1;
    }
    return Object.keys(out);
  }
  function allWords(lang, uptoDay) {
    var r = [];
    days(lang).forEach(function (d) { if (uptoDay == null || d.day <= uptoDay) d.words.forEach(function (w) { r.push({ w: w, day: d.day }); }); });
    return r;
  }
  function distract(correct, cands, n) {
    var seen = {}; seen[correct] = 1; var out = [];
    shuffle(cands).forEach(function (c) { if (out.length < n && c && !seen[c]) { seen[c] = 1; out.push(c); } });
    return out;
  }
  function wordQ(item, lang, type) {
    var L = LBY[lang], w = item.w, pool = allWords(lang);
    var near = pool.filter(function (x) { return x.w !== w && (x.w.pos || "") === (w.pos || ""); });
    var other = pool.filter(function (x) { return x.w !== w; });
    var after = '<div class="qa-word">' + T(w.w, lang, L.helper.modes.length - 1) + spk(w.say || w.w, lang, "F") + (w.pos ? '<span class="w-pos">' + esc(w.pos) + "</span>" : "") + '<div class="qa-mean">' + K(w.m, lang) + "</div>" +
      (w.ex ? '<div class="w-ex"><div class="ex-t">' + T(w.ex, lang, L.helper.modes.length - 1) + spk(w.ex, lang, "M") + '</div><div class="ex-k">' + K(w.exk, lang) + "</div></div>" : "") + "</div>";
    var q = { wk: wkey(item.day, w), lang: lang, after: after, autoSay: { t: w.say || w.w, v: "F" } };
    function mOpts(list) { return distract(w.m, near.map(function (x) { return x.w.m; }), 3).concat(distract(w.m, other.map(function (x) { return x.w.m; }), 3)); }
    if (type === "rev") {
      var cands = distract(FL.plain(w.w), near.map(function (x) { return FL.plain(x.w.w); }).concat(other.map(function (x) { return FL.plain(x.w.w); })), 3);
      q.instr = L.instr.wordRev; q.prompt = '<div class="q-mean">' + K(w.m, lang, 0) + "</div>";
      q.opts = [FL.plain(w.w)].concat(cands).map(function (x) { return T(x, lang, 0); });
    } else if (type === "read") {
      var right, wrongs;
      if (lang === "ja") { right = jaReading(w.w); wrongs = distract(right, jaVariants(right), 3); if (wrongs.length < 3) wrongs = wrongs.concat(distract(right, other.map(function (x) { return jaReading(x.w.w); }), 3 - wrongs.length)); }
      else { var sy = zhSyl(w.w); right = sy.join(" "); wrongs = distract(right, zhVariants(sy), 3); }
      q.instr = L.instr.wordRead; q.prompt = '<div class="q-word">' + T(w.w, lang, 0) + "</div>";
      q.opts = [right].concat(wrongs).map(function (x) { return '<span lang="' + L.tag + '">' + esc(x) + "</span>"; });
      q.autoSay = null; q.sayAfter = { t: w.say || w.w, v: "F" };
    } else if (type === "listen") {
      q.instr = L.instr.listen; q.listen = { t: w.say || w.w, v: "F" };
      q.prompt = '<div class="q-listen">' + spk(w.say || w.w, lang, "F", "big") + "</div>";
      q.opts = [w.m].concat(distract(w.m, mOpts(), 3)).map(function (x) { return K(x, lang, 0); });
      q.autoSay = null;
    } else {
      q.instr = L.instr.word; q.prompt = '<div class="q-word">' + T(w.w, lang, 0) + "</div>";
      q.opts = [w.m].concat(distract(w.m, mOpts(), 3)).map(function (x) { return K(x, lang, 0); });
    }
    q.answer = 0;
    return q;
  }
  function wordTypes(lang, w) {
    var t = ["mean", "mean", "rev", "listen"];
    if (lang === "ja" && hasRuby(w.w)) t.push("read", "read");
    if (lang === "zh" && /[㐀-鿿]/.test(w.w)) t.push("read");
    return t;
  }
  function makeWordQs(items, lang) {
    return items.map(function (it) { var ts = wordTypes(lang, it.w); return wordQ(it, lang, ts[Math.floor(Math.random() * ts.length)]); });
  }
  function grammarQ(gq, lang, gp, hp) {
    var L = LBY[lang], idx = gq.o.map(function (_, i) { return i; });
    var order = shuffle(idx);
    return {
      lang: lang, instr: L.instr.grammar, prompt: '<div class="q-sent">' + T(gq.q, lang, 0) + "</div>",
      opts: order.map(function (i) { return T(gq.o[i], lang, hp || 0); }), answer: order.indexOf(gq.a),
      after: '<div class="qa-expl"><div class="qa-full">' + T(gq.nb ? gq.o[gq.a] : gq.q.replace(/（\s*）|\(\s*\)|＿+|_{2,}/, gq.o[gq.a]), lang, L.helper.modes.length - 1) + "</div>" +
        (gq.k ? '<div class="ex-k">' + K(gq.k, lang) + "</div>" : "") + '<p class="expl">' + K(gq.e, lang) + "</p>" + (gp ? '<p class="gref">문법: ' + K(gp.p, lang) + " — " + K(gp.m, lang) + "</p>" : "") + "</div>"
    };
  }

  // ----- 문제 풀이 틀 -----
  var QZ = null;
  function runQuiz(box, qs, opt) {
    QZ = { qs: qs, i: 0, score: 0, wrong: [], opt: opt || {}, box: box, answered: false };
    showQ();
  }
  function showQ() {
    var z = QZ; if (!z) return;
    var q = z.qs[z.i];
    if (!q) return finishQuiz();
    SAY = SAY.slice(0); // 유지
    z.answered = false;
    var h = '<div class="quiz"><div class="q-top"><span class="q-n">' + (z.i + 1) + " / " + z.qs.length + '</span><span class="q-score">맞음 ' + z.score + '</span></div>' +
      '<div class="q-bar"><i style="width:' + Math.round(z.i / z.qs.length * 100) + '%"></i></div>' +
      (q.tag ? '<div class="q-tag">' + esc(q.tag) + "</div>" : "") +
      '<div class="q-instr" lang="' + LBY[q.lang].tag + '">' + esc(q.instr) + "</div>" + q.prompt +
      '<ol class="opts">' + q.opts.map(function (o, i) { return '<li><button type="button" class="opt" data-i="' + i + '"><span class="o-n">' + (i + 1) + '</span><span class="o-t">' + o + "</span></button></li>"; }).join("") + "</ol>" +
      '<div class="q-after" hidden></div><div class="q-next" hidden><button type="button" class="btn" id="nextQ">' + (z.i + 1 < z.qs.length ? "다음" : "결과 보기") + " (Enter)</button></div></div>";
    // 선지 섞기(정답 0으로 만든 것만)
    z.box.innerHTML = h;
    var ol = z.box.querySelector(".opts"), lis = Array.from(ol.children);
    if (!q.fixed) {
      var sh = shuffle(lis); sh.forEach(function (li, k) { ol.appendChild(li); li.querySelector(".o-n").textContent = k + 1; });
    }
    z.box.querySelectorAll(".opt").forEach(function (b) { b.onclick = function () { answer(+b.getAttribute("data-i")); }; });
    z.box.querySelector("#nextQ").onclick = function () { z.i++; showQ(); };
    if (q.listen) setTimeout(function () { var b = z.box.querySelector(".q-listen .spk"); if (b) b.click(); }, 250);
    if (!keepScroll) z.box.scrollIntoView({ block: "start" });
  }
  function answer(i) {
    var z = QZ; if (!z || z.answered) return;
    var q = z.qs[z.i]; z.answered = true;
    var ok = i === q.answer;
    if (ok) z.score++; else z.wrong.push(q);
    z.box.querySelectorAll(".opt").forEach(function (b) {
      var k = +b.getAttribute("data-i"); b.disabled = true;
      if (k === q.answer) b.classList.add("right"); else if (k === i) b.classList.add("bad");
    });
    if (q.wk) {
      var W = wrongOf(q.lang);
      if (!ok) W[q.wk] = { n: ((W[q.wk] && W[q.wk].n) || 0) + 1, t: Date.now() };
      else if (z.opt.wrongMode && W[q.wk]) { W[q.wk].ok = (W[q.wk].ok || 0) + 1; if (W[q.wk].ok >= 2) delete W[q.wk]; }
      saveWrong();
    }
    var af = z.box.querySelector(".q-after");
    af.innerHTML = '<div class="verdict ' + (ok ? "ok" : "no") + '">' + (ok ? "정답" : "오답") + "</div>" + (q.after || "");
    af.hidden = false; z.box.querySelector(".q-next").hidden = false;
    var s = q.autoSay || q.sayAfter;
    if (s) { stopAudio(); playOne(s.t, q.lang, s.v); }
  }
  document.addEventListener("keydown", function (e) {
    if (!QZ || e.target.tagName === "INPUT" || e.altKey || e.ctrlKey || e.metaKey) return;
    if (!QZ.answered && /^[1-9]$/.test(e.key)) {
      var b = QZ.box.querySelectorAll(".opt")[+e.key - 1]; if (b) { e.preventDefault(); b.click(); }
    } else if (QZ.answered && e.key === "Enter") { e.preventDefault(); QZ.i++; showQ(); }
  });
  function finishQuiz() {
    var z = QZ, n = z.qs.length, pct = n ? Math.round(z.score / n * 100) : 0;
    if (z.opt.onDone) z.opt.onDone(z.score, n);
    var h = '<div class="result"><div class="r-score"><b>' + z.score + "</b> / " + n + '<span class="r-pct">' + pct + "%</span></div>";
    if (z.wrong.length) {
      h += '<h3>틀린 문제</h3><ol class="r-wrong">' + z.wrong.map(function (q) { return "<li>" + '<div class="q-instr small">' + esc(q.instr) + "</div>" + q.prompt.replace(/<button[^>]*data-say[^>]*>[\s\S]*?<\/button>/, "") + '<div class="r-ans">정답: ' + q.opts[q.answer] + "</div>" + (q.after || "") + "</li>"; }).join("") + "</ol>";
    }
    h += '<div class="row-actions"><button type="button" class="btn" id="again">다시 풀기</button>' + (z.wrong.length ? '<button type="button" class="btn ghost" id="againWrong">틀린 것만 다시</button>' : "") + "</div></div>";
    z.box.innerHTML = h;
    var opt = z.opt, wrong = z.wrong, box = z.box;
    box.querySelector("#again").onclick = function () { runQuiz(box, opt.make(), opt); };
    var aw = box.querySelector("#againWrong");
    if (aw) aw.onclick = function () { runQuiz(box, shuffle(wrong.map(function (q) { return q.remake ? q.remake() : q; })), Object.assign({}, opt, { onDone: null })); };
    QZ = null;
    box.scrollIntoView({ block: "start" });
  }

  // ----- 단어 테스트 -----
  function paneWTest(pane, d, L) {
    var lang = L.id;
    function make() { return makeWordQs(shuffle(d.words.map(function (w) { return { w: w, day: d.day }; })), lang).map(function (q, i, all) { return q; }); }
    startScreen(pane, "단어 테스트", d.words.length + "문항 · 뜻 고르기, 단어 고르기, 듣고 고르기" + (lang === "ja" ? ", 읽기 고르기" : lang === "zh" ? ", 병음 고르기" : "") + "가 섞여 나옵니다. 읽기 도움은 보이지 않습니다.", prog(lang, d.day).wtest, function () {
      runQuiz(pane, make(), { make: make, onDone: function (s, n) { prog(lang, d.day).wtest = { s: s, n: n, t: Date.now() }; saveProg(); } });
    });
  }
  function startScreen(pane, title, desc, last, start) {
    pane.innerHTML = '<div class="start"><h2>' + esc(title) + '</h2><p class="sub">' + esc(desc) + "</p>" +
      (last ? '<p class="last">지난 기록: ' + last.s + " / " + last.n + "</p>" : "") +
      '<button type="button" class="btn" id="startQ">시작</button></div>';
    pane.querySelector("#startQ").onclick = start;
  }

  // ----- 문법 -----
  function paneGrammar(pane, d, L) {
    var lang = L.id, h = "";
    d.grammar.forEach(function (g, gi) {
      h += '<article class="gcard"><header><span class="g-no">' + (gi + 1) + '</span><h2>' + T(g.p, lang) + '</h2></header><div class="g-mean">' + K(g.m, lang) + "</div>" +
        (g.form ? '<div class="g-form"><span class="lbl">접속</span>' + K(g.form, lang) + "</div>" : "") +
        '<div class="g-expl">' + K(g.e, lang) + "</div>" +
        '<ul class="g-ex">' + (g.ex || []).map(function (x) { return '<li><div class="ex-t">' + T(x.t, lang) + spk(x.t, lang, "F") + '</div><div class="ex-k">' + K(x.k, lang) + "</div></li>"; }).join("") + "</ul>" +
        ((g.quiz || []).length ? '<div class="g-quiz" data-g="' + gi + '"></div>' : "") + "</article>";
    });
    h += doneBtn(lang, d.day, "grammar");
    pane.innerHTML = h;
    pane.querySelectorAll(".g-quiz").forEach(function (box) {
      var g = d.grammar[+box.getAttribute("data-g")];
      box.innerHTML = '<div class="gq-h">확인 문제</div>' + g.quiz.map(function (gq, qi) {
        var q = grammarQ(gq, lang, null, SET.helper[lang]);
        return '<div class="gq" data-q="' + qi + '"><div class="gq-q">' + T(gq.q, lang) + '</div><div class="gq-o">' + q.opts.map(function (o, i) { return '<button type="button" class="opt sm" data-i="' + i + '" data-ok="' + (i === q.answer ? 1 : 0) + '">' + o + "</button>"; }).join("") + '</div><div class="gq-a" hidden>' + q.after + "</div></div>";
      }).join("");
      box.querySelectorAll(".gq").forEach(function (qd) {
        qd.querySelectorAll(".opt").forEach(function (b) {
          b.onclick = function () {
            qd.querySelectorAll(".opt").forEach(function (x) { x.disabled = true; if (x.getAttribute("data-ok") === "1") x.classList.add("right"); });
            if (b.getAttribute("data-ok") !== "1") b.classList.add("bad");
            qd.querySelector(".gq-a").hidden = false;
          };
        });
      });
    });
    wireDone(pane, lang, d.day);
  }

  // ----- 대화 -----
  function paneDialogue(pane, d, L) {
    var lang = L.id, dg = d.dialogue, cast = dg.cast, ids = Object.keys(cast);
    var h = '<div class="dlg-hd"><h2>' + T(dg.title, lang) + "</h2>" + (dg.scene ? '<p class="sub">' + K(dg.scene, lang) + "</p>" : "") +
      '<div class="cast">' + ids.map(function (id, i) { var c = cast[id]; return '<span class="who s' + i + '">' + T(c.name, lang) + '<small>' + esc(c.ko || "") + " · " + (c.voice.charAt(0) === "M" ? "남" : "여") + "</small></span>"; }).join("") + "</div></div>";
    h += '<div class="toolbar"><button type="button" class="btn sm" id="playAll">' + ICON.play + ' 대화 듣기</button><button type="button" class="btn sm ghost" id="stopAll">' + ICON.stop + ' 멈춤</button>' +
      '<label class="tgl"><input type="checkbox" id="showTr"' + (SET.tr ? " checked" : "") + "> 해석</label></div>";
    h += '<ol class="dlg' + (SET.tr ? "" : " no-tr") + '">';
    dg.lines.forEach(function (ln, i) {
      var si = ids.indexOf(ln.s), c = cast[ln.s];
      h += '<li class="line s' + si + (si % 2 ? " right" : "") + '" id="ln' + i + '"><div class="who-n">' + T(c.name, lang) + '</div><div class="bubble"><div class="ln-t">' + T(ln.t, lang) + spk(ln.t, lang, c.voice) + '</div><div class="ln-k">' + K(ln.k, lang) + "</div></div></li>";
    });
    h += "</ol>";
    if (dg.notes && dg.notes.length) h += '<section class="notes"><h3>표현 정리</h3><dl>' + dg.notes.map(function (n) { return "<dt>" + T(n.t, lang) + "</dt><dd>" + K(n.k, lang) + "</dd>"; }).join("") + "</dl></section>";
    h += doneBtn(lang, d.day, "dialogue");
    pane.innerHTML = h;
    pane.querySelector("#showTr").onchange = function (e) { SET.tr = e.target.checked; saveSet(); pane.querySelector(".dlg").classList.toggle("no-tr", !SET.tr); };
    pane.querySelector("#playAll").onclick = function () {
      playSeq(dg.lines.map(function (ln, i) { return { t: ln.t, v: cast[ln.s].voice, el: document.getElementById("ln" + i) }; }), lang);
    };
    pane.querySelector("#stopAll").onclick = stopAudio;
    wireDone(pane, lang, d.day);
  }

  // ----- 독해 -----
  function paneReading(pane, d, L) {
    var lang = L.id, h = '<div class="q-instr" lang="' + L.tag + '">' + esc(L.instr.reading) + "</div>";
    var ORD = [];
    d.reading.forEach(function (r, ri) {
      var paras = r.text.split(/\n\s*\n/);
      h += '<article class="passage"><header><h2>' + T(r.title, lang) + "</h2>" +
        '<button type="button" class="btn sm" data-pall="' + ri + '">' + ICON.play + ' 전체 듣기</button><button type="button" class="btn sm ghost stopA">' + ICON.stop + "</button>" +
        '<span class="count">' + FL.plain(r.text).replace(/\s/g, "").length + (lang === "ru" ? "자" : "자") + " · " + r.qs.length + "문항</span></header>" +
        paras.map(function (p, pi) { return '<p class="para" id="p' + ri + "_" + pi + '">' + T(p, lang) + spk(p, lang, r.voice || "F", "para-spk") + "</p>"; }).join("") + "</article>";
      h += '<ol class="rq">';
      r.qs.forEach(function (q, qi) {
        var ord = shuffle(q.o.map(function (_, i) { return i; })); ORD.push(ord);
        h += '<li class="rqi" data-r="' + ri + '" data-q="' + qi + '"><div class="rq-q">' + T(q.q, lang) + '</div><div class="rq-o">' +
          ord.map(function (oi, k) { return '<label class="ropt"><input type="radio" name="r' + ri + "_" + qi + '" value="' + oi + '"><span class="o-n">' + (k + 1) + '</span><span class="o-t">' + T(q.o[oi], lang) + "</span></label>"; }).join("") +
          '</div><div class="rq-e" hidden></div></li>';
      });
      h += "</ol>";
      if (r.k) h += '<details class="trans" hidden data-tr="' + ri + '"><summary>전문 해석</summary><div>' + K(r.k, lang) + "</div></details>";
    });
    var last = prog(lang, d.day).reading;
    h += '<div class="row-actions"><button type="button" class="btn" id="grade">채점하기</button>' + (last ? '<span class="last">지난 기록: ' + last.s + " / " + last.n + "</span>" : "") + "</div>";
    pane.innerHTML = h;
    pane.querySelectorAll("[data-pall]").forEach(function (b) {
      b.onclick = function () {
        var ri = +b.getAttribute("data-pall"), r = d.reading[ri];
        playSeq(r.text.split(/\n\s*\n/).map(function (p, pi) { return { t: p, v: r.voice || "F", el: document.getElementById("p" + ri + "_" + pi) }; }), lang);
      };
    });
    pane.querySelectorAll(".stopA").forEach(function (b) { b.onclick = stopAudio; });
    pane.querySelector("#grade").onclick = function () {
      var s = 0, n = 0, oi = 0;
      pane.querySelectorAll(".rqi").forEach(function (li) {
        var r = d.reading[+li.getAttribute("data-r")], q = r.qs[+li.getAttribute("data-q")]; n++;
        var sel = li.querySelector("input:checked"), v = sel ? +sel.value : -1, ok = v === q.a;
        if (ok) s++;
        li.classList.add(ok ? "ok" : "no");
        li.querySelectorAll(".ropt").forEach(function (lab) {
          var x = +lab.querySelector("input").value; lab.querySelector("input").disabled = true;
          if (x === q.a) lab.classList.add("right"); else if (x === v) lab.classList.add("bad");
        });
        var e = '<div class="verdict ' + (ok ? "ok" : "no") + '">' + (ok ? "정답" : (v < 0 ? "답하지 않음" : "오답")) + "</div>";
        if (q.ev) e += '<blockquote class="ev">' + T(q.ev, lang, SET.helper[lang]) + "</blockquote>";
        e += '<div class="expl">' + K(q.e, lang) + "</div>";
        if (q.oe) e += '<ul class="oe">' + ORD[oi].map(function (k, j) { return '<li class="' + (k === q.a ? "right" : "") + '"><span class="o-n">' + (j + 1) + "</span><div>" + T(q.o[k], lang) + '<div class="oe-t">' + K(q.oe[k], lang) + "</div></div></li>"; }).join("") + "</ul>";
        var box = li.querySelector(".rq-e"); box.innerHTML = e; box.hidden = false; oi++;
      });
      pane.querySelectorAll(".trans").forEach(function (t) { t.hidden = false; });
      prog(lang, d.day).reading = { s: s, n: n, t: Date.now() }; saveProg();
      var b = pane.querySelector("#grade"); b.textContent = s + " / " + n + " · 다시 풀기"; b.onclick = function () { rerender(); };
    };
  }

  // ----- 정리 테스트 -----
  function paneReview(pane, d, L) {
    var lang = L.id;
    function make() {
      var today = d.words.map(function (w) { return { w: w, day: d.day }; });
      var before = allWords(lang, d.day - 1);
      var nb = Math.min(before.length, 3), nt = 10 - nb;
      var ws = pick(today, nt).concat(pick(before, nb));
      var qs = makeWordQs(ws, lang).map(function (q) { q.tag = "단어"; return q; });
      d.grammar.forEach(function (g) { (g.quiz || []).forEach(function (gq) { var q = grammarQ(gq, lang, g); q.tag = "문법"; q.answer = q.answer; q.fixed = true; qs.push(q); }); });
      var lines = d.dialogue.lines, picks = pick(lines.filter(function (l) { return FL.plain(l.t).length > 3; }), 2);
      picks.forEach(function (ln) {
        var c = d.dialogue.cast[ln.s];
        var opts = [ln.k].concat(distract(ln.k, lines.map(function (l) { return l.k; }), 3));
        qs.push({ lang: lang, tag: "대화 듣기", instr: L.instr.dialog, listen: { t: ln.t, v: c.voice }, prompt: '<div class="q-listen">' + spk(ln.t, lang, c.voice, "big") + "</div>",
          opts: opts.map(function (x) { return K(x, lang, 0); }), answer: 0, after: '<div class="qa-expl"><div class="qa-full">' + T(ln.t, lang, LBY[lang].helper.modes.length - 1) + "</div></div>" });
      });
      qs = shuffle(qs);
      // 독해: 학습용과 다른 지문. 지문을 문제마다 함께 보인다
      var rr = d.review && d.review.reading;
      if (rr) {
        var pass = '<div class="passage mini"><h3>' + T(rr.title, lang, 0) + "</h3>" + rr.text.split(/\n\s*\n/).map(function (p) { return '<p class="para">' + T(p, lang, 0) + "</p>"; }).join("") + "</div>";
        rr.qs.forEach(function (rq, qi) {
          var ord = shuffle(rq.o.map(function (_, i) { return i; }));
          var af = '<div class="qa-expl">' + (rq.ev ? '<blockquote class="ev">' + T(rq.ev, lang, LBY[lang].helper.modes.length - 1) + "</blockquote>" : "") + '<div class="expl">' + K(rq.e, lang) + "</div>" +
            (rq.oe ? '<ul class="oe">' + ord.map(function (k, j) { return '<li class="' + (k === rq.a ? "right" : "") + '"><span class="o-n">' + (j + 1) + "</span><div>" + T(rq.o[k], lang) + '<div class="oe-t">' + K(rq.oe[k], lang) + "</div></div></li>"; }).join("") + "</ul>" : "") +
            (qi === rr.qs.length - 1 && rr.k ? '<details class="trans"><summary>전문 해석</summary><div>' + K(rr.k, lang) + "</div></details>" : "") + "</div>";
          qs.push({ lang: lang, tag: "독해", instr: L.instr.reading, fixed: true, prompt: pass + '<div class="q-sent">' + T(rq.q, lang, 0) + "</div>",
            opts: ord.map(function (k) { return T(rq.o[k], lang, 0); }), answer: ord.indexOf(rq.a), after: af });
        });
      }
      return qs;
    }
    var nG = d.grammar.reduce(function (s, g) { return s + (g.quiz || []).length; }, 0);
    var nR = d.review && d.review.reading ? d.review.reading.qs.length : 0;
    startScreen(pane, "정리 테스트", "단어 10문항(오늘 단어와 지난 날 단어에서 무작위), 문법 " + nG + "문항, 대화 듣기 2문항" + (nR ? ", 새 지문 독해 " + nR + "문항" : "") + ". 읽기 도움은 보이지 않습니다.", prog(lang, d.day).review, function () {
      runQuiz(pane, make(), { make: make, onDone: function (s, n) { prog(lang, d.day).review = { s: s, n: n, t: Date.now() }; saveProg(); } });
    });
  }

  // ----- 오답 노트 -----
  function viewWrong(lang) {
    var L = LBY[lang], W = wrongOf(lang), items = [];
    days(lang).forEach(function (d) { d.words.forEach(function (w) { var k = wkey(d.day, w); if (W[k]) items.push({ w: w, day: d.day, n: W[k].n }); }); });
    items.sort(function (a, b) { return b.n - a.n; });
    var h = '<nav class="crumb"><a href="#/">처음</a> / <a href="#/' + lang + '">' + esc(L.ko) + "</a> / <span>오답 노트</span></nav>" +
      '<section class="hero small"><h1>오답 노트</h1><p class="sub">테스트에서 틀린 단어가 모입니다. 오답 테스트에서 두 번 맞히면 빠집니다.</p></section>';
    if (!items.length) { $app.innerHTML = h + '<p class="empty">아직 틀린 단어가 없습니다.</p>'; return; }
    h += '<div class="row-actions"><button type="button" class="btn" id="wrongTest">오답 테스트 (' + Math.min(items.length, 20) + "문항)</button>" +
      '<button type="button" class="btn ghost" id="wrongClear">모두 지우기</button></div><div id="wq"></div><ol class="words">';
    items.forEach(function (it) {
      h += '<li class="word"><div class="w-main"><span class="w-no">D' + it.day + "</span><span class=\"w-word\">" + T(it.w.w, lang) + "</span>" + spk(it.w.say || it.w.w, lang, "F") + '<span class="w-pos">틀림 ' + it.n + '</span></div><div class="w-mean">' + K(it.w.m, lang) + "</div></li>";
    });
    $app.innerHTML = h + "</ol>";
    document.getElementById("wrongClear").onclick = function () { if (confirm("오답 노트를 모두 지울까요?")) { WRONG[lang] = {}; saveWrong(); route(); } };
    document.getElementById("wrongTest").onclick = function () {
      var box = document.getElementById("wq");
      function make() { return makeWordQs(pick(items, 20), lang); }
      document.querySelector(".words").hidden = true;
      runQuiz(box, make(), { make: make, wrongMode: true });
    };
  }

  route();
})();
