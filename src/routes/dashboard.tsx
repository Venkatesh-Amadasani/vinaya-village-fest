import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { sessionQ, overviewQ, youthQ } from "@/lib/queries";
import { useI18n } from "@/lib/i18n";
import { FundCards } from "@/components/app/Finance";
import { KpiCard, PageSkeleton, Pill, SectionHeader } from "@/components/app/bits";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "My Dashboard — Vinayaka Chavithi" }, { name: "description", content: "Your festival role, permissions and shortcuts." }, { property: "og:title", content: "My Dashboard" }, { property: "og:description", content: "Signed-in member dashboard." }] }),
  component: Page,
});

function Page() {
  const { t } = useI18n();
  const session = useQuery(sessionQ());
  const overview = useQuery(overviewQ());
  const youth = useQuery({ ...youthQ(), enabled: !!session.data?.viewer.canSeeYouth });
  if (!session.data || !overview.data) return <PageSkeleton />;
  const v = session.data.viewer;
  if (!v.user) return (
    <div className="mx-auto max-w-md rounded-xl border bg-card p-6 text-center shadow-card">
      <p className="mb-4">{t("signIn")}</p>
      <Link to="/auth" className="inline-flex h-11 items-center rounded-full bg-primary px-6 font-semibold text-primary-foreground">{t("signIn")}</Link>
    </div>
  );
  const links = [
    { to: "/donations" as const, label: t("donations") }, { to: "/expenses" as const, label: t("expenses") },
    { to: "/auctions" as const, label: t("auctions") }, { to: "/notifications" as const, label: t("notifications") },
    ...(v.canSeeYouth ? [{ to: "/youth" as const, label: t("youthDashboard") }] : []),
    ...(v.isAdmin ? [{ to: "/admin" as const, label: t("admin") }] : []),
  ];
  return (
    <div className="space-y-8">
      <SectionHeader title={`${t("myDashboard")} · ${v.user.name}`} sub={v.isAdmin ? t("admin") : v.canSeeYouth ? t("youth") : t("general")} />
      <div className="rounded-lg border border-dashed bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
        {t("demoBadge")}: {t("demoSignInNote")}
      </div>
      <section className="flex flex-wrap gap-2">
        {v.isAdmin ? <Pill tone="primary">ADMIN — all permissions</Pill> : v.permissions.length === 0 ? <Pill>View only</Pill> : v.permissions.map((p) => <Pill key={p}>{p}</Pill>)}
      </section>
      <section><SectionHeader title={t("transparency")} /><FundCards fund={overview.data.general} /></section>
      {youth.data && !youth.data.denied && (() => {
        const g = youth.data.general, y = youth.data.youth;
        const sum = { donations: g.donations + y.donations, auctionCollected: g.auctionCollected + y.auctionCollected, auctionCommitted: g.auctionCommitted + y.auctionCommitted, expenses: g.expenses + y.expenses, balance: g.balance + y.balance };
        return (<>
          <section><SectionHeader title={t("youthFund")} /><FundCards fund={y} youth /></section>
          <section><SectionHeader title={t("combinedFund")} /><FundCards fund={{ ...g, ...sum }} />
            <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4"><KpiCard label={t("auctionOutstanding")} value={Math.max(0, sum.auctionCommitted - sum.auctionCollected)} /></div>
          </section>
        </>);
      })()}
      <nav className="grid gap-3 sm:grid-cols-3">
        {links.map((l) => <Link key={l.to} to={l.to} className="rounded-xl border bg-card p-4 font-semibold shadow-card hover:bg-muted">{l.label}</Link>)}
      </nav>
    </div>
  );
}
