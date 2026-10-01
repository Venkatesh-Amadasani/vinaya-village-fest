import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import type { Highlight } from "@/domain/types";
import { pick, useI18n } from "@/lib/i18n";
import { resolveImage } from "@/lib/images";
import { cn } from "@/lib/utils";

/**
 * Manually managed festival highlights.
 * Displays both:
 * 1. A continuous smooth rolling horizontal marquee ticker banner.
 * 2. An auto-rolling slide carousel with smooth horizontal slide animation,
 *    progress countdown bar, slide dots, and interactive controls.
 */
export function HighlightCarousel({ items }: { items: Highlight[] }) {
  const { lang, t } = useI18n();
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  // Auto-roll every 4.5 seconds
  useEffect(() => {
    if (paused || items.length < 2) return;
    const id = setInterval(() => {
      setI((x) => (x + 1) % items.length);
    }, 4500);
    return () => clearInterval(id);
  }, [paused, items.length]);

  if (!items || items.length === 0) return null;

  // Seamless rolling ticker items (duplicate list so -50% translateX loops infinitely)
  const base = items.length < 3 ? [...items, ...items, ...items] : items;
  const tickerItems = [...base, ...base];

  return (
    <div className="space-y-3">
      {/* 1. Continuous Rolling Marquee News Ticker */}
      <div
        className="relative overflow-hidden rounded-xl border border-primary/25 bg-card/90 backdrop-blur-sm p-1.5 shadow-xs flex items-center"
        aria-label="Highlights rolling news ticker"
      >
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider shrink-0 z-10 shadow-xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
          </span>
          <span>{lang === "te" ? "ముఖ్యాంశాలు" : "HIGHLIGHTS"}</span>
        </div>

        <div className="overflow-hidden flex-1 px-3">
          <div className="animate-marquee flex items-center gap-8 whitespace-nowrap text-sm hover:[animation-play-state:paused]">
            {tickerItems.map((item, idx) => {
              const origIdx = idx % items.length;
              const isCurrent = origIdx === i;
              const title = pick(lang, item.titleEn, item.titleTe);
              const body = pick(lang, item.bodyEn, item.bodyTe);
              return (
                <button
                  key={`${item.id}-${idx}`}
                  type="button"
                  onClick={() => setI(origIdx)}
                  className={cn(
                    "inline-flex items-center gap-2 transition-colors cursor-pointer text-left focus:outline-none",
                    isCurrent ? "text-primary font-bold" : "text-foreground/90 hover:text-primary"
                  )}
                  title={title}
                >
                  <Sparkles className="h-3 w-3 text-primary shrink-0" aria-hidden />
                  <span className="font-semibold">{title}</span>
                  {body && (
                    <span className="text-muted-foreground text-xs hidden md:inline">
                      — {body}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Rolling Slides Showcase Carousel */}
      <section
        aria-roledescription="carousel"
        aria-label={t("highlights")}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={(e) => {
          const t0 = e.touches[0];
          if (t0) setTouchStart(t0.clientX);
        }}
        onTouchEnd={(e) => {
          if (touchStart === null) return;
          const t0 = e.changedTouches[0];
          if (!t0) return;
          const diff = touchStart - t0.clientX;
          if (diff > 45) setI((x) => (x + 1) % items.length);
          if (diff < -45) setI((x) => (x - 1 + items.length) % items.length);
          setTouchStart(null);
        }}
        className="relative overflow-hidden rounded-2xl border bg-card shadow-card group"
      >
        {/* Rolling countdown progress bar */}
        {items.length > 1 && (
          <div className="h-1 w-full bg-muted/30 overflow-hidden">
            <div
              key={i}
              className={cn(
                "h-full bg-primary origin-left",
                paused ? "w-full opacity-30" : "animate-progress"
              )}
            />
          </div>
        )}

        {/* Rolling Horizontal Slide Track */}
        <div
          className="flex transition-transform duration-700 ease-in-out"
          style={{ transform: `translateX(-${i * 100}%)` }}
        >
          {items.map((h, idx) => {
            const img = resolveImage(h.image);
            const title = pick(lang, h.titleEn, h.titleTe);
            const body = pick(lang, h.bodyEn, h.bodyTe);
            return (
              <div
                key={h.id || idx}
                className="w-full min-w-full flex-shrink-0 flex min-h-36 items-stretch"
                aria-hidden={idx !== i}
              >
                {img ? (
                  <img
                    src={img}
                    alt={title}
                    className="hidden w-48 sm:w-56 object-cover md:block shrink-0"
                    loading="lazy"
                  />
                ) : (
                  <div className="hidden sm:flex w-36 md:w-44 shrink-0 items-center justify-center bg-gradient-to-br from-primary/10 via-primary/5 to-muted/20 border-r border-border/50 text-primary">
                    <div className="rounded-2xl bg-card/90 p-3.5 shadow-xs border border-primary/20">
                      <Sparkles className="h-7 w-7 text-primary" />
                    </div>
                  </div>
                )}
                <div className="flex flex-1 flex-col justify-center gap-1.5 p-5 pr-28" aria-live="polite">
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden />
                    {t("highlights")}
                  </div>
                  <h3 className="text-xl font-bold sm:text-2xl leading-snug text-foreground">
                    {title}
                  </h3>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed line-clamp-2">
                    {body}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Carousel Slide Navigation Controls */}
        {items.length > 1 && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-card/85 backdrop-blur-sm p-1 rounded-full border shadow-xs">
            <button
              type="button"
              aria-label="Previous"
              onClick={() => setI((x) => (x - 1 + items.length) % items.length)}
              className="rounded-full p-1.5 text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1 px-1">
              {items.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  aria-label={`Go to slide ${idx + 1}`}
                  onClick={() => setI(idx)}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300 cursor-pointer",
                    idx === i ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60"
                  )}
                />
              ))}
            </div>
            <span className="tabular px-1 text-xs font-medium text-muted-foreground">
              {i + 1}/{items.length}
            </span>
            <button
              type="button"
              aria-label="Next"
              onClick={() => setI((x) => (x + 1) % items.length)}
              className="rounded-full p-1.5 text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
