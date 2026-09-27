import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { overviewQ } from "@/lib/queries";
import { pick, useI18n } from "@/lib/i18n";
import { FundCards } from "@/components/app/Finance";
import { CategoryChart } from "@/components/app/CategoryChart";
import { SectionHeader, ErrorState, PageSkeleton, Pill } from "@/components/app/bits";

export const Route = createFileRoute("/years/$year")({
  head: ({ params }) => ({ meta: [{ title: `Vinayaka Chavithi ${params.year} — Accounts` }, { name: "description", content: `Festival ${params.year} financial summary.` }, { property: "og:title", content: `Festival ${params.year}` }, { property: "og:description", content: `Festival ${params.year} summary.` }] }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(overviewQ(Number(params.year))).then(() => undefined),
  pendingComponent: PageSkeleton,
  errorComponent: ({ error }) => <ErrorState error={error} />,
  component: Page,
});
function Page() {
  const { year } = Route.useParams();
  const { t, lang } = useI18n();
  const { data: o } = useSuspenseQuery(overviewQ(Number(year)));
  return (<div className="space-y-6">
    <SectionHeader title={pick(lang, o.branding.nameEn, o.branding.nameTe)} action={<Pill tone="primary">{t(o.festival.status)}</Pill>} />
    <FundCards fund={o.general} />
    {o.generalByCategory.length > 0 && <div className="rounded-xl border bg-card p-5"><CategoryChart data={o.generalByCategory} /></div>}
  </div>);
}
