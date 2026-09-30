import type { Tribute } from "./api";
import { TRIBUTE } from "./config";
import { STRINGS } from "./i18n";

interface OfflineSlide {
  name: string;
  community: string | null;
  message: string;
  date: string;
  photo: string | null;
}

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

/** Fetch a photo and convert it to a base64 data URI so it works offline. */
async function toDataUri(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("PHOTO_FETCH_FAILED");
  const blob = await res.blob();
  const ext = (url.split("?")[0].toLowerCase().match(/\.[a-z0-9]+$/) || [""])[0];
  const fixed = blob.type ? blob : new Blob([blob], { type: MIME[ext] || "image/jpeg" });
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("PHOTO_READ_FAILED"));
    reader.readAsDataURL(fixed);
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** JSON.stringify that is safe to inline inside a <script> block. */
function safeJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function langBlock(lang: "en" | "xh") {
  const s = STRINGS[lang];
  return {
    eyebrow: s.eyebrow,
    verseText: s.verse.text,
    verseRef: s.verse.ref,
    play: s.slideshow.play,
    pause: s.slideshow.pause,
    prev: s.slideshow.prev,
    next: s.slideshow.next,
    hint: s.slideshow.hint,
    langSwitch: s.langSwitch,
  };
}

/**
 * Build a single self-contained HTML file that plays the tributes as a
 * full-screen slideshow. All tributes and photos are embedded, so the file
 * works from `file://` on any laptop with no internet connection.
 */
