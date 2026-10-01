import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { youthQ } from "@/lib/queries";
import { setPermissionFn } from "@/lib/api.functions";
import { pick, useI18n } from "@/lib/i18n";
import { formatDate, formatINR } from "@/lib/format";
import { DonationList, ExpenseList, FundCards } from "@/components/app/Finance";
import { DeniedState, EmptyState, KpiCard, PageSkeleton, Pill, SectionHeader, StatusPill } from "@/components/app/bits";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/youth")({
  head: () => ({ meta: [{ title: "Youth Dashboard — Vinayaka Chavithi" }, { name: "description", content: "Youth fund accounts for approved youth members." }, { property: "og:title", content: "Youth Dashboard" }, { property: "og:description", content: "Youth fund — members only." }] }),
  component: Page,
});

function Page() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const { data } = useQuery(youthQ());
  if (!data) return <PageSkeleton />;
  if (data.denied) return <DeniedState />;

  const toggleYouthPermission = async (userId: string, userName: string, enabled: boolean) => {
    try {
      await setPermissionFn({ data: { userId, permission: "YOUTH_ACCESS", enabled } });
      await qc.invalidateQueries();
      toast.success(
        enabled
          ? (lang === "te" ? `${userName}కి యువత అనుమతి ఇవ్వబడింది` : `Youth permission granted to ${userName}`)
          : (lang === "te" ? `${userName}కి యువత అనుమతి తొలగించబడింది` : `Youth permission revoked for ${userName}`)
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  return (
    <div className="space-y-8">
      <section>
        <SectionHeader title={t("youthDashboard")} sub={t("youthFund")} />
        <FundCards fund={data.youth} youth />
      </section>

      <section>
        <SectionHeader title={t("donations")} />
        <DonationList rows={data.youthDonations} showSplit />
      </section>

      <section>
        <SectionHeader title={t("expenses")} />
        <ExpenseList rows={data.youthExpenses} categories={data.categories} />
      </section>

      <section className="space-y-4">
        <SectionHeader
          title={t("members")}
          sub={lang === "te" ? "యువత సభ్యులు మరియు అనుమతుల నిర్వహణ" : "Youth members and access control"}
        />
        <div className="flex flex-wrap gap-2">
          {data.members.map((m) => (
            <Pill key={m.userId} tone={m.approved ? "youth" : "muted"}>{m.name}</Pill>
          ))}
        </div>

        {data.allUsers && (
          <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
            <div className="border-b pb-3">
              <h4 className="font-bold text-sm">
                {lang === "te" ? "యువత అనుమతుల నియంత్రణ (నిర్వాహక స్విచ్‌లు)" : "Youth Member Access Control (Admin Toggles)"}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {lang === "te"
                  ? "గ్రామ యువకులకు విన్నపం అవసరం లేకుండా నేరుగా యూత్ డాష్‌బోర్డ్ అనుమతి ఇవ్వండి లేదా రద్దు చేయండి."
                  : "Directly grant or revoke Youth Dashboard permission for any member with an instant toggle switch."}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.allUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-muted/20">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{u.name}</div>
                    <div className="text-xs text-muted-foreground">{u.role}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-medium text-muted-foreground">
                      {u.isYouth ? (lang === "te" ? "అనుమతించబడింది" : "Granted") : (lang === "te" ? "లేదు" : "Revoked")}
                    </span>
                    <Switch
                      checked={u.isYouth}
                      onCheckedChange={(enabled) => toggleYouthPermission(u.id, u.name, enabled)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section>
        <SectionHeader title={lang === "te" ? "సమగ్ర నిల్వ (జనరల్ + యూత్)" : "Combined (General + Youth)"} />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard label={lang === "te" ? "మొత్తం విరాళాలు" : "Donations"} value={data.combined.donations} />
          <KpiCard label={lang === "te" ? "వేలం వసూళ్లు" : "Auction collected"} value={data.combined.collected} />
          <KpiCard label={lang === "te" ? "మొత్తం ఖర్చులు" : "Expenses"} value={data.combined.expenses} />
          <KpiCard label={lang === "te" ? "నికర నిల్వ" : "Balance"} value={data.combined.balance} tone="primary" />
        </div>
      </section>

      <section>
        <SectionHeader title={t("auctions")} />
        {data.youthAuctions.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="space-y-3">
            {data.youthAuctions.map((a) => (
              <li key={a.id} className="rounded-xl border bg-card p-4 shadow-card">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <b>{pick(lang, a.itemEn, a.itemTe)}</b>
                  <StatusPill status={a.status} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {a.winnerName} · {formatINR(a.finalAmount)} · {lang === "te" ? "చెల్లించినది" : "paid"} {formatINR(a.paid)} · {lang === "te" ? "మిగిలినది" : "remaining"} {formatINR(a.remaining)}
                </p>
                {a.contributions.length > 0 && (
                  <ul className="mt-2 text-sm">
                    {a.contributions.map((c) => (
                      <li key={c.id} className="flex justify-between border-t py-1">
                        <span>{c.contributorName} · {formatDate(c.date)}</span>
                        <span>{formatINR(c.amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <SectionHeader title={t("memories")} />
        {data.youthPosts.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {data.youthPosts.map((p) => (
              <li key={p.id} className="rounded-xl border bg-card p-4">
                <b>{pick(lang, p.titleEn, p.titleTe)}</b>
                <p className="text-sm text-muted-foreground">{p.body}</p>
                <Pill tone="youth">{p.mediaCount} {lang === "te" ? "మీడియా" : "media"}</Pill>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <SectionHeader title={t("auditLog")} />
        {data.youthLogs.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="divide-y rounded-xl border bg-card text-sm">
            {data.youthLogs.map((l) => (
              <li key={l.id} className="p-3">
                <b>{l.action}</b> {l.entity} · {l.actor} · {formatDate(l.at)}
                {l.reason && <span className="text-muted-foreground"> — {l.reason}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
