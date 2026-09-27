import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { getOverviewFn } from "@/lib/api.functions";
import { auctionsQ, donationsQ, expensesQ, festivalsQ, galleryQ } from "@/lib/queries";
import { pick, useI18n } from "@/lib/i18n";
import { resolveImage } from "@/lib/images";
import { formatDate, formatINR } from "@/lib/format";
import { HighlightCarousel } from "./HighlightCarousel";
import { CategoryChart } from "./CategoryChart";
import { AuctionCard, DonationList, ExpenseList, FundCards, ViewAll } from "./Finance";
import { Pill, SectionHeader } from "./bits";

type Overview = Awaited<ReturnType<typeof getOverviewFn>>;

export function FestivalHome({ overview: o }: { year?: number; overview: Overview }) {
  const { t, lang } = useI18n();
  const donations = useSuspenseQuery(donationsQ({})).data;
  const expenses = useSuspenseQuery(expensesQ({})).data;
  const auctions = useSuspenseQuery(auctionsQ()).data;
  const gallery = useSuspenseQuery(galleryQ()).data;
  const festivals = useSuspenseQuery(festivalsQ()).data;
  const idol = resolveImage(o.branding.idolImage);
  return (
    <div className="space-y-12">
      <section className="grid items-center gap-6 overflow-hidden rounded-3xl bg-warm p-6 shadow-card sm:p-10 md:grid-cols-[1.3fr_1fr]">
        <div>
          <Pill tone="primary">{o.festival.year} · {t(o.festival.status)}</Pill>
          <h1 className="mt-3 text-4xl leading-tight sm:text-5xl">{pick(lang, o.branding.nameEn, o.branding.nameTe)}</h1>
          <p className="mt-3 text-lg text-muted-foreground">{pick(lang, o.branding.taglineEn, o.branding.taglineTe)}</p>
          <p className="mt-2 text-sm text-muted-foreground">{formatDate(o.festival.startDate)} – {formatDate(o.festival.endDate)}</p>
        </div>
        {idol && <img src={idol} alt="Ganesha idol" width={1024} height={1280} className="mx-auto max-h-96 rounded-2xl object-cover shadow-card" />}
      </section>

      <HighlightCarousel items={o.highlights} />

      <section>
        <SectionHeader title={t("transparency")} sub={t("transparencySub")} />
        <FundCards fund={o.general} />
        {o.generalByCategory.length > 0 && (
          <div className="mt-4 rounded-xl border bg-card p-5 shadow-card">
            <h3 className="mb-3 text-lg font-semibold">{t("expenseByCategory")}</h3>
            <CategoryChart data={o.generalByCategory} />
          </div>
        )}
      </section>

      <section><SectionHeader title={t("donations")} action={<ViewAll to="/donations" />} /><DonationList rows={donations.rows.slice(0, 5)} showSplit={donations.canSeeYouth} /></section>
      <section><SectionHeader title={t("expenses")} action={<ViewAll to="/expenses" />} /><ExpenseList rows={expenses.rows.slice(0, 5)} categories={expenses.categories} /></section>
      <section>
        <SectionHeader title={t("auctions")} action={<ViewAll to="/auctions" />} />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{auctions.auctions.slice(0, 3).map((v) => <AuctionCard key={v.auction.id} v={v} />)}</div>
      </section>
      {gallery.length > 0 && (
        <section>
          <SectionHeader title={t("gallery")} action={<ViewAll to="/gallery" />} />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {gallery.flatMap((p) => p.media.map((m) => (
              <figure key={m.id} className="overflow-hidden rounded-xl border bg-card">
                <img src={resolveImage(m.url) ?? ""} alt={pick(lang, p.titleEn, p.titleTe)} loading="lazy" className="aspect-[4/3] w-full object-cover" />
                <figcaption className="p-2 text-sm font-medium">{pick(lang, p.titleEn, p.titleTe)}</figcaption>
              </figure>
            )))}
          </div>
        </section>
      )}
      <section>
        <SectionHeader title={t("years")} action={<ViewAll to="/years" />} />
        <YearGrid items={festivals} />
      </section>
    </div>
  );
}

export function YearGrid({ items }: { items: Awaited<ReturnType<typeof import("@/lib/api.functions").getFestivalsFn>> }) {
  const { t, lang } = useI18n();
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {items.map((f) => (
        <Link key={f.festival.id} to="/years/$year" params={{ year: String(f.festival.year) }} className="rounded-xl border bg-card p-5 shadow-card hover:border-primary">
          <div className="flex justify-between"><span className="font-display text-3xl">{f.festival.year}</span><Pill tone={f.festival.isCurrent ? "primary" : "muted"}>{t(f.festival.status)}</Pill></div>
          <p className="mt-1 text-sm text-muted-foreground">{pick(lang, f.branding.nameEn, f.branding.nameTe)}</p>
          <p className="tabular mt-2 text-sm">{t("collected")}: <b>{formatINR(f.general.donations)}</b></p>
        </Link>
      ))}
    </div>
  );
}
