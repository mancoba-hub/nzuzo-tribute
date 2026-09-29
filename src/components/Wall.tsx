import { useEffect, useState } from "react";
import { listTributes, type Tribute } from "../api";
import { useLang } from "../i18n";

const PAGE = 12;

function formatDate(iso: string, lang: string) {
  try {
    return new Date(iso).toLocaleDateString(lang === "xh" ? "xh-ZA" : "en-ZA", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return new Date(iso).toLocaleDateString();
  }
}

function Lightbox({ photo, name, onClose }: { photo: string; name: string; onClose: () => void }) {
  return (
    <div className="lightbox" onClick={onClose} role="dialog" aria-label="Photo">
      <img src={photo} alt={name} />
    </div>
  );
}

function TributeCard({ tribute, lang }: { tribute: Tribute; lang: string }) {
  const [open, setOpen] = useState(false);
  return (
    <article className="tribute-card">
      {tribute.photo && (
        <img
          className="photo"
          src={tribute.photo}
          alt={tribute.name}
          loading="lazy"
          onClick={() => setOpen(true)}
        />
      )}
      <h3>{tribute.name}</h3>
      {tribute.community && <div className="community">{tribute.community}</div>}
      <div className="date">{formatDate(tribute.createdAt, lang)}</div>
      <p className="message">{tribute.message}</p>
      {open && tribute.photo && (
        <Lightbox photo={tribute.photo} name={tribute.name} onClose={() => setOpen(false)} />
      )}
    </article>
  );
}

export default function Wall() {
  const { t, lang } = useLang();
  const [tributes, setTributes] = useState<Tribute[]>([]);
  const [visible, setVisible] = useState(PAGE);

  useEffect(() => {
    listTributes()
      .then(setTributes)
      .catch(() => setTributes([]));
  }, []);

  if (tributes.length === 0) {
    return (
      <section>
        <h2 className="section-title">🤍 {t.wall.title}</h2>
        <p className="wall-empty">{t.wall.empty}</p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="section-title">🤍 {t.wall.title}</h2>
      <div className="wall">
        {tributes.slice(0, visible).map((tribute) => (
          <TributeCard key={tribute.id} tribute={tribute} lang={lang} />
        ))}
      </div>
      {tributes.length > visible && (
        <div className="more">
          <button type="button" className="btn-ghost" onClick={() => setVisible((v) => v + PAGE)}>
            {t.wall.more}
          </button>
        </div>
      )}
    </section>
  );
}
