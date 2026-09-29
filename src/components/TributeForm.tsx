import { useEffect, useRef, useState, type FormEvent } from "react";
import { submitTribute, ApiError } from "../api";
import { useLang } from "../i18n";

interface Props {
  onSubmitted: () => void;
}

export default function TributeForm({ onSubmitted }: Props) {
  const { t } = useLang();
  const [name, setName] = useState("");
  const [community, setCommunity] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pickPhoto(file: File | undefined) {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp|gif)$/i.test(file.type) || file.size > 10 * 1024 * 1024) {
      setError(t.form.errorImage);
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
    setError(null);
  }

  function removePhoto() {
    if (preview) URL.revokeObjectURL(preview);
    setPhoto(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (sending) return;
    setError(null);
    setSending(true);
    try {
      const form = new FormData();
      form.append("name", name);
      form.append("community", community);
      form.append("contact", contact);
      form.append("message", message);
      if (photo) form.append("photo", photo);
      await submitTribute(form);
      setName("");
      setCommunity("");
      setContact("");
      setMessage("");
      removePhoto();
      setDone(true);
      onSubmitted();
    } catch (err) {
      if (err instanceof ApiError && (err.code === "INVALID_IMAGE" || err.code === "IMAGE_TOO_LARGE")) {
        setError(t.form.errorImage);
      } else {
        setError(t.form.errorGeneric);
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <section id="send">
      <h2 className="section-title">🕯️ {t.form.title}</h2>
      {done && !error && <div className="form-success">✓ {t.form.success}</div>}
      <form className="tribute-form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="f-name">{t.form.name} *</label>
          <input
            id="f-name"
            type="text"
            required
            maxLength={80}
            placeholder={t.form.namePlaceholder}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="f-community">
            {t.form.community} <span className="optional">· optional</span>
          </label>
          <input
            id="f-community"
            type="text"
            maxLength={120}
            placeholder={t.form.communityPlaceholder}
            value={community}
            onChange={(e) => setCommunity(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="f-contact">
            {t.form.contact} <span className="optional">· optional</span>
          </label>
          <input
            id="f-contact"
            type="text"
            maxLength={120}
            placeholder={t.form.contactPlaceholder}
            value={contact}
            onChange={(e) => setContact(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="f-message">{t.form.message} *</label>
          <textarea
            id="f-message"
            required
            maxLength={5000}
            placeholder={t.form.messagePlaceholder}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="f-photo">
            {t.form.photo} <span className="optional">· optional</span>
          </label>
          <label className="photo-pick" htmlFor="f-photo">
            📷 {t.form.photoHint}
          </label>
          <input
            ref={fileRef}
            id="f-photo"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            hidden
            onChange={(e) => pickPhoto(e.target.files?.[0])}
          />
          {preview && (
            <div className="photo-preview">
              <img src={preview} alt="Selected tribute" />
              <button type="button" className="photo-remove" onClick={removePhoto}>
                ✕ {t.form.removePhoto}
              </button>
            </div>
          )}
        </div>
        {error && <div className="form-error">{error}</div>}
        <button type="submit" className="btn" disabled={sending}>
          {sending ? `⏳ ${t.form.sending}` : `🤍 ${t.form.submit}`}
        </button>
      </form>
    </section>
  );
}
