import { useLang } from "../i18n";

export default function Footer() {
  const { t } = useLang();
  return (
    <footer className="site-footer">
      <p className="handover">🕊️ {t.footer.handover}</p>
      <p>{t.footer.organised}</p>
      <p className="rest">{t.footer.rest}</p>
      <a className="admin-link" href="#/admin">
        {t.footer.admin}
      </a>
    </footer>
  );
}
