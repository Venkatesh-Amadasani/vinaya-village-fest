import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { auctionsQ } from "@/lib/queries";
import { useI18n } from "@/lib/i18n";
import { AuctionCard } from "@/components/app/Finance";
import { SectionHeader, ErrorState, PageSkeleton, EmptyState } from "@/components/app/bits";

export const Route = createFileRoute("/auctions")({
  head: () => ({ meta: [{ title: "Auction Results — Vinayaka Chavithi 2026" }, { name: "description", content: "Final auction results and payment status." }, { property: "og:title", content: "Auction Results" }, { property: "og:description", content: "Laddu and other auction final results." }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(auctionsQ()).then(() => undefined),
  pendingComponent: PageSkeleton,
  errorComponent: ({ error }) => <ErrorState error={error} />,
  component: Page,
});
function Page() {
  const { t } = useI18n();
  const { data } = useSuspenseQuery(auctionsQ());
  return (<div>
    <SectionHeader title={t("auctions")} />
    {data.auctions.length === 0 ? <EmptyState /> : <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{data.auctions.map((v) => <AuctionCard key={v.auction.id} v={v} />)}</div>}
  </div>);
}
