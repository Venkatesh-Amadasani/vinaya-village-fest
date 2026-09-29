import type { ReactNode } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Home, HandCoins, Receipt, Gavel, Images, ShieldCheck, Users, History } from "lucide-react";
import { useI18n, type Key } from "@/lib/i18n";
import { sessionQ } from "@/lib/queries";
import { setDemoUserFn } from "@/lib/api.functions";
import { cn } from "@/lib/utils";

type NavItem = { to: "/" | "/donations" | "/expenses" | "/auctions" | "/gallery" | "/years" | "/youth" | "/admin" | "/dashboard"; key: Key; icon: typeof Home };
const PUBLIC_NAV: NavItem[] = [
  { to: "/", key: "home", icon: Home }, { to: "/donations", key: "donations", icon: HandCoins },
  { to: "/expenses", key: "expenses", icon: Receipt }, { to: "/auctions", key: "auctions", icon: Gavel },
  { to: "/gallery", key: "gallery", icon: Images }, { to: "/years", key: "years", icon: History },
];

export function LanguageSwitch() {
  const { lang, setLang } = useI18n();
  return (
    <div className="flex rounded-full border bg-card p-0.5 text-sm" role="group" aria-label="Language">
      {(["en", "te"] as const).map((l) => (
        <button key={l} onClick={() => setLang(l)} aria-pressed={lang === l}
          className={cn("h-9 rounded-full px-3 font-medium", lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
          {l === "en" ? "English" : "తెలుగు"}
        </button>
      ))}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { data } = useQuery(sessionQ());
  const viewer = data?.viewer;
  const nav: NavItem[] = [
    ...PUBLIC_NAV,
    ...(viewer?.user ? [{ to: "/dashboard", key: "dashboard", icon: Home } as NavItem] : []),
    ...(viewer?.canSeeYouth ? [{ to: "/youth", key: "youth", icon: Users } as NavItem] : []),
    ...(viewer?.isAdmin ? [{ to: "/admin", key: "admin", icon: ShieldCheck } as NavItem] : []),
  ];
  const mobile = nav.filter((n) => ["/", "/donations", "/expenses", "/auctions"].includes(n.to)).concat(nav.filter((n) => n.to === "/youth" || n.to === "/admin").slice(0, 1));

  return (
    <div className="min-h-screen pb-20 lg:pb-0">
      <div className="toran" aria-hidden />
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-festive font-display text-lg text-primary-foreground" aria-hidden>ॐ</span>
            <span className="hidden font-display text-lg leading-tight sm:block">Vinayaka Chavithi<br /><span className="text-xs text-muted-foreground">వినాయక చవితి</span></span>
          </Link>
          <nav className="ml-4 hidden flex-1 items-center gap-1 lg:flex" aria-label="Main">
            {nav.map((n) => (
              <Link key={n.to} to={n.to} activeOptions={{ exact: n.to === "/" }}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                activeProps={{ className: "bg-accent text-accent-foreground" }}>
                {t(n.key)}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <LanguageSwitch />
            {viewer?.user ? (
              <Link to="/notifications" className="relative rounded-full border bg-card p-2.5" aria-label={`${t("notifications")} (${data?.unread ?? 0})`}>
                <Bell className="h-5 w-5" />
                {!!data?.unread && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground">{data.unread}</span>}
              </Link>
            ) : (
              <Link to="/auth" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">{t("signIn")}</Link>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">{children}</main>
      <footer className="mx-auto max-w-6xl px-4 pb-8 text-center text-xs text-muted-foreground">{t("demoNotice")}</footer>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid border-t bg-card lg:hidden" style={{ gridTemplateColumns: `repeat(${mobile.length}, 1fr)` }} aria-label="Mobile">
        {mobile.map((n) => (
          <Link key={n.to} to={n.to} activeOptions={{ exact: n.to === "/" }} className="flex flex-col items-center gap-0.5 py-2 text-[11px] text-muted-foreground" activeProps={{ className: "text-primary" }}>
            <n.icon className="h-5 w-5" aria-hidden />{t(n.key)}
          </Link>
        ))}
      </nav>
    </div>
  );
}

/** Demo identity switch. TODO(prod-auth): replace with real sign-in (phone OTP / email) via Lovable Cloud. */
export function useSwitchUser() {
  const qc = useQueryClient();
  const router = useRouter();
  return async (userId: string | null) => {
    await setDemoUserFn({ data: { userId } });
    await qc.invalidateQueries();
    await router.invalidate();
  };
}
