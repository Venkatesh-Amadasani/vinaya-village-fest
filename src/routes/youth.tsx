import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { youthQ } from "@/lib/queries";
import { useI18n } from "@/lib/i18n";
import { DonationList, ExpenseList, FundCards } from "@/components/app/Finance";
import { DeniedState, PageSkeleton, Pill, SectionHeader } from "@/components/app/bits";

export const Route = createFileRoute("/youth")({
  head: () => ({ meta: [{ title: "Youth Dashboard — Vinayaka Chavithi" }, { name: "description", content: "Youth fund accounts for approved youth members." }, { property: "og:title", content: "Youth Dashboard" }, { property: "og:description", content: "Youth fund — members only." }] }),
  component: Page,
});
function Page() {
  const { t } = useI18n();
  const { data } = useQuery(youthQ());
  if (!data) return <PageSkeleton />;
  if (data.denied) return <DeniedState />;
  return (<div className="space-y-8">
    <section><SectionHeader title={t("youthDashboard")} sub={t("youthFund")} /><FundCards fund={data.youth} youth /></section>
    <section><SectionHeader title={t("donations")} /><DonationList rows={data.youthDonations} showSplit /></section>
    <section><SectionHeader title={t("expenses")} /><ExpenseList rows={data.youthExpenses} categories={data.categories} /></section>
    <section><SectionHeader title={t("members")} /><div className="flex flex-wrap gap-2">{data.members.map((m) => <Pill key={m.userId} tone={m.approved ? "youth" : "muted"}>{m.name}</Pill>)}</div></section>
  </div>);
}
