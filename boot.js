// 공개판 시작: 비밀번호 → 열쇠(PBKDF2) → d.bin 풀기 → app.js 실행
// 음성은 audio/<lang>/<hash>.bin을 내려받아 풀고 blob URL로 넘긴다.
(function () {
  "use strict";
  var KEYSTORE = "fl_key";
  var app = document.getElementById("app");
  function b64(buf) { var s = "", a = new Uint8Array(buf); for (var i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return btoa(s); }
  function unb64(s) { var b = atob(s), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
  function getJSON(u) { return fetch(u, { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error(u); return r.json(); }); }
  function getBin(u) { return fetch(u).then(function (r) { if (!r.ok) throw new Error(u); return r.arrayBuffer(); }); }
  function derive(pw, meta) {
    var enc = new TextEncoder();
    return crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveBits"]).then(function (k) {
      return crypto.subtle.deriveBits({ name: "PBKDF2", salt: unb64(meta.salt), iterations: meta.iter, hash: "SHA-256" }, k, 256);
    });
  }
  function aesKey(raw) { return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]); }
  function decrypt(key, buf) {
    var a = new Uint8Array(buf);
    return crypto.subtle.decrypt({ name: "AES-GCM", iv: a.slice(0, 12) }, key, a.slice(12));
  }
  function gunzip(buf) {
    var ds = new DecompressionStream("gzip");
    return new Response(new Blob([buf]).stream().pipeThrough(ds)).text();
  }
  var meta;
  function open(raw, remember) {
    return aesKey(raw).then(function (key) {
      return getBin("d.bin?v=" + meta.v).then(function (buf) { return decrypt(key, buf); }).then(gunzip).then(function (txt) {
        var d = JSON.parse(txt);
        if (remember) { try { localStorage.setItem(KEYSTORE, b64(raw)); } catch (e) {} }
        window.FL_LANGS = d.langs; window.FL_BANK = d.bank; if (d.sync) window.FL_SYNC = d.sync;
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
  function form(msg) {
    app.innerHTML = '<form class="lock" id="lockForm"><img class="logo big" src="icon-192.png" alt=""><h1>외국어 공부</h1><p class="sub">비밀번호를 넣어 주십시오.</p>' +
      '<input type="password" id="pw" autocomplete="current-password" required autofocus>' +
      '<label class="tgl"><input type="checkbox" id="rem" checked> 이 기기에서 기억하기</label>' +
      '<button class="btn" type="submit">열기</button>' + (msg ? '<p class="err">' + msg + "</p>" : "") + "</form>";
    document.getElementById("lockForm").onsubmit = function (e) {
      e.preventDefault();
      var pw = document.getElementById("pw").value, rem = document.getElementById("rem").checked;
      app.querySelector("button").disabled = true;
      derive(pw, meta).then(function (raw) { return open(raw, rem); }).catch(function () { form("비밀번호가 맞지 않습니다."); });
    };
  }
  getJSON("k.json").then(function (m) {
    meta = m;
    var saved = null; try { saved = localStorage.getItem(KEYSTORE); } catch (e) {}
    if (saved) return open(unb64(saved), false).catch(function () { try { localStorage.removeItem(KEYSTORE); } catch (e) {} form(); });
    form();
  }).catch(function () { app.innerHTML = '<p class="sub">불러오지 못했습니다. 새로고침해 주십시오.</p>'; });
  window.FL_LOGOUT = function () { try { localStorage.removeItem(KEYSTORE); } catch (e) {} location.reload(); };
})();
