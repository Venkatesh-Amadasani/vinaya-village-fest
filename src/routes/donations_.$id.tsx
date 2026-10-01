import type { ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { donationQ } from "@/lib/queries";
import { useI18n } from "@/lib/i18n";
import { formatDate, formatINR, METHOD_LABEL } from "@/lib/format";
import { DetailShell, Facts, History } from "@/components/app/Detail";
import { DonationForm } from "@/components/app/Forms";
import { ErrorState, PageSkeleton, Pill } from "@/components/app/bits";

import { Printer } from "lucide-react";

export const Route = createFileRoute("/donations_/$id")({
  head: () => ({ meta: [{ title: "Donation details — Vinayaka Chavithi" }, { name: "description", content: "Details of a festival donation." }, { property: "og:title", content: "Donation details" }, { property: "og:description", content: "Openly recorded festival donation." }] }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(donationQ(params.id)).then(() => undefined),
  pendingComponent: PageSkeleton,
  errorComponent: ({ error }) => <ErrorState error={error} />,
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  const { t, lang } = useI18n();
  const { data } = useSuspenseQuery(donationQ(id));
  const d = data.donation;
  const donorTitle = lang === "te" ? (d.donorNameTe || d.donorName) : (d.donorName || d.donorNameTe);
  const rows: [string, ReactNode][] = [
    [t("amount"), <span className="tabular text-lg font-bold">{formatINR(d.totalAmount)}</span>],
    [t("date"), formatDate(d.date)], [t("method"), METHOD_LABEL[d.method]],
    [t("festival"), String(data.festival.year)],
  ];
  if (d.village) rows.push([t("village"), d.village]);
  if (data.canSeeYouth) rows.push([t("general"), formatINR(d.generalAmount)], [t("youth"), formatINR(d.youthAmount)]);
  return (
    <DetailShell
      back="/donations"
      title={donorTitle}
      action={
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-background px-3 text-sm font-medium shadow-xs hover:bg-muted"
          >
            <Printer className="h-4 w-4" />
            {t("printReceipt")}
          </button>
          {data.canEdit ? <DonationForm canYouth={data.canSeeYouth} edit={d} /> : null}
        </div>
      }
    >
      {d.status === "PENDING_APPROVAL" && <Pill tone="warn">Pending approval</Pill>}
      <Facts rows={rows} />
      <History rows={data.history} />
    </DetailShell>
  );
}
