// 공개판 시작: 로그인(퀴즈 사이트와 같은 Supabase 계정) → 그 계정만 읽는 user_files의 열쇠 → d.bin 풀기 → app.js 실행
// 열쇠 줄(lang-study/key)은 publish.mjs가 주인 계정에만 넣는다. 다른 계정은 로그인해도 열쇠가 없어 열 수 없다.
// 음성은 audio/<lang>/<hash>.bin을 내려받아 풀고 blob URL로 넘긴다.
(function () {
  "use strict";
  var app = document.getElementById("app");
  try { localStorage.removeItem("fl_key"); } catch (e) {}   // 예전 비밀번호 방식의 열쇠
  function unb64(s) { var b = atob(s), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
  function getJSON(u) { return fetch(u, { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error(u); return r.json(); }); }
  function getBin(u) { return fetch(u).then(function (r) { if (!r.ok) throw new Error(u); return r.arrayBuffer(); }); }
  function decrypt(key, buf) { var a = new Uint8Array(buf); return crypto.subtle.decrypt({ name: "AES-GCM", iv: a.slice(0, 12) }, key, a.slice(12)); }
  function gunzip(buf) { return new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"))).text(); }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function loadScript(src) {
    return new Promise(function (res, rej) { var s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = function () { rej(new Error("load")); }; document.head.appendChild(s); });
  }
  var meta, sb;
  function open(raw, user) {
    return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]).then(function (key) {
      return getBin("d.bin?v=" + meta.v).then(function (buf) { return decrypt(key, buf); }).then(gunzip).then(function (txt) {
        var d = JSON.parse(txt);
        window.FL_LANGS = d.langs; window.FL_BANK = d.bank; window.FL_CHECKS = d.checks || [];
        window.FL_SYNC = meta.sync; window.FL_SB = sb; window.FL_USER = user;
        var cache = {};
        window.FL_AUDIO_URL = function (path) {
          if (cache[path]) return cache[path];
          cache[path] = getBin(path.replace(/\.mp3$/, ".bin")).then(function (b) { return decrypt(key, b); })
            .then(function (plainBuf) { return URL.createObjectURL(new Blob([plainBuf], { type: "audio/mpeg" })); })
            .catch(function (e) { delete cache[path]; throw e; });
          return cache[path];
        };
        var s = document.createElement("script"); s.src = "app.js?v=" + meta.v; document.body.appendChild(s);
      });
    });
  }
  function unlock(user) {
    app.innerHTML = '<p class="sub">여는 중…</p>';
    return sb.from("user_files").select("data").eq("user_id", user.id).eq("path", meta.sync.keyPath).maybeSingle().then(function (r) {
      if (r.error) throw r.error;
      if (!r.data || !r.data.data || !r.data.data.k) { denied(); return; }
      return open(unb64(r.data.data.k), user);
    });
  }
  function denied() {
    app.innerHTML = '<div class="lock"><img class="logo big" src="icon-192.png" alt=""><h1>외국어 공부</h1><p class="sub">이 계정으로는 열 수 없습니다.</p><button class="btn" id="outBtn">다른 계정으로 로그인</button></div>';
    document.getElementById("outBtn").onclick = function () { sb.auth.signOut().then(function () { form(); }); };
  }
  function form(msg) {
    app.innerHTML = '<form class="lock" id="lockForm"><img class="logo big" src="icon-192.png" alt=""><h1>외국어 공부</h1><p class="sub">의대 퀴즈 사이트 계정으로 로그인합니다.</p>' +
      '<input id="lid" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="ID" required autofocus>' +
      '<input type="password" id="lpw" autocomplete="current-password" placeholder="비밀번호" required>' +
      '<button class="btn" type="submit">로그인</button>' + (msg ? '<p class="err">' + esc(msg) + "</p>" : "") + "</form>";
    document.getElementById("lockForm").onsubmit = function (e) {
      e.preventDefault();
      var id = document.getElementById("lid").value.trim().toLowerCase(), pw = document.getElementById("lpw").value;
      app.querySelector("button").disabled = true;
      sb.auth.signInWithPassword({ email: id + "@" + meta.sync.idDomain, password: pw }).then(function (r) {
        if (r.error) throw r.error;
        return unlock(r.data.user);
      }).catch(function (er) {
        var m = String(er && er.message || er);
        form(/invalid login/i.test(m) ? "ID 또는 비밀번호가 맞지 않습니다." : /banned/i.test(m) ? "탈퇴한 계정입니다." : "로그인하지 못했습니다. 연결을 확인해 주십시오.");
      });
    };
  }
  getJSON("k.json").then(function (m) {
    meta = m;
    return loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js");
  }).then(function () {
    sb = window.supabase.createClient(meta.sync.url, meta.sync.anonKey, { auth: { persistSession: true, storageKey: "fl-sb-auth", autoRefreshToken: true } });
    return sb.auth.getSession();
  }).then(function (r) {
    var s = r.data && r.data.session;
    if (s) return unlock(s.user).catch(function () { form("다시 로그인해 주십시오."); });
    form();
  }).catch(function () { app.innerHTML = '<p class="sub">불러오지 못했습니다. 새로고침해 주십시오.</p>'; });
  window.FL_LOGOUT = function () { (sb ? sb.auth.signOut() : Promise.resolve()).then(function () { location.reload(); }, function () { location.reload(); }); };
})();
