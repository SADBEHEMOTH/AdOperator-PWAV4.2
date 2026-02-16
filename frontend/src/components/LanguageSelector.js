import { useLanguage } from "@/context/LanguageContext";

export default function LanguageSelector() {
  const { lang, changeLang, LANG_NAMES } = useLanguage();
  const langs = Object.keys(LANG_NAMES);

  return (
    <div className="flex items-center gap-0.5" data-testid="language-selector">
      {langs.map((l) => (
        <button
          key={l}
          data-testid={`lang-${l}`}
          onClick={() => changeLang(l)}
          className={`text-xs px-2 py-1 rounded-sm transition-all duration-200 font-mono ${
            lang === l
              ? "bg-white/10 text-white border border-white/20"
              : "text-zinc-600 hover:text-zinc-300 border border-transparent"
          }`}
        >
          {LANG_NAMES[l]}
        </button>
      ))}
    </div>
  );
}
