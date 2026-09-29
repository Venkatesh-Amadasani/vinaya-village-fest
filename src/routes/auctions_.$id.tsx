import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { auctionQ } from "@/lib/queries";
import { pick, useI18n } from "@/lib/i18n";
import { formatINR } from "@/lib/format";
import { DetailShell, Facts } from "@/components/app/Detail";
import { ContributionForm } from "@/components/app/Forms";
import { ErrorState, PageSkeleton, StatusPill } from "@/components/app/bits";

export const Route = createFileRoute("/auctions_/$id")({
  head: () => ({ meta: [{ title: "Auction result — Vinayaka Chavithi" }, { name: "description", content: "Final auction result and payment progress." }, { property: "og:title", content: "Auction result" }, { property: "og:description", content: "Final result and contributions — no bid history." }] }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(auctionQ(params.id)).then(() => undefined),
  pendingComponent: PageSkeleton,
  errorComponent: ({ error }) => <ErrorState error={error} />,
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  const { t, lang } = useI18n();
  const { data } = useSuspenseQuery(auctionQ(id));
  const { auction: a, paid, remaining, contributions } = data.view;
  return (
    <DetailShell back="/auctions" title={pick(lang, a.itemEn, a.itemTe)}
      action={data.canContribute && remaining > 0 ? <ContributionForm auctionId={a.id} remaining={remaining} /> : null}>
      <StatusPill status={a.paymentStatus} />
      <Facts rows={[
        [t("winner"), a.winnerName], [t("finalAmount"), <span className="tabular font-bold">{formatINR(a.finalAmount)}</span>],
        [t("paid"), formatINR(paid)], [t("remaining"), <span className="tabular font-bold">{formatINR(remaining)}</span>],
        [t("festival"), `${a.auctionYear} → ${a.forFestivalYear}`],
      ]} />
      <section>
        <h2 className="mb-2 text-lg font-semibold">{t("contributions")}</h2>
        {contributions === null ? <p className="text-sm text-muted-foreground">{t("hiddenContrib")}</p> : (
          <ul className="divide-y rounded-xl border bg-card">
            {contributions.map((c) => <li key={c.id} className="flex justify-between px-4 py-3"><span>{c.contributorName}</span><span className="tabular font-semibold">{formatINR(c.amount)}</span></li>)}
          </ul>
        )}
      </section>
    </DetailShell>
  );
}
