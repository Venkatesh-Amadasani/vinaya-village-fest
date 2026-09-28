import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { sessionQ } from "@/lib/queries";
import { useI18n } from "@/lib/i18n";
import { useSwitchUser } from "@/components/app/AppShell";
import { PageSkeleton, SectionHeader, Pill } from "@/components/app/bits";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — Vinayaka Chavithi Festival" }, { name: "description", content: "Sign in to the village festival platform (demo accounts)." }, { property: "og:title", content: "Sign in — Festival Platform" }, { property: "og:description", content: "Demo sign-in for General, Youth and Admin roles." }] }),
  component: Page,
});
function Page() {
  const { t } = useI18n();
  const { data } = useQuery(sessionQ());
  const sw = useSwitchUser();
  const nav = useNavigate();
  if (!data) return <PageSkeleton />;
  const current = data.viewer.user?.id ?? null;
  const pickUser = async (id: string | null) => { await sw(id); await nav({ to: "/" }); };
  return (<div className="mx-auto max-w-lg">
    <SectionHeader title={t("demoAccounts")} sub={t("demoAuthNote")} />
    <ul className="space-y-3">
      {data.demoUsers.map((u) => (
        <li key={u.id}><button onClick={() => pickUser(u.id)} className="flex w-full items-center justify-between rounded-xl border bg-card p-4 text-left shadow-card hover:border-primary">
          <span><b>{u.name}</b><br /><span className="text-sm text-muted-foreground">{u.id === "u-youth" ? "Youth member" : u.role === "ADMIN" ? "Admin" : "General member"}</span></span>
          {current === u.id && <Pill tone="primary">{t("current")}</Pill>}
        </button></li>
      ))}
      <li><button onClick={() => pickUser(null)} className="w-full rounded-xl border border-dashed p-4 text-muted-foreground">{t("publicVisitor")} ({t("signOut")})</button></li>
    </ul>
  </div>);
}
