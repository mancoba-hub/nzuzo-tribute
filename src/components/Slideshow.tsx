import { useCallback, useEffect, useState } from "react";
import { listTributes, type Tribute } from "../api";
import { TRIBUTE } from "../config";
import { useLang } from "../i18n";
import { Candle } from "./Hero";

/** How long each slide stays on screen before auto-advancing. */
const SLIDE_MS = 9000;

/**
 * Full-screen slideshow for the funeral service: an intro slide followed by
 * one slide per tribute, auto-advancing with manual controls.
 * Reachable at `#/slideshow`.
 */
export default function Slideshow() {
  const { t } = useLang();
  const [tributes, setTributes] = useState<Tribute[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [index, setIndex] = useState(0); // 0 = intro slide
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    listTributes()
      .then(setTributes)
      .catch(() => setFailed(true));
  }, []);

  const names = tributes ?? [];
  const count = names.length + 1; // intro slide + one per tribute
  const hasTributes = names.length > 0;

  const next = useCallback(() => setIndex((i) => (i + 1) % count), [count]);
  const prev = useCallback(() => setIndex((i) => (i - 1 + count) % count), [count]);
  const goTo = useCallback((i: number) => setIndex(((i % count) + count) % count), [count]);

  // Auto-advance while playing. Restarts whenever the slide or play state changes.
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), SLIDE_MS);
    return () => window.clearInterval(id);
  }, [playing, count]);

  // Keyboard controls for whoever operates the screen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        setPlaying(false);
        next();
      } else if (e.key === "ArrowLeft") {
        setPlaying(false);
        prev();
      } else if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.key === "Escape") {
        window.location.hash = "#/";
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  const slide = index === 0 ? null : names[index - 1];

  return (
    <div className="slideshow">
      <button type="button" className="slideshow-exit" onClick={() => (window.location.hash = "#/")}>
        ✕ {t.slideshow.exit}
      </button>
      <div className="slideshow-counter">
        {index + 1} / {count}
      </div>

      {failed ? (
        <div className="slideshow-slide">
          <p className="slideshow-message">{t.slideshow.error}</p>
        </div>
      ) : !hasTributes ? (
        <div className="slideshow-slide">
          <p className="slideshow-message">
            {tributes === null ? t.slideshow.loading : t.slideshow.empty}
          </p>
        </div>
      ) : slide ? (
        <div className="slideshow-slide" key={slide.id}>
          {slide.photo && <img className="slideshow-photo" src={slide.photo} alt="" />}
          <p className="eyebrow">{t.eyebrow}</p>
          <h1 className="slideshow-name">{slide.name}</h1>
          <p className="slideshow-meta">
            {slide.community ? `${slide.community} · ` : ""}
            {new Date(slide.createdAt).toLocaleDateString("en-ZA", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
          <p className="slideshow-message">{slide.message}</p>
        </div>
      ) : (
        <div className="slideshow-slide" key="intro">
          <Candle />
          <p className="eyebrow">{t.eyebrow}</p>
          <h1 className="slideshow-name">{TRIBUTE.name}</h1>
          {TRIBUTE.dates && <p className="slideshow-meta">{TRIBUTE.dates}</p>}
          <p className="slideshow-message slideshow-verse">“{t.verse.text}”</p>
          <p className="slideshow-meta">— {t.verse.ref}</p>
        </div>
      )}

      {hasTributes && (
        <>
          <div className="slideshow-controls">
            <div className="slideshow-dots">
              {Array.from({ length: count }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  className={i === index ? "slideshow-dot active" : "slideshow-dot"}
                  onClick={() => {
                    setPlaying(false);
                    goTo(i);
                  }}
                  aria-label={i === 0 ? t.eyebrow : names[i - 1].name}
                />
              ))}
            </div>
            <div className="slideshow-buttons">
              <button
                type="button"
                onClick={() => {
                  setPlaying(false);
                  prev();
                }}
                aria-label={t.slideshow.prev}
              >
                ⏮
              </button>
              <button
                type="button"
                className="play"
                onClick={() => setPlaying((p) => !p)}
                aria-label={playing ? t.slideshow.pause : t.slideshow.play}
              >
                {playing ? "⏸" : "▶"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPlaying(false);
                  next();
                }}
                aria-label={t.slideshow.next}
              >
                ⏭
              </button>
            </div>
            <p className="slideshow-hint">{t.slideshow.hint}</p>
          </div>
          <div className={playing ? "slideshow-progress" : "slideshow-progress paused"} key={index}>
            <div style={{ animationDuration: `${SLIDE_MS}ms` }} />
          </div>
        </>
      )}
    </div>
  );
}
