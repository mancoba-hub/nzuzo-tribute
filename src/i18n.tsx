import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "xh";

const STRINGS = {
  en: {
    topbar: "Qeqe Community Development",
    eyebrow: "In Loving Memory",
    subtitle: "A tribute to a life well lived",
    noticeCaption: "Funeral Notice",
    heroBody:
      "Qeqe Community Development invites you to share your messages of love, remembrance and comfort for the family of Nzuzo Pukuza. Your tributes will be handed over to the family on the day of the funeral.",
    form: {
      title: "Send Your Tribute",
      name: "Your Name",
      namePlaceholder: "e.g. Thandeka Mthembu",
      community: "Community / Organisation (optional)",
      communityPlaceholder: "e.g. Qeqe Community Development",
      contact: "Phone or Email (optional)",
      contactPlaceholder: "So the family can reach you",
      message: "Your Message of Condolence",
      messagePlaceholder: "Share a memory of Nzuzo or words of comfort for the family…",
      photo: "Add a Photo (optional)",
      photoHint: "A photo with Nzuzo, or a candle lit in his memory. JPG, PNG or WEBP, max 10MB.",
      removePhoto: "Remove photo",
      submit: "Send Tribute",
      sending: "Sending…",
      success:
        "Thank you. Your tribute has been received and will be shared with the family on the day of the funeral.",
      errorGeneric: "Something went wrong. Please try again.",
      errorImage: "Please choose a photo in JPG, PNG or WEBP format (max 10MB).",
    },
    wall: {
      title: "Tributes",
      empty: "Be the first to leave a tribute.",
      more: "Show more",
    },
    footer: {
      handover:
        "These tributes will be handed over to the family of Nzuzo Pukuza on the day of the funeral.",
      organised: "Organised by Qeqe Community Development",
      rest: "Rest in Peace, Nzuzo.",
      admin: "Admin",
    },
    langSwitch: "isiXhosa",
  },
  xh: {
    topbar: "Qeqe Community Development",
    eyebrow: "UKhunjulwa Ngothando",
    subtitle: "Isikhumbuzo sobomi obuphilwe kakuhle",
    noticeCaption: "Isaziso Somngcwabo",
    heroBody:
      "IQeqe Community Development iyakumema ukuba wabelane ngemiyalezo yothando, yokukhumbula nentuthuzelo nosapho lukaNzuzo Pukuza. Izikhumbuzo zakho ziya kunikezelwa kusapho ngosuku lomngcwabo.",
    form: {
      title: "Thumela Isikhumbuzo Sakho",
      name: "Igama Lakho",
      namePlaceholder: "umz. uThandeka Mthembu",
      community: "Uluntu / Umbutho (ukuba uyafuna)",
      communityPlaceholder: "umz. IQeqe Community Development",
      contact: "Ifowuni okanye I-imeyile (ukuba uyafuna)",
      contactPlaceholder: "Ukuze usapho lukwazi ukufikelela kuwe",
      message: "Umyalezo Wakho Wovelwano",
      messagePlaceholder: "Yabelana ngenkumbulo kaNzuzo okanye ngamazwi entuthuzelo kusapho…",
      photo: "Faka Umfanekiso (ukuba uyafuna)",
      photoHint: "Umfanekiso kaNzuzo, okanye ikhandlela elibaselwe ukumkhumbula. JPG, PNG okanye WEBP, ubukhulu be-10MB.",
      removePhoto: "Susa umfanekiso",
      submit: "Thumela Isikhumbuzo",
      sending: "Iyathunyelwa…",
      success:
        "Enkosi. Isikhumbuzo sakho sifunyenwe kwaye siya kwabelwana naso nosapho ngosuku lomngcwabo.",
      errorGeneric: "Kukho into engahambanga kakuhle. Nceda uzame kwakhona.",
      errorImage: "Nceda ukhethe umfanekiso weJPG, PNG okanye WEBP (ubukhulu be-10MB).",
    },
    wall: {
      title: "Izikhumbuzo",
      empty: "Yiba ngowokuqala ukushiya isikhumbuzo.",
      more: "Bonisa ezinye",
    },
    footer: {
      handover:
        "Ezi zikhumbuzo ziya kunikezelwa kusapho lukaNzuzo Pukuza ngosuku lomngcwabo.",
      organised: "Iququzelelwa yiQeqe Community Development",
      rest: "Lala ngoxolo, Nzuzo.",
      admin: "Admin",
    },
    langSwitch: "English",
  },
} as const;

export type Strings = (typeof STRINGS)["en"];

interface LangContextValue {
  lang: Lang;
  t: Strings;
  setLang: (lang: Lang) => void;
}

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem("nzuzo-lang");
    if (saved === "en" || saved === "xh") return saved;
    return navigator.language?.toLowerCase().startsWith("xh") ? "xh" : "en";
  });

  useEffect(() => {
    localStorage.setItem("nzuzo-lang", lang);
    document.documentElement.lang = lang === "xh" ? "xh" : "en";
  }, [lang]);

  return (
    <LangContext.Provider value={{ lang, t: STRINGS[lang], setLang: setLangState }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used inside LangProvider");
  return ctx;
}
