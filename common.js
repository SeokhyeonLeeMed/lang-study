// 화면(app.js)과 음성 생성 도구(_tools/audio_jobs.mjs)가 함께 쓰는 함수.
// - 표기: {바탕|읽기} = 직접 단 루비(일본어 후리가나, 중국어 병음 고침, 러시아어 발음 고침)
// - 러시아어 강세: 강세 모음 뒤에 U+0301(◌́)을 붙여 적는다(молоко́). 모음이 하나뿐이거나 ё면 생략.
// - 음성 파일: audio/<언어>/<sayKey(voice, text)>.mp3
(function (G) {
  "use strict";
  var ACUTE = "́";
  var RUBY_RE = /\{([^{}|]+)\|([^{}]+)\}/g;

  // 화면에 보이는 글자만 남긴다(루비 읽기·강세 표시 제거)
  function plain(text) {
    return String(text || "").replace(RUBY_RE, "$1").split(ACUTE).join("");
  }
  // 음성에 넘길 글. 루비는 바탕 글자로, 강세 표시는 지운다.
  function speech(text) {
    return plain(text).replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n").trim();
  }

  // ---- 해시: FNV-1a 32비트 두 번(시작값만 다름) → 16자리 ----
  function utf8(s) {
    if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(s);
    return Buffer.from(s, "utf8");
  }
  function fnv(bytes, seed) {
    var h = seed >>> 0;
    for (var i = 0; i < bytes.length; i++) { h ^= bytes[i]; h = Math.imul(h, 16777619) >>> 0; }
    return ("0000000" + h.toString(16)).slice(-8);
  }
  function sayKey(voice, text) {
    var b = utf8(voice + "\n" + speech(text));
    return fnv(b, 2166136261) + fnv(b, 0x9747b28c);
  }

  // ---- 러시아어 발음(영문 표기) ----
  var RU_VOW = "аеёиоуыэюя";
  var RU_SPECIAL = {
    "что": "shto", "чтобы": "shtóby", "ничто": "nishtó", "что-то": "shtó-ta", "что-нибудь": "shtó-nibud'",
    "здравствуйте": "zdrástvuyte", "здравствуй": "zdrástvuy", "чувство": "chústva", "чувствовать": "chústvavat'",
    "конечно": "kanyéshna", "скучно": "skúshna", "скучный": "skúshnyy", "скучная": "skúshnaya",
    "сегодня": "sivódnya", "сегодняшний": "sivódnyashniy", "его": "yivó", "ничего": "nichivó", "чего": "chivó",
    "солнце": "sóntse", "пожалуйста": "pazhálsta", "сейчас": "sichás", "счастье": "shchást'ye", "счастлив": "shchásliv",
    "мужчина": "mushchína", "лёгкий": "lyókhkiy", "легко": "likhkó", "мягкий": "myákhkiy", "бог": "bokh",
    "извините": "izviníte", "лестница": "lyésnitsa", "праздник": "práznik", "поздно": "pózna", "сердце": "syértse",
    "грустный": "grúsnyy", "честный": "chésnyy", "известный": "izvyésnyy", "интересно": "intirésna",
    "интересный": "intirésnyy", "грустно": "grúsna", "местный": "myésnyy", "здесь": "zdyes'", "интересная": "intirésnaya", "интересную": "intirésnuyu", "кафе": "kafé", "метро": "mitró",
    "кофе": "kófe", "отец": "atyéts", "двадцать": "dvátsat'", "тридцать": "trítsat'", "одиннадцать": "adínatsat'",
    "двенадцать": "dvinátsat'", "пятнадцать": "pitnátsat'", "шестнадцать": "shisnátsat'"
  };
  // 뒤 단어에 붙어 읽는 전치사: 끝소리를 무성음으로 바꾸지 않는다
  var RU_PREP = { "из": 1, "без": 1, "под": 1, "над": 1, "перед": 1, "об": 1, "через": 1, "сквозь": 1 };
  var RU_OGO_KEEP = { "много": 1, "немного": 1, "строго": 1, "дорого": 1, "недорого": 1, "убого": 1, "полого": 1 };
  var RU_LAT = { "б": "b", "в": "v", "г": "g", "д": "d", "ж": "zh", "з": "z", "й": "y", "к": "k", "л": "l", "м": "m", "н": "n",
    "п": "p", "р": "r", "с": "s", "т": "t", "ф": "f", "х": "kh", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "shch" };
  var DEVOICE = { "б": "п", "в": "ф", "г": "к", "д": "т", "ж": "ш", "з": "с" };
  var VOICE = { "п": "б", "ф": "в", "к": "г", "т": "д", "ш": "ж", "с": "з" };
  var ACC = { a: "á", e: "é", i: "í", o: "ó", u: "ú", y: "ý" };
  var HARD_AFTER = { "ж": 1, "ш": 1, "ц": 1, "ч": 1, "щ": 1 };

  function ruRomanWord(word, unstressed) {
    if (word.indexOf("-") > 0) {
      // по-ру́сски, кого́-то: 강세 표시가 없는 짧은 조각은 강세 없이 읽는다
      var parts = word.split("-"), anyStress = /[́ёЁ]/.test(word);
      return parts.map(function (p) { return ruRomanWord(p, anyStress && !/[́ёЁ]/.test(p)); }).join("-");
    }
    var cap = word.charAt(0) !== word.charAt(0).toLowerCase();
    var raw = word.toLowerCase();
    var letters = [], stress = -1;
    for (var i = 0; i < raw.length; i++) {
      var ch = raw.charAt(i);
      if (ch === ACUTE) { if (letters.length) stress = letters.length - 1; continue; }
      letters.push(ch);
    }
    var bare = letters.join("");
    var nV = 0, onlyV = -1;
    for (i = 0; i < letters.length; i++) if (RU_VOW.indexOf(letters[i]) >= 0) { nV++; onlyV = i; }
    if (stress < 0 && !unstressed) { var yo = bare.indexOf("ё"); if (yo >= 0) stress = yo; else if (nV === 1) stress = onlyV; }
    var out;
    if (RU_SPECIAL[bare]) out = RU_SPECIAL[bare];
    else {
      // -ого/-его → -ova/-iva
      if (/[ое]го$/.test(bare) && bare.length > 3 && !RU_OGO_KEEP[bare]) letters[letters.length - 2] = "в";
      // 유·무성음 동화(오른쪽부터). 모음 없는 전치사(в, к, с)는 그대로
      var snd = letters.slice();
      if (nV > 0 && !RU_PREP[bare]) {
        var nextC = null; // 바로 뒤 소리(ь, ъ 건너뜀): null=단어 끝, "V"=모음/공명음
        for (i = snd.length - 1; i >= 0; i--) {
          var c = snd[i];
          if (c === "ь" || c === "ъ") continue;
          if (RU_VOW.indexOf(c) >= 0 || "лмнрй".indexOf(c) >= 0) { nextC = "V"; continue; }
          var voiceless = nextC !== null && nextC !== "V" && "пфктшсхцчщ".indexOf(nextC) >= 0;
          var voicedObs = nextC !== null && nextC !== "V" && "бгджз".indexOf(nextC) >= 0;
          if (nextC === null || voiceless) { if (DEVOICE[c]) snd[i] = DEVOICE[c]; }
          else if (voicedObs) { if (VOICE[c]) snd[i] = VOICE[c]; }
          nextC = snd[i];
        }
      }
      // -тся/-ться → tsa
      var tail = "";
      if (/ть?ся$/.test(bare)) { var cut = bare.slice(-4) === "ться" ? 4 : 3; snd = snd.slice(0, snd.length - cut); tail = "tsa"; }
      var r = "";
      for (i = 0; i < snd.length; i++) {
        c = snd[i];
        var prev = i > 0 ? snd[i - 1] : "";
        var isStr = i === stress, last = i === snd.length - 1 && !tail;
        var iot = i === 0 || RU_VOW.indexOf(prev) >= 0 || prev === "ь" || prev === "ъ";
        var v = null;
        switch (c) {
          case "а": v = "a"; break;
          case "о": v = isStr ? "o" : "a"; break;
          case "у": v = "u"; break;
          case "ы": v = "y"; break;
          case "и": v = "i"; break;
          case "э": v = isStr ? "e" : "e"; break;
          case "е":
            if (isStr) v = iot ? "ye" : (HARD_AFTER[prev] ? "e" : "ye");
            else v = last ? (iot ? "ye" : "e") : (iot ? "yi" : "i");
            break;
          case "ё": v = HARD_AFTER[prev] ? "o" : "yo"; break;
          case "ю": v = HARD_AFTER[prev] ? "u" : "yu"; break;
          case "я":
            if (isStr || last) v = "ya";
            else v = iot ? "yi" : "i";
            break;
          case "ь": r += "'"; continue;
          case "ъ": continue;
          default: r += RU_LAT[c] || c; continue;
        }
        if (isStr && nV > 1) v = v.slice(0, -1) + ACC[v.slice(-1)];
        r += v;
      }
      out = r + tail;
    }
    if (cap) out = out.charAt(0).toUpperCase() + out.slice(1);
    return out;
  }

  // ---- 중국어 병음: 경성 단어는 사전에 넣는다 ----
  var ZH_CUSTOM = {
    "有点儿": "yǒu diǎnr", "点儿": "diǎnr", "裤子": "kù zi", "得先": "děi xiān", "怪不得": "guài bu de",
    "跑得": "pǎo de", "睡得": "shuì de", "吃得": "chī de", "游得": "yóu de", "弹得": "tán de", "做得": "zuò de", "唱得": "chàng de",
    "住得": "zhù de", "跳得": "tiào de", "写得": "xiě de", "学得": "xué de", "休息得": "xiū xi de", "进步得": "jìn bù de", "倒热水": "dào rè shuǐ", "学校": "xué xiào", "说得": "shuō de", "只想": "zhǐ xiǎng",
    "谢谢": "xiè xie", "朋友": "péng you", "东西": "dōng xi", "学生": "xué sheng", "先生": "xiān sheng", "喜欢": "xǐ huan",
    "名字": "míng zi", "衣服": "yī fu", "时候": "shí hou", "认识": "rèn shi", "知道": "zhī dao", "告诉": "gào su",
    "地方": "dì fang", "客气": "kè qi", "漂亮": "piào liang", "舒服": "shū fu", "明白": "míng bai", "意思": "yì si",
    "事情": "shì qing", "爸爸": "bà ba", "妈妈": "mā ma", "哥哥": "gē ge", "姐姐": "jiě jie", "弟弟": "dì di", "妹妹": "mèi mei",
    "儿子": "ér zi", "桌子": "zhuō zi", "椅子": "yǐ zi", "杯子": "bēi zi", "孩子": "hái zi", "早上": "zǎo shang",
    "晚上": "wǎn shang", "关系": "guān xi", "太阳": "tài yang", "休息": "xiū xi", "便宜": "pián yi", "清楚": "qīng chu",
    "麻烦": "má fan", "别人": "bié ren", "后面": "hòu mian", "前面": "qián mian", "里面": "lǐ mian", "外面": "wài mian",
    "上面": "shàng mian", "下面": "xià mian", "什么": "shén me", "怎么": "zěn me", "这么": "zhè me", "那么": "nà me",
    "多么": "duō me", "我们": "wǒ men", "你们": "nǐ men", "他们": "tā men", "她们": "tā men", "咱们": "zán men",
    "觉得": "jué de", "老师": "lǎo shī", "妻子": "qī zi", "丈夫": "zhàng fu", "眼睛": "yǎn jing", "耳朵": "ěr duo",
    "头发": "tóu fa", "鼻子": "bí zi", "肚子": "dù zi", "房子": "fáng zi", "帽子": "mào zi", "日子": "rì zi",
    "包子": "bāo zi", "饺子": "jiǎo zi", "本子": "běn zi", "裙子": "qún zi", "脑子": "nǎo zi", "个子": "gè zi",
    "看看": "kàn kan", "想想": "xiǎng xiang", "试试": "shì shi", "等等": "děng deng", "听听": "tīng ting", "走走": "zǒu zou",
    "聊聊": "liáo liao", "尝尝": "cháng chang", "问问": "wèn wen", "说说": "shuō shuo", "坐坐": "zuò zuo",
    "回来": "huí lai", "回去": "huí qu", "出来": "chū lai", "出去": "chū qu", "进来": "jìn lai", "进去": "jìn qu",
    "起来": "qǐ lai", "过来": "guò lai", "过去": "guò qu", "上来": "shàng lai", "下来": "xià lai", "下去": "xià qu",
    "暖和": "nuǎn huo", "热闹": "rè nao", "聪明": "cōng ming", "认真": "rèn zhēn", "部分": "bù fen", "生意": "shēng yi",
    "商量": "shāng liang", "打扮": "dǎ ban", "钥匙": "yào shi", "已经": "yǐ jīng", "豆腐": "dòu fu", "萝卜": "luó bo",
    "葡萄": "pú tao", "窗户": "chuāng hu", "月亮": "yuè liang", "力气": "lì qi", "脾气": "pí qi", "消息": "xiāo xi",
    "学问": "xué wen", "姑娘": "gū niang", "护士": "hù shi", "大夫": "dài fu", "医生": "yī shēng", "师傅": "shī fu",
    "收拾": "shōu shi", "喜欢上": "xǐ huan shàng", "主意": "zhǔ yi", "大方": "dà fang", "凉快": "liáng kuai",
    "快乐": "kuài lè", "粮食": "liáng shi", "爷爷": "yé ye", "奶奶": "nǎi nai", "叔叔": "shū shu", "阿姨": "ā yí",
    "不客气": "bú kè qi", "没关系": "méi guān xi", "对不起": "duì bu qǐ", "看不见": "kàn bu jiàn", "听不懂": "tīng bu dǒng",
    "看不懂": "kàn bu dǒng", "来不及": "lái bu jí", "了不起": "liǎo bu qǐ", "差不多": "chà bu duō", "怎么样": "zěn me yàng",
    "地道": "dì dao", "在乎": "zài hu", "糊涂": "hú tu", "厉害": "lì hai", "热情": "rè qíng", "早饭": "zǎo fàn",
    "只要": "zhǐ yào", "有空": "yǒu kòng", "教我": "jiāo wǒ", "教你": "jiāo nǐ", "教他": "jiāo tā", "路上": "lù shang",
    "一下": "yí xià", "一点儿": "yì diǎnr", "哪儿": "nǎr", "这儿": "zhèr", "那儿": "nàr", "一会儿": "yí huìr", "玩儿": "wánr"
  };
  var zhReady = false;
  function zhInit() {
    if (zhReady) return true;
    var P = G.pinyinPro;
    if (!P) return false;
    P.customPinyin(ZH_CUSTOM);
    zhReady = true;
    return true;
  }
  // 한자 구간 → [{c:글자, p:병음}]  (병음이 없는 글자는 p="")
  function zhPinyin(text) {
    if (!zhInit()) return Array.from(text).map(function (c) { return { c: c, p: "" }; });
    if (text === "了") return [{ c: "了", p: "le" }]; // 설명 속에 홀로 쓴 了는 조사
    if (text === "得") return [{ c: "得", p: "de" }]; // 설명·선지에 홀로 쓴 得는 구조조사(정도보어)
    var arr = G.pinyinPro.pinyin(text, { type: "all", toneSandhi: true });
    var out = [];
    for (var i = 0; i < arr.length; i++) out.push({ c: arr[i].origin, p: arr[i].isZh ? arr[i].pinyin : "" });
    return out;
  }
  // 한 단어의 병음(띄어쓰기 없이 이어 붙임) — 시험 선지용
  function zhPinyinWord(text) {
    var t = String(text || "");
    var m, explicit = [], last = 0, parts = [];
    RUBY_RE.lastIndex = 0;
    while ((m = RUBY_RE.exec(t))) { if (m.index > last) parts.push([t.slice(last, m.index), null]); parts.push([m[1], m[2]]); last = RUBY_RE.lastIndex; }
    if (last < t.length) parts.push([t.slice(last), null]);
    return parts.map(function (p) { return p[1] ? p[1].replace(/\s+/g, "") : zhPinyin(p[0]).map(function (x) { return x.p || ""; }).join(""); }).join("");
  }

  function ruRomanText(text) {
    return String(text || "").replace(RUBY_RE, "$1").replace(/[А-Яа-яЁё́-]+/g, function (w) { return /[А-Яа-яЁё]/.test(w) ? ruRomanWord(w) : w; });
  }

  var API = { plain: plain, speech: speech, sayKey: sayKey, ruRomanWord: ruRomanWord, ruRomanText: ruRomanText,
    zhPinyin: zhPinyin, zhPinyinWord: zhPinyinWord, zhInit: zhInit, RUBY_RE: RUBY_RE, ACUTE: ACUTE };
  G.FL = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;
})(typeof window !== "undefined" ? window : globalThis);
