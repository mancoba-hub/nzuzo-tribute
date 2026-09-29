import { useEffect, useState } from "react";
import { LangProvider, useLang } from "./i18n";
import Hero from "./components/Hero";
import TributeForm from "./components/TributeForm";
import Wall from "./components/Wall";
import Footer from "./components/Footer";
import Admin from "./components/Admin";

function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const onHash = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return hash;
}

function LanguageToggle() {
  const { lang, t, setLang } = useLang();
  return (
    <button
      type="button"
      className="lang-toggle"
      onClick={() => setLang(lang === "en" ? "xh" : "en")}
    >
      🌍 {t.langSwitch}
    </button>
  );
}

function TopBar() {
  const { t } = useLang();
  return <header className="topbar">{t.topbar}</header>;
}

function Home() {
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <div className="page">
      <Hero />
      <div className="container">
        <TributeForm onSubmitted={() => setRefreshKey((k) => k + 1)} />
        <Wall key={refreshKey} />
        <Footer />
      </div>
    </div>
  );
}

export default function App() {
  const hash = useHashRoute();
  return (
    <LangProvider>
      <div className="app">
        <TopBar />
        <LanguageToggle />
        {hash.startsWith("#/admin") ? <Admin /> : <Home />}
      </div>
    </LangProvider>
  );
}
