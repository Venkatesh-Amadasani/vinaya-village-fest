import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { galleryQ } from "@/lib/queries";
import { pick, useI18n } from "@/lib/i18n";
import { resolveImage } from "@/lib/images";
import { SectionHeader, ErrorState, PageSkeleton, EmptyState, Pill } from "@/components/app/bits";

export const Route = createFileRoute("/gallery")({
  head: () => ({ meta: [{ title: "Gallery & Memories — Vinayaka Chavithi" }, { name: "description", content: "Photos and memories from our village festival." }, { property: "og:title", content: "Festival Gallery" }, { property: "og:description", content: "Photos and memories from the festival." }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(galleryQ()).then(() => undefined),
  pendingComponent: PageSkeleton,
  errorComponent: ({ error }) => <ErrorState error={error} />,
  component: Page,
});
function Page() {
  const { t, lang } = useI18n();
  const { data } = useSuspenseQuery(galleryQ());
  return (<div>
    <SectionHeader title={t("gallery")} />
    {data.length === 0 ? <EmptyState /> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{data.map((p) => (
      <article key={p.id} className="overflow-hidden rounded-xl border bg-card shadow-card">
        {p.media[0] && <img src={resolveImage(p.media[0].url) ?? ""} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover" />}
        <div className="p-4"><div className="flex gap-2"><h3 className="flex-1 text-lg font-semibold">{pick(lang, p.titleEn, p.titleTe)}</h3>{p.visibility !== "PUBLIC" && <Pill tone="youth">{p.visibility}</Pill>}</div><p className="text-sm text-muted-foreground">{p.body}</p></div>
      </article>))}</div>}
  </div>);
}
