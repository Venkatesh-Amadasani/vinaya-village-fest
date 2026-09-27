import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { festivalsQ } from "@/lib/queries";
import { useI18n } from "@/lib/i18n";
import { YearGrid } from "@/components/app/FestivalHome";
import { SectionHeader, ErrorState, PageSkeleton } from "@/components/app/bits";

export const Route = createFileRoute("/years/")({
  head: () => ({ meta: [{ title: "Festival Archive — All Years" }, { name: "description", content: "Every year of our village Vinayaka Chavithi festival." }, { property: "og:title", content: "Festival Archive" }, { property: "og:description", content: "Past and upcoming festival years." }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(festivalsQ()).then(() => undefined),
  pendingComponent: PageSkeleton,
  errorComponent: ({ error }) => <ErrorState error={error} />,
  component: () => { const { t } = useI18n(); const { data } = useSuspenseQuery(festivalsQ()); return <div><SectionHeader title={t("years")} /><YearGrid items={data} /></div>; },
});
