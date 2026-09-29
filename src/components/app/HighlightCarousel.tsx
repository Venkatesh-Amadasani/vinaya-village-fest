import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import type { Highlight } from "@/domain/types";
import { pick, useI18n } from "@/lib/i18n";
import { resolveImage } from "@/lib/images";

/** Manually managed highlights only. Renders nothing when there are none. */
export function HighlightCarousel({ items }: { items: Highlight[] }) {
  const { lang, t } = useI18n();
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || items.length < 2) return;
    const id = setInterval(() => setI((x) => (x + 1) % items.length), 5000);
    return () => clearInterval(id);
  }, [paused, items.length]);
  const h = items[i % Math.max(items.length, 1)];
  if (!h) return null;
  const img = resolveImage(h.image);
  return (
    <section aria-roledescription="carousel" aria-label={t("highlights")} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      className="relative overflow-hidden rounded-2xl border bg-card shadow-card">
      <div className="flex min-h-36 items-stretch">
        {img && <img src={img} alt="" className="hidden w-48 object-cover sm:block" loading="lazy" />}
        <div className="flex flex-1 flex-col justify-center gap-1 p-5 pr-24" aria-live="polite">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary"><Sparkles className="h-3.5 w-3.5" aria-hidden />{t("highlights")}</div>
          <h3 className="text-xl font-semibold sm:text-2xl">{pick(lang, h.titleEn, h.titleTe)}</h3>
          <p className="text-muted-foreground">{pick(lang, h.bodyEn, h.bodyTe)}</p>
        </div>
      </div>
      {items.length > 1 && (
        <div className="absolute bottom-3 right-3 flex items-center gap-1">
          <button aria-label="Previous" onClick={() => setI((x) => (x - 1 + items.length) % items.length)} className="rounded-full border bg-card p-2 hover:bg-muted"><ChevronLeft className="h-4 w-4" /></button>
          <span className="tabular px-1 text-xs text-muted-foreground">{(i % items.length) + 1}/{items.length}</span>
          <button aria-label="Next" onClick={() => setI((x) => (x + 1) % items.length)} className="rounded-full border bg-card p-2 hover:bg-muted"><ChevronRight className="h-4 w-4" /></button>
        </div>
      )}
    </section>
  );
}
