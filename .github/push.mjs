// 매일 알림 보내기 (의존성 없음, Node 18+)
//   GitHub Actions: .github/push.mjs 로 복사되어 remind.yml이 돌린다. 환경 변수는 저장소 secrets.
//   로컬 시험:      node _tools/push.mjs   (_secret/vapid.json, _secret/push_subs.json 사용)
// 내용 없는(빈) push를 보낸다 → 문구는 sw.js가 고른다. 그래서 payload 암호화가 필요 없다.
//   VAPID_JWK  : P-256 개인 키 JWK(JSON)
//   PUSH_SUBS  : 구독 JSON 배열 [{endpoint, keys}] (endpoint만 쓴다)
// 구독이 없어졌으면(404·410) 실패로 끝낸다 → GitHub이 실패 메일을 보내므로 알 수 있다.
import crypto from "node:crypto";
import fs from "node:fs";

const SUB = "https://seokhyeonleemed.github.io/lang-study/";
const rd = (f) => { try { return fs.readFileSync(new URL("../_secret/" + f, import.meta.url), "utf8"); } catch { return null; } };
const jwk = JSON.parse(process.env.VAPID_JWK || rd("vapid.json") || "null");
let subs = JSON.parse(process.env.PUSH_SUBS || rd("push_subs.json") || "[]");
if (!Array.isArray(subs)) subs = [subs];
if (!jwk) { console.error("VAPID_JWK 없음"); process.exit(1); }
if (!subs.length) { console.log("구독 없음 — 보낼 곳이 없습니다."); process.exit(0); }

const key = crypto.createPrivateKey({ key: jwk, format: "jwk" });
const pub = Buffer.concat([Buffer.from([4]), Buffer.from(jwk.x, "base64url"), Buffer.from(jwk.y, "base64url")]).toString("base64url");
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
function jwt(aud) {
  const data = b64({ typ: "JWT", alg: "ES256" }) + "." + b64({ aud, exp: Math.floor(Date.now() / 1000) + 3000, sub: SUB });
  return data + "." + crypto.sign("sha256", Buffer.from(data), { key, dsaEncoding: "ieee-p1363" }).toString("base64url");
}

let bad = 0;
for (const s of subs) {
  const ep = s.endpoint || s;
  const host = new URL(ep).host;
  const r = await fetch(ep, {
    method: "POST",
    headers: { TTL: "21600", Urgency: "high", Authorization: `vapid t=${jwt(new URL(ep).origin)}, k=${pub}`, "Content-Length": "0" },
  });
  const ok = r.status >= 200 && r.status < 300;
  console.log(`${host}: ${r.status} ${ok ? "보냄" : (await r.text()).slice(0, 200)}`);
  if (!ok) bad++;
}
process.exit(bad ? 1 : 0);
