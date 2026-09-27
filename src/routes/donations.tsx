import { createFileRoute } from "@tanstack/react-router";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useState } from "react";
import { donationsQ } from "@/lib/queries";
import { useI18n } from "@/lib/i18n";
import { DonationList } from "@/components/app/Finance";
import { FilterBar, Pager, SectionHeader, PageSkeleton } from "@/components/app/bits";
import { DonationForm } from "@/components/app/Forms";
import { formatINR } from "@/lib/format";

export const Route = createFileRoute("/donations")({
  head: () => ({ meta: [{ title: "Donations — Vinayaka Chavithi 2026" }, { name: "description", content: "Every donation to the village festival, listed openly." }, { property: "og:title", content: "Festival Donations" }, { property: "og:description", content: "Open list of donors and amounts." }] }),
  component: Page,
});
function Page() {
  const { t } = useI18n();
  const [q, setQ] = useState(""); const [scope, setScope] = useState<"ALL" | "GENERAL" | "YOUTH">("ALL"); const [page, setPage] = useState(1);
  const { data } = useQuery({ ...donationsQ({ q, scope, page }), placeholderData: keepPreviousData });
  if (!data) return <PageSkeleton />;
  return (<div>
    <SectionHeader title={t("donations")} sub={`${t("total")}: ${formatINR(data.sum)}`} action={data.canAdd ? <DonationForm canYouth={data.canSeeYouth} /> : null} />
    <FilterBar q={q} onQ={(v) => { setQ(v); setPage(1); }} scope={scope} onScope={(s) => { setScope(s); setPage(1); }} showYouth={data.canSeeYouth} />
    <DonationList rows={data.rows} showSplit={data.canSeeYouth} />
    <Pager page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
  </div>);
}
