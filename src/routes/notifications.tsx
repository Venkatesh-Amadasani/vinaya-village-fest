import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationsQ } from "@/lib/queries";
import { markReadFn, setPreferenceFn } from "@/lib/api.functions";
import { pick, useI18n } from "@/lib/i18n";
import { formatDate } from "@/lib/format";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { DeniedState, EmptyState, PageSkeleton, Pill, SectionHeader } from "@/components/app/bits";
import type { NotificationKind } from "@/domain/types";

const KINDS: NotificationKind[] = ["ANNOUNCEMENT", "DONATION", "EXPENSE", "AUCTION", "APPROVAL", "SYSTEM"];
export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Vinayaka Chavithi Festival" }, { name: "description", content: "Festival announcements and updates." }, { property: "og:title", content: "Festival Notifications" }, { property: "og:description", content: "In-app festival updates in English and Telugu." }] }),
  component: Page,
});
function Page() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const { data } = useQuery(notificationsQ());
  if (!data) return <PageSkeleton />;
  if (!data.signedIn) return <DeniedState />;
  const refresh = () => qc.invalidateQueries();
  const unread = data.items.filter((n) => !n.read).length;
  return (<div className="grid gap-8 lg:grid-cols-[1fr_320px]">
    <section>
      <SectionHeader title={t("notifications")} sub={`${unread} ${t("unread")}`} action={unread > 0 ? <Button variant="outline" onClick={async () => { await markReadFn({ data: { id: null } }); await refresh(); }}>{t("markAllRead")}</Button> : null} />
      {data.items.length === 0 ? <EmptyState label={t("noNotifications")} /> : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-card">
          {data.items.map((n) => (
            <li key={n.id} className={`flex gap-3 p-4 ${n.read ? "" : "bg-accent/40"}`}>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2"><b>{pick(lang, n.titleEn, n.titleTe)}</b><Pill>{t(n.kind)}</Pill>{n.festivalId && <Pill tone="primary">{data.festivals.find((f) => f.id === n.festivalId)?.year}</Pill>}</div>
                <p className="text-sm text-muted-foreground">{pick(lang, n.bodyEn, n.bodyTe)}</p>
                <p className="text-xs text-muted-foreground">{formatDate(n.createdAt)}</p>
              </div>
              {!n.read && <button className="text-sm font-medium text-primary" onClick={async () => { await markReadFn({ data: { id: n.id } }); await refresh(); }}>{t("markRead")}</button>}
            </li>
          ))}
        </ul>
      )}
    </section>
    <aside className="rounded-xl border bg-card p-5 shadow-card">
      <h2 className="text-lg font-semibold">{t("preferences")}</h2>
      <p className="mb-3 text-xs text-muted-foreground">{t("inApp")}</p>
      <ul className="space-y-3">{KINDS.map((k) => (
        <li key={k} className="flex items-center justify-between"><span>{t(k)}</span>
          <Switch checked={data.prefs ? data.prefs.kinds[k] : true} onCheckedChange={async (v) => { await setPreferenceFn({ data: { kind: k, enabled: v } }); await refresh(); }} aria-label={t(k)} /></li>
      ))}</ul>
    </aside>
  </div>);
}
