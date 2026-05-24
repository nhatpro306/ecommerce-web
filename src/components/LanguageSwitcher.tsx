"use client";

import { Globe } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function LanguageSwitcher() {
  const { language, setLanguage } = useI18n();

  return (
    <div
      className="flex items-center gap-0 border border-zinc-200 bg-white"
      role="group"
      aria-label="Switch language"
    >
      <span className="flex h-9 w-9 items-center justify-center text-zinc-500">
        <Globe className="h-3.5 w-3.5" />
        <span className="sr-only">Switch language</span>
      </span>
      <button
        type="button"
        onClick={() => setLanguage("vi")}
        aria-pressed={language === "vi"}
        aria-label="Switch to Vietnamese"
        title="Tiếng Việt"
        className={`h-9 min-w-10 cursor-pointer px-2 text-[11px] font-bold uppercase tracking-[0.12em] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 ${
          language === "vi"
            ? "bg-zinc-950 text-white"
            : "bg-white text-zinc-700 hover:bg-zinc-100"
        }`}
      >
        VN
      </button>
      <button
        type="button"
        onClick={() => setLanguage("en")}
        aria-pressed={language === "en"}
        aria-label="Switch to English"
        title="English"
        className={`h-9 min-w-10 cursor-pointer border-l border-zinc-200 px-2 text-[11px] font-bold uppercase tracking-[0.12em] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 ${
          language === "en"
            ? "bg-zinc-950 text-white"
            : "bg-white text-zinc-700 hover:bg-zinc-100"
        }`}
      >
        EN
      </button>
    </div>
  );
}
