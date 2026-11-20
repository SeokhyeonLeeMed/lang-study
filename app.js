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
  function saveProg() { save("fl_prog", PROG); syncDirty(); nextUpSave(); }
  var WRONG = load("fl_wrong", {});
  function wrongOf(lang) { return WRONG[lang] || (WRONG[lang] = {}); }
  function saveWrong() { save("fl_wrong", WRONG); syncDirty(); }

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
  function hush() { try { AU.pause(); } catch (e) {} if (window.speechSynthesis) speechSynthesis.cancel(); }
  function stopAudio() { seqId++; hush(); markPlaying(null); plClose(); }
  function markPlaying(el) {
    if (curBtn) curBtn.classList.remove("playing");
    curBtn = el; if (el) el.classList.add("playing");
  }

  // ---------- 이어 듣기 (전체 듣기 플레이어) ----------
  // 대화·독해·단어의 '전체 듣기'. 아래에 뜨는 막대로 이전/다시/멈춤/다음을 고르고,
  // 대화 말풍선·독해 단락을 누르면 그 줄부터 끝까지 이어서 읽는다(2026-11-20 사용자 요청).
  // items: [{t, v, el, who?}], start: 시작 줄 번호
  var PL = null;
  function playSeq(items, lang, start) {
    stopAudio();
    PL = { items: items, lang: lang, i: Math.max(0, Math.min(start || 0, items.length - 1)), my: ++seqId, paused: false, waiting: false };
    document.body.classList.add("pl-on");
    plStep();
  }
  function plStep() {
    var P = PL; if (!P) return;
    if (P.i >= P.items.length) { markPlaying(null); plClose(); return; }
    var it = P.items[P.i], my = P.my;
    P.waiting = false; P.paused = false;
    markPlaying(it.el || null);
    if (it.el && it.el.scrollIntoView) it.el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    plUI();
    playOne(it.t, P.lang, it.v).then(function () {
      if (PL !== P || P.my !== my) return;
      setTimeout(function () {
        if (PL !== P || P.my !== my) return;
        if (P.paused) { P.waiting = true; return; }   // 줄 사이에서 멈춘 경우: 다시 누르면 다음 줄로
        P.i++; plStep();
      }, 380);
    });
  }
  // j번 줄부터 다시(같은 줄을 누르면 그 줄을 한 번 더)
  function plJump(j) {
    var P = PL; if (!P) return;
    hush(); P.my = ++seqId;
    P.i = Math.max(0, Math.min(j, P.items.length - 1));
    plStep();
  }
  function plToggle() {
    var P = PL; if (!P) return;
    if (!P.paused) {
      P.paused = true;
      try { AU.pause(); } catch (e) {}
      if (window.speechSynthesis && speechSynthesis.speaking) speechSynthesis.pause();
    } else {
      P.paused = false;
      if (P.waiting) { P.i++; P.my = ++seqId; plStep(); return; }
      if (window.speechSynthesis && speechSynthesis.paused) speechSynthesis.resume();
      else if (AU.src && AU.paused && !AU.ended) { var p = AU.play(); if (p && p.catch) p.catch(function () { plJump(P.i); }); }
      else plJump(P.i);
    }
    plUI();
  }
  function plClose() {
    PL = null; document.body.classList.remove("pl-on");
    var bar = document.getElementById("plBar"); if (bar) bar.hidden = true;
  }
  // 목록에서 누른 요소가 플레이어의 몇 번째 줄인지
  function plIndexOf(el) {
    if (!PL) return -1;
    for (var i = 0; i < PL.items.length; i++) if (PL.items[i].el === el) return i;
    return -1;
  }
  function plUI() {
    var P = PL, bar = document.getElementById("plBar");
    if (!bar) {
      bar = document.createElement("div"); bar.id = "plBar"; bar.className = "pl-bar"; bar.setAttribute("role", "toolbar"); bar.setAttribute("aria-label", "이어 듣기");
      bar.innerHTML = '<div class="pl-info"><span class="pl-eq" aria-hidden="true"><i></i><i></i><i></i></span><span class="pl-who"></span><span class="pl-n"></span></div>' +
        '<div class="pl-btns"><button type="button" data-pl="prev" title="이전 줄 (←)" aria-label="이전 줄">' + ICON.prev + '</button>' +
        '<button type="button" data-pl="again" title="이 줄 다시 (R)" aria-label="이 줄 다시">' + ICON.again + '</button>' +
        '<button type="button" data-pl="toggle" class="pl-main" title="멈춤/계속 (Space)" aria-label="멈춤/계속"></button>' +
        '<button type="button" data-pl="next" title="다음 줄 (→)" aria-label="다음 줄">' + ICON.next + '</button>' +
        '<button type="button" data-pl="close" title="끄기 (Esc)" aria-label="끄기">' + ICON.close + "</button></div>" +
        '<div class="pl-prog"><i></i></div>';
      document.body.appendChild(bar);
      bar.addEventListener("click", function (e) {
        var b = e.target.closest("[data-pl]"); if (!b || !PL) return;
        var a = b.getAttribute("data-pl");
        if (a === "prev") plJump(PL.i - 1);
        else if (a === "next") { if (PL.i + 1 >= PL.items.length) stopAudio(); else plJump(PL.i + 1); }
        else if (a === "again") plJump(PL.i);
        else if (a === "toggle") plToggle();
        else if (a === "close") stopAudio();
      });
    }
    if (!P) { bar.hidden = true; return; }
    bar.hidden = false;
    var it = P.items[P.i] || {};
    bar.classList.toggle("paused", !!P.paused);
    bar.querySelector(".pl-who").textContent = it.who || "";
    bar.querySelector(".pl-n").textContent = (P.i + 1) + " / " + P.items.length;
    bar.querySelector(".pl-main").innerHTML = P.paused ? ICON.play : ICON.pause;
    bar.querySelector('[data-pl="prev"]').disabled = P.i === 0;
    bar.querySelector(".pl-prog i").style.width = Math.round((P.i + 1) / P.items.length * 100) + "%";
  }
  document.addEventListener("keydown", function (e) {
    if (!PL || QZ || e.altKey || e.ctrlKey || e.metaKey || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    var k = e.key;
    if (k === " " || k === "Spacebar") { e.preventDefault(); plToggle(); }
    else if (k === "ArrowLeft") { e.preventDefault(); plJump(PL.i - 1); }
    else if (k === "ArrowRight") { e.preventDefault(); if (PL.i + 1 >= PL.items.length) stopAudio(); else plJump(PL.i + 1); }
    else if (k === "r" || k === "R") { e.preventDefault(); plJump(PL.i); }
    else if (k === "Escape") stopAudio();
  });
  // 글을 끌어 고르는 중이면 누름으로 치지 않는다
  function selecting() { var s = window.getSelection && window.getSelection(); return !!(s && String(s).length); }
  var SAY = []; // 버튼 → {t, v, lang}
  function spk(text, lang, v, cls) {
    SAY.push({ t: text, v: v || "F", lang: lang });
    return '<button type="button" class="spk ' + (cls || "") + '" data-say="' + (SAY.length - 1) + '" aria-label="듣기" title="듣기">' + ICON.spk + "</button>";
  }
  var ICON = {
    spk: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M3 10v4a1 1 0 0 0 1 1h3l4 4V5L7 9H4a1 1 0 0 0-1 1zm13.5 2a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg>',
    play: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>',
    stop: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M6 6h12v12H6z"/></svg>',
    check: '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>',
    prev: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M6 5h2v14H6zM9.5 12 19 5v14z"/></svg>',
    next: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M16 5h2v14h-2zM14.5 12 5 19V5z"/></svg>',
    again: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 5V2L7 6l5 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z"/></svg>',
    close: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>'
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
    if (SY.cfg) h += '<span class="chip sync" id="syncChip" hidden></span>';
    if (window.FL_LOGOUT) h += '<button type="button" class="chip" id="lockBtn" title="이 기기에서 로그아웃">로그아웃</button>';
    box.innerHTML = h;
    var sc = document.getElementById("syncChip"); if (sc) chipSync(sc);
    var lb = document.getElementById("lockBtn"); if (lb) lb.onclick = function () { if (confirm("로그아웃할까요? 기록은 서버에 남습니다.")) (SYMETA.dirty ? syncPush() : Promise.resolve()).then(function () { window.FL_LOGOUT(); }); };
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
    ROUTE.check = !!(ROUTE.lang && p[1] === "check");
    ROUTE.tab = ROUTE.day ? (TABS.some(function (t) { return t[0] === p[2]; }) ? p[2] : "words") : null;
    var sy = window.scrollY;
    document.body.setAttribute("data-lang", ROUTE.lang || "");
    topControls();
    if (!ROUTE.lang) viewHome();
    else if (p[1] === "wrong") viewWrong(ROUTE.lang);
    else if (ROUTE.check) viewCheck(ROUTE.lang, +p[2]);
    else if (!ROUTE.day) viewLang(ROUTE.lang);
    else viewDay(ROUTE.lang, ROUTE.day, ROUTE.tab);
    if (keepScroll) window.scrollTo(0, sy); else window.scrollTo(0, 0);
    keepScroll = false;
    nextUpSave();
  }

  // ---------- 첫 화면 ----------
  function dayDone(lang, d) {
    var g = prog(lang, d.day), n = 0;
    ["words", "grammar", "dialogue"].forEach(function (k) { if (g[k]) n++; });
    ["wtest", "reading", "review"].forEach(function (k) { if (g[k]) n++; });
    return n;
  }
  var GLYPH = { ja: "あ", zh: "中", ru: "Я" };
  function viewHome() {
    var h = '<section class="hero home"><img class="logo big" src="icon-192.png" alt=""><div><h1>외국어 공부</h1><p class="sub">일차별로 단어 → 문법 → 대화 → 독해 → 정리 테스트 순서로 공부합니다.</p></div></section><div class="langs">';
    LANGS.forEach(function (L) {
      var ds = days(L.id), full = ds.filter(function (d) { return dayDone(L.id, d) === 6; }).length;
      var nw = Object.keys(wrongOf(L.id)).length;
      var nx = nextOf(L.id);
      h += '<a class="lang-card" href="#/' + L.id + '" data-l="' + L.id + '"><span class="lang-glyph" aria-hidden="true" lang="' + L.tag + '">' + GLYPH[L.id] + "</span>" +
        '<span class="lang-name" lang="' + L.tag + '">' + esc(L.name) + "</span>" +
        '<span class="lang-ko">' + esc(L.ko) + ' · 목표 ' + esc(L.goal) + "</span>" +
        '<span class="lang-meta">Day ' + ds.length + "개 · 끝낸 날 " + full + (nw ? " · 오답 " + nw : "") + "</span>" +
        '<span class="bar"><i style="width:' + (ds.length ? Math.round(full / ds.length * 100) : 0) + '%"></i></span>' +
        (nx ? '<span class="lang-next">다음 · ' + esc(nx) + "</span>" : '<span class="lang-next done">모두 끝냈습니다</span>') + "</a>";
    });
    $app.innerHTML = h + "</div>" +
      '<section class="device"><h2>설정</h2><div class="dv-row" id="syncRow"></div><div class="dv-row" id="pushRow"></div></section>';
    syncUI();
    pushUI();
  }

  // ---------- 기록 저장 (서버) ----------
  // 공개판에서만 켜진다. boot.js가 로그인한 Supabase 세션(FL_SB·FL_USER)과 설정(FL_SYNC)을 넘긴다.
  // user_files(본인만 읽고 쓰는 표)의 한 줄(path)에 {prog, wrong, upd}를 둔다. ver로 동시 저장을 막는다.
  // 이 기기의 localStorage는 사본(오프라인일 때·불러오기 전)일 뿐이고, 서버가 원본이다.
  var SY = { cfg: window.FL_SYNC || null, sb: window.FL_SB || null, user: window.FL_USER || null, ver: null, st: "off", last: 0, timer: null, busy: false, again: false, err: "" };
  var SYMETA = load("fl_sync", {});   // { uid: 마지막으로 맞춘 계정, dirty: 서버에 아직 안 올린 변경이 있음, t: 그 변경 시각 }
  function syncState(s, err) { SY.st = s; SY.err = err || ""; var c = document.getElementById("syncChip"); if (c) chipSync(c); syncUI(); }
  function chipSync(c) {
    var m = { saved: "저장됨 " + hhmm(SY.last), saving: "저장 중…", error: "저장 안 됨", loading: "불러오는 중…" }[SY.st];
    c.hidden = !m; c.textContent = m || ""; c.classList.toggle("bad", SY.st === "error"); c.classList.toggle("ok", SY.st === "saved");
    c.title = SY.st === "error" ? "서버에 저장하지 못했습니다. 연결되면 다시 저장합니다." + (SY.err ? " (" + SY.err + ")" : "") : "기록은 서버에 저장됩니다.";
  }
  function hhmm(t) { var d = new Date(t); return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2); }
  function syncDirty() {
    SYMETA.dirty = true; SYMETA.t = Date.now(); save("fl_sync", SYMETA);
    if (!SY.user) return;
    clearTimeout(SY.timer); SY.timer = setTimeout(syncPush, 1500);
  }
  function syncInit() {
    if (!SY.cfg || !SY.user) return;
    syncPull();
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") { if (SYMETA.dirty) { clearTimeout(SY.timer); syncPush(); } }
      else if (!SY.busy) syncPull();   // 다른 기기에서 공부한 것 받아 오기
    });
    window.addEventListener("online", function () { syncPull(); });
  }
  // 두 기록 합치기: 공부 표시·테스트 점수는 합집합(같은 칸이면 늦게 한 쪽), 오답 노트는 최근에 바꾼 쪽을 바탕으로 다른 쪽에만 있는 단어를 더한다
  function syncMerge(loc, rem, locNewer) {
    var prog = JSON.parse(JSON.stringify(rem.prog || {}));
    Object.keys(loc.prog || {}).forEach(function (k) {
      var a = loc.prog[k] || {}, b = prog[k] || (prog[k] = {});
      Object.keys(a).forEach(function (t) {
        var x = a[t], y = b[t];
        if (y == null) b[t] = x;
        else if (x && typeof x === "object" && (!y || typeof y !== "object" || (x.t || 0) > (y.t || 0))) b[t] = x;
      });
    });
    var base = locNewer ? loc.wrong : rem.wrong, other = locNewer ? rem.wrong : loc.wrong;
    var wrong = JSON.parse(JSON.stringify(base || {}));
    Object.keys(other || {}).forEach(function (l) { var w = wrong[l] || (wrong[l] = {}); Object.keys(other[l] || {}).forEach(function (k) { if (!w[k]) w[k] = other[l][k]; }); });
    return { prog: prog, wrong: wrong };
  }
  function syncApply(doc) {
    var changed = JSON.stringify(doc.prog) !== JSON.stringify(PROG) || JSON.stringify(doc.wrong) !== JSON.stringify(WRONG);
    PROG = doc.prog || {}; WRONG = doc.wrong || {};
    save("fl_prog", PROG); save("fl_wrong", WRONG);
    if (changed && !ROUTE.day && !ROUTE.check) rerender();   // Day·종합 점검 화면(테스트 중일 수 있음)은 건드리지 않는다
    nextUpSave();
  }
  function syncPull() {
    if (!SY.user) return Promise.resolve();
    SY.busy = true; if (SY.st !== "saved") syncState("loading");
    return SY.sb.from("user_files").select("data,ver").eq("user_id", SY.user.id).eq("path", SY.cfg.path).maybeSingle().then(function (r) {
      if (r.error) throw r.error;
      var row = r.data, local = { prog: PROG, wrong: WRONG };
      SY.ver = row ? row.ver : null;
      var first = SYMETA.uid !== SY.user.id;   // 이 기기에서 이 계정으로 처음 맞춤 → 이 기기 기록도 합친다
      var need = false;
      if (!row) need = true;
      else if (first || SYMETA.dirty) {
        var m = syncMerge(local, row.data || {}, (SYMETA.t || 0) > ((row.data && row.data.upd) || 0));
        syncApply(m); need = JSON.stringify(m) !== JSON.stringify({ prog: (row.data || {}).prog || {}, wrong: (row.data || {}).wrong || {} });
      } else syncApply(row.data || {});
      SYMETA.uid = SY.user.id; if (!need) SYMETA.dirty = false; save("fl_sync", SYMETA);
      SY.busy = false;
      if (need) { SYMETA.dirty = true; return syncPush(); }
      SY.last = row && row.data && row.data.upd || Date.now(); syncState("saved");
    }).catch(function (e) { SY.busy = false; syncState("error", e.message || String(e)); });
  }
  function syncPush() {
    if (!SY.user) return Promise.resolve();
    if (SY.busy) { SY.again = true; return Promise.resolve(); }
    SY.busy = true; syncState("saving");
    var t0 = SYMETA.t, doc = { prog: PROG, wrong: WRONG, upd: Date.now() };
    var q = SY.ver == null
      ? SY.sb.from("user_files").insert({ user_id: SY.user.id, path: SY.cfg.path, data: doc, ver: 1 }).select("ver")
      : SY.sb.from("user_files").update({ data: doc, ver: SY.ver + 1 }).eq("user_id", SY.user.id).eq("path", SY.cfg.path).eq("ver", SY.ver).select("ver");
    return q.then(function (r) {
      SY.busy = false;
      var conflict = (r.error && /duplicate|23505/.test(r.error.message + r.error.code)) || (!r.error && (!r.data || !r.data.length));
      if (conflict) { SYMETA.dirty = true; save("fl_sync", SYMETA); return syncPull(); }   // 다른 기기가 먼저 저장 → 받아서 합친 뒤 다시 올린다
      if (r.error) throw r.error;
      SY.ver = r.data[0].ver; SY.last = doc.upd;
      if (SYMETA.t === t0) { SYMETA.dirty = false; save("fl_sync", SYMETA); }
      syncState("saved");
      if (SY.again || SYMETA.dirty) { SY.again = false; return syncPush(); }
    }).catch(function (e) { SY.busy = false; syncState("error", e.message || String(e)); });
  }
  function syncUI() {
    var el = document.getElementById("syncRow"); if (!el) return;
    var h = '<div class="dv-title">기록 저장</div>';
    if (!SY.cfg || !SY.user) { el.innerHTML = h + '<p class="sub">공개 사이트에서만 서버에 저장됩니다. 지금은 이 브라우저에만 남습니다.</p>'; return; }
    var id = SY.user && SY.user.email ? SY.user.email.split("@")[0] : "";
    var msg = { loading: "불러오는 중…", saving: "저장 중…", saved: "저장됨 " + hhmm(SY.last), error: "저장하지 못했습니다. 연결되면 다시 저장합니다." }[SY.st] || "";
    el.innerHTML = h + '<p class="sub">' + (id ? esc(id) + " 계정에 저장합니다. " : "") + esc(msg) + "</p>" +
      (SY.user ? '<div class="row-actions"><button type="button" class="btn sm ghost" id="syNow">지금 불러오기</button><button type="button" class="btn sm ghost" id="syOut">로그아웃</button></div>' : "");
    var o = document.getElementById("syOut"); if (o) o.onclick = function () {
      if (!confirm("로그아웃할까요? 기록은 서버에 남습니다.")) return;
      (SYMETA.dirty ? syncPush() : Promise.resolve()).then(function () { window.FL_LOGOUT(); });
    };
    var n = document.getElementById("syNow"); if (n) n.onclick = function () { (SYMETA.dirty ? syncPush() : syncPull()); };
  }

  // ---------- 매일 알림 (홈 화면 앱) ----------
  // 켜면 이 기기의 구독 정보를 서버(user_files의 pushPath 줄)에 넣는다. GitHub Actions(remind.yml)가 매일 그 목록으로 보낸다.
  var PUSH_KEY = "BKGoDJ-MhE2Hg8w-ktyEPvRyIrKcK-2ppzZbYrkeqJgg1jbzwKrYLCiqdOlyUR-qP21qq5PoLOtkTyXPTTGs3Sc";
  var STANDALONE = (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
  var IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var SWREG = ("serviceWorker" in navigator && /^https?:$/.test(location.protocol))
    ? navigator.serviceWorker.register("sw.js").catch(function () { return null; }) : null;
  function b64uBytes(s) { s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; var b = atob(s), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
  // 서버의 구독 목록에 이 기기를 넣거나(remove=false) 뺀다. 이미 맞으면 아무것도 하지 않는다
  function pushSave(sub, remove) {
    if (!SY.user || !SY.cfg || !SY.cfg.pushPath) return Promise.reject(new Error("로그인 필요"));
    var j = sub.toJSON ? sub.toJSON() : sub, P = SY.cfg.pushPath;
    return SY.sb.from("user_files").select("data,ver").eq("user_id", SY.user.id).eq("path", P).maybeSingle().then(function (r) {
      if (r.error) throw r.error;
      var list = (r.data && r.data.data && r.data.data.subs) || [];
      var had = list.some(function (x) { return x.endpoint === j.endpoint; });
      if (remove ? !had : had) return;
      list = list.filter(function (x) { return x.endpoint !== j.endpoint; });
      if (!remove) list.push({ endpoint: j.endpoint, keys: j.keys, ua: navigator.userAgent.slice(0, 140), t: Date.now() });
      var q = r.data
        ? SY.sb.from("user_files").update({ data: { subs: list }, ver: r.data.ver + 1 }).eq("user_id", SY.user.id).eq("path", P).eq("ver", r.data.ver)
        : SY.sb.from("user_files").insert({ user_id: SY.user.id, path: P, data: { subs: list }, ver: 1 });
      return q.then(function (w) { if (w.error) throw w.error; });
    });
  }
  function pushUI() {
    var el = document.getElementById("pushRow"); if (!el) return;
    function put(h) { el.innerHTML = '<div class="dv-title">매일 알림</div>' + h; }
    if (!SWREG || !("PushManager" in window) || !("Notification" in window)) {
      put('<p class="sub">' + (location.protocol === "file:" ? "공개 사이트에서만 켤 수 있습니다." : IOS && !STANDALONE ? "홈 화면에 추가한 앱으로 열면 켤 수 있습니다." : "이 브라우저에서는 알림을 쓸 수 없습니다.") + "</p>");
      return;
    }
    put('<p class="sub">확인하는 중…</p>');
    SWREG.then(function (reg) {
      if (!reg) { put('<p class="sub">알림을 준비하지 못했습니다.</p>'); return; }
      return reg.pushManager.getSubscription().then(function (sub) {
        if (Notification.permission === "denied") {
          put('<p class="sub">알림이 막혀 있습니다. 설정 → 알림 → 외국어에서 허용해 주십시오.</p>');
        } else if (sub && Notification.permission === "granted") {
          put('<p class="sub" id="pushMsg">켜져 있습니다. 매일 저녁 8시 무렵에 옵니다.</p>' +
            '<div class="row-actions"><button type="button" class="btn sm ghost" id="subOff">끄기</button></div>');
          pushSave(sub).catch(function () { var m = document.getElementById("pushMsg"); if (m) m.textContent = "켜져 있지만 서버에 등록하지 못했습니다. 연결되면 이 화면을 다시 열어 주십시오."; });
          document.getElementById("subOff").onclick = function () {
            if (!confirm("매일 알림을 끌까요?")) return;
            pushSave(sub, true).catch(function () {}).then(function () { return sub.unsubscribe(); }).then(pushUI, pushUI);
          };
        } else {
          put('<p class="sub">매일 저녁 공부할 시간을 알려 드립니다.</p><div class="row-actions"><button type="button" class="btn sm" id="subOn">알림 켜기</button></div>');
          document.getElementById("subOn").onclick = function () {
            Notification.requestPermission().then(function (p) {
              if (p !== "granted") return pushUI();
              return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uBytes(PUSH_KEY) }).then(pushUI);
            }).catch(function (e) { put('<p class="sub">켜지 못했습니다: ' + esc(String(e && e.message || e)) + "</p>"); });
          };
        }
      });
    });
  }

  // ---------- 언어 화면 ----------
  function viewLang(lang) {
    var L = LBY[lang], ds = days(lang), nw = Object.keys(wrongOf(lang)).length;
    var h = '<nav class="crumb"><a href="#/">처음</a> / <span>' + esc(L.ko) + "</span></nav>" +
      '<section class="hero small lang-hero"><span class="lang-glyph" aria-hidden="true" lang="' + L.tag + '">' + GLYPH[lang] + '</span><h1 lang="' + L.tag + '">' + esc(L.name) + '</h1><p class="sub">' + esc(L.ko) + " · 목표 " + esc(L.goal) + "</p></section>";
    h += '<div class="row-actions"><a class="btn ghost" href="#/' + lang + '/wrong">오답 노트' + (nw ? " (" + nw + ")" : "") + "</a></div>";
    h += '<div class="day-list">';
    ds.forEach(function (d) {
      var g = prog(lang, d.day);
      var st = TABS.map(function (t) {
        var v = g[t[0]], on = !!v, sc = v && v.n ? " " + v.s + "/" + v.n : "";
        return '<span class="pill' + (on ? " on" : "") + '">' + (on ? ICON.check : "") + esc(t[1]) + esc(sc) + "</span>";
      }).join("");
      var dn = dayDone(lang, d);
      h += '<a class="day-card' + (dn === 6 ? " all-done" : "") + '" href="#/' + lang + "/" + d.day + '"><div class="day-head"><span class="day-no">Day ' + d.day + '</span><span class="day-title">' + K(d.title, lang, 0) + "</span>" +
        '<span class="day-count" title="끝낸 단계">' + (dn === 6 ? ICON.check + " 완료" : dn + " / 6") + "</span></div>" +
        (d.theme ? '<div class="day-theme">' + K(d.theme, lang, 0) + "</div>" : "") + '<div class="pills">' + st + "</div></a>";
      checksOf(lang).forEach(function (c) { if (c.to === d.day) h += checkCard(lang, c); });
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
        items.push({ t: w.say || w.w, v: "F", el: el, who: (i + 1) + ". " + FL.plain(w.w) });
        if (w.ex && !SET.hideEx) items.push({ t: w.ex, v: "M", el: el, who: (i + 1) + ". 예문" });
      });
      playSeq(items, lang);
    };
    // 전체 듣기 중에 단어 칸을 누르면 그 단어부터 이어서
    pane.querySelector(".words").addEventListener("click", function (e) {
      var li = e.target.closest(".word"); if (!li || !PL || e.target.closest("[data-say], .w-mean") || selecting()) return;
      var j = plIndexOf(li); if (j >= 0) plJump(j);
    });
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
    q.answer = 0; q.ty = type || "mean";
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
    QZ = { qs: qs, i: 0, score: 0, wrong: [], log: [], opt: opt || {}, box: box, answered: false };
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
    if (q.key) z.log.push({ k: q.key, ty: q.ty || "", ok: ok ? 1 : 0 });
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
    if (z.opt.onDone) z.opt.onDone(z.score, n, z.log);
    var h = '<div class="result"><div class="r-score"><b>' + z.score + "</b> / " + n + '<span class="r-pct">' + pct + "%</span></div>" + (z.opt.summary ? z.opt.summary(z.log) : "");
    if (z.wrong.length) {
      h += '<h3>틀린 문제</h3><ol class="r-wrong">' + z.wrong.map(function (q) { return "<li>" + '<div class="q-instr small">' + esc(q.instr) + "</div>" + q.prompt.replace(/<button[^>]*data-say[^>]*>[\s\S]*?<\/button>/, "") + '<div class="r-ans">정답: ' + q.opts[q.answer] + "</div>" + (q.after || "") + "</li>"; }).join("") + "</ol>";
    }
    h += '<div class="row-actions"><button type="button" class="btn" id="again">다시 풀기</button>' + (z.wrong.length ? '<button type="button" class="btn ghost" id="againWrong">틀린 것만 다시</button>' : "") + "</div></div>";
    z.box.innerHTML = h;
    var opt = z.opt, wrong = z.wrong, box = z.box;
    box.querySelector("#again").onclick = function () { runQuiz(box, opt.make(), opt); };
    var aw = box.querySelector("#againWrong");
    if (aw) aw.onclick = function () { runQuiz(box, shuffle(wrong.map(function (q) { return q.remake ? q.remake() : q; })), Object.assign({}, opt, { onDone: null, summary: null })); };
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
      '<label class="tgl"><input type="checkbox" id="showTr"' + (SET.tr ? " checked" : "") + "> 해석</label></div>" +
      '<p class="hint">말풍선을 누르면 그 줄부터 이어서 듣습니다(다시 누르면 그 줄을 한 번 더). 스피커 단추는 그 줄만 읽습니다.</p>';
    h += '<ol class="dlg' + (SET.tr ? "" : " no-tr") + '">';
    dg.lines.forEach(function (ln, i) {
      var si = ids.indexOf(ln.s), c = cast[ln.s];
      h += '<li class="line s' + si + (si % 2 ? " right" : "") + '" id="ln' + i + '" data-ln="' + i + '"><div class="av s' + si + '" aria-hidden="true" lang="' + L.tag + '">' + esc(initial(c.name)) + '</div>' +
        '<div class="ln-body"><div class="who-n">' + T(c.name, lang) + '</div><div class="bubble" role="button" tabindex="0" title="여기서부터 이어 듣기"><div class="ln-t">' + T(ln.t, lang) + spk(ln.t, lang, c.voice) + '</div><div class="ln-k">' + K(ln.k, lang) + "</div></div></div></li>";
    });
    h += "</ol>";
    if (dg.notes && dg.notes.length) h += '<section class="notes"><h3>표현 정리</h3><dl>' + dg.notes.map(function (n) { return "<dt>" + T(n.t, lang) + "</dt><dd>" + K(n.k, lang) + "</dd>"; }).join("") + "</dl></section>";
    h += doneBtn(lang, d.day, "dialogue");
    pane.innerHTML = h;
    pane.querySelector("#showTr").onchange = function (e) { SET.tr = e.target.checked; saveSet(); pane.querySelector(".dlg").classList.toggle("no-tr", !SET.tr); };
    function items() { return dg.lines.map(function (ln, i) { return { t: ln.t, v: cast[ln.s].voice, el: document.getElementById("ln" + i), who: FL.plain(cast[ln.s].name).split(ACUTE).join("") }; }); }
    function from(i) {
      var el = document.getElementById("ln" + i), j = plIndexOf(el);
      if (j >= 0) plJump(j); else playSeq(items(), lang, i);
    }
    pane.querySelector("#playAll").onclick = function () { playSeq(items(), lang, 0); };
    pane.querySelector("#stopAll").onclick = stopAudio;
    var list = pane.querySelector(".dlg");
    list.addEventListener("click", function (e) {
      var li = e.target.closest(".line"); if (!li || e.target.closest("[data-say]") || selecting()) return;
      from(+li.getAttribute("data-ln"));
    });
    list.addEventListener("keydown", function (e) {
      if ((e.key === "Enter" || e.key === " ") && e.target.classList.contains("bubble")) { e.preventDefault(); e.stopPropagation(); from(+e.target.closest(".line").getAttribute("data-ln")); }
    });
    wireDone(pane, lang, d.day);
  }
  function initial(name) { return Array.from(FL.plain(name).split(ACUTE).join("").trim())[0] || "?"; }

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
        playSeq(paraItems(ri), lang);
      };
    });
    function paraItems(ri) { var r = d.reading[ri], ps = r.text.split(/\n\s*\n/); return ps.map(function (p, pi) { return { t: p, v: r.voice || "F", el: document.getElementById("p" + ri + "_" + pi), who: FL.plain(r.title).split(ACUTE).join("") + " · " + (pi + 1) + "단락" }; }); }
    // 전체 듣기 중에 단락을 누르면 그 단락부터 이어서
    pane.querySelectorAll(".passage .para").forEach(function (el) {
      el.addEventListener("click", function (e) {
        if (!PL || e.target.closest("[data-say]") || selecting()) return;
        var m = el.id.match(/^p(\d+)_(\d+)$/), j = plIndexOf(el);
        if (j >= 0) plJump(j); else playSeq(paraItems(+m[1]), lang, +m[2]);
      });
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

  // 대화 한 줄을 듣고 뜻 고르기
  function dialogQ(d, ln, lang) {
    var L = LBY[lang], lines = d.dialogue.lines, c = d.dialogue.cast[ln.s];
    var opts = [ln.k].concat(distract(ln.k, lines.map(function (l) { return l.k; }), 3));
    return { lang: lang, tag: "대화 듣기", instr: L.instr.dialog, listen: { t: ln.t, v: c.voice }, prompt: '<div class="q-listen">' + spk(ln.t, lang, c.voice, "big") + "</div>",
      opts: opts.map(function (x) { return K(x, lang, 0); }), answer: 0, after: '<div class="qa-expl"><div class="qa-full">' + T(ln.t, lang, L.helper.modes.length - 1) + "</div></div>" };
  }
  // 새 문장 듣고 뜻 고르기(정리 테스트·종합 점검 전용 문장: { t, v, o:[정답, 오답…], a, e })
  function listenQ(x, lang) {
    var L = LBY[lang];
    return { lang: lang, tag: "듣기", instr: L.instr.sent || L.instr.dialog, listen: { t: x.t, v: x.v || "F" }, prompt: '<div class="q-listen">' + spk(x.t, lang, x.v || "F", "big") + "</div>",
      opts: x.o.map(function (o) { return K(o, lang, 0); }), answer: x.a || 0,
      after: '<div class="qa-expl"><div class="qa-full">' + T(x.t, lang, L.helper.modes.length - 1) + "</div>" + (x.e ? '<p class="expl">' + K(x.e, lang) + "</p>" : "") + "</div>" };
  }
  // 지문 하나의 독해 문항들(지문을 문제마다 함께 보인다, 읽기 도움 없음)
  function passageQs(rr, lang) {
    var L = LBY[lang], hp = L.helper.modes.length - 1;
    var pass = '<div class="passage mini"><h3>' + T(rr.title, lang, 0) + "</h3>" + rr.text.split(/\n\s*\n/).map(function (p) { return '<p class="para">' + T(p, lang, 0) + "</p>"; }).join("") + "</div>";
    return rr.qs.map(function (rq, qi) {
      var ord = shuffle(rq.o.map(function (_, i) { return i; }));
      var af = '<div class="qa-expl">' + (rq.ev ? '<blockquote class="ev">' + T(rq.ev, lang, hp) + "</blockquote>" : "") + '<div class="expl">' + K(rq.e, lang) + "</div>" +
        (rq.oe ? '<ul class="oe">' + ord.map(function (k, j) { return '<li class="' + (k === rq.a ? "right" : "") + '"><span class="o-n">' + (j + 1) + "</span><div>" + T(rq.o[k], lang) + '<div class="oe-t">' + K(rq.oe[k], lang) + "</div></div></li>"; }).join("") + "</ul>" : "") +
        (qi === rr.qs.length - 1 && rr.k ? '<details class="trans"><summary>전문 해석</summary><div>' + K(rr.k, lang) + "</div></details>" : "") + "</div>";
      return { lang: lang, tag: "독해", instr: L.instr.reading, fixed: true, prompt: pass + '<div class="q-sent">' + T(rq.q, lang, 0) + "</div>",
        opts: ord.map(function (k) { return T(rq.o[k], lang, 0); }), answer: ord.indexOf(rq.a), after: af };
    });
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
      var rv = d.review || {};
      if (rv.grammar) rv.grammar.forEach(function (gq) { var q = grammarQ(gq, lang, d.grammar[gq.g]); q.tag = "문법"; q.fixed = true; qs.push(q); });
      else d.grammar.forEach(function (g) { (g.quiz || []).forEach(function (gq) { var q = grammarQ(gq, lang, g); q.tag = "문법"; q.fixed = true; qs.push(q); }); });
      if (rv.listen) rv.listen.forEach(function (x) { qs.push(listenQ(x, lang)); });
      else pick(d.dialogue.lines.filter(function (l) { return FL.plain(l.t).length > 3; }), 2).forEach(function (ln) { qs.push(dialogQ(d, ln, lang)); });
      qs = shuffle(qs);
      // 독해: 학습용과 다른 지문. 지문을 문제마다 함께 보인다
      if (d.review && d.review.reading) qs = qs.concat(passageQs(d.review.reading, lang));
      return qs;
    }
    var rv0 = d.review || {}, nG = rv0.grammar ? rv0.grammar.length : d.grammar.reduce(function (s, g) { return s + (g.quiz || []).length; }, 0), nL = rv0.listen ? rv0.listen.length : 2;
    var nR = d.review && d.review.reading ? d.review.reading.qs.length : 0;
    startScreen(pane, "정리 테스트", "단어 10문항(오늘 단어와 지난 날 단어에서 무작위), 문법 " + nG + "문항, 듣기 " + nL + "문항" + (nR ? ", 독해 " + nR + "문항" : "") + ". 문법·듣기·독해는 학습 화면에 나오지 않은 새 문장입니다. 읽기 도움은 보이지 않습니다.", prog(lang, d.day).review, function () {
      runQuiz(pane, make(), { make: make, onDone: function (s, n) { prog(lang, d.day).review = { s: s, n: n, t: Date.now() }; saveProg(); } });
    });
  }

  // ----- 종합 점검 (5일마다) -----
  // 단어(Day마다 고르게 무작위) + 문법(새 문항, 문법 항목마다 하나) + 대화 듣기 3 + 새 지문 독해.
  // 문항마다 맞고 틀림(log)을 남긴다: PROG["<lang>-c<no>"] = { s, n, t, log, first: 첫 응시 }. 다음 5일 난이도는 이 기록으로 정한다(_tools/report.mjs).
  function checksOf(lang) { return (window.FL_CHECKS || []).filter(function (c) { return c.lang === lang; }).sort(function (a, b) { return a.no - b.no; }); }
  function checkRec(lang, no) { return PROG[lang + "-c" + no] || null; }
  function checkCard(lang, c) {
    var g = checkRec(lang, c.no), f = g && g.first;
    return '<a class="day-card check-card" href="#/' + lang + "/check/" + c.no + '"><div class="day-head"><span class="day-no">점검 ' + c.no + '</span><span class="day-title">종합 점검 · Day ' + c.from + "–" + c.to + "</span></div>" +
      '<div class="day-theme">' + (f ? "첫 응시 " + f.s + " / " + f.n + (g.t !== f.t ? " · 최근 " + g.s + " / " + g.n : "") : "Day " + c.from + "–" + c.to + "를 마친 뒤에 풉니다.") + "</div></a>";
  }
  function viewCheck(lang, no) {
    var L = LBY[lang], c = checksOf(lang).filter(function (x) { return x.no === no; })[0];
    var h = '<nav class="crumb"><a href="#/">처음</a> / <a href="#/' + lang + '">' + esc(L.ko) + "</a> / <span>종합 점검 " + no + "</span></nav>";
    if (!c) { $app.innerHTML = h + '<p class="empty">없는 점검입니다.</p>'; return; }
    var ds = days(lang).filter(function (d) { return d.day >= c.from && d.day <= c.to; });
    var per = lang === "ja" ? 5 : 4, nW = per * ds.length, nD = c.listen ? c.listen.length : Math.min(3, ds.length);
    function make() {
      var qs = [];
      ds.forEach(function (d) {
        makeWordQs(pick(d.words, per).map(function (w) { return { w: w, day: d.day }; }), lang).forEach(function (q) { q.tag = "단어"; q.key = "w:" + q.wk; qs.push(q); });
      });
      c.grammar.forEach(function (gq) {
        var r = gq.ref.split("."), d = dayOf(lang, +r[0]), gp = d && d.grammar[+r[1]];
        var q = grammarQ(gq, lang, gp); q.tag = "문법"; q.fixed = true; q.key = "g:" + gq.ref; q.ty = "grammar"; qs.push(q);
      });
      if (c.listen) c.listen.forEach(function (x, i) { var q = listenQ(x, lang); q.key = "l:" + i; q.ty = "listen-s"; qs.push(q); });
      else pick(ds, nD).forEach(function (d) {
        var ln = pick(d.dialogue.lines.filter(function (l) { return FL.plain(l.t).length > 3; }), 1)[0];
        if (ln) { var q = dialogQ(d, ln, lang); q.key = "d:" + d.day; q.ty = "dialog"; qs.push(q); }
      });
      return shuffle(qs).concat(passageQs(c.reading, lang).map(function (q, i) { q.key = "r:" + i; q.ty = "reading"; return q; }));
    }
    var g = checkRec(lang, no);
    h += '<section class="hero small"><h1>종합 점검 ' + no + '</h1><p class="sub">Day ' + c.from + "–" + c.to + ' 전체를 한 번에 확인합니다.</p></section><div id="ckPane"></div>';
    if (g && g.log) h += '<div class="ck-last"><h3>' + (g.first && g.t !== g.first.t ? "최근 결과" : "결과") + " (" + new Date(g.t).toLocaleDateString("ko-KR") + ")</h3>" + checkSummary(lang, g.log) + "</div>";
    $app.innerHTML = h;
    var pane = document.getElementById("ckPane");
    startScreen(pane, "종합 점검 " + no,
      "단어 " + nW + "문항(Day마다 " + per + "개씩 무작위), 문법 " + c.grammar.length + "문항, 듣기 " + nD + "문항, 독해 " + c.reading.qs.length + "문항. 문법·듣기·독해는 모두 처음 보는 새 문장입니다. 읽기 도움은 보이지 않습니다. 첫 응시 결과로 다음 5일의 난이도를 정하므로, 미리 복습하지 말고 지금 실력대로 풀어 주십시오.",
      g && g.n ? g : null, function () {
        var ck = document.querySelector(".ck-last"); if (ck) ck.remove();
        runQuiz(pane, make(), { make: make, summary: function (log) { return checkSummary(lang, log); }, onDone: function (s, n, log) {
          var rec = prog(lang, "c" + no), t = Date.now();
          if (!rec.first) rec.first = { s: s, n: n, t: t, log: log };
          rec.s = s; rec.n = n; rec.t = t; rec.log = log; saveProg();
        } });
      });
  }
  function checkSummary(lang, log) {
    var area = {}, gram = [], order = [];
    function add(name, ok) { if (!area[name]) { area[name] = [0, 0]; order.push(name); } area[name][1]++; if (ok) area[name][0]++; }
    log.forEach(function (x) {
      var p = x.k.split(":");
      if (p[0] === "w") add("단어 · Day " + p[1], x.ok);
      else if (p[0] === "g") gram.push(x);
      else if (p[0] === "d" || p[0] === "l") add("듣기", x.ok);
      else if (p[0] === "r") add("독해", x.ok);
    });
    order.sort(function (a, b) { return (a.indexOf("단어") === 0 ? 0 : 1) - (b.indexOf("단어") === 0 ? 0 : 1) || a.localeCompare(b); });
    gram.sort(function (a, b) { return a.k.localeCompare(b.k); });
    var h = '<div class="ck-sum"><table class="ck-t"><tbody>' + order.map(function (k) {
      var v = area[k], pc = Math.round(v[0] / v[1] * 100);
      return "<tr><th>" + esc(k) + "</th><td>" + v[0] + " / " + v[1] + '</td><td class="ck-bar"><i style="width:' + pc + '%"></i></td></tr>';
    }).join("") + "</tbody></table>";
    if (gram.length) h += '<h4>문법 항목</h4><ul class="ck-g">' + gram.map(function (x) {
      var r = x.k.slice(2).split("."), d = dayOf(lang, +r[0]), gp = d && d.grammar[+r[1]];
      return '<li class="' + (x.ok ? "ok" : "no") + '"><span class="ck-m">' + (x.ok ? "○" : "×") + "</span>Day " + r[0] + " · " + (gp ? T(gp.p, lang, 0) : esc(x.k)) + "</li>";
    }).join("") + "</ul>";
    return h + "</div>";
  }
  // 알림에 넣을 '오늘 할 것'(언어마다 다음 Day 또는 종합 점검)을 Cache에 둔다 → sw.js가 알림을 띄울 때 읽는다
  function nextOf(lang) {
    var ds = days(lang), cs = checksOf(lang);
    for (var i = 0; i < ds.length; i++) {
      if (dayDone(lang, ds[i]) < 6) return "Day " + ds[i].day;
      for (var j = 0; j < cs.length; j++) if (cs[j].to === ds[i].day && !(checkRec(lang, cs[j].no) || {}).first) return "종합 점검 " + cs[j].no;
    }
    return null;
  }
  function nextUpSave() {
    if (!window.caches || !/^https?:$/.test(location.protocol)) return;
    var parts = []; LANGS.forEach(function (L) { var n = nextOf(L.id); if (n) parts.push(L.ko + " " + n); });
    var body = parts.join(" · ");
    if (body === nextUpSave.last) return; nextUpSave.last = body;
    caches.open("fl-meta").then(function (c) { return c.put(new URL("fl-next", location.href).href, new Response(JSON.stringify({ body: body, t: Date.now() }), { headers: { "Content-Type": "application/json" } })); }).catch(function () {});
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
  syncInit();
})();
