#!/usr/bin/env node
/**
 * Builds the printable tribute booklet (A5) from the tributes embedded in
 * nzuzo-tribute-slideshow.html.
 *
 *   node scripts/build-booklet.mjs
 *
 * Outputs booklet/nzuzo-pukuza-tribute-booklet.html and extracts any embedded
 * tribute photos into booklet/assets/.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const bookletDir = join(root, "booklet");
const assetsDir = join(bookletDir, "assets");
mkdirSync(assetsDir, { recursive: true });

const slideshowCandidates = [
  join(bookletDir, "nzuzo-tribute-slideshow.html"),
  join(root, "nzuzo-tribute-slideshow.html"),
];
const slideshowPath = slideshowCandidates.find((candidate) => existsSync(candidate));
if (!slideshowPath) {
  throw new Error(
    "Could not find nzuzo-tribute-slideshow.html in booklet/ or the project root.",
  );
}
const slideshow = readFileSync(slideshowPath, "utf8");

const dataMatch = slideshow.match(/var DATA = (\[[\s\S]*?\]);\s*var CONFIG/);
if (!dataMatch) throw new Error("Could not find the DATA array in the slideshow file.");
const rawTributes = JSON.parse(dataMatch[1]);

const configMatch = slideshow.match(/var CONFIG = (\{[\s\S]*?\});\s*var CANDLE/);
const config = configMatch
  ? JSON.parse(configMatch[1])
  : { name: "Nzuzo Pukuza", dates: "1 April 1982 - 19 September 2026" };

const NAME = config.name;
const DATES = "1 April 1982 - 19 September 2026";
const COMMUNITY = "Qeqe Community Development";

const escapeHtml = (value = "") =>
  String(value).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[ch]);

const slug = (value = "") =>
  value
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

const tidy = (value = "") =>
  String(value)
    .replace(/\r\n?/g, "\n")
    .replace(/[\u2013\u2014]/g, "-")
    .trim();

const tributes = rawTributes.map((tribute, index) => {
  const entry = {
    ...tribute,
    index,
    message: tidy(tribute.message),
    community: tribute.community ? String(tribute.community).trim() : "",
    date: tribute.date ? String(tribute.date).trim() : "",
    photo: null,
  };

  if (tribute.photo) {
    const fileName = `tribute-${index + 1}-${slug(tribute.name)}.jpg`;
    const filePath = join(assetsDir, fileName);
    if (!existsSync(filePath)) {
      const base64 = String(tribute.photo).replace(/^data:image\/[a-z0-9.+-]+;base64,/i, "");
      writeFileSync(filePath, Buffer.from(base64, "base64"));
    }
    entry.photo = `assets/${basename(filePath)}`;
  }

  return entry;
});

const ordered = [...tributes].sort((a, b) => {
  const aTime = Date.parse(a.date) || 0;
  const bTime = Date.parse(b.date) || 0;
  return aTime - bTime || a.index - b.index;
});

const messageSize = (text, hasPhoto) => {
  const length = text.length;
  let size = 12.4;
  if (length > 150) size = 12;
  if (length > 300) size = 11.3;
  if (length > 500) size = 10.7;
  if (length > 700) size = 10.2;
  if (hasPhoto) size -= 0.9;
  return `${Math.max(9.3, size).toFixed(1)}pt`;
};

let pageNumber = 0;
const pageNum = () => `<div class="page-num">${++pageNumber}</div>`;

const dividerSvg = `<svg class="orn" viewBox="0 0 140 14" aria-hidden="true"><path d="M0 7h50M90 7h50"/><path d="M70 1.8 75.2 7 70 12.2 64.8 7z"/><circle cx="57" cy="7" r="1.1"/><circle cx="83" cy="7" r="1.1"/></svg>`;

const candleSvg = `<svg class="candle" viewBox="0 0 64 88" aria-hidden="true"><path class="flame" d="M32 5c4.4 5.8 7 9.8 7 13.4a7 7 0 0 1-14 0C25 14.8 27.6 10.8 32 5z"/><path d="M32 26v6"/><path d="M20 32h24v39a5 5 0 0 1-5 5H25a5 5 0 0 1-5-5z"/><path d="M20 38c4.5 0 7 2.2 12 2.2S39.5 38 44 38"/><ellipse cx="32" cy="80" rx="17" ry="3.4"/></svg>`;

const cover = `
<section class="page cover">
  <div class="frame"></div>
  <div class="cover-inner">
    <p class="cover-eyebrow">In Loving Memory</p>
    <div class="portrait-wrap"><img src="assets/nzuzo-portrait.jpg" alt="Portrait of ${escapeHtml(NAME)}"></div>
    <h1 class="cover-name">Nzuzo<span>Pukuza</span></h1>
    <p class="cover-dates">${escapeHtml(DATES)}</p>
    ${dividerSvg}
    <p class="cover-sub">Tributes from family, friends<br>and the Qeqe Community</p>
  </div>
  <p class="cover-foot">${escapeHtml(COMMUNITY)}</p>
</section>`;

const dedication = `
<section class="page dedication">
  ${candleSvg}
  <p class="eyebrow">In Loving Memory</p>
  <h2 class="dedication-name">${escapeHtml(NAME)}</h2>
  <p class="dedication-dates">${escapeHtml(DATES)}</p>
  ${dividerSvg}
  <p class="verse">“I am the resurrection and the life. The one who believes in me will live, even though they die.”</p>
  <p class="verse-ref">John 11:25</p>
  <p class="verse verse-xh">“Ndim uvuko, ndim ubomi; okholwayo kum, nokuba uthe wafa, uya kudla ubomi.”</p>
  <p class="verse-ref">Yohane 11:25</p>
  <p class="dedication-note">This book gathers the tributes shared by family, friends and the Qeqe community, and is presented to the Pukuza family in love and remembrance.</p>
  ${pageNum()}
</section>`;

const foreword = `
<section class="page prose-page">
  <h2 class="page-title">A Word from the Community</h2>
  <p class="page-kicker">${escapeHtml(COMMUNITY)}</p>
  <div class="title-rule"></div>
  <p>When word reached us that Nzuzo had passed, messages began to arrive from every corner - from Bangweni and Qeqe, from friends met at university, from neighbours and from colleagues near and far. Each message carried the same thread: a generous heart, a warm laugh, and a man who gave quietly and never counted the cost.</p>
  <p>In these pages he is called by many names - Dlamini, Zizi, Njokweni, Makhwabe, Mchana - each one a sign of belonging, each one spoken with love.</p>
  <p>This booklet gathers those messages exactly as they were written. They come from different hands and different voices, in English and in isiXhosa, yet they speak as one: of kindness that lifted others, of a cheerleader who rejoiced in the success of his community, and of a presence that will be deeply missed.</p>
  <p>We hope that in the days and years ahead, these words will remind you of how widely Nzuzo was loved, and of the light he brought into the lives around him.</p>
  <p class="signature">Enkosi. Thank you.<br><span>${escapeHtml(COMMUNITY)}</span></p>
  ${pageNum()}
</section>`;

const sectionDivider = `
<section class="page divider-page">
  <div class="divider-inner">
    <p class="eyebrow">Messages of Love and Remembrance</p>
    <h2 class="divider-title">Tributes</h2>
    <p class="divider-xh">Izikhumbuzo</p>
    ${dividerSvg}
    <p class="divider-note">From the family, friends and community<br>of ${escapeHtml(NAME)}</p>
  </div>
  ${pageNum()}
</section>`;

const tributePages = ordered
  .map((tribute) => {
    const hasPhoto = Boolean(tribute.photo);
    const meta = [tribute.community, tribute.date].filter(Boolean).join(" · ");
    const messageClasses = ["message"];
    const isShort = tribute.message.length <= 140;
    if (isShort) messageClasses.push("message-short");
    if (hasPhoto) messageClasses.push("message-with-photo");

    return `
<section class="page tribute-page">
  <p class="running-head">${escapeHtml(NAME)} <span>·</span> In Loving Memory</p>
  <div class="tribute-inner">
    ${
      hasPhoto
        ? `<figure class="tribute-photo${tribute.message.length > 500 ? " photo-small" : ""}"><img src="${escapeHtml(tribute.photo)}" alt="Photograph shared by ${escapeHtml(tribute.name)}"></figure>`
        : ""
    }
    <div class="quote-mark${isShort ? " quote-mark-center" : ""}" aria-hidden="true">“</div>
    <p class="${messageClasses.join(" ")}" style="--msg-size:${messageSize(tribute.message, hasPhoto)}">${escapeHtml(tribute.message)}</p>
  </div>
  <div class="attribution">
    <div class="att-rule"></div>
    <p class="att-name">${escapeHtml(tribute.name)}</p>
    ${meta ? `<p class="att-meta">${escapeHtml(meta)}</p>` : ""}
  </div>
  ${pageNum()}
</section>`;
  })
  .join("");

const acknowledgements = `
<section class="page prose-page">
  <h2 class="page-title">With Gratitude</h2>
  <p class="page-kicker">${escapeHtml(COMMUNITY)}</p>
  <div class="title-rule"></div>
  <p>This booklet was compiled from the tributes received through the online memorial page for ${escapeHtml(NAME)}, between 29 September and 2 October 2026.</p>
  <p>Our thanks go to every person who took the time to write - for the memories shared, the comfort offered, and the love poured into each message.</p>
  <p>To the Pukuza family: may these words carry you in the days ahead, and may Nzuzo’s memory remain a blessing to you always.</p>
  <p class="small-note">The messages are reproduced as they were received, in the language in which they were written. Names appear as their authors signed them.</p>
  <p class="signature">${escapeHtml(COMMUNITY)}</p>
  ${pageNum()}
</section>`;

const closing = `
<section class="page closing-page">
  ${candleSvg}
  <div class="closing-inner">
    <h2 class="closing-xh">Phumla ngoxolo</h2>
    <p class="closing-en">Rest in peace</p>
    ${dividerSvg}
    <p class="closing-verse">“I am the resurrection and the life. The one who believes in me will live, even though they die.”</p>
    <p class="closing-verse-ref">John 11:25</p>
    <p class="closing-line">Lala ngoxolo, Dlamini.</p>
    <p class="closing-note">With deepest sympathy and abiding love,<br><strong>${escapeHtml(COMMUNITY)}</strong></p>
  </div>
  ${pageNum()}
</section>`;

const backCover = `
<section class="page cover back-cover">
  <div class="frame"></div>
  <div class="back-inner">
    ${candleSvg}
    <p class="back-name">${escapeHtml(NAME)}</p>
    <p class="back-dates">${escapeHtml(DATES)}</p>
    ${dividerSvg}
    <p class="back-rest">Phumla ngoxolo</p>
    <p class="back-rest-en">Rest in peace</p>
  </div>
  <p class="cover-foot">${escapeHtml(COMMUNITY)}</p>
</section>`;

const css = `
  :root {
    --paper: #fbf7ef;
    --paper-deep: #f4ecdd;
    --ink: #2b2723;
    --ink-soft: #4c443a;
    --muted: #7a6f5f;
    --gold: #a98544;
    --gold-soft: #c7ab74;
    --gold-line: #ddcfae;
    --serif: Georgia, "Times New Roman", serif;
    --display: "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif;
    --sans: "Segoe UI", Arial, sans-serif;
  }

  * { box-sizing: border-box; }

  html, body {
    margin: 0;
    padding: 0;
    background: #e3dbcc;
    color: var(--ink);
  }

  body {
    font-family: var(--serif);
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  @page {
    size: 148mm 210mm;
    margin: 0;
  }

  .page {
    position: relative;
    width: 148mm;
    height: 210mm;
    padding: 14mm 18mm 13mm;
    background: var(--paper);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    break-after: page;
    page-break-after: always;
  }

  .page:last-child {
    break-after: auto;
    page-break-after: auto;
  }

  @media screen {
    body { padding: 12mm 0; }
    .page {
      margin: 0 auto 12mm;
      box-shadow: 0 2mm 9mm rgba(55, 43, 25, 0.18);
    }
  }

  p { margin: 0; }

  .eyebrow {
    font-family: var(--sans);
    font-size: 7.2pt;
    letter-spacing: 0.36em;
    text-transform: uppercase;
    color: var(--gold);
  }

  .orn {
    display: block;
    width: 52mm;
    height: auto;
    margin: 0 auto;
    color: var(--gold-soft);
    fill: none;
    stroke: currentColor;
    stroke-width: 0.9;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .candle {
    display: block;
    width: 17mm;
    height: auto;
    margin: 0 auto;
    fill: none;
    stroke: var(--gold);
    stroke-width: 1.4;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .candle .flame { fill: var(--gold-soft); stroke: var(--gold); }

  .page-num {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 6.5mm;
    text-align: center;
    font-family: var(--sans);
    font-size: 7pt;
    letter-spacing: 0.14em;
    color: #b3a58d;
  }

  /* ---------- cover ---------- */

  .cover {
    padding: 0;
    text-align: center;
    background:
      radial-gradient(120% 78% at 50% 0%, #fffdf7 0%, var(--paper) 52%, var(--paper-deep) 100%);
  }

  .frame {
    position: absolute;
    inset: 7mm;
    border: 0.35mm solid var(--gold-soft);
    pointer-events: none;
  }

  .frame::after {
    content: "";
    position: absolute;
    inset: 1.7mm;
    border: 0.15mm solid var(--gold-line);
  }

  .cover-inner {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 22mm 20mm 20mm;
  }

  .cover-eyebrow {
    font-family: var(--sans);
    font-size: 8pt;
    letter-spacing: 0.44em;
    text-transform: uppercase;
    color: #8c7444;
    margin-bottom: 9mm;
  }

  .portrait-wrap {
    padding: 1.7mm;
    border: 0.3mm solid var(--gold-soft);
    border-radius: 31mm 31mm 2mm 2mm;
    background: #fffdf8;
    margin-bottom: 9mm;
  }

  .portrait-wrap img {
    display: block;
    width: 56mm;
    height: 64mm;
    object-fit: cover;
    border-radius: 29.4mm 29.4mm 0.6mm 0.6mm;
    filter: saturate(0.92) contrast(1.02);
  }

  .cover-name {
    font-family: var(--display);
    font-size: 31pt;
    font-weight: 600;
    line-height: 1;
    letter-spacing: 0.045em;
    color: #25221e;
    margin: 0;
  }

  .cover-name span {
    display: block;
    margin-top: 2.4mm;
    font-size: 21pt;
    font-weight: 400;
    letter-spacing: 0.2em;
    text-indent: 0.2em;
    text-transform: uppercase;
  }

  .cover-dates {
    font-family: var(--sans);
    font-size: 8.6pt;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--muted);
    margin-top: 5mm;
  }

  .cover .orn { margin: 6.5mm auto; }

  .cover-sub {
    font-family: var(--display);
    font-style: italic;
    font-size: 11.5pt;
    line-height: 1.65;
    color: var(--ink-soft);
  }

  .cover-foot {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 11mm;
    text-align: center;
    font-family: var(--sans);
    font-size: 7pt;
    letter-spacing: 0.3em;
    text-transform: uppercase;
    color: #8c7444;
  }

  /* ---------- dedication ---------- */

  .dedication {
    text-align: center;
    justify-content: flex-start;
    padding-top: 20mm;
  }

  .dedication .candle { width: 16mm; margin-bottom: 8mm; }
  .dedication .eyebrow { margin-bottom: 4mm; }

  .dedication-name {
    font-family: var(--display);
    font-size: 22pt;
    font-weight: 500;
    letter-spacing: 0.04em;
    margin: 0;
  }

  .dedication-dates {
    font-family: var(--sans);
    font-size: 8pt;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted);
    margin-top: 3mm;
  }

  .dedication .orn { margin: 8mm auto 9mm; }

  .verse {
    font-family: var(--display);
    font-style: italic;
    font-size: 12.4pt;
    line-height: 1.6;
    color: var(--ink-soft);
    max-width: 96mm;
    margin: 0 auto;
  }

  .verse-xh { margin-top: 8mm; font-size: 11.6pt; }

  .verse-ref {
    font-family: var(--sans);
    font-size: 7.4pt;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--gold);
    margin-top: 3mm;
  }

  .dedication-note {
    max-width: 92mm;
    margin: 13mm auto 0;
    padding-top: 6mm;
    border-top: 0.2mm solid var(--gold-line);
    font-size: 9.6pt;
    line-height: 1.7;
    color: var(--muted);
  }

  /* ---------- prose pages ---------- */

  .prose-page { padding-top: 21mm; }

  .page-title {
    font-family: var(--display);
    font-size: 21pt;
    font-weight: 500;
    letter-spacing: 0.03em;
    color: var(--ink);
    margin: 0;
  }

  .page-kicker {
    font-family: var(--sans);
    font-size: 7.4pt;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: var(--gold);
    margin-top: 3.5mm;
  }

  .title-rule {
    width: 22mm;
    border-top: 0.4mm solid var(--gold-soft);
    margin: 6mm 0 7mm;
  }

  .prose-page p {
    font-size: 10.2pt;
    line-height: 1.72;
    color: var(--ink-soft);
    margin-bottom: 3.4mm;
    text-align: left;
  }

  .prose-page .signature {
    margin-top: 8mm;
    font-family: var(--display);
    font-style: italic;
    font-size: 11.5pt;
    line-height: 1.6;
    color: var(--ink);
  }

  .prose-page .signature span {
    display: inline-block;
    margin-top: 1mm;
    font-family: var(--sans);
    font-style: normal;
    font-size: 7.4pt;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--gold);
  }

  .prose-page .small-note {
    margin-top: 7mm;
    padding-top: 5mm;
    border-top: 0.2mm solid var(--gold-line);
    font-size: 8.6pt;
    line-height: 1.65;
    color: var(--muted);
  }

  /* ---------- section divider ---------- */

  .divider-page {
    justify-content: center;
    text-align: center;
    background:
      radial-gradient(90% 60% at 50% 45%, #fffdf7 0%, var(--paper) 62%, var(--paper-deep) 100%);
  }

  .divider-inner { margin-top: -8mm; }

  .divider-title {
    font-family: var(--display);
    font-size: 34pt;
    font-weight: 400;
    letter-spacing: 0.09em;
    margin: 5mm 0 0;
  }

  .divider-xh {
    font-family: var(--display);
    font-style: italic;
    font-size: 14pt;
    color: var(--gold);
    margin-top: 2mm;
  }

  .divider-page .orn { margin: 9mm auto; width: 58mm; }

  .divider-note {
    font-family: var(--sans);
    font-size: 7.6pt;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    line-height: 2;
    color: var(--muted);
  }

  /* ---------- tribute pages ---------- */

  .tribute-page { padding-top: 11mm; }

  .running-head {
    font-family: var(--sans);
    font-size: 6.6pt;
    letter-spacing: 0.26em;
    text-transform: uppercase;
    color: var(--gold);
    text-align: center;
    padding-bottom: 3.5mm;
    border-bottom: 0.2mm solid var(--gold-line);
  }

  .running-head span { color: var(--gold-soft); padding: 0 1.5mm; }

  .tribute-inner {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 3mm 0 2mm;
  }

  .tribute-photo {
    margin: 0 auto 4mm;
    padding: 1.2mm;
    background: #fffdf8;
    border: 0.25mm solid var(--gold-line);
    box-shadow: 0 1mm 3mm rgba(70, 52, 24, 0.1);
  }

  .tribute-photo img {
    display: block;
    max-width: 84mm;
    max-height: 58mm;
    object-fit: contain;
  }

  .tribute-photo.photo-small img { max-height: 40mm; }

  .quote-mark {
    font-family: var(--display);
    font-size: 30pt;
    line-height: 0.7;
    color: var(--gold-soft);
    height: 7mm;
    text-align: left;
  }

  .message {
    font-family: var(--serif);
    font-size: var(--msg-size, 11.5pt);
    line-height: 1.68;
    color: var(--ink);
    white-space: pre-line;
    overflow-wrap: break-word;
  }

  .message-short { text-align: center; }

  .quote-mark-center { text-align: center; }

  .message-with-photo { font-size: var(--msg-size, 10pt); }

  .attribution {
    text-align: center;
    padding-bottom: 8mm;
  }

  .att-rule {
    width: 15mm;
    border-top: 0.35mm solid var(--gold-soft);
    margin: 0 auto 3.5mm;
  }

  .att-name {
    font-family: var(--display);
    font-size: 14.5pt;
    letter-spacing: 0.02em;
    color: var(--ink);
  }

  .att-meta {
    font-family: var(--sans);
    font-size: 6.8pt;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--muted);
    margin-top: 2mm;
  }

  /* ---------- closing ---------- */

  .closing-page {
    text-align: center;
    padding-top: 24mm;
  }

  .closing-page .candle { width: 15mm; margin-bottom: 9mm; }

  .closing-inner { display: flex; flex-direction: column; align-items: center; }

  .closing-xh {
    font-family: var(--display);
    font-size: 25pt;
    font-weight: 400;
    margin: 0;
  }

  .closing-en {
    font-family: var(--sans);
    font-size: 7.6pt;
    letter-spacing: 0.3em;
    text-transform: uppercase;
    color: var(--gold);
    margin-top: 3mm;
  }

  .closing-page .orn { margin: 9mm auto; }

  .closing-verse {
    max-width: 92mm;
    font-family: var(--display);
    font-style: italic;
    font-size: 12pt;
    line-height: 1.7;
    color: var(--ink-soft);
  }

  .closing-verse-ref {
    font-family: var(--sans);
    font-size: 7pt;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--gold);
    margin-top: 3mm;
  }

  .closing-line {
    font-family: var(--display);
    font-size: 15pt;
    color: var(--ink);
    margin-top: 12mm;
  }

  .closing-note {
    font-size: 9.4pt;
    line-height: 1.75;
    color: var(--muted);
    margin-top: 15mm;
  }

  .closing-note strong {
    font-family: var(--sans);
    font-weight: 600;
    font-size: 7.4pt;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--gold);
  }

  /* ---------- back cover ---------- */

  .back-cover { justify-content: center; }

  .back-inner {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding-bottom: 8mm;
  }

  .back-inner .candle { width: 14mm; margin-bottom: 11mm; }

  .back-name {
    font-family: var(--display);
    font-size: 25pt;
    letter-spacing: 0.04em;
    color: var(--ink);
  }

  .back-dates {
    font-family: var(--sans);
    font-size: 8pt;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted);
    margin-top: 3.5mm;
  }

  .back-inner .orn { margin: 9mm auto; }

  .back-rest {
    font-family: var(--display);
    font-style: italic;
    font-size: 15pt;
    color: var(--gold);
  }

  .back-rest-en {
    font-family: var(--sans);
    font-size: 7.2pt;
    letter-spacing: 0.26em;
    text-transform: uppercase;
    color: var(--muted);
    margin-top: 2.5mm;
  }
`;

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(NAME)} - A Book of Tributes</title>
<meta name="author" content="${escapeHtml(COMMUNITY)}">
<meta name="description" content="A collection of tributes in loving memory of ${escapeHtml(NAME)} (${escapeHtml(DATES)}).">
<style>${css}</style>
</head>
<body>
${cover}
${dedication}
${foreword}
${sectionDivider}
${tributePages}
${acknowledgements}
${closing}
${backCover}
</body>
</html>`;

const outputPath = join(bookletDir, "nzuzo-pukuza-tribute-booklet.html");
writeFileSync(outputPath, html, "utf8");

console.log(`Wrote ${outputPath}`);
console.log(`Tributes: ${ordered.length} (${ordered.filter((t) => t.photo).length} with photos)`);
console.log(`Booklet pages: ${1 + 1 + 1 + 1 + ordered.length + 1 + 1 + 1}`);