export async function buildOfflineSlideshow(tributes: Tribute[]): Promise<Blob> {
  const entries: OfflineSlide[] = await Promise.all(
    tributes
      .filter((t) => !t.hidden)
      .map(async (t) => ({
        name: t.name,
        community: t.community,
        message: t.message,
        date: new Date(t.createdAt).toLocaleDateString("en-ZA", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        photo: t.photo ? await toDataUri(t.photo).catch(() => null) : null,
      })),
  );

  const config = {
    name: TRIBUTE.name,
    dates: TRIBUTE.dates,
    en: langBlock("en"),
    xh: langBlock("xh"),
  };

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(TRIBUTE.name)} — In Loving Memory</title>
<style>
  html, body { margin: 0; padding: 0; height: 100%; }
  body {
    background: #0a0e15;
    background-image: radial-gradient(1100px 520px at 50% -8%, #1b2436 0%, rgba(27, 36, 54, 0) 60%);
    background-repeat: no-repeat;
    color: #e8e6df;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    line-height: 1.55;
    overflow: hidden;
  }
  .wrap { position: fixed; inset: 0; display: flex; flex-direction: column; }
  .slide {
    flex: 1; overflow-y: auto; display: flex; flex-direction: column; align-items: center;
    text-align: center; padding: 72px 26px 150px;
  }
  .slide::before, .slide::after { content: ""; margin: auto; }
  .slide.fade { animation: fade 0.9s ease both; }
  @keyframes fade { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
  .photo {
    max-height: 40vh; max-width: 88%; object-fit: contain; border-radius: 10px;
    border: 1px solid #263142; margin-bottom: 24px; box-shadow: 0 12px 44px rgba(0, 0, 0, 0.55);
  }
  .eyebrow { color: #d4a24e; text-transform: uppercase; letter-spacing: 0.22em; font-size: 12px; margin: 0; }
  .name { font-family: Georgia, "Times New Roman", serif; font-size: clamp(24px, 5vw, 42px); font-weight: 600; margin: 10px 0 6px; color: #fff; }
  .meta { color: #9aa4b2; font-size: 14px; letter-spacing: 0.06em; margin: 0 0 18px; }
  .message {
    max-width: 760px; max-height: 32vh; overflow-y: auto; white-space: pre-wrap;
    font-family: Georgia, "Times New Roman", serif; font-size: clamp(17px, 3.4vw, 25px); line-height: 1.6; margin: 0;
  }
  .verse { font-style: italic; }
  .candle { width: 84px; height: auto; margin: 0 auto 10px; display: block; filter: drop-shadow(0 0 18px rgba(212, 162, 78, 0.35)); }
  .candle .flame { transform-origin: 50% 100%; transform-box: fill-box; animation: flicker 2.4s ease-in-out infinite; }
  @keyframes flicker {
    0%, 100% { transform: scaleY(1) scaleX(1) rotate(-1deg); }
    25% { transform: scaleY(1.04) scaleX(0.97) rotate(1deg); }
    50% { transform: scaleY(0.97) scaleX(1.02) rotate(-0.5deg); }
    75% { transform: scaleY(1.02) scaleX(0.98) rotate(0.5deg); }
  }
  .counter { position: absolute; top: 18px; left: 22px; z-index: 10; font-size: 13px; letter-spacing: 0.08em; color: #9aa4b2; }
  .lang {
    position: absolute; top: 12px; right: 12px; z-index: 10; background: rgba(22, 30, 43, 0.9);
    border: 1px solid #263142; color: #f0c66d; border-radius: 999px; padding: 8px 14px; font-size: 13px; cursor: pointer;
  }
  .controls {
    position: absolute; left: 0; right: 0; bottom: 0; z-index: 10; display: flex; flex-direction: column;
    align-items: center; gap: 10px; padding: 18px 18px 22px;
    background: linear-gradient(rgba(10, 14, 21, 0), rgba(10, 14, 21, 0.92) 40%);
  }
  .dots { display: flex; flex-wrap: wrap; justify-content: center; gap: 7px; max-width: 100%; }
  .dots button { width: 9px; height: 9px; border-radius: 50%; border: none; padding: 0; background: rgba(154, 164, 178, 0.35); cursor: pointer; }
  .dots button.active { background: #f0c66d; }
  .buttons { display: flex; gap: 18px; align-items: center; }
  .buttons button { background: none; border: none; color: #9aa4b2; font-size: 22px; cursor: pointer; padding: 4px 10px; border-radius: 8px; }
  .buttons button:hover { color: #fff; }
  .buttons button.play { color: #f0c66d; border: 1px solid #263142; background: rgba(22, 30, 43, 0.8); font-size: 18px; padding: 8px 20px; }
  .hint { margin: 0; font-size: 11px; letter-spacing: 0.08em; color: rgba(154, 164, 178, 0.7); }
  .progress { position: absolute; left: 0; bottom: 0; width: 100%; height: 3px; background: rgba(212, 162, 78, 0.2); }
  .progress .bar { height: 100%; width: 0; background: #d4a24e; animation: fill linear forwards; }
  .progress.paused .bar { animation-play-state: paused; }
  @keyframes fill { from { width: 0; } to { width: 100%; } }
  @media (max-width: 560px) {
    .slide { padding: 60px 18px 170px; }
    .photo { max-height: 32vh; }
  }
</style>
</head>
<body>
<div class="wrap">
  <div class="counter" id="counter"></div>
  <button type="button" class="lang" id="lang"></button>
  <div class="slide" id="slide"></div>
  <div class="controls">
    <div class="dots" id="dots"></div>
    <div class="buttons">
      <button type="button" id="prev" title="Previous">⏮</button>
      <button type="button" id="play" class="play" title="Pause">⏸</button>
      <button type="button" id="next" title="Next">⏭</button>
    </div>
    <p class="hint" id="hint"></p>
  </div>
  <div class="progress" id="progress"><div class="bar"></div></div>
</div>
<script>
(function () {
  "use strict";
  var SLIDE_MS = 9000;
  var DATA = ${safeJson(entries)};
  var CONFIG = ${safeJson(config)};
  var slides = [null].concat(DATA);
  var index = 0;
  var playing = true;
  var timer = null;
  var lang = "en";
  try {
    var saved = window.localStorage.getItem("nzuzo-offline-lang");
    if (saved === "en" || saved === "xh") { lang = saved; }
  } catch (e) { /* localStorage unavailable */ }

  var slideEl = document.getElementById("slide");
  var counterEl = document.getElementById("counter");
  var dotsEl = document.getElementById("dots");
  var langBtn = document.getElementById("lang");
  var prevBtn = document.getElementById("prev");
  var playBtn = document.getElementById("play");
  var nextBtn = document.getElementById("next");
  var hintEl = document.getElementById("hint");
  var progressEl = document.getElementById("progress");
  var barEl = progressEl.getElementsByClassName("bar")[0];

  var CANDLE = '<svg viewBox="0 0 120 140" class="candle" role="img" aria-label="Candle"><ellipse cx="60" cy="100" rx="30" ry="7" fill="rgba(0,0,0,.30)"></ellipse><g class="flame"><path d="M60 10 c8 9 12 15 12 21 a12 10 0 0 1 -24 0 c0-6 4-12 12-21 z" fill="#e8a13d"></path><path d="M60 21 c4 5 6 9 6 13 a6 6 0 0 1 -12 0 c0-4 2-8 6-13 z" fill="#f7d98b"></path></g><path d="M55.5 40 h9 v10 h-9 z" fill="#2a2722"></path><path d="M46 49 h28 v42 c0 7-6 11-14 11 s-14-4-14-11 z" fill="#e9dcc3"></path><path d="M46 49 h28 v7 c0 3-6 3-6 0 v-7 h-16 v7 c0 3-6 3-6 0 z" fill="#f6eeda"></path></svg>';

  function S(key) { return CONFIG[lang][key]; }

  function addP(cls, text) {
    var p = document.createElement("p");
    p.className = cls;
    p.textContent = text;
    slideEl.appendChild(p);
  }

  function addH(text) {
    var h = document.createElement("h1");
    h.className = "name";
    h.textContent = text;
    slideEl.appendChild(h);
  }

  function restartBar() {
    barEl.style.animation = "none";
    void barEl.offsetWidth;
    barEl.style.animation = "";
    barEl.style.animationDuration = SLIDE_MS + "ms";
  }

  function renderDots() {
    dotsEl.innerHTML = "";
    for (var i = 0; i < slides.length; i++) {
      var b = document.createElement("button");
      b.type = "button";
      if (i === index) { b.className = "active"; }
      b.title = i === 0 ? S("eyebrow") : slides[i].name;
      (function (target) {
        b.addEventListener("click", function () {
          playing = false;
          goTo(target);
        });
      })(i);
      dotsEl.appendChild(b);
    }
  }

  function render() {
    var s = slides[index];
    slideEl.innerHTML = "";
    slideEl.classList.remove("fade");
    void slideEl.offsetWidth;
    slideEl.classList.add("fade");
    counterEl.textContent = (index + 1) + " / " + slides.length;

    if (!s) {
      slideEl.insertAdjacentHTML("beforeend", CANDLE);
      addP("eyebrow", S("eyebrow"));
      addH(CONFIG.name);
      if (CONFIG.dates) { addP("meta", CONFIG.dates); }
      addP("message verse", S("verseText"));
      addP("meta", "— " + S("verseRef"));
    } else {
      if (s.photo) {
        var img = document.createElement("img");
        img.className = "photo";
        img.src = s.photo;
        img.alt = "";
        slideEl.appendChild(img);
      }
      addP("eyebrow", S("eyebrow"));
      addH(s.name);
      var meta = (s.community ? s.community + " · " : "") + s.date;
      addP("meta", meta);
      addP("message", s.message);
    }
    renderDots();
    restartBar();
  }

  function goTo(i) {
    index = ((i % slides.length) + slides.length) % slides.length;
    render();
  }

  function next() { goTo(index + 1); }
  function prev() { goTo(index - 1); }

  function startTimer() {
    stopTimer();
    timer = window.setInterval(next, SLIDE_MS);
  }

  function stopTimer() {
    if (timer) { window.clearInterval(timer); timer = null; }
  }

  function setPlaying(value) {
    playing = value;
    playBtn.textContent = playing ? "⏸" : "▶";
    playBtn.title = playing ? S("pause") : S("play");
    if (playing) {
      progressEl.classList.remove("paused");
      startTimer();
    } else {
      progressEl.classList.add("paused");
      stopTimer();
    }
  }

  function setLang(value) {
    lang = value;
    try { window.localStorage.setItem("nzuzo-offline-lang", lang); } catch (e) { }
    langBtn.textContent = lang === "en" ? CONFIG.en.langSwitch : CONFIG.xh.langSwitch;
    hintEl.textContent = S("hint");
    prevBtn.title = S("prev");
    nextBtn.title = S("next");
    playBtn.title = playing ? S("pause") : S("play");
    render();
  }

  playBtn.addEventListener("click", function () { setPlaying(!playing); });
  prevBtn.addEventListener("click", function () { setPlaying(false); prev(); });
  nextBtn.addEventListener("click", function () { setPlaying(false); next(); });
  langBtn.addEventListener("click", function () { setLang(lang === "en" ? "xh" : "en"); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") { setPlaying(false); next(); }
    else if (e.key === "ArrowLeft") { setPlaying(false); prev(); }
    else if (e.key === " ") { e.preventDefault(); setPlaying(!playing); }
  });

  setLang(lang);
  startTimer();
})();
</script>
</body>
</html>
`;

  return new Blob([html], { type: "text/html; charset=utf-8" });
}

/** Trigger a browser download of the offline slideshow file. */
export function downloadOfflineSlideshow(blob: Blob): void {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "nzuzo-tribute-slideshow.html";
  a.click();
  URL.revokeObjectURL(a.href);
}
