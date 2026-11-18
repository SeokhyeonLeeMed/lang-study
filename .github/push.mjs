// 매일 알림 보내기 (의존성 없음, Node 18+)
//   GitHub Actions: .github/push.mjs 로 복사되어 remind.yml이 돌린다. 환경 변수는 저장소 secrets.
//   로컬 시험:      node _tools/push.mjs   (_secret·_tools/sync/config.json 사용, OWNER_UID 환경 변수로 다른 계정 지정 가능)
// 구독 목록은 앱이 서버(Supabase user_files, 주인 계정의 lang-study/push.json 줄)에 넣는다. 연결 글을 옮길 필요가 없다.
// 내용 없는(빈) push를 보낸다 → 문구는 sw.js가 고른다(payload 암호화가 필요 없다).
//   VAPID_JWK            : P-256 개인 키 JWK(JSON)
//   SUPABASE_URL         : 서버 주소
//   SUPABASE_SERVICE_KEY : 서버 관리 키(구독 목록 읽기·끊긴 구독 지우기에만 쓴다)
//   OWNER_UID            : 주인 계정 id
// 끊긴 구독(404·410)은 목록에서 지운다. 그 밖의 실패만 작업 실패로 끝낸다(GitHub이 실패 메일을 보낸다).
import crypto from "node:crypto";
import fs from "node:fs";

const SUB = "https://seokhyeonleemed.github.io/lang-study/";
const PATH = "lang-study/push.json";
const local = (f) => { try { return fs.readFileSync(new URL("../" + f, import.meta.url), "utf8"); } catch { return null; } };
const lcfg = JSON.parse(local("_tools/sync/config.json") || "{}");
const env = (k, f) => process.env[k] || f;
const jwk = JSON.parse(env("VAPID_JWK", local("_secret/vapid.json")) || "null");
const URL0 = env("SUPABASE_URL", lcfg.url);
const SK = (env("SUPABASE_SERVICE_KEY", lcfg.serviceKeyFile ? fs.readFileSync(lcfg.serviceKeyFile, "utf8") : "") || "").trim();
const UID = (env("OWNER_UID", local("_secret/owner_uid.txt")) || "").trim();
if (!jwk || !URL0 || !SK || !UID) { console.error("설정 없음(VAPID_JWK·SUPABASE_URL·SUPABASE_SERVICE_KEY·OWNER_UID)"); process.exit(1); }

const H = { apikey: SK, Authorization: "Bearer " + SK, "Content-Type": "application/json" };
const q = `${URL0}/rest/v1/user_files?user_id=eq.${UID}&path=eq.${encodeURIComponent(PATH)}`;
const rows = await (await fetch(q + "&select=data,ver", { headers: H })).json();
if (!Array.isArray(rows)) { console.error("서버 읽기 실패", rows); process.exit(1); }
const subs = rows[0]?.data?.subs || [];
if (!subs.length) { console.log("구독 없음 — 보낼 곳이 없습니다."); process.exit(0); }

const key = crypto.createPrivateKey({ key: jwk, format: "jwk" });
const pub = Buffer.concat([Buffer.from([4]), Buffer.from(jwk.x, "base64url"), Buffer.from(jwk.y, "base64url")]).toString("base64url");
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
function jwt(aud) {
  const data = b64({ typ: "JWT", alg: "ES256" }) + "." + b64({ aud, exp: Math.floor(Date.now() / 1000) + 3000, sub: SUB });
  return data + "." + crypto.sign("sha256", Buffer.from(data), { key, dsaEncoding: "ieee-p1363" }).toString("base64url");
}

let bad = 0; const gone = new Set();
for (const s of subs) {
  const u = new URL(s.endpoint);
  const r = await fetch(s.endpoint, {
    method: "POST",
    headers: { TTL: "21600", Urgency: "high", Authorization: `vapid t=${jwt(u.origin)}, k=${pub}`, "Content-Length": "0" },
  });
  const ok = r.status >= 200 && r.status < 300;
  console.log(`${u.host}: ${r.status} ${ok ? "보냄" : (await r.text()).slice(0, 200)}`);
  if (r.status === 404 || r.status === 410) gone.add(s.endpoint);
  else if (!ok) bad++;
}
if (gone.size) {
  const r = await fetch(q + `&ver=eq.${rows[0].ver}`, { method: "PATCH", headers: H, body: JSON.stringify({ data: { subs: subs.filter((s) => !gone.has(s.endpoint)) }, ver: rows[0].ver + 1 }) });
  console.log(`끊긴 구독 ${gone.size}개 지움: ${r.status}`);
}
process.exit(bad ? 1 : 0);
