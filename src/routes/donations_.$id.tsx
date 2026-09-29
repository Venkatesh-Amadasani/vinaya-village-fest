import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { donationQ } from "@/lib/queries";
import { useI18n } from "@/lib/i18n";
import { formatDate, formatINR, METHOD_LABEL } from "@/lib/format";
import { DetailShell, Facts, History } from "@/components/app/Detail";
import { DonationForm } from "@/components/app/Forms";
import { ErrorState, PageSkeleton, Pill } from "@/components/app/bits";

export const Route = createFileRoute("/donations_/$id")({
  head: () => ({ meta: [{ title: "Donation details — Vinayaka Chavithi" }, { name: "description", content: "Details of a festival donation." }, { property: "og:title", content: "Donation details" }, { property: "og:description", content: "Openly recorded festival donation." }] }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(donationQ(params.id)).then(() => undefined),
  pendingComponent: PageSkeleton,
  errorComponent: ({ error }) => <ErrorState error={error} />,
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  const { t } = useI18n();
  const { data } = useSuspenseQuery(donationQ(id));
  const d = data.donation;
  const rows: [string, React.ReactNode][] = [
    [t("amount"), <span className="tabular text-lg font-bold">{formatINR(d.totalAmount)}</span>],
    [t("date"), formatDate(d.date)], [t("method"), METHOD_LABEL[d.method]],
    [t("festival"), String(data.festival.year)],
  ];
  if (d.village) rows.push([t("village"), d.village]);
  if (data.canSeeYouth) rows.push([t("general"), formatINR(d.generalAmount)], [t("youth"), formatINR(d.youthAmount)]);
  return (
    <DetailShell back="/donations" title={d.donorName} action={data.canEdit ? <DonationForm canYouth={data.canSeeYouth} edit={d} /> : null}>
      {d.status === "PENDING_APPROVAL" && <Pill tone="warn">Pending approval</Pill>}
      <Facts rows={rows} />
      <History rows={data.history} />
    </DetailShell>
  );
}
