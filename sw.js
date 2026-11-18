// 알림 전용 service worker. 페이지를 저장(캐시)하지 않는다 — 판이 바뀌면 바로 새 판이 뜨게.
// 알림은 GitHub Actions(.github/workflows/remind.yml)가 매일 빈 push를 보내면 여기서 띄운다.
// 제목은 짧게 하나로 두고(iOS가 'from 외국어 공부'를 따로 붙인다), 본문에는 앱이 Cache에 둔 '오늘 할 것'을 넣는다.
//   예: 오늘 공부할 시간입니다 / 일본어 Day 2 · 중국어 Day 2 · 러시아어 Day 1
var TITLE = "오늘 공부할 시간입니다";
var FALLBACK = ["今日も一歩ずつ。", "今天也加油！", "Пора заниматься!"];
self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (e) { e.waitUntil(self.clients.claim()); });
function nextBody() {
  return caches.open("fl-meta").then(function (c) { return c.match(new URL("fl-next", self.registration.scope).href); })
    .then(function (r) { return r ? r.json() : null; }).then(function (j) { return j && j.body; }).catch(function () { return null; });
}
self.addEventListener("push", function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = {}; }
  var n = Math.floor((Date.now() + 9 * 36e5) / 864e5); // 한국 날짜로 매일 바뀜
  e.waitUntil(nextBody().then(function (b) {
    return self.registration.showNotification(d.title || TITLE, {
      body: d.body || b || FALLBACK[n % FALLBACK.length],
      icon: "icon-192.png", badge: "icon-192.png", tag: "daily", data: { url: d.url || "./" }
    });
  }));
});
self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || "./";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (cs) {
    for (var i = 0; i < cs.length; i++) if ("focus" in cs[i]) return cs[i].focus();
    return self.clients.openWindow(url);
  }));
});
