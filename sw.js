// 알림 전용 service worker. 페이지를 저장(캐시)하지 않는다 — 판이 바뀌면 바로 새 판이 뜨게.
// 알림은 GitHub Actions(.github/workflows/remind.yml)가 매일 빈 push를 보내면 여기서 띄운다.
var MSG = [
  "오늘 공부할 시간입니다. 今日も一歩ずつ。",
  "오늘 공부할 시간입니다. 今天也加油！",
  "오늘 공부할 시간입니다. Пора заниматься!",
  "오늘의 Day를 열어 보십시오. 단어부터 시작하면 됩니다.",
  "오늘 공부할 시간입니다. 오답 노트도 한 번 풀어 보십시오."
];
self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener("push", function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = {}; }
  var n = Math.floor((Date.now() + 9 * 36e5) / 864e5); // 한국 날짜로 매일 바뀜
  e.waitUntil(self.registration.showNotification(d.title || "외국어 공부", {
    body: d.body || MSG[n % MSG.length],
    icon: "icon-192.png", badge: "icon-192.png", tag: "daily", data: { url: d.url || "./" }
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
