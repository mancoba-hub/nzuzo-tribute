import { useEffect, useState, type FormEvent } from "react";
import {
  adminDelete,
  adminExportCsv,
  adminExportZip,
  adminList,
  adminLogin,
  adminSetHidden,
  adminToken,
  ApiError,
  type Tribute,
} from "../api";
import { TRIBUTE } from "../config";
import { buildOfflineSlideshow, downloadOfflineSlideshow } from "../exportSlideshow";

function PrintSheet({ tributes }: { tributes: Tribute[] }) {
  const visible = tributes.filter((t) => !t.hidden);
  return (
    <div className="print-sheet">
      <h1>Tributes for {TRIBUTE.name}</h1>
      <p className="print-intro">
        Collected by {TRIBUTE.community} — handed over to the family on the day of the funeral.
      </p>
      {visible.map((t) => (
        <section className="print-tribute" key={t.id}>
          <h2>{t.name}</h2>
          <p className="print-meta">
            {t.community ? `${t.community} · ` : ""}
            {new Date(t.createdAt).toLocaleDateString("en-ZA", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
          {t.photo && <img src={t.photo} alt="" />}
          <p className="print-message">{t.message}</p>
        </section>
      ))}
    </div>
  );
}

export default function Admin() {
  const [token, setToken] = useState<string | null>(adminToken.get());
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState("");
  const [tributes, setTributes] = useState<Tribute[] | null>(null);
  const [filter, setFilter] = useState<"all" | "visible" | "hidden">("all");

  function logout() {
    adminToken.clear();
    setToken(null);
    setTributes(null);
  }

  async function login(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const t = await adminLogin(password);
      adminToken.set(t);
      setToken(t);
      setPassword("");
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? "Incorrect password." : "Login failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    adminList()
      .then(setTributes)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) logout();
        else setError("Could not load tributes.");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function toggleHidden(t: Tribute) {
    try {
      await adminSetHidden(t.id, !t.hidden);
      setTributes((prev) => (prev ? prev.map((x) => (x.id === t.id ? { ...x, hidden: !x.hidden } : x)) : prev));
    } catch {
      setError("Could not update the tribute.");
    }
  }

  async function remove(t: Tribute) {
    if (!window.confirm(`Delete the tribute from ${t.name}? This cannot be undone.`)) return;
    try {
      await adminDelete(t.id);
      setTributes((prev) => (prev ? prev.filter((x) => x.id !== t.id) : prev));
    } catch {
      setError("Could not delete the tribute.");
    }
  }

  async function run(fn: () => Promise<void>) {
    setError("");
    try {
      await fn();
    } catch {
      setError("Download failed. Please try again.");
    }
  }

  async function runOffline() {
    if (!tributes) return;
    setBuilding(true);
    setError("");
    try {
      const blob = await buildOfflineSlideshow(tributes);
      downloadOfflineSlideshow(blob);
    } catch {
      setError("Could not prepare the offline slideshow. Please try again.");
    } finally {
      setBuilding(false);
    }
  }

  if (!token) {
    return (
      <div className="container">
        <form className="admin-login" onSubmit={login}>
          <h2>Admin — {TRIBUTE.community}</h2>
          <p className="section-note">Sign in to review tributes and prepare the handover.</p>
          <div className="field">
            <label htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
          </div>
          {error && <div className="form-error">{error}</div>}
          <button type="submit" className="btn" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    );
  }

  if (!tributes) {
    return <div className="container"><p className="section-note">Loading tributes…</p></div>;
  }

  const photos = tributes.filter((t) => t.photo).length;
  const visible = tributes.filter((t) => !t.hidden).length;
  const shown =
    filter === "all" ? tributes : tributes.filter((t) => (filter === "hidden" ? t.hidden : !t.hidden));

  return (
    <>
      <div className="container admin-ui">
        <h2 className="section-title">Tribute Dashboard</h2>
        <div className="admin-stats">
          <div className="stat"><b>{tributes.length}</b><span>Total tributes</span></div>
          <div className="stat"><b>{photos}</b><span>With photos</span></div>
          <div className="stat"><b>{tributes.length - visible}</b><span>Hidden</span></div>
        </div>

        <div className="admin-actions">
          <button type="button" className="btn-ghost" onClick={() => run(adminExportCsv)}>
            ⬇ Download CSV (all tributes)
          </button>
          <button type="button" className="btn-ghost" onClick={() => run(adminExportZip)}>
            ⬇ Download photos (ZIP)
          </button>
          <button type="button" className="btn-ghost" onClick={() => window.print()}>
            🖨 Print tribute booklet
          </button>
          <a
            className="btn-ghost"
            href="#/slideshow"
            target="_blank"
            rel="noopener"
          >
            ▶ Play tribute slideshow
          </a>
          <button type="button" className="btn-ghost" onClick={runOffline} disabled={building}>
            {building ? "⏳ Preparing offline slideshow…" : "⬇ Download offline slideshow (HTML)"}
          </button>
          <button type="button" className="btn-ghost" onClick={logout}>
            Log out
          </button>
        </div>

        {error && <div className="form-error">{error}</div>}

        <div className="admin-actions">
          {(["all", "visible", "hidden"] as const).map((f) => (
            <button
              key={f}
              type="button"
              className={filter === f ? "btn-filter active" : "btn-filter"}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "All" : f === "visible" ? "Visible" : "Hidden"}
            </button>
          ))}
        </div>

        {shown.map((t) => (
          <div className="admin-row" key={t.id}>
            {t.photo && <img className="thumb" src={t.photo} alt="" />}
            <div className="grow">
              <h4>
                {t.name}
                {t.hidden && <span className="hidden-badge">hidden</span>}
              </h4>
              <div className="meta">
                {new Date(t.createdAt).toLocaleString("en-ZA")}
                {t.community ? ` · ${t.community}` : ""}
                {t.contact ? ` · ${t.contact}` : ""}
              </div>
              <p className="msg">{t.message}</p>
              <div className="row-actions">
                <button type="button" onClick={() => toggleHidden(t)}>
                  {t.hidden ? "Show" : "Hide"}
                </button>
                <button type="button" className="danger" onClick={() => remove(t)}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
        {shown.length === 0 && <p className="wall-empty">No tributes match this filter.</p>}
      </div>
      <PrintSheet tributes={tributes} />
    </>
  );
}
