import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { youthQ } from "@/lib/queries";
import { pick, useI18n } from "@/lib/i18n";
import { formatDate, formatINR } from "@/lib/format";
import { DonationList, ExpenseList, FundCards } from "@/components/app/Finance";
import { DeniedState, EmptyState, KpiCard, PageSkeleton, Pill, SectionHeader, StatusPill } from "@/components/app/bits";

export const Route = createFileRoute("/youth")({
  head: () => ({ meta: [{ title: "Youth Dashboard — Vinayaka Chavithi" }, { name: "description", content: "Youth fund accounts for approved youth members." }, { property: "og:title", content: "Youth Dashboard" }, { property: "og:description", content: "Youth fund — members only." }] }),
  component: Page,
});
function Page() {
  const { t, lang } = useI18n();
  const { data } = useQuery(youthQ());
  if (!data) return <PageSkeleton />;
  if (data.denied) return <DeniedState />;
  return (<div className="space-y-8">
    <section><SectionHeader title={t("youthDashboard")} sub={t("youthFund")} /><FundCards fund={data.youth} youth /></section>
    <section><SectionHeader title={t("donations")} /><DonationList rows={data.youthDonations} showSplit /></section>
    <section><SectionHeader title={t("expenses")} /><ExpenseList rows={data.youthExpenses} categories={data.categories} /></section>
    <section><SectionHeader title={t("members")} /><div className="flex flex-wrap gap-2">{data.members.map((m) => <Pill key={m.userId} tone={m.approved ? "youth" : "muted"}>{m.name}</Pill>)}</div></section>
    <section><SectionHeader title="Combined (General + Youth)" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Donations" value={data.combined.donations} /><KpiCard label="Auction collected" value={data.combined.collected} />
        <KpiCard label="Expenses" value={data.combined.expenses} /><KpiCard label="Balance" value={data.combined.balance} tone="primary" />
      </div></section>
    <section><SectionHeader title={t("auctions")} />
      {data.youthAuctions.length === 0 ? <EmptyState /> : <ul className="space-y-3">{data.youthAuctions.map((a) => (
        <li key={a.id} className="rounded-xl border bg-card p-4 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-2"><b>{pick(lang, a.itemEn, a.itemTe)}</b><StatusPill status={a.status} /></div>
          <p className="text-sm text-muted-foreground">{a.winnerName} · {formatINR(a.finalAmount)} · paid {formatINR(a.paid)} · remaining {formatINR(a.remaining)}</p>
          {a.contributions.length > 0 && <ul className="mt-2 text-sm">{a.contributions.map((c) => <li key={c.id} className="flex justify-between border-t py-1"><span>{c.contributorName} · {formatDate(c.date)}</span><span>{formatINR(c.amount)}</span></li>)}</ul>}
        </li>))}</ul>}
    </section>
    <section><SectionHeader title={t("memories")} />
      {data.youthPosts.length === 0 ? <EmptyState /> : <ul className="grid gap-3 sm:grid-cols-2">{data.youthPosts.map((p) => <li key={p.id} className="rounded-xl border bg-card p-4"><b>{pick(lang, p.titleEn, p.titleTe)}</b><p className="text-sm text-muted-foreground">{p.body}</p><Pill tone="youth">{p.mediaCount} media</Pill></li>)}</ul>}
    </section>
    <section><SectionHeader title={t("auditLog")} />
      {data.youthLogs.length === 0 ? <EmptyState /> : <ul className="divide-y rounded-xl border bg-card text-sm">{data.youthLogs.map((l) => <li key={l.id} className="p-3"><b>{l.action}</b> {l.entity} · {l.actor} · {formatDate(l.at)}{l.reason && <span className="text-muted-foreground"> — {l.reason}</span>}</li>)}</ul>}
    </section>
  </div>);
}
