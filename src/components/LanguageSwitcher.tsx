"use client";

import { Globe } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export function LanguageSwitcher() {
  const { language, setLanguage } = useI18n();

  return (
    <div className="flex items-center gap-1 border border-zinc-200 px-1 py-1">
      <Globe className="h-3.5 w-3.5 text-zinc-500" />
      <Button
        type="button"
        variant={language === "vi" ? "secondary" : "ghost"}
        size="sm"
        className="h-7 rounded-none px-2 text-[11px] font-bold"
        onClick={() => setLanguage("vi")}
      >
        VI
      </Button>
      <Button
        type="button"
        variant={language === "en" ? "secondary" : "ghost"}
        size="sm"
        className="h-7 rounded-none px-2 text-[11px] font-bold"
        onClick={() => setLanguage("en")}
      >
        EN
      </Button>
    </div>
  );
}

