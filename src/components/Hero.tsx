import { TRIBUTE } from "../config";
import { useLang } from "../i18n";

export function Candle() {
  return (
    <svg viewBox="0 0 120 140" className="candle" role="img" aria-label="Candle">
      <ellipse cx="60" cy="100" rx="30" ry="7" fill="rgba(0,0,0,.30)" />
      <g className="flame">
        <path d="M60 10 c8 9 12 15 12 21 a12 10 0 0 1 -24 0 c0-6 4-12 12-21 z" fill="#e8a13d" />
        <path d="M60 21 c4 5 6 9 6 13 a6 6 0 0 1 -12 0 c0-4 2-8 6-13 z" fill="#f7d98b" />
      </g>
      <path d="M55.5 40 h9 v10 h-9 z" fill="#2a2722" />
      <path d="M46 49 h28 v42 c0 7-6 11-14 11 s-14-4-14-11 z" fill="#e9dcc3" />
      <path d="M46 49 h28 v7 c0 3-6 3-6 0 v-7 h-16 v7 c0 3-6 3-6 0 z" fill="#f6eeda" />
    </svg>
  );
}

export default function Hero() {
  const { t } = useLang();
  return (
    <section className="hero">
      <div className="container">
        {TRIBUTE.heroPhoto ? (
          <img className="hero-photo" src={TRIBUTE.heroPhoto} alt={TRIBUTE.name} />
        ) : (
          <Candle />
        )}
        <p className="eyebrow">{t.eyebrow}</p>
        <h1>{TRIBUTE.name}</h1>
        {TRIBUTE.dates && <p className="dates">{TRIBUTE.dates}</p>}
        <p className="subtitle">{t.subtitle}</p>
        <p className="body">{t.heroBody}</p>
        {TRIBUTE.funeralNote && <p className="funeral-note">🕊️ {TRIBUTE.funeralNote}</p>}
      </div>
    </section>
  );
}
